/**
 * Test de integracion — F2-T1 "Costeo por combinacion (BOM por variante)"
 * (DUENO menu-inventario-pos). Verifica el envoltorio REAL de
 * CosteoService (src/costeo/costeo.service.ts) contra Postgres: que
 * calcularCostoPedido resuelva receta base + RecetaModificador de un
 * modificador aplicado + costo unitario vigente de Insumo, para una linea
 * realmente vendida (creada via VentasService, igual que en produccion).
 *
 * Requiere PostgreSQL real; si DATABASE_URL no esta definido, se salta (mismo
 * patron que el resto de test/integration/).
 */
import type { INestApplication } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { VentasService } from "../../src/ventas/ventas.service";
import { CosteoService } from "../../src/costeo/costeo.service";
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
    "[integration] DATABASE_URL no definido: se omiten los tests de Costeo (F2-T1). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("CosteoService (F2-T1) — costo real de una linea vendida", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ventas: VentasService;
  let costeo: CosteoService;
  let fixtures: FixturesBasicas;

  beforeAll(async () => {
    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    ventas = app.get(VentasService);
    costeo = app.get(CosteoService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    fixtures = await sembrarFixturesBasicas(prisma);
  });

  it("calcula costo + margen real de un pedido con un modificador 'agregar' con su propio RecetaModificador", async () => {
    // fixtures.productoId (precioBase=10) ya tiene receta: 2 unidades de fixtures.insumoId.
    await prisma.insumo.update({ where: { id: fixtures.insumoId }, data: { costoUnitario: 1.5 } }); // $1.5/unidad

    // Segundo insumo + modificador "agregar" con su propio delta de receta (F2-T1).
    const insumoExtra = await prisma.insumo.create({
      data: { id: "insu-extra", nombre: "Extra insumo", unidadMedida: "unidad", umbralStockBajo: 1, costoUnitario: 3 },
    });
    const grupoModificador = await prisma.grupoModificador.create({
      data: {
        id: "gm-extra",
        productoId: fixtures.productoId,
        nombre: "Extras",
        minSelecciones: 0,
        maxSelecciones: 1,
        obligatorio: false,
      },
    });
    const modificador = await prisma.modificador.create({
      data: {
        id: "mod-extra",
        grupoModificadorId: grupoModificador.id,
        nombre: "Extra insumo",
        precioDelta: 1,
        disponible86: true,
        tipo: "agregar",
      },
    });
    await prisma.recetaModificador.create({
      data: { id: uuidv7(), modificadorId: modificador.id, insumoId: insumoExtra.id, cantidadDelta: 2 },
    });

    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, {
      productoId: fixtures.productoId,
      cantidad: 2,
      modificadorIds: [modificador.id],
    });

    const resultado = await costeo.calcularCostoPedido(pedidoId);
    expect(resultado.lineas).toHaveLength(1);

    // Por unidad: receta base 2 * $1.5 = $3.00 ; modificador +2 * $3 = $6.00 => $9.00/unidad
    // * cantidad 2 = $18.00 total de insumos.
    expect(resultado.lineas[0].costoTotalLinea).toBe("18");
    expect(resultado.costoTotalPedido).toBe("18");

    // Precio de venta de la linea: (precioBase 10 + delta modificador 1) * 2 = 22; subtotal pedido = 22.
    expect(resultado.precioVentaTotal).toBe("22");
    expect(resultado.margenTotal).toBe("4"); // 22 - 18

    // El desglose es auditable por insumo, no un numero opaco.
    const insumoIds = resultado.lineas[0].desglose.map((d: { insumoId: string }) => d.insumoId).sort();
    expect(insumoIds).toEqual([fixtures.insumoId, insumoExtra.id].sort());
  });

  it("un producto sin receta activa costea 0 (no rompe, igual criterio que InventarioService)", async () => {
    const producto = await prisma.producto.create({
      data: {
        id: "prod-sin-receta",
        categoriaId: "cat-test",
        nombre: "Sin receta",
        descripcion: "",
        precioBase: 5,
        gravable: true,
        esCombo: false,
        disponible86: true,
        activo: true,
      },
    });

    const pedidoId = uuidv7();
    await ventas.crearPedido({ id: pedidoId, ubicacionId: UBICACION_TEST }, UBICACION_TEST);
    await ventas.agregarLinea(pedidoId, { productoId: producto.id, cantidad: 1 });

    const resultado = await costeo.calcularCostoPedido(pedidoId);
    expect(resultado.lineas[0].costoTotalLinea).toBe("0");
    expect(new Decimal(resultado.margenTotal).toString()).toBe(resultado.precioVentaTotal);
  });
});
