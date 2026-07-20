/**
 * Semilla de datos DEMO del Store Server (Fase 1). Ejecutar con
 * `npm run prisma:seed` (o automaticamente tras `prisma migrate reset`).
 *
 * Portado (no copiado 1:1, subconjunto representativo) desde lib/data/catalog.ts
 * de la demo Next.js: mismas categorias/nombres de Chicken Kitchen, precios y
 * recetas DEMO razonables. Permite ejercitar TODOS los modulos (catalogo,
 * inventario con un insumo a proposito bajo su umbral, ventas con turno
 * abierto, seguridad con usuarios+roles reales con PIN hasheado).
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { uuidv7 } from "../src/common/util/uuid";

const prisma = new PrismaClient();

const UBICACION_PILOTO_ID = "ubic-miami-fl";
const UBICACION_AUSTIN_ID = "ubic-austin-tx";

async function main(): Promise<void> {
  // ---------- Ubicaciones + Reglas de impuesto (FL/TX, S-06/S-08 DEMO) ----------
  await prisma.ubicacion.upsert({
    where: { id: UBICACION_PILOTO_ID },
    update: {},
    create: {
      id: UBICACION_PILOTO_ID,
      codigo: "MIA-72",
      nombre: "Chicken Kitchen — Miami (SW 72nd St)",
      estado: "FL",
      zonaHoraria: "America/New_York",
      direccion: "15738 SW 72nd Street, Miami, FL",
      moneda: "USD",
      activo: true,
    },
  });
  await prisma.ubicacion.upsert({
    where: { id: UBICACION_AUSTIN_ID },
    update: {},
    create: {
      id: UBICACION_AUSTIN_ID,
      codigo: "AUS-01",
      nombre: "Chicken Kitchen — Austin (demo)",
      estado: "TX",
      zonaHoraria: "America/Chicago",
      direccion: "Demo location, Austin, TX",
      moneda: "USD",
      activo: true,
    },
  });

  await prisma.reglaDeImpuesto.upsert({
    where: { id: "tax-fl-miamidade" },
    update: {},
    create: {
      id: "tax-fl-miamidade",
      ubicacionId: UBICACION_PILOTO_ID,
      jurisdiccion: "FL / Miami-Dade",
      nombre: "Sales Tax FL (demo)",
      tasa: 0.07,
      vigenteDesde: new Date("2026-01-01"),
      vigenteHasta: null,
      aplicaAExentos: false,
    },
  });
  await prisma.reglaDeImpuesto.upsert({
    where: { id: "tax-tx-austin" },
    update: {},
    create: {
      id: "tax-tx-austin",
      ubicacionId: UBICACION_AUSTIN_ID,
      jurisdiccion: "TX",
      nombre: "Sales Tax TX (demo)",
      tasa: 0.0825,
      vigenteDesde: new Date("2026-01-01"),
      vigenteHasta: null,
      aplicaAExentos: false,
    },
  });

  // ---------- Roles (RBAC MVP, RNF-08) ----------
  const PERMISOS_GERENCIALES = [
    "pedido.crear",
    "pedido.cobrar",
    "pedido.descuento.autorizar",
    "pago.reembolso",
    "inventario.ajustar",
    "turno.abrir",
    "turno.cierreZ",
    "producto.marcar86",
    "catalogo.gestionar",
    "cajon.abrir",
    "reporte.ver", // F2-T3: reporte del dia (HU-REP-01)
    "costeo.ver", // F2-T1: costo/margen real de un pedido (BOM por variante)
    "inventario.solicitarBaja", // F3-T1: el gerente tambien puede solicitar (no solo aprobar)
    "inventario.aprobarBaja", // F3-T1: aprobar/rechazar bajas es exclusivo del gerente
    "pedido.modificarEnviado", // gap matriz Alsea: modificar/eliminar una linea ya enviada a cocina
  ];
  await prisma.rol.upsert({
    where: { id: "rol-cajero" },
    update: {},
    create: {
      id: "rol-cajero",
      nombre: "cajero",
      // F3-T1: el cajero detecta producto vencido/danado en el mostrador y
      // puede SOLICITAR una baja, pero no aprobarla (eso mueve stock de verdad).
      permisos: ["pedido.crear", "pedido.cobrar", "producto.marcar86", "turno.abrir", "inventario.solicitarBaja"],
    },
  });
  await prisma.rol.upsert({
    where: { id: "rol-cocina" },
    update: {},
    // F3-T1: cocina tambien detecta merma en la linea (producto que se cayo,
    // se quemo, etc.) y puede solicitar la baja igual que el cajero.
    create: { id: "rol-cocina", nombre: "cocina", permisos: ["cocina.actualizarEstado", "inventario.solicitarBaja"] },
  });
  await prisma.rol.upsert({
    where: { id: "rol-gerente" },
    update: {},
    create: { id: "rol-gerente", nombre: "gerenteTienda", permisos: PERMISOS_GERENCIALES },
  });

  // ---------- Usuarios DEMO (PIN hasheado con bcrypt, S-10) ----------
  const pinCajero = await bcrypt.hash("1234", 10);
  const pinGerente = await bcrypt.hash("9999", 10);
  await prisma.usuario.upsert({
    where: { id: "user-cajero-demo" },
    update: {},
    create: {
      id: "user-cajero-demo",
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Cajero Demo",
      pinHash: pinCajero,
      rolId: "rol-cajero",
      activo: true,
    },
  });
  await prisma.usuario.upsert({
    where: { id: "user-gerente-demo" },
    update: {},
    create: {
      id: "user-gerente-demo",
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Gerente Demo",
      pinHash: pinGerente,
      rolId: "rol-gerente",
      activo: true,
    },
  });

  // ---------- Catalogo (subconjunto representativo del real, ver lib/data/catalog.ts) ----------
  const categorias = [
    { id: "cat-bowls", nombre: "CHOP-CHOP® BOWLS", orden: 1 },
    { id: "cat-wrapito", nombre: "WRAPITO®", orden: 2 },
    { id: "cat-cheesadilla", nombre: "CHEESADILLA®", orden: 3 },
    { id: "cat-sides", nombre: "SIDE ORDERS", orden: 4 },
    { id: "cat-drinks", nombre: "DRINKS", orden: 5 },
  ];
  for (const c of categorias) {
    await prisma.categoria.upsert({ where: { id: c.id }, update: {}, create: { ...c, activo: true } });
  }

  const productos = [
    { id: "prod-bowl-build", categoriaId: "cat-bowls", nombre: "Build Your Own Bowl", precioBase: 9.95, gravable: true, esCombo: false },
    { id: "prod-bowl-classic", categoriaId: "cat-bowls", nombre: "Classic Chop-Chop Bowl", precioBase: 10.95, gravable: true, esCombo: false },
    { id: "prod-wrap-build", categoriaId: "cat-wrapito", nombre: "Build Your Own Wrapito", precioBase: 8.95, gravable: true, esCombo: false },
    { id: "prod-cheesadilla-chicken", categoriaId: "cat-cheesadilla", nombre: "Chicken Cheesadilla", precioBase: 8.95, gravable: true, esCombo: false },
    { id: "prod-cheesadilla-combo", categoriaId: "cat-cheesadilla", nombre: "Chicken Cheesadilla Combo", precioBase: 10.95, gravable: true, esCombo: true },
    { id: "prod-side-corn-mix", categoriaId: "cat-sides", nombre: "Corn Mix", precioBase: 3.5, gravable: true, esCombo: false },
    { id: "prod-side-guacamole", categoriaId: "cat-sides", nombre: "Guacamole", precioBase: 4.5, gravable: true, esCombo: false },
    { id: "prod-drink-soft-regular", categoriaId: "cat-drinks", nombre: "Soft Drink (Regular)", precioBase: 2.5, gravable: false, esCombo: false },
  ];
  for (const p of productos) {
    await prisma.producto.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, descripcion: "", disponible86: true, activo: true },
    });
  }

  // Combo: Cheesadilla Combo + 1 side obligatorio (Corn Mix o Guacamole).
  await prisma.combo.upsert({
    where: { productoId: "prod-cheesadilla-combo" },
    update: {},
    create: {
      id: "combo-cheesadilla",
      productoId: "prod-cheesadilla-combo",
      componentes: [
        {
          grupoSeleccion: "Choose a Side",
          obligatorio: true,
          opciones: ["prod-side-corn-mix", "prod-side-guacamole"],
        },
      ],
    },
  });

  // Grupo de modificador: Signature Sauces (opcional) en el bowl armable.
  await prisma.grupoModificador.upsert({
    where: { id: "gm-salsas-bowl-build" },
    update: {},
    create: {
      id: "gm-salsas-bowl-build",
      productoId: "prod-bowl-build",
      nombre: "Signature Sauces",
      minSelecciones: 0,
      maxSelecciones: 3,
      obligatorio: false,
    },
  });
  const salsas = ["Chipotle Lime", "BBQ", "Fresh Salsa", "Caesar"];
  for (const [idx, nombre] of salsas.entries()) {
    await prisma.modificador.upsert({
      where: { id: `mod-salsa-${idx}` },
      update: {},
      create: {
        id: `mod-salsa-${idx}`,
        grupoModificadorId: "gm-salsas-bowl-build",
        nombre,
        precioDelta: 0,
        disponible86: true,
        tipo: "agregar",
      },
    });
  }
  await prisma.grupoModificador.upsert({
    where: { id: "gm-guac-bowl-build" },
    update: {},
    create: {
      id: "gm-guac-bowl-build",
      productoId: "prod-bowl-build",
      nombre: "Add Guacamole",
      minSelecciones: 0,
      maxSelecciones: 1,
      obligatorio: false,
    },
  });
  await prisma.modificador.upsert({
    where: { id: "mod-guac-bowl-build" },
    update: {},
    create: {
      id: "mod-guac-bowl-build",
      grupoModificadorId: "gm-guac-bowl-build",
      nombre: "Add Guacamole",
      precioDelta: 1.5,
      disponible86: true,
      tipo: "agregar",
    },
  });

  // F2-T1 (BOM por variante) DEMO: "Sin Queso" en el Chicken Cheesadilla —
  // precio fijo (no se cobra distinto), pero el costo real de insumos baja
  // (ver RecetaModificador mas abajo, una vez existan los Insumo referenciados).
  await prisma.grupoModificador.upsert({
    where: { id: "gm-queso-cheesadilla" },
    update: {},
    create: {
      id: "gm-queso-cheesadilla",
      productoId: "prod-cheesadilla-chicken",
      nombre: "Cheese Options",
      minSelecciones: 0,
      maxSelecciones: 1,
      obligatorio: false,
    },
  });
  await prisma.modificador.upsert({
    where: { id: "mod-sin-queso-cheesadilla" },
    update: {},
    create: {
      id: "mod-sin-queso-cheesadilla",
      grupoModificadorId: "gm-queso-cheesadilla",
      nombre: "Sin Queso",
      precioDelta: 0,
      disponible86: true,
      tipo: "sin",
    },
  });

  // ---------- Insumos + recetas ----------
  // costoUnitario (F2-T1, BOM por variante) es DEMO/orientativo (mismo criterio
  // que precios/recetas del resto de la semilla) — precioBase de Producto NO
  // cambia por esto, es puramente para poder ejercitar CosteoService.
  const insumos = [
    { id: "insu-chicken", nombre: "Grilled Chicken Breast", unidadMedida: "lb", umbralStockBajo: 5, costoUnitario: 4.5 },
    { id: "insu-rice", nombre: "Rice", unidadMedida: "lb", umbralStockBajo: 5, costoUnitario: 0.8 },
    { id: "insu-lettuce", nombre: "Lettuce", unidadMedida: "lb", umbralStockBajo: 3, costoUnitario: 1.2 },
    { id: "insu-blackbeans", nombre: "Black Beans", unidadMedida: "lb", umbralStockBajo: 3, costoUnitario: 1.0 },
    { id: "insu-tortilla", nombre: "Tortilla", unidadMedida: "unidad", umbralStockBajo: 10, costoUnitario: 0.35 },
    { id: "insu-cheese", nombre: "Cheese", unidadMedida: "lb", umbralStockBajo: 3, costoUnitario: 3.2 },
    { id: "insu-corn", nombre: "Corn", unidadMedida: "lb", umbralStockBajo: 3, costoUnitario: 0.9 },
    { id: "insu-guacamole", nombre: "Guacamole", unidadMedida: "lb", umbralStockBajo: 2, costoUnitario: 3.8 },
    { id: "insu-sodasyrup", nombre: "Soda Syrup", unidadMedida: "liter", umbralStockBajo: 2, costoUnitario: 1.5 },
    { id: "insu-cup", nombre: "Cup", unidadMedida: "unidad", umbralStockBajo: 20, costoUnitario: 0.1 },
  ];
  for (const i of insumos) {
    await prisma.insumo.upsert({ where: { id: i.id }, update: {}, create: i });
  }

  const recetas: Record<string, Array<{ insumoId: string; cantidad: number }>> = {
    "prod-bowl-build": [
      { insumoId: "insu-chicken", cantidad: 0.35 },
      { insumoId: "insu-rice", cantidad: 0.4 },
      { insumoId: "insu-lettuce", cantidad: 0.15 },
      { insumoId: "insu-blackbeans", cantidad: 0.2 },
    ],
    "prod-bowl-classic": [
      { insumoId: "insu-chicken", cantidad: 0.35 },
      { insumoId: "insu-rice", cantidad: 0.4 },
      { insumoId: "insu-corn", cantidad: 0.15 },
    ],
    "prod-wrap-build": [
      { insumoId: "insu-chicken", cantidad: 0.3 },
      { insumoId: "insu-tortilla", cantidad: 1 },
      { insumoId: "insu-lettuce", cantidad: 0.15 },
    ],
    "prod-cheesadilla-chicken": [
      { insumoId: "insu-chicken", cantidad: 0.3 },
      { insumoId: "insu-tortilla", cantidad: 1 },
      { insumoId: "insu-cheese", cantidad: 0.2 },
    ],
    "prod-cheesadilla-combo": [
      { insumoId: "insu-chicken", cantidad: 0.3 },
      { insumoId: "insu-tortilla", cantidad: 1 },
      { insumoId: "insu-cheese", cantidad: 0.2 },
    ],
    "prod-side-corn-mix": [{ insumoId: "insu-corn", cantidad: 0.25 }],
    "prod-side-guacamole": [{ insumoId: "insu-guacamole", cantidad: 0.2 }],
    "prod-drink-soft-regular": [
      { insumoId: "insu-sodasyrup", cantidad: 0.15 },
      { insumoId: "insu-cup", cantidad: 1 },
    ],
  };

  for (const [productoId, items] of Object.entries(recetas)) {
    const recetaId = `receta-${productoId}`;
    await prisma.receta.upsert({
      where: { id: recetaId },
      update: {},
      create: { id: recetaId, productoId, activo: true },
    });
    for (const item of items) {
      const riId = `ri-${productoId}-${item.insumoId}`;
      await prisma.recetaInsumo.upsert({
        where: { id: riId },
        update: {},
        create: { id: riId, recetaId, insumoId: item.insumoId, cantidad: item.cantidad },
      });
    }
  }

  // ---------- RecetaModificador (F2-T1, BOM por variante) ----------
  // "Add Guacamole" (agregar) suma la MISMA cantidad que la receta del side de
  // guacamole; "Sin Queso" (sin) resta EXACTAMENTE lo que la receta base del
  // Chicken Cheesadilla tenia de queso (neteo a 0 -> desaparece del desglose,
  // ver test/unit/costeo.spec.ts).
  await prisma.recetaModificador.upsert({
    where: { id: "rm-guac-bowl-build" },
    update: {},
    create: { id: "rm-guac-bowl-build", modificadorId: "mod-guac-bowl-build", insumoId: "insu-guacamole", cantidadDelta: 0.2 },
  });
  await prisma.recetaModificador.upsert({
    where: { id: "rm-sin-queso-cheesadilla" },
    update: {},
    create: {
      id: "rm-sin-queso-cheesadilla",
      modificadorId: "mod-sin-queso-cheesadilla",
      insumoId: "insu-cheese",
      cantidadDelta: -0.2,
    },
  });

  // ---------- Stock inicial (Guacamole y Cup a proposito cerca/bajo umbral: StockBajo demo) ----------
  const stockInicial: Record<string, number> = {
    "insu-chicken": 40,
    "insu-rice": 30,
    "insu-lettuce": 20,
    "insu-blackbeans": 15,
    "insu-tortilla": 60,
    "insu-cheese": 10,
    "insu-corn": 15,
    "insu-guacamole": 2, // <= umbral (2)
    "insu-sodasyrup": 10,
    "insu-cup": 15, // < umbral (20)
  };
  for (const [insumoId, cantidadActual] of Object.entries(stockInicial)) {
    await prisma.stock.upsert({
      where: { ubicacionId_insumoId: { ubicacionId: UBICACION_PILOTO_ID, insumoId } },
      update: { cantidadActual },
      create: { id: uuidv7(), ubicacionId: UBICACION_PILOTO_ID, insumoId, cantidadActual },
    });
  }

  // ---------- Turno abierto en la tienda piloto (para poder vender desde el arranque) ----------
  const turnoAbierto = await prisma.turno.findFirst({
    where: { ubicacionId: UBICACION_PILOTO_ID, estado: "abierto" },
  });
  if (!turnoAbierto) {
    await prisma.turno.create({
      data: {
        id: uuidv7(),
        ubicacionId: UBICACION_PILOTO_ID,
        usuarioAperturaId: "user-cajero-demo",
        fondoInicial: 200,
        estado: "abierto",
        ultimoNumeroOrden: 0,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed completada: ubicaciones, roles, usuarios, catalogo, insumos, recetas, stock y turno abierto.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
