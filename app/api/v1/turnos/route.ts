import { abrirTurno, type AbrirTurnoInput } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/turnos — abre un turno {ubicacionId?, usuarioAperturaId, fondoInicial?}. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as AbrirTurnoInput;
      const turno = abrirTurno(body);
      return Response.json({ turno }, { status: 201 });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
