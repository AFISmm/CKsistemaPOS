import { crearNotificacion, listarNotificaciones } from "@/lib/notificaciones/notificaciones";
import { respuestaErrorNotificaciones } from "@/lib/notificaciones/http";
import { ErrorNotificaciones } from "@/lib/notificaciones/errores";
import type { TipoNotificacion } from "@/lib/domain/types";

import { conPersistencia } from "@/lib/db/store";
const TIPOS_VALIDOS: TipoNotificacion[] = ["inventario", "personal", "nomina", "pedido", "sistema"];

function tipoValido(tipo: string | undefined): tipo is TipoNotificacion {
  return !!tipo && (TIPOS_VALIDOS as string[]).includes(tipo);
}

export const dynamic = "force-dynamic";

/** GET /api/v1/notificaciones?ubicacionId= */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const ubicacionId = searchParams.get("ubicacionId") ?? undefined;
      const notificaciones = listarNotificaciones(ubicacionId);
      return Response.json({ notificaciones });
    } catch (e) {
      return respuestaErrorNotificaciones(e);
    }
  });
}

/**
 * POST /api/v1/notificaciones — crea una notificacion nueva.
 * Body: { ubicacionId, tipo, titulo, mensaje, entidadRelacionadaHref? }.
 * Ver deduplicacion documentada en lib/notificaciones/notificaciones.ts
 * (crearNotificacion): si ya existe una notificacion con el mismo
 * `entidadRelacionadaHref`, se devuelve esa en vez de crear un duplicado.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        ubicacionId?: string;
        tipo?: string;
        titulo?: string;
        mensaje?: string;
        entidadRelacionadaHref?: string | null;
      };
      if (!tipoValido(body.tipo)) {
        throw new ErrorNotificaciones(
          "tipo_invalido",
          `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`,
          422
        );
      }
      const notificacion = crearNotificacion({
        ubicacionId: body.ubicacionId ?? "",
        tipo: body.tipo,
        titulo: body.titulo ?? "",
        mensaje: body.mensaje ?? "",
        entidadRelacionadaHref: body.entidadRelacionadaHref ?? null,
      });
      return Response.json({ notificacion }, { status: 201 });
    } catch (e) {
      return respuestaErrorNotificaciones(e);
    }
  });
}
