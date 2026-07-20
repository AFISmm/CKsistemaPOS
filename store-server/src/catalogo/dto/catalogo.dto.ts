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
}

/** PATCH /api/v1/insumos/:id — hoy solo permite actualizar el costo (F2-T1); ampliable. */
export class ActualizarInsumoDto {
  @IsNumber()
  @Min(0)
  costoUnitario!: number;
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
