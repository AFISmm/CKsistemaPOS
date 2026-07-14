import { cambiarPin } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/auth/usuarios/[id]/pin — body {pin: string}. Cambia el PIN de
 * acceso de un Usuario ("Cambiar PIN" del modal "Gestionar perfiles" del
 * sidebar). Valida server-side que el PIN sea exactamente 4 digitos
 * numericos (ver lib/auth/autenticacion.ts, cambiarPin) sin confiar solo en
 * la validacion del cliente.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { pin?: string };
      const usuario = cambiarPin(params.id, body.pin ?? "");
      return Response.json({ usuario });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
