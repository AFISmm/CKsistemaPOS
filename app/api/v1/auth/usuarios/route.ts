import { listarUsuarios } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/usuarios — lista de Usuario (sin pinHash) + `pinActualDemo`
 * (PIN en texto plano) para el panel "Gestionar perfiles" del sidebar. El PIN
 * en claro SOLO es posible por el formato de almacenamiento demo
 * (`pinHash = "demo:<pin>"`, no un hash criptografico real) — ver la nota de
 * cumplimiento en lib/auth/autenticacion.ts (listarUsuarios/UsuarioConPinDemo)
 * antes de tocar este endpoint.
 */
export async function GET() {
  try {
    const usuarios = listarUsuarios();
    return Response.json({ usuarios });
  } catch (e) {
    return respuestaErrorAuth(e);
  }
}
