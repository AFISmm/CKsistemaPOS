import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO } from "../common/eventos/tipos-evento";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import { detectarCicloReceta } from "./receta-ciclo";
import type {
  ActualizarInsumoDto,
  ActualizarProductoDto,
  CrearCategoriaDto,
  CrearComboDto,
  CrearGrupoModificadorDto,
  CrearInsumoDto,
  CrearModificadorDto,
  CrearProductoDto,
  CrearRecetaDto,
  CrearRecetaInsumoDto,
  CrearRecetaModificadorDto,
  DefinirRecetaInsumoElaboradoDto,
} from "./dto/catalogo.dto";

/**
 * CatalogoService — DUENO: menu-inventario-pos (arquitectura.md §6.1/§9.3).
 * Owner de Producto/Combo/GrupoModificador/Modificador/Receta/RecetaInsumo/Insumo.
 */
@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosService,
  ) {}

  /** GET /api/v1/catalogo — carta completa cacheable por terminal (offline, C-OFFLINE). */
  async obtenerCatalogoCompleto() {
    const [categorias, productos, combos, gruposModificador, modificadores, insumos, recetas, recetaInsumos] =
      await Promise.all([
        this.prisma.categoria.findMany({ orderBy: { orden: "asc" } }),
        this.prisma.producto.findMany({ where: { activo: true } }),
        this.prisma.combo.findMany(),
        this.prisma.grupoModificador.findMany(),
        this.prisma.modificador.findMany(),
        this.prisma.insumo.findMany(),
        this.prisma.receta.findMany({ where: { activo: true } }),
        this.prisma.recetaInsumo.findMany(),
      ]);
    return { categorias, productos, combos, gruposModificador, modificadores, insumos, recetas, recetaInsumos };
  }

  async crearCategoria(dto: CrearCategoriaDto) {
    return this.prisma.categoria.create({
      data: { id: uuidv7(), nombre: dto.nombre, orden: dto.orden ?? 0 },
    });
  }

  async crearProducto(dto: CrearProductoDto) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } });
    if (!categoria) {
      throw new ErrorDominio("categoria_no_encontrada", `Categoria ${dto.categoriaId} no existe`, 422);
    }
    return this.prisma.producto.create({
      data: {
        id: uuidv7(),
        categoriaId: dto.categoriaId,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? "",
        precioBase: dto.precioBase,
        gravable: dto.gravable,
        esCombo: false,
        disponible86: true,
        activo: true,
      },
    });
  }

  async actualizarProducto(id: string, dto: ActualizarProductoDto) {
    await this.obtenerProductoOrThrow(id);
    return this.prisma.producto.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
        ...(dto.precioBase !== undefined ? { precioBase: dto.precioBase } : {}),
        ...(dto.gravable !== undefined ? { gravable: dto.gravable } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
  }

  private async obtenerProductoOrThrow(id: string) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) {
      throw new ErrorDominio("producto_no_encontrado", `Producto ${id} no existe`, 404);
    }
    return producto;
  }

  /** POST /api/v1/productos/:id/86 — emite Producto86Cambiado (RN-07). */
  async marcar86(id: string, usuarioId: string | null, motivo?: string) {
    return this.cambiarDisponibilidad(id, false, usuarioId, motivo);
  }

  /** POST /api/v1/productos/:id/reactivar — emite Producto86Cambiado (RN-07). */
  async reactivar(id: string, usuarioId: string | null, motivo?: string) {
    return this.cambiarDisponibilidad(id, true, usuarioId, motivo);
  }

  private async cambiarDisponibilidad(
    id: string,
    disponible: boolean,
    usuarioId: string | null,
    motivo?: string,
  ) {
    const producto = await this.obtenerProductoOrThrow(id);
    const anterior = producto.disponible86;
    const actualizado = await this.prisma.producto.update({
      where: { id },
      data: { disponible86: disponible },
    });

    // Ubicacion del evento: 86 es catalogo global en el MVP de una tienda; se
    // usa la primera ubicacion activa para el envelope (C-TENANT exige el
    // campo, aunque el catalogo hoy no es por-ubicacion).
    const ubicacion = await this.prisma.ubicacion.findFirst({ where: { activo: true } });

    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.PRODUCTO_86_CAMBIADO,
      ubicacionId: ubicacion?.id ?? "desconocida",
      agregadoTipo: "Producto",
      agregadoId: id,
      payload: {
        productoId: id,
        nombre: actualizado.nombre,
        disponibleAnterior: anterior,
        disponibleNuevo: disponible,
        usuarioId,
        motivo: motivo ?? (disponible ? "Producto reactivado" : "Producto marcado 86 (agotado)"),
      },
    });

    return actualizado;
  }

  async crearCombo(dto: CrearComboDto) {
    await this.obtenerProductoOrThrow(dto.productoId);
    return this.prisma.combo.create({
      data: {
        id: uuidv7(),
        productoId: dto.productoId,
        componentes: dto.componentes as unknown as object,
      },
    });
  }

  async crearGrupoModificador(dto: CrearGrupoModificadorDto) {
    await this.obtenerProductoOrThrow(dto.productoId);
    if (dto.minSelecciones > dto.maxSelecciones) {
      throw new ErrorDominio(
        "grupo_modificador_invalido",
        "minSelecciones no puede ser mayor que maxSelecciones",
        422,
      );
    }
    return this.prisma.grupoModificador.create({
      data: {
        id: uuidv7(),
        productoId: dto.productoId,
        nombre: dto.nombre,
        minSelecciones: dto.minSelecciones,
        maxSelecciones: dto.maxSelecciones,
        obligatorio: dto.obligatorio,
      },
    });
  }

  async crearModificador(dto: CrearModificadorDto) {
    const grupo = await this.prisma.grupoModificador.findUnique({ where: { id: dto.grupoModificadorId } });
    if (!grupo) {
      throw new ErrorDominio(
        "grupo_modificador_no_encontrado",
        `GrupoModificador ${dto.grupoModificadorId} no existe`,
        422,
      );
    }
    return this.prisma.modificador.create({
      data: {
        id: uuidv7(),
        grupoModificadorId: dto.grupoModificadorId,
        nombre: dto.nombre,
        precioDelta: dto.precioDelta,
        disponible86: true,
        tipo: dto.tipo,
      },
    });
  }

  async crearInsumo(dto: CrearInsumoDto) {
    return this.prisma.insumo.create({
      data: {
        id: uuidv7(),
        nombre: dto.nombre,
        unidadMedida: dto.unidadMedida,
        umbralStockBajo: dto.umbralStockBajo,
        costoUnitario: dto.costoUnitario ?? 0,
        esElaborado: dto.esElaborado ?? false,
      },
    });
  }

  /** PATCH /api/v1/insumos/:id — actualiza costo unitario y/o esElaborado (F2-T1 + S-14). */
  async actualizarInsumo(id: string, dto: ActualizarInsumoDto) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${id} no existe`, 404);
    }
    return this.prisma.insumo.update({
      where: { id },
      data: {
        ...(dto.costoUnitario !== undefined ? { costoUnitario: dto.costoUnitario } : {}),
        ...(dto.esElaborado !== undefined ? { esElaborado: dto.esElaborado } : {}),
      },
    });
  }

  async crearReceta(dto: CrearRecetaDto) {
    await this.obtenerProductoOrThrow(dto.productoId);
    return this.prisma.receta.create({
      data: { id: uuidv7(), productoId: dto.productoId, activo: true },
    });
  }

  async agregarRecetaInsumo(recetaId: string, dto: CrearRecetaInsumoDto) {
    const receta = await this.prisma.receta.findUnique({ where: { id: recetaId } });
    if (!receta) {
      throw new ErrorDominio("receta_no_encontrada", `Receta ${recetaId} no existe`, 404);
    }
    const insumo = await this.prisma.insumo.findUnique({ where: { id: dto.insumoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${dto.insumoId} no existe`, 422);
    }
    return this.prisma.recetaInsumo.create({
      data: {
        id: uuidv7(),
        recetaId,
        insumoId: dto.insumoId,
        cantidad: dto.cantidad,
      },
    });
  }

  /**
   * POST /api/v1/modificadores/:id/receta-modificador — F2-T1 (BOM por
   * variante). Registra cuanto insumo agrega/quita ESTE Modificador sobre la
   * receta base del producto al que se aplique (CosteoService la resuelve al
   * costear una linea). No afecta Modificador.precioDelta ni ningun calculo
   * de VentasModule.
   */
  async agregarRecetaModificador(modificadorId: string, dto: CrearRecetaModificadorDto) {
    const modificador = await this.prisma.modificador.findUnique({ where: { id: modificadorId } });
    if (!modificador) {
      throw new ErrorDominio("modificador_no_encontrado", `Modificador ${modificadorId} no existe`, 404);
    }
    const insumo = await this.prisma.insumo.findUnique({ where: { id: dto.insumoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${dto.insumoId} no existe`, 422);
    }
    return this.prisma.recetaModificador.create({
      data: {
        id: uuidv7(),
        modificadorId,
        insumoId: dto.insumoId,
        cantidadDelta: dto.cantidadDelta,
      },
    });
  }

  /**
   * POST /api/v1/insumos/:id/receta — S-14 (BOM multinivel, ver
   * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
   * S-14). Define/REEMPLAZA la receta completa de un Insumo elaborado (ej.
   * Salsa BBQ): valida que ninguno de los insumos base referenciados forme un
   * ciclo (directo o transitivo) con este insumo ANTES de escribir nada
   * (`detectarCicloReceta`, 422 si lo detecta), luego, en una sola
   * transaccion, desactiva cualquier Receta anterior de este insumo elaborado
   * y crea la nueva Receta + sus RecetaInsumo (MISMAS tablas que ya usa el
   * flujo Producto->Receta->RecetaInsumo, sin estructura paralela) y marca
   * `Insumo.esElaborado = true`.
   */
  async definirRecetaInsumoElaborado(insumoElaboradoId: string, dto: DefinirRecetaInsumoElaboradoDto) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: insumoElaboradoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${insumoElaboradoId} no existe`, 404);
    }

    const idsBase = dto.items.map((item) => item.insumoBaseId);
    const insumosBase = await this.prisma.insumo.findMany({ where: { id: { in: idsBase } } });
    if (insumosBase.length !== new Set(idsBase).size) {
      const encontrados = new Set(insumosBase.map((i) => i.id));
      const faltantes = idsBase.filter((id) => !encontrados.has(id));
      throw new ErrorDominio(
        "insumo_no_encontrado",
        `Insumo(s) base no existen: ${Array.from(new Set(faltantes)).join(", ")}`,
        422,
      );
    }

    const grafoRecetasVigentes = await this.construirGrafoRecetasElaboradas();
    if (detectarCicloReceta(insumoElaboradoId, idsBase, grafoRecetasVigentes)) {
      throw new ErrorDominio(
        "receta_elaborado_ciclo",
        `La receta propuesta para el insumo elaborado ${insumoElaboradoId} formaria un ciclo (directo o transitivo)`,
        422,
      );
    }

    const receta = await this.prisma.$transaction(async (tx) => {
      // Desactiva cualquier receta previa de este insumo elaborado: evita la
      // ambiguedad de "cual es la activa" que tendria mantener varias filas
      // activo=true simultaneas para el mismo insumoElaboradoId.
      await tx.receta.updateMany({ where: { insumoElaboradoId, activo: true }, data: { activo: false } });

      const nuevaReceta = await tx.receta.create({
        data: { id: uuidv7(), insumoElaboradoId, activo: true },
      });
      for (const item of dto.items) {
        await tx.recetaInsumo.create({
          data: { id: uuidv7(), recetaId: nuevaReceta.id, insumoId: item.insumoBaseId, cantidad: item.cantidad },
        });
      }
      await tx.insumo.update({ where: { id: insumoElaboradoId }, data: { esElaborado: true } });
      return nuevaReceta;
    });

    return this.prisma.receta.findUnique({
      where: { id: receta.id },
      include: { recetaInsumos: true },
    });
  }

  /**
   * Grafo de recetas VIGENTES (activo=true) de TODOS los insumos elaborados
   * hoy en el catalogo: insumoId elaborado -> ids de sus insumos base. Lo
   * consume `detectarCicloReceta` (junto con la receta PROPUESTA para el
   * insumo que se esta definiendo/actualizando) para rechazar ciclos ANTES
   * de escribir nada.
   */
  private async construirGrafoRecetasElaboradas(): Promise<Map<string, string[]>> {
    const recetas = await this.prisma.receta.findMany({
      where: { activo: true, insumoElaboradoId: { not: null } },
      include: { recetaInsumos: true },
    });
    const grafo = new Map<string, string[]>();
    for (const receta of recetas) {
      if (!receta.insumoElaboradoId) continue;
      grafo.set(
        receta.insumoElaboradoId,
        receta.recetaInsumos.map((ri) => ri.insumoId),
      );
    }
    return grafo;
  }
}
