import { iniciarSesion } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";
import { emitirTokenSesion } from "@/lib/auth/sesionToken";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login — login por correo+PIN {email, pin}.
 * Ver lib/auth/autenticacion.ts para el aviso completo de simplificacion del
 * PIN. A partir de Fase B/seguridad (revision 2026-07-22), la respuesta
 * incluye ademas un `token` de sesion FIRMADO (ver lib/auth/sesionToken.ts):
 * es lo que el cliente debe guardar (ya NO el `usuarioId` en crudo, ver
 * lib/shell/SesionProvider.tsx) y mandar como `Authorization: Bearer <token>`
 * en cada request que necesite identidad verificada.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { email?: string; pin?: string };
      const { usuario, rol } = iniciarSesion(body.email ?? "", body.pin ?? "");
      const token = await emitirTokenSesion(usuario.id);
      return Response.json({ usuario, rol, token });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
