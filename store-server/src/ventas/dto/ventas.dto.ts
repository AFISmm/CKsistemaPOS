import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

/** POST /api/v1/pedidos — id = UUID v7 generado en cliente/tienda (C-ID). */
export class CrearPedidoDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  ubicacionId?: string;

  @IsOptional()
  @IsString()
  nombreCliente?: string;

  @IsOptional()
  @IsIn(["mostrador", "kiosco", "online", "delivery", "catering"])
  canal?: "mostrador" | "kiosco" | "online" | "delivery" | "catering";
}

export class AgregarLineaDto {
  @IsString()
  productoId!: string;

  @IsInt()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  modificadorIds?: string[];

  @IsOptional()
  @IsString()
  notas?: string;

  /** Opcional: id UUID v7 de la propia linea, si el cliente ya lo genero offline. */
  @IsOptional()
  @IsString()
  id?: string;

  /**
   * F2-T1 (BOM por variante): ids de Producto efectivamente elegidos por slot
   * si esta linea es un Combo (ej. ["prod-side-corn-mix"]). SOLO para costeo
   * (CosteoService); NUNCA afecta precioUnitario/subtotalLinea (que siguen
   * siendo el snapshot de siempre, C-SNAPSHOT intacto) ni la validacion de
   * "combo incompleto" (que sigue usando modificadorIds, sin cambios).
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  comboSeleccionProductoIds?: string[];

  /** F2-T2 (Hold & fire): si es true, la linea nace retenida (excluida del proximo envio a cocina hasta /liberar). */
  @IsOptional()
  @IsBoolean()
  retenida?: boolean;
}

export class ActualizarLineaDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidad?: number;

  @IsOptional()
  @IsBoolean()
  eliminar?: boolean;
}

export class AplicarDescuentoDto {
  @IsIn(["monto", "porcentaje"])
  tipo!: "monto" | "porcentaje";

  @IsNumber()
  @Min(0)
  @Max(100000)
  valor!: number;

  @IsString()
  @MinLength(1)
  motivo!: string;
}

export class ReembolsoPedidoDto {
  @IsString()
  @MinLength(1)
  motivo!: string;
}

export class AbrirTurnoDto {
  @IsOptional()
  @IsString()
  ubicacionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fondoInicial?: number;
}

export class CerrarTurnoZDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  efectivoContado?: number;
}
