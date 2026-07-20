import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from "class-validator";

export class RegistrarPagoDto {
  @IsString()
  pedidoId!: string;

  @IsIn(["efectivo", "tarjeta", "otro"])
  metodo!: "efectivo" | "tarjeta" | "otro";

  /** Monto a cobrar en este pago, SIN propina, en dolares. */
  @IsNumber()
  @IsPositive()
  monto!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  propina?: number;

  /** Requerido para metodo "efectivo": efectivo entregado por el cliente. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRecibido?: number;

  /** Solo tarjeta: simula terminal sin conectividad (store-and-forward, S-05). */
  @IsOptional()
  @IsBoolean()
  offline?: boolean;

  /** Solo tarjeta, demo/pruebas: fuerza un rechazo del PSP. */
  @IsOptional()
  @IsBoolean()
  forzarRechazo?: boolean;
}

export class ReembolsoPagoDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monto?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  motivo?: string;
}
