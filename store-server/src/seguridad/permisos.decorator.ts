import { SetMetadata } from "@nestjs/common";

export const PERMISO_REQUERIDO_KEY = "permisoRequerido";

/**
 * Marca un endpoint con la clave de permiso granular requerida (RNF-08),
 * ej. `@RequierePermiso("pago.reembolso")`. PermisosGuard la lee via
 * Reflector y la valida contra los permisos del Usuario autenticado.
 * Endpoints sin este decorador NO exigen permiso especifico (solo requieren
 * que el guard este activo si esta aplicado globalmente/por controlador).
 */
export const RequierePermiso = (permiso: string): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISO_REQUERIDO_KEY, permiso);
