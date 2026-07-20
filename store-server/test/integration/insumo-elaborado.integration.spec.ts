/**
 * Test de integracion — S-14 "BOM multinivel — productos elaborados/
 * intermedios" (DUENO menu-inventario-pos, ver
 * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
 * S-14). Verifica el envoltorio REAL de
 * InventarioService.producirInsumoElaborado y CatalogoService.
 * definirRecetaInsumoElaborado contra Postgres:
 *  (a) producir un insumo elaborado (ej. Salsa BBQ) decrementa CADA insumo
 *      base por la cantidad exacta escalada, e incrementa el stock del
 *      propio insumo elaborado.
 *  (b) producir MAS de lo que alcanza un insumo base rechaza la operacion
 *      COMPLETA (422) y NO consume ningun insumo base parcialmente.
 *  (c) vender un plato que usa la salsa preparada decrementa el stock de LA
 *      SALSA (no el de los insumos base crudos) via el flujo existente de
 *      VentaConfirmada — sin ningun cambio de codigo en
 *      InventarioService.moverStockPorPedido.
 *
 * Requiere PostgreSQL real; si DATABASE_URL no esta definido, se salta (mismo
 * patron que el resto de test/integration/, ver setup.ts).
 */
import type { INestApplication } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { CatalogoService } from "../../src/catalogo/catalogo.service";
import { InventarioService } from "../../src/inventario/inventario.service";
import { VentasService } from "../../src/ventas/ventas.service";
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
    "[integration] DATABASE_URL no definido: se omiten los tests de Insumo elaborado (S-14). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("Insumo elaborado — BOM multinivel (S-14)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let catalogo: CatalogoService;
  let inventario: InventarioService;
  let ventas: VentasService;
  let fixtures: FixturesBasicas;

  let tomateId: string;
  let especiasId: string;
  let salsaId: string;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    catalogo = app.get(CatalogoService);
    inventario = app.get(InventarioService);
    ventas = app.get(VentasService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function stockDe(insumoId: string): Promise<Decimal> {
    const stock = await prisma.stock.findUnique({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId } },
    });
    return new Decimal(stock?.cantidadActual ?? 0);
  }

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);

    // Insumos base "hoja" (crudos, se compran) para la receta de la salsa.
    const tomate: any = await catalogo.crearInsumo({ nombre: "Tomate", unidadMedida: "kg", umbralStockBajo: 1 });
    const especias: any = await catalogo.crearInsumo({ nombre: "Especias", unidadMedida: "kg", umbralStockBajo: 0.1 });
    tomateId = tomate.id;
    especiasId = especias.id;

    await prisma.stock.create({ data: { id: uuidv7(), ubicacionId: UBICACION_TEST, insumoId: tomateId, cantidadActual: 50 } });
    await prisma.stock.create({ data: { id: uuidv7(), ubicacionId: UBICACION_TEST, insumoId: especiasId, cantidadActual: 20 } });

    // Salsa BBQ: insumo elaborado, 0.5kg tomate + 0.1kg especias por unidad (litro) producida.
    const salsa: any = await catalogo.crearInsumo({ nombre: "Salsa BBQ", unidadMedida: "L", umbralStockBajo: 1 });
    salsaId = salsa.id;
    await catalogo.definirRecetaInsumoElaborado(salsaId, {
      items: [
        { insumoBaseId: tomateId, cantidad: 0.5 },
        { insumoBaseId: especiasId, cantidad: 0.1 },
      ],
    });
  });

  it("(a) definirRecetaInsumoElaborado marca esElaborado=true y persiste la receta via Receta/RecetaInsumo (mismas tablas que Producto)", async () => {
    const salsaActualizada = await prisma.insumo.findUniqueOrThrow({ where: { id: salsaId } });
    expect(salsaActualizada.esElaborado).toBe(true);

    const receta = await prisma.receta.findFirstOrThrow({ where: { insumoElaboradoId: salsaId, activo: true } });
    const items = await prisma.recetaInsumo.findMany({ where: { recetaId: receta.id } });
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.insumoId))).toEqual(new Set([tomateId, especiasId]));
  });

  it("(b) producirInsumoElaborado decrementa CADA insumo base escalado por cantidadProducida e incrementa el stock de la salsa", async () => {
    expect((await stockDe(salsaId)).toString()).toBe("0");

    const resultado: any = await inventario.producirInsumoElaborado({
      ubicacionId: UBICACION_TEST,
      insumoElaboradoId: salsaId,
      cantidadProducida: 10,
      usuarioId: fixtures.usuarioId,
    });
    expect(resultado.cantidadProducida).toBe("10");

    // 0.5*10=5 de tomate ; 0.1*10=1 de especias.
    expect((await stockDe(tomateId)).toString()).toBe("45"); // 50-5
    expect((await stockDe(especiasId)).toString()).toBe("19"); // 20-1
    expect((await stockDe(salsaId)).toString()).toBe("10"); // 0+10

    const auditoria = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "produccionInsumoElaborado", agregadoId: salsaId },
    });
    expect(auditoria).toHaveLength(1);
    const payload = auditoria[0].payload as Record<string, unknown>;
    expect(payload.cantidadProducida).toBe("10");
    expect(Array.isArray(payload.consumos)).toBe(true);
    expect((payload.consumos as unknown[]).length).toBe(2);
  });

  it("(c) producir MAS de lo que alcanza un insumo base rechaza la operacion COMPLETA (422) y NO consume nada parcialmente", async () => {
    // Deja "especias" con stock insuficiente para cantidadProducida=10 (requeriria 1, solo hay 0.5).
    await prisma.stock.update({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId: especiasId } },
      data: { cantidadActual: 0.5 },
    });
    // Tomate SI alcanza de sobra (requeriria 5, hay 50) — si la operacion NO
    // fuera atomica, el tomate se consumiria antes de fallar en especias.
    expect((await stockDe(tomateId)).toString()).toBe("50");

    await expect(
      inventario.producirInsumoElaborado({
        ubicacionId: UBICACION_TEST,
        insumoElaboradoId: salsaId,
        cantidadProducida: 10,
        usuarioId: fixtures.usuarioId,
      }),
    ).rejects.toMatchObject({ codigo: "stock_insuficiente", status: 422 });

    // NADA se consumio: ni el insumo que SI alcanzaba (tomate) ni el que no.
    expect((await stockDe(tomateId)).toString()).toBe("50");
    expect((await stockDe(especiasId)).toString()).toBe("0.5");
    // La salsa tampoco gano stock.
    expect((await stockDe(salsaId)).toString()).toBe("0");

    const auditoria = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "produccionInsumoElaborado", agregadoId: salsaId },
    });
    expect(auditoria).toHaveLength(0);
  });

  it("(d) vender un plato que usa la salsa preparada decrementa el stock de LA SALSA, no el de los insumos base crudos (via VentaConfirmada existente)", async () => {
    // Primero, produce suficiente salsa para la venta.
    await inventario.producirInsumoElaborado({
      ubicacionId: UBICACION_TEST,
      insumoElaboradoId: salsaId,
      cantidadProducida: 20,
      usuarioId: fixtures.usuarioId,
    });
    const tomateTrasProduccion = await stockDe(tomateId); // 50 - 0.5*20 = 40
    const especiasTrasProduccion = await stockDe(especiasId); // 20 - 0.1*20 = 18
    expect(tomateTrasProduccion.toString()).toBe("40");
    expect(especiasTrasProduccion.toString()).toBe("18");
    expect((await stockDe(salsaId)).toString()).toBe("20");

    // Producto de menu cuya receta usa 2 unidades de Salsa BBQ (no de tomate/especias directamente).
    const producto = await prisma.producto.create({
      data: {
        id: "prod-bowl-con-salsa",
        categoriaId: "cat-test",
        nombre: "Chop-Chop Bowl con Salsa BBQ",
        descripcion: "",
        precioBase: 12,
        gravable: true,
        esCombo: false,
        disponible86: true,
        activo: true,
      },
    });
    const recetaProducto = await prisma.receta.create({ data: { id: uuidv7(), productoId: producto.id, activo: true } });
    await prisma.recetaInsumo.create({
      data: { id: uuidv7(), recetaId: recetaProducto.id, insumoId: salsaId, cantidad: 2 },
    });

    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: producto.id, cantidad: 3 });

    const saldo = await ventas.saldoPendiente(pedidoId);
    await ventas.registrarPagoEnPedido(pedidoId, {
      metodo: "efectivo",
      monto: saldo,
      propina: 0,
      estado: "aprobado",
      montoRecibido: saldo,
      cambio: 0,
    });

    const pedidoCobrado = await ventas.obtenerPedidoOrThrow(pedidoId);
    expect(pedidoCobrado.estado).toBe("cobrado");

    // 2 unidades de salsa por unidad de producto * cantidad 3 = 6 consumidas de la SALSA.
    expect((await stockDe(salsaId)).toString()).toBe("14"); // 20 - 6

    // Los insumos BASE de la salsa (tomate/especias) NO se tocan al vender el
    // plato: la venta descuenta el insumo elaborado como CUALQUIER OTRO
    // insumo de la receta del producto, sin bajar transitivamente a sus
    // ingredientes base (ese descuento YA ocurrio, por separado, cuando se
    // PRODUJO la salsa arriba).
    expect((await stockDe(tomateId)).toString()).toBe(tomateTrasProduccion.toString());
    expect((await stockDe(especiasId)).toString()).toBe(especiasTrasProduccion.toString());
  });

  it("(e) definir una receta que formaria un ciclo se rechaza (422) y no persiste nada", async () => {
    // Intenta que la propia Salsa BBQ se use como ingrediente de si misma.
    await expect(
      catalogo.definirRecetaInsumoElaborado(salsaId, {
        items: [{ insumoBaseId: salsaId, cantidad: 1 }],
      }),
    ).rejects.toMatchObject({ codigo: "receta_elaborado_ciclo", status: 422 });

    // La receta original (tomate+especias) sigue intacta, no se sobreescribio.
    const receta = await prisma.receta.findFirstOrThrow({ where: { insumoElaboradoId: salsaId, activo: true } });
    const items = await prisma.recetaInsumo.findMany({ where: { recetaId: receta.id } });
    expect(items).toHaveLength(2);
  });

  it("(f) producir un insumo SIN receta definida (esElaborado=false) es rechazado", async () => {
    const crudo: any = await catalogo.crearInsumo({ nombre: "Sal", unidadMedida: "kg", umbralStockBajo: 1 });
    await expect(
      inventario.producirInsumoElaborado({
        ubicacionId: UBICACION_TEST,
        insumoElaboradoId: crudo.id,
        cantidadProducida: 1,
        usuarioId: fixtures.usuarioId,
      }),
    ).rejects.toMatchObject({ codigo: "insumo_no_elaborado", status: 422 });
  });
});
