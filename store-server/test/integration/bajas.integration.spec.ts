/**
 * Test de integracion — F3-T1 "Bajas con aprobacion de calidad" (DUENO
 * menu-inventario-pos + seguridad-accesos-pos). Verifica el envoltorio REAL
 * de BajasService contra Postgres, cubriendo el requisito NUCLEO de la tarea:
 * "la baja no impacta stock hasta ser aprobada".
 *
 * Requiere PostgreSQL real; si DATABASE_URL no esta definido, se salta (mismo
 * patron que el resto de test/integration/, ver setup.ts).
 */
import type { INestApplication } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { BajasService } from "../../src/bajas/bajas.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
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
    "[integration] DATABASE_URL no definido: se omiten los tests de Bajas (F3-T1). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("BajasService (F3-T1) — bajas con aprobacion de calidad", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bajas: BajasService;
  let fixtures: FixturesBasicas;
  let usuarioCajeroId: string;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    bajas = app.get(BajasService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function stockActual(): Promise<Decimal> {
    const stock = await prisma.stock.findUnique({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId } },
    });
    return new Decimal(stock?.cantidadActual ?? 0);
  }

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);
    // costoUnitario=2 para poder valorizar la merma en dolares (S-13).
    await prisma.insumo.update({ where: { id: fixtures.insumoId }, data: { costoUnitario: 2 } });

    // Usuario "cajero" con SOLO el permiso de solicitar (no de aprobar), para
    // reflejar el reparto de permisos real del seed (rol-cajero/rol-cocina
    // solicitan, rol-gerente aprueba/rechaza).
    const rolCajero = await prisma.rol.create({
      data: { id: "rol-test-cajero-baja", nombre: "cajeroTestBaja", permisos: ["inventario.solicitarBaja"] },
    });
    const usuarioCajero = await prisma.usuario.create({
      data: {
        id: "user-test-cajero-baja",
        ubicacionId: UBICACION_TEST,
        nombre: "Cajero Test Baja",
        pinHash: "$2a$10$abcdefghijklmnopqrstuv",
        rolId: rolCajero.id,
        activo: true,
      },
    });
    usuarioCajeroId = usuarioCajero.id;

    // El gerente de sembrarFixturesBasicas (fixtures.usuarioId) recibe el
    // permiso de aprobar/rechazar bajas, sumandolo a los que ya tenia.
    await prisma.rol.update({
      where: { id: "rol-test-gerente" },
      data: { permisos: ["pago.reembolso", "inventario.ajustar", "inventario.aprobarBaja"] },
    });
  });

  it("(a) solicitar NUNCA mueve stock; aprobar SI lo mueve (unica vez que cambia cantidadActual)", async () => {
    expect((await stockActual()).toString()).toBe("100");

    const solicitud: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 10, motivo: "caducado", etiqueta: "lote-1" },
      usuarioCajeroId,
    );
    expect(solicitud.estado).toBe("pendiente");

    // Justo despues de SOLICITAR (antes de cualquier aprobacion): stock intacto.
    expect((await stockActual()).toString()).toBe("100");

    const aprobada: any = await bajas.aprobarBaja(solicitud.id, fixtures.usuarioId);
    expect(aprobada.estado).toBe("aprobada");
    expect(aprobada.revisadoPorId).toBe(fixtures.usuarioId);
    expect(new Decimal(aprobada.valorEstimado).toString()).toBe("20"); // 10 * costoUnitario(2)

    // Solo DESPUES de aprobar cambia el stock (100 - 10 = 90).
    expect((await stockActual()).toString()).toBe("90");

    const eventosAjuste = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "ajusteInventario", agregadoTipo: "Stock" },
    });
    expect(eventosAjuste.length).toBeGreaterThan(0);
    const payloadAjuste = eventosAjuste[eventosAjuste.length - 1].payload as Record<string, unknown>;
    expect(payloadAjuste.tipoMovimiento).toBe("merma");
  });

  it("(b) rechazar NUNCA mueve stock, y queda auditado con tipo 'bajaRechazada'", async () => {
    const solicitud: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 10, motivo: "danado" },
      usuarioCajeroId,
    );

    const rechazada: any = await bajas.rechazarBaja(solicitud.id, fixtures.usuarioId, "conteo duplicado");
    expect(rechazada.estado).toBe("rechazada");
    expect(rechazada.motivoRechazo).toBe("conteo duplicado");
    expect(rechazada.valorEstimado).toBeNull();

    expect((await stockActual()).toString()).toBe("100");

    const eventosRechazo = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "bajaRechazada", agregadoId: solicitud.id },
    });
    expect(eventosRechazo).toHaveLength(1);
  });

  it("(c) aprobar/rechazar una solicitud YA decidida responde 409 (no un no-op silencioso) y no vuelve a mover stock", async () => {
    const solicitud: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 10, motivo: "errorConteo" },
      usuarioCajeroId,
    );
    await bajas.aprobarBaja(solicitud.id, fixtures.usuarioId);
    expect((await stockActual()).toString()).toBe("90");

    await expect(bajas.aprobarBaja(solicitud.id, fixtures.usuarioId)).rejects.toMatchObject({
      codigo: "solicitud_baja_ya_revisada",
      status: 409,
    });
    await expect(bajas.rechazarBaja(solicitud.id, fixtures.usuarioId)).rejects.toMatchObject({
      codigo: "solicitud_baja_ya_revisada",
      status: 409,
    });
    // El stock no se movio una segunda vez.
    expect((await stockActual()).toString()).toBe("90");
  });

  it("(d) merma que supera el umbral configurable de la Ubicacion dispara EventoDeAuditoria 'alertaMerma' SEPARADO del 'ajusteInventario'", async () => {
    // Stock=100, costoUnitario=2 => valor base = 200. Una baja de 10 unidades
    // vale 20 => 10% > umbral default de 3% (Ubicacion.umbralMermaPorcentaje).
    const solicitud: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 10, motivo: "caducado" },
      usuarioCajeroId,
    );
    await bajas.aprobarBaja(solicitud.id, fixtures.usuarioId);

    const alertas = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "alertaMerma", agregadoId: solicitud.id },
    });
    expect(alertas).toHaveLength(1);
    const payloadAlerta = alertas[0].payload as Record<string, unknown>;
    expect(Number(payloadAlerta.porcentajeMermaAcumulada)).toBeGreaterThan(3);

    // Sigue existiendo el ajusteInventario normal, aparte de la alerta.
    const ajustes = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "ajusteInventario" },
    });
    expect(ajustes.length).toBeGreaterThan(0);
  });

  it("(e) merma pequena por debajo del umbral configurado NO dispara 'alertaMerma'", async () => {
    // Subimos el umbral configurado de la Ubicacion a 50% para simular una
    // baja chica que se queda comodamente por debajo.
    await prisma.ubicacion.update({ where: { id: UBICACION_TEST }, data: { umbralMermaPorcentaje: 50 } });

    const solicitud: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 1, motivo: "otro" },
      usuarioCajeroId,
    );
    await bajas.aprobarBaja(solicitud.id, fixtures.usuarioId);

    const alertas = await prisma.eventoDeAuditoria.findMany({
      where: { ubicacionId: UBICACION_TEST, tipo: "alertaMerma", agregadoId: solicitud.id },
    });
    expect(alertas).toHaveLength(0);
  });

  it("(f) listarSolicitudes filtra por estado y ubicacionId (cola de aprobacion del gerente)", async () => {
    const pendiente: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 1, motivo: "otro" },
      usuarioCajeroId,
    );
    const aAprobar: any = await bajas.solicitarBaja(
      { ubicacionId: UBICACION_TEST, insumoId: fixtures.insumoId, cantidad: 1, motivo: "otro" },
      usuarioCajeroId,
    );
    await bajas.aprobarBaja(aAprobar.id, fixtures.usuarioId);

    const pendientes = await bajas.listarSolicitudes({ estado: "pendiente", ubicacionId: UBICACION_TEST });
    expect((pendientes as any[]).map((s) => s.id)).toEqual([pendiente.id]);

    const aprobadas = await bajas.listarSolicitudes({ estado: "aprobada", ubicacionId: UBICACION_TEST });
    expect((aprobadas as any[]).map((s) => s.id)).toEqual([aAprobar.id]);
  });
});
