/**
 * Test de integracion — GET /api/v1/reportes/dia (F2-T3, HU-REP-01).
 * Requiere PostgreSQL real (ver docker-compose.test.yml + README.md); si
 * DATABASE_URL no esta definido, la suite se salta (mismo patron que
 * test/integration/pedidos.integration.spec.ts).
 *
 * Siembra 3 Pedidos en el mismo turno/dia (2 dayparts distintos, 2 metodos de
 * pago distintos) mas UNO reembolsado, y verifica:
 *  - el pedido reembolsado NUNCA aparece en ventas/mix/dayparts (RN-04);
 *  - el mix de productos agrega unidades/monto solo de los pedidos vigentes;
 *  - el bucketing de dayparts usa la zona horaria de la Ubicacion, no UTC;
 *  - el arqueo del turno resta el reembolso EN EFECTIVO del efectivo esperado
 *    (fix documentado en src/reportes/arqueo-calculo.ts), y que el desglose
 *    "por metodo" del REPORTE (solo pedidos cobrados) difiere a proposito del
 *    "por metodo" del ARQUEO (todos los pagos aprobados del turno, incluido
 *    el de un pedido luego cancelado) — son dos preguntas distintas.
 */
import type { INestApplication } from "@nestjs/common";
import { VentasService } from "../../src/ventas/ventas.service";
import { ReportesService } from "../../src/reportes/reportes.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { uuidv7 } from "../../src/common/util/uuid";
import {
  crearAppDePrueba,
  limpiarBaseDeDatos,
  sembrarFixturesBasicas,
  UBICACION_TEST,
  type FixturesBasicas,
} from "./setup";

const DB_DISPONIBLE = Boolean(process.env.DATABASE_URL);
if (!DB_DISPONIBLE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] DATABASE_URL no definido: se omiten los tests de integracion de reportes. " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

const FECHA_TEST = "2026-07-18";

