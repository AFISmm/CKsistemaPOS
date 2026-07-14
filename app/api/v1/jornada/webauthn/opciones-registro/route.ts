import { opcionesRegistro } from "@/lib/jornada/webauthn";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/webauthn/opciones-registro — body { empleadoId }.
 *
 * Primer paso para registrar Face ID/Touch ID/Windows Hello en el
 * dispositivo del empleado: devuelve las opciones que necesita
 * `navigator.credentials.create()` en el cliente (ver
 * app/jornada/marcar/page.tsx). Ese llamado del navegador es el que dispara
 * el prompt biometrico REAL del sistema operativo — este endpoint solo
 * arma las opciones (ver lib/jornada/webauthn.ts para el detalle de que se
 * verifica server-side y que se simplifica a proposito en esta demo).
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { empleadoId?: string };
      if (!body.empleadoId) {
        return Response.json(
          { codigo: "empleadoId_requerido", mensaje: "empleadoId es requerido" },
          { status: 422 }
        );
      }
      return Response.json(opcionesRegistro(body.empleadoId));
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
