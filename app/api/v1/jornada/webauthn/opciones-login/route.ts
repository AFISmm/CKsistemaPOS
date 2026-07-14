import { opcionesLogin } from "@/lib/jornada/webauthn";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/webauthn/opciones-login — body { empleadoId }.
 *
 * Para usos posteriores (el empleado YA registro Face ID/Touch ID/Windows
 * Hello en este dispositivo): devuelve las opciones que necesita
 * `navigator.credentials.get()` en el cliente, que vuelve a disparar el
 * prompt biometrico real. Si el empleado todavia no tiene una credencial
 * registrada, responde 422 `sin_credencial_webauthn` para que el cliente
 * caiga al flujo de registro (POST .../webauthn/opciones-registro).
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
      return Response.json(opcionesLogin(body.empleadoId));
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
