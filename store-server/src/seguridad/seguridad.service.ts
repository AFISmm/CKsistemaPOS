import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../common/prisma/prisma.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import type { Prisma, TipoEventoAuditoria } from "@prisma/client";

export interface UsuarioConPermisos {
  id: string;
  ubicacionId: string;
  nombre: string;
  rolId: string;
  rolNombre: string;
  activo: boolean;
  permisos: string[];
}

export interface RegistrarAuditoriaInput {
  ubicacionId: string;
  usuarioId: string | null;
  tipo: TipoEventoAuditoria;
  agregadoTipo: string;
  agregadoId: string;
  motivo: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class SeguridadService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usado por PermisosGuard: null si el usuario no existe o esta inactivo. */
  async obtenerUsuarioConPermisos(usuarioId: string): Promise<UsuarioConPermisos | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { rol: true },
    });
    if (!usuario || !usuario.activo) return null;
    return {
      id: usuario.id,
      ubicacionId: usuario.ubicacionId,
      nombre: usuario.nombre,
      rolId: usuario.rolId,
      rolNombre: usuario.rol.nombre,
      activo: usuario.activo,
      permisos: usuario.rol.permisos,
    };
  }

  /** Login por PIN (S-10): compara contra pinHash con bcrypt, nunca en claro. */
  async loginPorPin(usuarioId: string, pin: string): Promise<UsuarioConPermisos> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { rol: true },
    });
    if (!usuario || !usuario.activo) {
      throw new ErrorDominio("credenciales_invalidas", "Usuario no existe o esta inactivo", 401);
    }
    const valido = await bcrypt.compare(pin, usuario.pinHash);
    if (!valido) {
      throw new ErrorDominio("credenciales_invalidas", "PIN incorrecto", 401);
    }
    return {
      id: usuario.id,
      ubicacionId: usuario.ubicacionId,
      nombre: usuario.nombre,
      rolId: usuario.rolId,
      rolNombre: usuario.rol.nombre,
      activo: usuario.activo,
      permisos: usuario.rol.permisos,
    };
  }

  static async hashPin(pin: string, saltRounds = 10): Promise<string> {
    return bcrypt.hash(pin, saltRounds);
  }

  /**
   * Escribe una fila de EventoDeAuditoria (RNF-07/C-AUDIT). Append-only por
   * diseno: no existe metodo de update/delete en este servicio ni endpoint
   * expuesto en ningun controller para mutar/borrar esta tabla.
   */
  async registrarAuditoria(input: RegistrarAuditoriaInput): Promise<void> {
    await this.prisma.eventoDeAuditoria.create({
      data: {
        id: uuidv7(),
        ubicacionId: input.ubicacionId,
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        agregadoTipo: input.agregadoTipo,
        agregadoId: input.agregadoId,
        motivo: input.motivo,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }
}
