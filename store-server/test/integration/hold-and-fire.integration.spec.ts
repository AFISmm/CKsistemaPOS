/**
 * Tests de integracion — F2-T2 "Hold & fire (retener/marchar)"
 * (PLAN_DE_PRODUCCION.md Fase 2, DUENO menu-inventario-pos + kds-cocina-pos):
 *   (a) enviar un pedido con una linea retenida + una no retenida solo
 *       dispara TicketEnviadoACocina para la NO retenida.
 *   (b) liberar la linea retenida mas tarde dispara un SEGUNDO
 *       TicketEnviadoACocina que contiene UNICAMENTE esa linea (no duplica ni
 *       re-envia la primera).
 *   (c) liberar una linea ya liberada/enviada es un no-op 409, no un tercer
 *       evento duplicado.
 *   (d) /liberar-retenidas libera TODAS las retenidas pendientes en un solo
 *       evento, y llamarlo de nuevo sin pendientes es un no-op sin evento.
 *
 * Requiere PostgreSQL real (ver docker-compose.test.yml + README.md). Si
 * DATABASE_URL no esta definido, la suite se salta (mismo patron que
 * test/integration/pedidos.integration.spec.ts).
 */
import type { INestApplication } from "@nestjs/common";
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
    "[integration] DATABASE_URL no definido: se omiten los tests de Hold & fire (F2-T2). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("Hold & fire (F2-T2) — retener/liberar lineas a cocina", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ventas: VentasService;
  let fixtures: FixturesBasicas;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    ventas = app.get(VentasService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);
  });

  async function crearPedidoConDosLineas(): Promise<{ pedidoId: string; lineaNormalId: string; lineaRetenidaId: string }> {
    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);

    const pedidoConNormal = await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1 });
    const lineaNormalId = pedidoConNormal.lineas[pedidoConNormal.lineas.length - 1].id;

    const pedidoConRetenida = await ventas.agregarLinea(pedidoId, {
      productoId: fixtures.productoId,
      cantidad: 1,
      retenida: true,
    });
    const lineaRetenidaId = pedidoConRetenida.lineas.find((l) => l.id !== lineaNormalId)!.id;

    return { pedidoId, lineaNormalId, lineaRetenidaId };
  }

  it("(a) enviar-cocina con una linea retenida + una no retenida solo dispara TicketEnviadoACocina para la no retenida", async () => {
    const { pedidoId, lineaNormalId, lineaRetenidaId } = await crearPedidoConDosLineas();

    const pedidoEnviado = await ventas.enviarACocina(pedidoId);
    expect(pedidoEnviado.estado).toBe("enviadoCocina");

    const eventos = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
    });
    expect(eventos).toHaveLength(1);
    const payload = eventos[0].payload as { lineas: Array<{ lineaDePedidoId: string }> };
    expect(payload.lineas).toHaveLength(1);
    expect(payload.lineas[0].lineaDePedidoId).toBe(lineaNormalId);
    expect(payload.lineas.some((l) => l.lineaDePedidoId === lineaRetenidaId)).toBe(false);

    const lineaNormal = await prisma.lineaDePedido.findUniqueOrThrow({ where: { id: lineaNormalId } });
    expect(lineaNormal.enviadaACocinaEn).not.toBeNull();

    const lineaRetenida = await prisma.lineaDePedido.findUniqueOrThrow({ where: { id: lineaRetenidaId } });
    expect(lineaRetenida.enviadaACocinaEn).toBeNull();
    expect(lineaRetenida.retenida).toBe(true);
  });

  it("(b) liberar la linea retenida despues dispara un SEGUNDO TicketEnviadoACocina con SOLO esa linea (no duplica el primero)", async () => {
    const { pedidoId, lineaNormalId, lineaRetenidaId } = await crearPedidoConDosLineas();
    await ventas.enviarACocina(pedidoId);

    const pedidoLiberado = await ventas.liberarLinea(pedidoId, lineaRetenidaId);
    expect(pedidoLiberado.id).toBe(pedidoId);

    const eventos = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
      orderBy: { ocurridoEn: "asc" },
    });
    expect(eventos).toHaveLength(2); // el inicial + esta liberacion, nunca mas

    const payloadInicial = eventos[0].payload as { lineas: Array<{ lineaDePedidoId: string }> };
    expect(payloadInicial.lineas).toHaveLength(1);
    expect(payloadInicial.lineas[0].lineaDePedidoId).toBe(lineaNormalId);

    const payloadLiberacion = eventos[1].payload as {
      liberacionParcial: boolean;
      lineas: Array<{ lineaDePedidoId: string }>;
    };
    expect(payloadLiberacion.liberacionParcial).toBe(true);
    expect(payloadLiberacion.lineas).toHaveLength(1);
    expect(payloadLiberacion.lineas[0].lineaDePedidoId).toBe(lineaRetenidaId);

    const lineaRetenida = await prisma.lineaDePedido.findUniqueOrThrow({ where: { id: lineaRetenidaId } });
    expect(lineaRetenida.retenida).toBe(false);
    expect(lineaRetenida.enviadaACocinaEn).not.toBeNull();
    expect(lineaRetenida.liberadaACocinaEn).not.toBeNull();
  });

  it("(c) liberar una linea ya liberada es 409 (no-op), NO crea un tercer evento", async () => {
    const { pedidoId, lineaRetenidaId } = await crearPedidoConDosLineas();
    await ventas.enviarACocina(pedidoId);
    await ventas.liberarLinea(pedidoId, lineaRetenidaId);

    await expect(ventas.liberarLinea(pedidoId, lineaRetenidaId)).rejects.toMatchObject({
      codigo: "linea_ya_enviada_cocina",
      status: 409,
    });

    const eventos = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
    });
    expect(eventos).toHaveLength(2); // sigue siendo inicial + 1 liberacion, el intento repetido NO agrego un tercero
  });

  it("(d) /liberar-retenidas libera TODAS las pendientes en un solo evento; repetirlo sin pendientes es no-op sin evento nuevo", async () => {
    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1 });
    const conRetenida1 = await ventas.agregarLinea(pedidoId, {
      productoId: fixtures.productoId,
      cantidad: 1,
      retenida: true,
    });
    const conRetenida2 = await ventas.agregarLinea(pedidoId, {
      productoId: fixtures.productoId,
      cantidad: 1,
      retenida: true,
    });
    const idsRetenidas = conRetenida2.lineas.filter((l) => l.retenida).map((l) => l.id);
    expect(idsRetenidas).toHaveLength(2);
    void conRetenida1;

    await ventas.enviarACocina(pedidoId);
    const eventosTrasEnvioInicial = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
    });
    expect(eventosTrasEnvioInicial).toHaveLength(1);

    await ventas.liberarLineasRetenidas(pedidoId);
    const eventosTrasLiberarTodas = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
      orderBy: { ocurridoEn: "asc" },
    });
    expect(eventosTrasLiberarTodas).toHaveLength(2);
    const payloadBulk = eventosTrasLiberarTodas[1].payload as { lineas: Array<{ lineaDePedidoId: string }> };
    expect(payloadBulk.lineas.map((l) => l.lineaDePedidoId).sort()).toEqual([...idsRetenidas].sort());

    // Repetir sin pendientes: no-op, ningun evento nuevo.
    await ventas.liberarLineasRetenidas(pedidoId);
    const eventosFinal = await prisma.eventoDominio.findMany({
      where: { tipo: "TicketEnviadoACocina", agregadoId: pedidoId },
    });
    expect(eventosFinal).toHaveLength(2);
  });

  it("retener una linea que ya fue enviada a cocina es 409 (no se puede retener retroactivamente)", async () => {
    const { pedidoId, lineaNormalId } = await crearPedidoConDosLineas();
    await ventas.enviarACocina(pedidoId);

    await expect(ventas.retenerLinea(pedidoId, lineaNormalId)).rejects.toMatchObject({
      codigo: "linea_ya_enviada_cocina",
      status: 409,
    });
  });

  it("enviar-cocina con TODAS las lineas retenidas falla 422 (nada para enviar)", async () => {
    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1, retenida: true });

    await expect(ventas.enviarACocina(pedidoId)).rejects.toMatchObject({
      codigo: "nada_para_enviar_cocina",
      status: 422,
    });
  });
});
