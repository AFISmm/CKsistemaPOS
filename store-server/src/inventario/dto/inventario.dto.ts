import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

/**
 * Ajuste manual de stock (POST /api/v1/stock/ajuste, HU-INV-03 CA4).
 * `cantidad` es el DELTA a aplicar (puede ser negativo, ej. merma) — nunca una
 * sobrescritura del saldo (arquitectura.md §4.5).
 */
export class AjustarStockDto {
  @IsString()
  ubicacionId!: string;

  @IsString()
  insumoId!: string;

  @IsNumber()
  cantidad!: number;

  @IsIn(["merma", "recepcion", "ajuste"])
  tipoMovimiento!: "merma" | "recepcion" | "ajuste";

  @IsString()
  @MinLength(1)
  motivo!: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}

/**
 * S-14 (BOM multinivel — productos elaborados/intermedios). POST
 * /api/v1/stock/produccion — produce `cantidadProducida` unidades del insumo
 * elaborado `insumoElaboradoId` a partir de su propia Receta de insumos
 * base (ver InventarioService.producirInsumoElaborado).
 */
export class ProducirInsumoElaboradoDto {
  @IsString()
  ubicacionId!: string;

  @IsString()
  insumoElaboradoId!: string;

  @IsNumber()
  @IsPositive()
  cantidadProducida!: number;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
