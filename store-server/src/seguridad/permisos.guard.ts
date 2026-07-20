import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorDominio } from "../common/errores/error-dominio";
import { PERMISO_REQUERIDO_KEY } from "./permisos.decorator";
import { SeguridadService } from "./seguridad.service";
import { tienePermiso } from "./permisos";

/**
 * Guard RBAC (F1-T6, RNF-08) — valida la clave de permiso declarada por
 * @RequierePermiso() en el handler/controller contra los permisos del Rol del
 * Usuario autenticado.
 *
 * Autenticacion en este MVP de LAN de tienda (documentado como simplificacion
 * deliberada, ver README.md): el cliente hace login por PIN una vez
 * (POST /api/v1/auth/login-pin) y en cada request sensible envia el header
 * `x-usuario-id` obtenido de esa respuesta. El Store Server SOLO opera dentro
 * de la LAN de la tienda (no expuesto a internet, arquitectura.md §2), por lo
 * que no se introduce aqui infraestructura de sesion/JWT; Fase 2 puede
 * endurecerlo con tokens de sesion de corta duracion sin cambiar el contrato
 * de permisos.
 *
 * - Sin @RequierePermiso en el endpoint -> el guard no exige nada (true).
 * - Header ausente o usuario invalido/inactivo -> 401 (no_autenticado).
 * - Usuario valido pero sin el permiso -> 403 (permiso_insuficiente, C-ERRORES).
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly seguridadService: SeguridadService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisoRequerido = this.reflector.getAllAndOverride<string | undefined>(
      PERMISO_REQUERIDO_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permisoRequerido) return true;

    const request = context.switchToHttp().getRequest();
    const usuarioId = request.headers?.["x-usuario-id"];

    if (!usuarioId || typeof usuarioId !== "string") {
      throw new ErrorDominio(
        "no_autenticado",
        "Falta el header x-usuario-id (login previo por PIN requerido)",
        401,
      );
    }

    const usuario = await this.seguridadService.obtenerUsuarioConPermisos(usuarioId);
    if (!usuario) {
      throw new ErrorDominio("no_autenticado", "Usuario no valido o inactivo", 401);
    }

    if (!tienePermiso(usuario.permisos, permisoRequerido)) {
      throw new ErrorDominio(
        "permiso_insuficiente",
        `El usuario "${usuario.nombre}" no tiene el permiso requerido "${permisoRequerido}"`,
        403,
      );
    }

    request.usuario = usuario;
    return true;
  }
}
