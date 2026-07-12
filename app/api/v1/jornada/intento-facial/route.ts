import { reportarIntentoFacial } from "@/lib/jornada/marcaje";
import { respuestaErrorJornada } from "@/lib/jornada/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/intento-facial — body { empleadoId, exitoso }.
 *
 * El celular del empleado reporta aqui el resultado de CADA intento de
 * verificacion facial simulada ("Simular verificacion exitosa/fallida" en
 * app/jornada/marcar/page.tsx). Este endpoint es la FUENTE DE VERDAD de los
 * intentos fallidos consecutivos y del bloqueo de 5 minutos (el conteo que
 * hace el cliente es solo para la UX, ver lib/jornada/bloqueo.ts).
 * Responde con `bloqueadoHasta` (ISO datetime o null) para que la UI muestre
 * el tiempo restante y ofrezca el PIN de respaldo cuando corresponda.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      empleadoId?: string;
      exitoso?: boolean;
    };
    if (!body.empleadoId || typeof body.exitoso !== "boolean") {
      return Response.json(
        { codigo: "campos_requeridos", mensaje: "empleadoId y exitoso (boolean) son requeridos" },
        { status: 422 }
      );
    }
    const resultado = reportarIntentoFacial(body.empleadoId, body.exitoso);
    return Response.json(resultado);
  } catch (e) {
    return respuestaErrorJornada(e);
  }
}
