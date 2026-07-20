import { Body, Controller, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { SeguridadService } from "./seguridad.service";

class LoginPinDto {
  @IsString()
  usuarioId!: string;

  @IsString()
  @MinLength(4)
  pin!: string;
}

/**
 * Login rapido de mostrador por PIN (S-10). Devuelve el usuario + permisos;
 * el cliente reenvia `usuarioId` como header `x-usuario-id` en las siguientes
 * llamadas sensibles (ver PermisosGuard). Nunca se acepta ni se loguea el PIN
 * en claro en ningun otro punto del sistema.
 */
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly seguridadService: SeguridadService) {}

  @Post("login-pin")
  async loginPin(@Body() dto: LoginPinDto) {
    const usuario = await this.seguridadService.loginPorPin(dto.usuarioId, dto.pin);
    return { usuario };
  }
}
