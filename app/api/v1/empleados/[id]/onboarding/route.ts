import {
  completarOnboarding,
  type CompletarOnboardingInput,
} from "@/lib/rrhh/empleados";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/empleados/[id]/onboarding — completa onboarding {pin}: crea Usuario y pasa a "activo". */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as CompletarOnboardingInput;
      const empleado = completarOnboarding(params.id, body);
      return Response.json({ empleado });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
