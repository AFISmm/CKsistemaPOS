/**
 * Utilidades compartidas de los tests de integracion (requieren PostgreSQL
 * real, ver docker-compose.test.yml y store-server/README.md).
 *
 * Estos tests NO corren contra un mock de Prisma: levantan el AppModule
 * completo (Nest DI real) contra la base de datos apuntada por DATABASE_URL,
 * para validar el comportamiento end-to-end (idempotencia, reversa de stock,
 * emision de eventos) tal como correria en produccion.
 */
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";

export async function crearAppDePrueba(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Borra todas las filas en orden seguro para FKs (hijos antes que padres). */
export async function limpiarBaseDeDatos(prisma: PrismaService): Promise<void> {
  await prisma.syncEstado.deleteMany();
  await prisma.eventoDominio.deleteMany();
  await prisma.eventoDeAuditoria.deleteMany();
  await prisma.lineaModificador.deleteMany();
  await prisma.lineaDePedido.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.recetaInsumo.deleteMany();
  await prisma.receta.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.modificador.deleteMany();
  await prisma.grupoModificador.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.rol.deleteMany();
  await prisma.reglaDeImpuesto.deleteMany();
  await prisma.ubicacion.deleteMany();
}

export const UBICACION_TEST = "ubic-test";

export interface FixturesBasicas {
  productoId: string;
  insumoId: string;
  recetaId: string;
  turnoId: string;
  usuarioId: string;
}

/** Crea el minimo comun necesario para poder crear/enviar/cobrar un Pedido. */
export async function sembrarFixturesBasicas(prisma: PrismaService): Promise<FixturesBasicas> {
  await prisma.ubicacion.create({
    data: {
      id: UBICACION_TEST,
      codigo: "TST-01",
      nombre: "Tienda de pruebas",
      estado: "FL",
      zonaHoraria: "America/New_York",
      direccion: "Test",
      moneda: "USD",
      activo: true,
    },
  });
  await prisma.reglaDeImpuesto.create({
    data: {
      id: "tax-test",
      ubicacionId: UBICACION_TEST,
      jurisdiccion: "TEST",
      nombre: "Test tax",
      tasa: 0.1,
      vigenteDesde: new Date("2020-01-01"),
      vigenteHasta: null,
      aplicaAExentos: false,
    },
  });
  await prisma.rol.create({
    data: { id: "rol-test-gerente", nombre: "gerenteTiendaTest", permisos: ["pago.reembolso", "inventario.ajustar"] },
  });
  const usuario = await prisma.usuario.create({
    data: {
      id: "user-test-gerente",
      ubicacionId: UBICACION_TEST,
      nombre: "Gerente Test",
      pinHash: "$2a$10$abcdefghijklmnopqrstuv", // no se usa login en estos tests
      rolId: "rol-test-gerente",
      activo: true,
    },
  });
  const categoria = await prisma.categoria.create({ data: { id: "cat-test", nombre: "Test", orden: 1, activo: true } });
  const producto = await prisma.producto.create({
    data: {
      id: "prod-test",
      categoriaId: categoria.id,
      nombre: "Producto de prueba",
      descripcion: "",
      precioBase: 10,
      gravable: true,
      esCombo: false,
      disponible86: true,
      activo: true,
    },
  });
  const insumo = await prisma.insumo.create({
    data: { id: "insu-test", nombre: "Insumo de prueba", unidadMedida: "unidad", umbralStockBajo: 5 },
  });
  const receta = await prisma.receta.create({ data: { id: "receta-test", productoId: producto.id, activo: true } });
  await prisma.recetaInsumo.create({
    data: { id: "ri-test", recetaId: receta.id, insumoId: insumo.id, cantidad: 2 },
  });
  await prisma.stock.create({
    data: { id: "stock-test", ubicacionId: UBICACION_TEST, insumoId: insumo.id, cantidadActual: 100 },
  });
  const turno = await prisma.turno.create({
    data: {
      id: "turno-test",
      ubicacionId: UBICACION_TEST,
      usuarioAperturaId: usuario.id,
      fondoInicial: 100,
      estado: "abierto",
      ultimoNumeroOrden: 0,
    },
  });

  return { productoId: producto.id, insumoId: insumo.id, recetaId: receta.id, turnoId: turno.id, usuarioId: usuario.id };
}
