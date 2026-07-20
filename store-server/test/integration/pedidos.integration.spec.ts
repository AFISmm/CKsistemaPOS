/**
 * Tests de integracion — gate de pruebas Fase 1 (PLAN_DE_PRODUCCION.md §5):
 *   (a) reintento idempotente de POST /pedidos NO duplica el pedido.
 *   (b) un reembolso revierte el stock via VentaRevertida (fix de la deuda
 *       tecnica de la demo: "el reembolso no invoca la reversa de stock").
 *   (c) enviarACocina emite TicketEnviadoACocina y queda en EventoDominio.
 *
 * Requieren PostgreSQL real (ver docker-compose.test.yml + README.md). Si
 * DATABASE_URL no esta definido, la suite se salta (no rompe `npm test`,
 * que solo corre los unit tests puros).
 */
import type { INestApplication } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { VentasService } from "../../src/ventas/ventas.service";
import { InventarioService } from "../../src/inventario/inventario.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { uuidv7 } from "../../src/common/util/uuid";
import { ErrorDominio } from "../../src/common/errores/error-dominio";
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
    "[integration] DATABASE_URL no definido: se omiten los tests de integracion. " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("Ventas/Inventario — gate de pruebas Fase 1", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ventas: VentasService;
  let inventario: InventarioService;
  let fixtures: FixturesBasicas;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    ventas = app.get(VentasService);
    inventario = app.get(InventarioService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);
  });

  it("(a) un reintento idempotente de crearPedido con el mismo id NO duplica el pedido", async () => {
    const id = uuidv7();

    const primero = await ventas.crearPedido({ id, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    expect(primero.id).toBe(id);

    await expect(ventas.crearPedido({ id, ubicacionId: UBICACION_TEST }, UBICACION_TEST)).rejects.toMatchObject({
      codigo: "pedido_ya_existe",
      status: 409,
    });

    const pedidos = await prisma.pedido.findMany({ where: { id } });
    expect(pedidos).toHaveLength(1);
  });

  it("(b) reembolsar un pedido cobrado revierte el stock (VentaRevertida)", async () => {
    const stockAntes = await prisma.stock.findUniqueOrThrow({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId } },
    });
    expect(new Decimal(stockAntes.cantidadActual).toString()).toBe("100");

    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 3 });

    // subtotal = 30, tasa test = 0.10 => impuesto 3, saldo = 33
    const saldo = await ventas.saldoPendiente(pedidoId);
    expect(saldo.toString()).toBe("33");

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

    // Receta: 2 unidades de insumo por unidad de producto * cantidad 3 = 6 descontadas.
    const stockTrasVenta = await prisma.stock.findUniqueOrThrow({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId } },
    });
    expect(new Decimal(stockTrasVenta.cantidadActual).toString()).toBe("94");

    await ventas.reembolsarPedido(pedidoId, fixtures.usuarioId, "Cliente insatisfecho (test)");

    const pedidoReembolsado = await ventas.obtenerPedidoOrThrow(pedidoId);
    expect(pedidoReembolsado.estado).toBe("cancelado");

    // FIX de la deuda tecnica: el stock debe volver a 100 (reversa completa).
    const stockTrasReembolso = await prisma.stock.findUniqueOrThrow({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId } },
    });
    expect(new Decimal(stockTrasReembolso.cantidadActual).toString()).toBe("100");

    const eventoVentaRevertida = await prisma.eventoDominio.findFirst({
      where: { tipo: "VentaRevertida", agregadoId: pedidoId },
    });
    expect(eventoVentaRevertida).not.toBeNull();
  });

  it("(c) enviarACocina emite TicketEnviadoACocina y queda registrado en EventoDominio", async () => {
    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1 });

    const pedidoEnviado = await ventas.enviarACocina(pedidoId);
    expect(pedidoEnviado.estado).toBe("enviadoCocina");
    expect(pedidoEnviado.enviadoACocinaEn).not.toBeNull();

    const evento = await prisma.eventoDominio.findFirst({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
    });
    expect(evento).not.toBeNull();
    expect(evento?.ubicacionId).toBe(UBICACION_TEST);
    expect(evento?.sincronizadoEn).toBeNull(); // pendiente de outbox (F1-T5)
  });

  it("insumosBajoUmbral no reporta el insumo de prueba mientras este por encima del umbral", async () => {
    const bajos = await inventario.insumosBajoUmbral(UBICACION_TEST);
    expect(bajos.find((b) => b.insumoId === fixtures.insumoId)).toBeUndefined();
  });
});
