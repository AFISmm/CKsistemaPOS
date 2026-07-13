import { listarUsuarios } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/usuarios — lista de Usuario (sin pinHash, nunca se expone
 * el hash) para el modal "Gestionar perfiles" del sidebar. Ver
 * lib/auth/autenticacion.ts (listarUsuarios).
 */
export async function GET() {
  try {
    const usuarios = listarUsuarios();
    return Response.json({ usuarios });
  } catch (e) {
    return respuestaErrorAuth(e);
  }
}