(DB_DISPONIBLE ? describe : describe.skip)("ReportesService.reporteDia — F2-T3 (HU-REP-01)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ventas: VentasService;
  let reportes: ReportesService;
  let fixtures: FixturesBasicas;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    ventas = app.get(VentasService);
    reportes = app.get(ReportesService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);
    // El turno de fixtures se abre "ahora" (hoy); lo anclamos a FECHA_TEST
    // para que el rango del reporte lo encuentre.
    await prisma.turno.update({
      where: { id: fixtures.turnoId },
      data: { abiertoEn: new Date(`${FECHA_TEST}T05:00:00.000Z`) },
    });
  });

  async function crearYCobrarPedido(opts: {
    cantidad: number;
    metodo: "efectivo" | "tarjeta";
    cerradoEnUtc: string;
  }): Promise<string> {
    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: opts.cantidad });
    const saldo = await ventas.saldoPendiente(pedidoId);

    await ventas.registrarPagoEnPedido(pedidoId, {
      metodo: opts.metodo,
      monto: saldo,
      propina: 0,
      estado: "aprobado",
      montoRecibido: opts.metodo === "efectivo" ? saldo : undefined,
      cambio: opts.metodo === "efectivo" ? 0 : undefined,
    });

    // Backdatea el cierre para poder controlar en que daypart/dia cae (el
    // motor de ventas usa `new Date()` al cobrar, ver VentasService).
    await prisma.pedido.update({ where: { id: pedidoId }, data: { cerradoEn: new Date(opts.cerradoEnUtc) } });

    return pedidoId;
  }

  it("ventas/mix/dayparts: solo cuenta pedidos cobrados; un reembolso NUNCA los infla", async () => {
    // Pedido A: 1 unidad, efectivo, 08:00 local America/New_York (12:00Z, EDT) -> Desayuno.
    await crearYCobrarPedido({ cantidad: 1, metodo: "efectivo", cerradoEnUtc: "2026-07-18T12:00:00.000Z" });
    // Pedido B: 2 unidades, tarjeta, 12:00 local (16:00Z) -> Almuerzo.
    await crearYCobrarPedido({ cantidad: 2, metodo: "tarjeta", cerradoEnUtc: "2026-07-18T16:00:00.000Z" });
    // Pedido C: 1 unidad, efectivo, luego REEMBOLSADO -> pasa a "cancelado".
    const pedidoCId = await crearYCobrarPedido({
      cantidad: 1,
      metodo: "efectivo",
      cerradoEnUtc: "2026-07-18T13:00:00.000Z",
    });
    await ventas.reembolsarPedido(pedidoCId, fixtures.usuarioId, "Cliente insatisfecho (test integracion)");

    const reporte = await reportes.reporteDia({ ubicacionId: UBICACION_TEST, fecha: FECHA_TEST });

    // --- Ventas del dia: SOLO A + B (subtotal 10 + 20 = 30, impuesto 1+2=3, total 11+22=33) ---
    expect(reporte.ventas.numeroPedidos).toBe(2);
    expect(reporte.ventas.subtotal).toBe("30");
    expect(reporte.ventas.impuestoTotal).toBe("3");
    expect(reporte.ventas.total).toBe("33");
    // Desglose por metodo: SOLO de pedidos cobrados (C, ya cancelado, no aporta).
    expect(reporte.ventas.porMetodoPago.efectivo).toBe("11");
    expect(reporte.ventas.porMetodoPago.tarjeta).toBe("22");

    // --- Mix de productos: unidades 1(A) + 2(B) = 3 (NO +1 de C) ---
    expect(reporte.mixProductos.items).toHaveLength(1);
    const item = reporte.mixProductos.items[0];
    expect(item.productoId).toBe(fixtures.productoId);
    expect(item.unidades).toBe(3);
    expect(item.monto).toBe("30"); // 10 (A) + 20 (B), sin el subtotal de C

    // --- Dayparts: A en Desayuno, B en Almuerzo, ninguno en Cena/Madrugada/Tarde ---
    const porNombre = Object.fromEntries(reporte.dayparts.items.map((d) => [d.nombre, d]));
    expect(porNombre["Desayuno"].numeroPedidos).toBe(1);
    expect(porNombre["Desayuno"].total).toBe("11");
    expect(porNombre["Almuerzo"].numeroPedidos).toBe(1);
    expect(porNombre["Almuerzo"].total).toBe("22");
    expect(porNombre["Cena"].numeroPedidos).toBe(0);
    expect(porNombre["Tarde"].numeroPedidos).toBe(0);
    expect(porNombre["Madrugada"].numeroPedidos).toBe(0);

    // --- Arqueo del turno: efectivo reembolsado resta del efectivo esperado ---
    expect(reporte.arqueo.turnos).toHaveLength(1);
    const arqueoTurno = reporte.arqueo.turnos[0];
    expect(arqueoTurno.turnoId).toBe(fixtures.turnoId);
    // porMetodo del ARQUEO (nivel turno) SI incluye el pago original de C
    // (estado="aprobado" en el momento del cobro): 11 (A) + 11 (C) = 22.
    expect(arqueoTurno.porMetodo.efectivo).toBe("22");
    expect(arqueoTurno.efectivoReembolsado).toBe("11");
    // fondoInicial(100) + efectivo aprobado(22) - reembolsado en efectivo(11) = 111
    expect(arqueoTurno.efectivoEsperado).toBe("111");
    expect(arqueoTurno.efectivoContado).toBeNull(); // turno aun no cerrado (sin cierre-z)
    expect(arqueoTurno.diferencia).toBeNull();
  });

  it("ubicacionId es obligatorio (C-TENANT): nunca agrega sin acotar a una tienda", async () => {
    await expect(reportes.reporteDia({ ubicacionId: "", fecha: FECHA_TEST })).rejects.toMatchObject({
      codigo: "ubicacion_requerida",
      status: 422,
    });
  });

  it("una ubicacion inexistente devuelve 404 (no un reporte vacio silencioso)", async () => {
    await expect(reportes.reporteDia({ ubicacionId: "ubic-no-existe", fecha: FECHA_TEST })).rejects.toMatchObject({
      codigo: "ubicacion_no_encontrada",
      status: 404,
    });
  });

  it("un rango hasta < fecha es invalido (422)", async () => {
    await expect(
      reportes.reporteDia({ ubicacionId: UBICACION_TEST, fecha: FECHA_TEST, hasta: "2026-07-01" }),
    ).rejects.toMatchObject({ codigo: "rango_invalido", status: 422 });
  });

  it("ordenarMixPor='unidades' cambia el orden del mix (multi-producto)", async () => {
    // Reusa el mismo producto de fixtures dos veces con cantidades distintas
    // no alcanza para probar el ORDEN (un solo producto); se prueba con dos
    // productos: el de fixtures + uno nuevo con menos unidades pero mas monto.
    const categoria = await prisma.categoria.findFirstOrThrow({ where: { id: "cat-test" } });
    const productoCaro = await prisma.producto.create({
      data: {
        id: "prod-test-caro",
        categoriaId: categoria.id,
        nombre: "Producto caro de prueba",
        descripcion: "",
        precioBase: 100,
        gravable: true,
        esCombo: false,
        disponible86: true,
        activo: true,
      },
    });

    // Pedido barato-alto-volumen: 5 unidades del producto de fixtures (5*10=50).
    const pedidoBarato = uuidv7();
    await ventas.crearPedido({ id: pedidoBarato, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoBarato, { productoId: fixtures.productoId, cantidad: 5 });
    const saldoBarato = await ventas.saldoPendiente(pedidoBarato);
    await ventas.registrarPagoEnPedido(pedidoBarato, {
      metodo: "efectivo",
      monto: saldoBarato,
      propina: 0,
      estado: "aprobado",
      montoRecibido: saldoBarato,
      cambio: 0,
    });
    await prisma.pedido.update({
      where: { id: pedidoBarato },
      data: { cerradoEn: new Date("2026-07-18T12:00:00.000Z") },
    });

    // Pedido caro-bajo-volumen: 1 unidad del producto caro (1*100=100).
    const pedidoCaro = uuidv7();
    await ventas.crearPedido({ id: pedidoCaro, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoCaro, { productoId: productoCaro.id, cantidad: 1 });
    const saldoCaro = await ventas.saldoPendiente(pedidoCaro);
    await ventas.registrarPagoEnPedido(pedidoCaro, {
      metodo: "tarjeta",
      monto: saldoCaro,
      propina: 0,
      estado: "aprobado",
    });
    await prisma.pedido.update({
      where: { id: pedidoCaro },
      data: { cerradoEn: new Date("2026-07-18T12:00:00.000Z") },
    });

    const porMonto = await reportes.reporteDia({ ubicacionId: UBICACION_TEST, fecha: FECHA_TEST });
    expect(porMonto.mixProductos.ordenarPor).toBe("monto");
    expect(porMonto.mixProductos.items[0].productoId).toBe(productoCaro.id); // 100 > 50

    const porUnidades = await reportes.reporteDia({
      ubicacionId: UBICACION_TEST,
      fecha: FECHA_TEST,
      ordenarMixPor: "unidades",
    });
    expect(porUnidades.mixProductos.items[0].productoId).toBe(fixtures.productoId); // 5 > 1
  });
});
