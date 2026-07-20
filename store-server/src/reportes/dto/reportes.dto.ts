import { IsIn, IsOptional, IsString, Matches } from "class-validator";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/v1/reportes/dia — HU-REP-01. `ubicacionId` es OBLIGATORIO
 * (C-TENANT: nunca agregar/filtrar reportes sin acotar a una tienda, para no
 * arriesgar una fuga de numeros entre tiendas si en el futuro un mismo
 * Store Server sirviera mas de una `Ubicacion`).
 */
export class ReporteDiaQueryDto {
  @IsString()
  ubicacionId!: string;

  /** Fecha de inicio del rango (inclusive), YYYY-MM-DD. */
  @IsString()
  @Matches(FORMATO_FECHA, { message: "fecha debe tener formato YYYY-MM-DD" })
  fecha!: string;

  /** Fecha de fin del rango (inclusive), YYYY-MM-DD. Default: igual a `fecha` (un solo dia). */
  @IsOptional()
  @IsString()
  @Matches(FORMATO_FECHA, { message: "hasta debe tener formato YYYY-MM-DD" })
  hasta?: string;

  /** Orden del mix de productos. Default: "monto". */
  @IsOptional()
  @IsIn(["monto", "unidades"])
  ordenarMixPor?: "monto" | "unidades";
}
