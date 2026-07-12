import { correrNomina, listarRecibos, type CorrerNominaInput } from "@/lib/nomina/calculo";
import { respuestaErrorNomina } from "@/lib/nomina/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/nomina?empleadoId= — lista recibos de pago ya generados. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recibos = listarRecibos({ empleadoId: searchParams.get("empleadoId") ?? undefined });
    return Response.json({ recibos });
  } catch (e) {
    return respuestaErrorNomina(e);
  }
}

/**
 * POST /api/v1/nomina — corre nomina de un periodo {periodoInicio, periodoFin, empleadoId?}.
 * DEMO: tasas de retencion y regla de horas extra son ficticias, ver
 * README-DEMO.md / lib/nomina/calculo.ts.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CorrerNominaInput;
    const recibos = correrNomina(body);
    return Response.json({ recibos }, { status: 201 });
  } catch (e) {
    return respuestaErrorNomina(e);
  }
}
