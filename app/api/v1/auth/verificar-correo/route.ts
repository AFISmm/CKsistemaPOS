import { verificarCorreo } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/verificar-correo?email=... — paso 1 de /login. Se llama
 * SIN sesion. Responde SOLO { registrado, pinHabilitado }: lo minimo para que
 * el frontend decida si mostrar el teclado de PIN, el aviso de "pendiente de
 * aprobacion" o el formulario de auto-registro. Nunca expone datos de otros
 * empleados. Ver lib/auth/autenticacion.ts (verificarCorreo) para el detalle.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const email = searchParams.get("email") ?? "";
      const resultado = verificarCorreo(email);
      return Response.json(resultado);
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
