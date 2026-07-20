/**
 * Unit tests del guard RBAC (F1-T6, RNF-08). Mockea Reflector y
 * SeguridadService: no toca Prisma/Postgres, corre en cualquier entorno.
 */
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { PermisosGuard } from "../../src/seguridad/permisos.guard";
import type { SeguridadService, UsuarioConPermisos } from "../../src/seguridad/seguridad.service";
import { ErrorDominio } from "../../src/common/errores/error-dominio";

function crearContexto(headers: Record<string, string | undefined>): ExecutionContext {
  const request = { headers, usuario: undefined as UsuarioConPermisos | undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

function usuarioDemo(permisos: string[]): UsuarioConPermisos {
  return {
    id: "user-1",
    ubicacionId: "ubic-miami-fl",
    nombre: "Gerente Demo",
    rolId: "rol-gerente",
    rolNombre: "gerenteTienda",
    activo: true,
    permisos,
  };
}

describe("PermisosGuard", () => {
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let seguridadService: jest.Mocked<Pick<SeguridadService, "obtenerUsuarioConPermisos">>;
  let guard: PermisosGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    seguridadService = { obtenerUsuarioConPermisos: jest.fn() };
    guard = new PermisosGuard(
      reflector as unknown as Reflector,
      seguridadService as unknown as SeguridadService,
    );
  });

  it("permite el acceso si el endpoint no declara @RequierePermiso", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const contexto = crearContexto({});

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(seguridadService.obtenerUsuarioConPermisos).not.toHaveBeenCalled();
  });

  it("rechaza con 401 si falta el header x-usuario-id", async () => {
    reflector.getAllAndOverride.mockReturnValue("pago.reembolso");
    const contexto = crearContexto({});

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      codigo: "no_autenticado",
      status: 401,
    });
  });

  it("rechaza con 401 si el usuario no existe o esta inactivo", async () => {
    reflector.getAllAndOverride.mockReturnValue("pago.reembolso");
    seguridadService.obtenerUsuarioConPermisos.mockResolvedValue(null);
    const contexto = crearContexto({ "x-usuario-id": "user-inexistente" });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(ErrorDominio);
    await expect(guard.canActivate(contexto)).rejects.toMatchObject({ status: 401 });
  });

  it("rechaza con 403 si el usuario esta autenticado pero no tiene el permiso", async () => {
    reflector.getAllAndOverride.mockReturnValue("pago.reembolso");
    seguridadService.obtenerUsuarioConPermisos.mockResolvedValue(usuarioDemo(["pedido.crear"]));
    const contexto = crearContexto({ "x-usuario-id": "user-cajero-demo" });

    await expect(guard.canActivate(contexto)).rejects.toMatchObject({
      codigo: "permiso_insuficiente",
      status: 403,
    });
  });

  it("permite el acceso y adjunta el usuario al request si tiene el permiso", async () => {
    reflector.getAllAndOverride.mockReturnValue("pago.reembolso");
    const usuario = usuarioDemo(["pago.reembolso"]);
    seguridadService.obtenerUsuarioConPermisos.mockResolvedValue(usuario);

    const request = { headers: { "x-usuario-id": "user-gerente-demo" }, usuario: undefined as UsuarioConPermisos | undefined };
    const contexto = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.usuario).toEqual(usuario);
  });
});
