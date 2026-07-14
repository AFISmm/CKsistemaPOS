import { registrarCredencial, type RegistrarWebauthnInput } from "@/lib/jornada/webauthn";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/webauthn/registrar — body { empleadoId, credentialId }.
 *
 * Se llama DESPUES de que `navigator.credentials.create()` ya devolvio una
 * credencial exitosamente (es decir, despues de que el empleado ya completo
 * el gesto biometrico real que exigio el navegador/SO). Guarda ese
 * `credentialId` (el `credential.id` en base64url que entrega el navegador)
 * en Empleado.credencialWebauthnId, para que ese mismo dispositivo pueda
 * usar `navigator.credentials.get()` (POST .../webauthn/opciones-login) en
 * usos posteriores.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as Partial<RegistrarWebauthnInput>;
      if (!body.empleadoId || !body.credentialId) {
        return Response.json(
          { codigo: "campos_requeridos", mensaje: "empleadoId y credentialId son requeridos" },
          { status: 422 }
        );
      }
      const resultado = registrarCredencial({
        empleadoId: body.empleadoId,
        credentialId: body.credentialId,
      });
      return Response.json(resultado, { status: 201 });
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
