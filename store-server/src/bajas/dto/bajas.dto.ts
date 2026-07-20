import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

const MOTIVOS_BAJA = ["caducado", "danado", "errorConteo", "otro"] as const;
export type MotivoBajaDto = (typeof MOTIVOS_BAJA)[number];

const ESTADOS_SOLICITUD_BAJA = ["pendiente", "aprobada", "rechazada"] as const;

/**
 * POST /api/v1/bajas (F3-T1). Crea una SolicitudBaja en estado "pendiente" —
 * NO toca Stock (ver BajasService.solicitarBaja). `ubicacionId`/`insumoId`
 * van en el body (no hay contexto de sesion de tienda unica en el contrato
 * HTTP existente, mismo criterio que AjustarStockDto en InventarioModule).
 */
export class CrearSolicitudBajaDto {
  @IsString()
  ubicacionId!: string;

  @IsString()
  insumoId!: string;

  /** Cantidad a dar de baja, SIEMPRE positiva (el signo lo aplica InventarioService al aprobar). */
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsIn(MOTIVOS_BAJA)
  motivo!: MotivoBajaDto;

  /** Nota libre (ej. numero de lote/batch, fecha de vencimiento observada). */
  @IsOptional()
  @IsString()
  etiqueta?: string;
}

/** POST /api/v1/bajas/:id/rechazar — motivo de rechazo opcional pero recomendado (queda en el audit trail). */
export class RechazarSolicitudBajaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  motivoRechazo?: string;
}

/** GET /api/v1/bajas?estado=&ubicacionId= — cola de aprobacion del gerente. */
export class ListarSolicitudesBajaQueryDto {
  @IsOptional()
  @IsIn(ESTADOS_SOLICITUD_BAJA)
  estado?: "pendiente" | "aprobada" | "rechazada";

  @IsOptional()
  @IsString()
  ubicacionId?: string;
}
