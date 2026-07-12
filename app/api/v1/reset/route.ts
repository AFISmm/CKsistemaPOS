import { resetDb } from "@/lib/db/store";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/reset — reinicia el estado en memoria de la demo (resetDb). */
export async function POST() {
  try {
    resetDb();
    return Response.json({ ok: true, mensaje: "Estado de la demo reiniciado" });
  } catch (e) {
    return respuestaError(e);
  }
}
