import { IsIn, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

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
