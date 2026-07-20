/**
 * DTOs de entrada del CatalogoModule (menu-inventario-pos, owner del catalogo).
 * Todos los montos de entrada son numeros decimales en DOLARES (ej 10.99);
 * se convierten a Decimal(12,2) en el servicio (C-DINERO).
 */
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CrearCategoriaDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CrearProductoDto {
  @IsString()
  categoriaId!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precioBase!: number;

  @IsBoolean()
  gravable!: boolean;
}

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioBase?: number;

  @IsOptional()
  @IsBoolean()
  gravable?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ComboComponenteDto {
  @IsString()
  grupoSeleccion!: string;

  @IsBoolean()
  obligatorio!: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  opciones!: string[];
}

export class CrearComboDto {
  @IsString()
  productoId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboComponenteDto)
  componentes!: ComboComponenteDto[];
}

export class CrearGrupoModificadorDto {
  @IsString()
  productoId!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsInt()
  @Min(0)
  minSelecciones!: number;

  @IsInt()
  @Min(0)
  maxSelecciones!: number;

  @IsBoolean()
  obligatorio!: boolean;
}

export class CrearModificadorDto {
  @IsString()
  grupoModificadorId!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsNumber()
  precioDelta!: number;

  @IsIn(["agregar", "sin", "sustituir"])
  tipo!: "agregar" | "sin" | "sustituir";
}

export class CrearRecetaDto {
  @IsString()
  productoId!: string;
}

export class CrearRecetaInsumoDto {
  @IsString()
  insumoId!: string;

  @IsNumber()
  @Min(0)
  cantidad!: number;
}

export class CrearInsumoDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsString()
  unidadMedida!: string;

  @IsNumber()
  @Min(0)
  umbralStockBajo!: number;

  /** Costo unitario vigente (F2-T1, BOM por variante); opcional, default 0 (se completa despues via PATCH). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  /**
   * S-14 (BOM multinivel — productos elaborados/intermedios): true si este
   * insumo se PRODUCE en tienda a partir de otros insumos base (ej. Salsa
   * BBQ) en vez de comprarse ya listo. Opcional, default false (identico al
   * comportamiento existente). Puede declararse aqui ANTES de definir la
   * receta via POST /api/v1/insumos/:id/receta (que de todos modos lo marca
   * en true automaticamente al definir/actualizar la receta).
   */
  @IsOptional()
  @IsBoolean()
  esElaborado?: boolean;
}

/**
 * PATCH /api/v1/insumos/:id — actualiza costo y/o el flag esElaborado (F2-T1
 * + S-14). Ambos campos opcionales (antes `costoUnitario` era requerido; se
 * relaja de forma ADITIVA para permitir actualizar solo `esElaborado` sin
 * tener que reenviar el costo vigente en el mismo PATCH — ningun llamador
 * existente se rompe porque seguir enviando `costoUnitario` sigue siendo
 * valido).
 */
export class ActualizarInsumoDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @IsOptional()
  @IsBoolean()
  esElaborado?: boolean;
}

/**
 * S-14: UN ingrediente base (por unidad producida) dentro de la receta que se
 * esta definiendo/reemplazando para un Insumo elaborado.
 */
export class ItemRecetaInsumoElaboradoDto {
  @IsString()
  insumoBaseId!: string;

  @IsNumber()
  @Min(0)
  cantidad!: number;
}

/**
 * POST /api/v1/insumos/:id/receta — S-14 (BOM multinivel). A diferencia del
 * flujo Producto (POST /recetas + POST /recetas/:id/insumos, dos llamadas
 * incrementales), este endpoint define la receta COMPLETA de un insumo
 * elaborado en una sola llamada: mas seguro para este caso porque
 * CatalogoService.definirRecetaInsumoElaborado valida ausencia de ciclos
 * (detectarCicloReceta) contra la lista COMPLETA propuesta antes de escribir
 * nada, y reemplaza (desactiva) cualquier receta anterior del mismo insumo
 * elaborado en la misma transaccion — evitar el estado intermedio "receta a
 * medio construir" que si seria valido, aunque incompleto, en el flujo
 * incremental de Producto.
 */
export class DefinirRecetaInsumoElaboradoDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ItemRecetaInsumoElaboradoDto)
  items!: ItemRecetaInsumoElaboradoDto[];
}

/**
 * F2-T1 (BOM por variante): delta de insumo que introduce un Modificador
 * concreto sobre la receta base del producto. `cantidadDelta` puede ser
 * negativo (ej. "Sin queso" resta la cantidad de queso de la receta base;
 * "Sustituir" resta el lado quitado). Ver RecetaModificador en schema.prisma.
 */
export class CrearRecetaModificadorDto {
  @IsString()
  insumoId!: string;

  @IsNumber()
  cantidadDelta!: number;
}

export class MarcarUsuarioDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
