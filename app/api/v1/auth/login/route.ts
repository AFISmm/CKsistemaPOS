import { iniciarSesion } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login — sesion DEMO por correo+PIN {email, pin}.
 * Ver lib/auth/autenticacion.ts para el aviso completo de simplificacion.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { email?: string; pin?: string };
      const { usuario, rol } = iniciarSesion(body.email ?? "", body.pin ?? "");
      return Response.json({ usuario, rol });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
