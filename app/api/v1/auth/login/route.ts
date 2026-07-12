import { iniciarSesion } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login — sesion DEMO por PIN {pin: string}.
 * Ver lib/auth/autenticacion.ts para el aviso completo de simplificacion.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { pin?: string };
    const { usuario, rol } = iniciarSesion(body.pin ?? "");
    return Response.json({ usuario, rol });
  } catch (e) {
    return respuestaErrorAuth(e);
  }
}
