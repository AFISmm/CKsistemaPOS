import { registrarEmpleado, type RegistroInput } from "@/lib/auth/registro";
import { respuestaErrorAuth } from "@/lib/auth/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/registrar — auto-registro (primera vez) desde /login,
 * paso 2b. Body: {nombre, apellido, ssnUltimos4, email, telefono}. Crea un
 * Empleado en estado "onboarding" (mismo mecanismo que la alta manual del
 * gerente, ver lib/auth/registro.ts); NO inicia sesion (no hay PIN todavia,
 * eso lo asigna un gerente via "Completar onboarding").
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as Partial<RegistroInput>;
      const empleado = registrarEmpleado({
        nombre: body.nombre ?? "",
        apellido: body.apellido ?? "",
        ssnUltimos4: body.ssnUltimos4 ?? "",
        email: body.email ?? "",
        telefono: body.telefono ?? "",
        pin: body.pin ?? "",
      });
      return Response.json({ empleado }, { status: 201 });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
