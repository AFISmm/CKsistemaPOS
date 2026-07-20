/**
 * Tests de integracion — gap identificado al cruzar la matriz de
 * requerimientos de Alsea (docs/analisis-reunion-diego-arches-20260717.md
 * §7.2 #1): modificar o eliminar una LineaDePedido que YA fue enviada a
 * cocina debe requerir el permiso `pedido.modificarEnviado` y quedar
 * auditada; editar una linea que TODAVIA no se envio sigue sin requerir
 * permiso (accion rutinaria).
 *
 * Requiere PostgreSQL real (ver docker-compose.test.yml + README.md). Si
 * DATABASE_URL no esta definido, la suite se salta (mismo patron que el
 * resto de test/integration/*).
 */
import type { INestApplication } from "@nestjs/common";
import { VentasService } from "../../src/ventas/ventas.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { uuidv7 } from "../../src/common/util/uuid";
import { crearAppDePrueba, limpiarBaseDeDatos, sembrarFixturesBasicas, UBICACION_TEST, type FixturesBasicas } from "./setup";

const DB_DISPONIBLE = Boolean(process.env.DATABASE_URL);
if (!DB_DISPONIBLE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] DATABASE_URL no definido: se omiten los tests de autorizacion para modificar lineas ya enviadas a cocina. " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)(
  "Autorizacion para modificar/eliminar una linea ya enviada a cocina (gap matriz Alsea)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ventas: VentasService;
    let fixtures: FixturesBasicas;
    const USUARIO_SIN_PERMISO = "user-test-gerente"; // sembrado por sembrarFixturesBasicas, permisos: pago.reembolso/inventario.ajustar (NO incluye pedido.modificarEnviado)
    const USUARIO_CON_PERMISO = "user-test-gerente-autorizado";

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

      await prisma.rol.create({
        data: { id: "rol-test-gerente-autorizado", nombre: "gerenteAutorizadoTest", permisos: ["pedido.modificarEnviado"] },
      });
      await prisma.usuario.create({
        data: {
          id: USUARIO_CON_PERMISO,
          ubicacionId: UBICACION_TEST,
          nombre: "Gerente Autorizado Test",
          pinHash: "$2a$10$abcdefghijklmnopqrstuv",
          rolId: "rol-test-gerente-autorizado",
          activo: true,
        },
      });
    });

    async function crearPedidoConLineaEnviada(): Promise<{ pedidoId: string; lineaId: string }> {
      const pedidoId = uuidv7();
      await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
      const pedido = await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1 });
      const lineaId = pedido.lineas[pedido.lineas.length - 1].id;
      await ventas.enviarACocina(pedidoId);
      return { pedidoId, lineaId };
    }

    it("editar una linea que TODAVIA NO se envio a cocina no requiere usuarioId ni permiso", async () => {
      const pedidoId = uuidv7();
      await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
      const pedido = await ventas.agregarLinea(pedidoId, { productoId: fixtures.productoId, cantidad: 1 });
      const lineaId = pedido.lineas[0].id;

      const actualizado = await ventas.actualizarLinea(pedidoId, lineaId, { cantidad: 3 });
      const linea = actualizado.lineas.find((l) => l.id === lineaId)!;
      expect(linea.cantidad).toBe(3);

      const eventos = await prisma.eventoDeAuditoria.findMany({ where: { tipo: "lineaModificadaTrasEnvio" } });
      expect(eventos).toHaveLength(0);
    });

    it("editar una linea YA enviada a cocina SIN usuarioId responde 401 y NO modifica nada", async () => {
      const { pedidoId, lineaId } = await crearPedidoConLineaEnviada();

      await expect(ventas.actualizarLinea(pedidoId, lineaId, { cantidad: 5 })).rejects.toMatchObject({
        codigo: "autorizacion_requerida",
        status: 401,
      });

      const linea = await prisma.lineaDePedido.findUniqueOrThrow({ where: { id: lineaId } });
      expect(linea.cantidad).toBe(1);
    });

    it("editar una linea YA enviada a cocina con un usuario SIN el permiso responde 403 y NO modifica nada", async () => {
      const { pedidoId, lineaId } = await crearPedidoConLineaEnviada();

      await expect(
        ventas.actualizarLinea(pedidoId, lineaId, { cantidad: 5 }, USUARIO_SIN_PERMISO),
      ).rejects.toMatchObject({
        codigo: "permiso_insuficiente",
        status: 403,
      });

      const linea = await prisma.lineaDePedido.findUniqueOrThrow({ where: { id: lineaId } });
      expect(linea.cantidad).toBe(1);

      const eventos = await prisma.eventoDeAuditoria.findMany({ where: { tipo: "lineaModificadaTrasEnvio" } });
      expect(eventos).toHaveLength(0);
    });

    it("editar una linea YA enviada a cocina con un usuario CON el permiso SI la modifica y queda auditada", async () => {
      const { pedidoId, lineaId } = await crearPedidoConLineaEnviada();

      const actualizado = await ventas.actualizarLinea(pedidoId, lineaId, { cantidad: 5 }, USUARIO_CON_PERMISO);
      const linea = actualizado.lineas.find((l) => l.id === lineaId)!;
      expect(linea.cantidad).toBe(5);

      const eventos = await prisma.eventoDeAuditoria.findMany({ where: { tipo: "lineaModificadaTrasEnvio" } });
      expect(eventos).toHaveLength(1);
      expect(eventos[0].usuarioId).toBe(USUARIO_CON_PERMISO);
      const payload = eventos[0].payload as { cantidad: number; cantidadNueva: number; eliminada: boolean };
      expect(payload.cantidad).toBe(1);
      expect(payload.cantidadNueva).toBe(5);
      expect(payload.eliminada).toBe(false);
    });

    it("eliminar una linea YA enviada a cocina con permiso SI la elimina y audita eliminada=true", async () => {
      const { pedidoId, lineaId } = await crearPedidoConLineaEnviada();

      await ventas.actualizarLinea(pedidoId, lineaId, { eliminar: true }, USUARIO_CON_PERMISO);

      const linea = await prisma.lineaDePedido.findUnique({ where: { id: lineaId } });
      expect(linea).toBeNull();

      const eventos = await prisma.eventoDeAuditoria.findMany({ where: { tipo: "lineaModificadaTrasEnvio" } });
      expect(eventos).toHaveLength(1);
      const payload = eventos[0].payload as { eliminada: boolean };
      expect(payload.eliminada).toBe(true);
    });
  },
);
