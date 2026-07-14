/**
 * Cola offline — DEMO simplificada (ver lib/sales/offlineState.ts).
 * Expone el interruptor de modo offline por tienda; NO implementa el
 * store-and-forward real (eso es responsabilidad de arquitecto-pos/pagos-pos
 * fuera de esta app). Mientras esta activo, el motor de ventas
 * (lib/sales/engine.ts) trata los pagos con tarjeta como "encolado".
 */
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";
import { getModoOffline, setModoOffline } from "@/lib/sales/offlineState";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/offline — consulta el estado actual del flag. */
export async function GET() {
  return conPersistencia(async () => {
    return Response.json({ activo: getModoOffline() });
  });
}

/** POST /api/v1/offline — {activo:boolean}. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => null)) as { activo?: boolean } | null;
      if (!body || typeof body.activo !== "boolean") {
        throw new ErrorDominio("cuerpo_invalido", "Se requiere activo (boolean)", 422);
      }
      setModoOffline(body.activo);
      return Response.json({ activo: getModoOffline() });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
