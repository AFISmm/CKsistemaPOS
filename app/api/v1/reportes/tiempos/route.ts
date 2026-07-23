import { conPersistencia, getDb } from "@/lib/db/store";
import { respuestaError } from "@/lib/sales/http";
import { pedidoEnRangoFecha, type FilaTiempoPedido } from "@/lib/reportes/tiempos";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD de hoy y de "hace N dias", en UTC (misma convencion simple que fechaISOHaceDias en app/nomina/page.tsx). */
function fechaISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/v1/reportes/tiempos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *
 * Reporte operativo de trazabilidad de tiempos (Fase A, seccion 6.1): por
 * pedido dentro del rango de fechas (por `creadoEn`, inclusive en ambos
 * extremos; por defecto ultimos 7 dias), devuelve quien lo tomo, cuando entro
 * a cocina y cuando salio hacia caja/se cerro. El calculo de duraciones y la
 * agrupacion por hora del dia (para detectar cuellos de botella) se hacen en
 * el cliente (lib/reportes/tiempos.ts, funciones puras `calcularDuraciones` /
 * `agruparPorHoraDelDia`) a partir de estas filas ya resueltas.
 *
 * RESOLUCION DE "QUIEN LO TOMO" (dos columnas, no una, a proposito):
 *  - `creadoPorNombre`: viene de `Pedido.creadoPorUsuarioId` (agregado en esta
 *    misma tarea, ver lib/domain/types.ts) — la fuente MAS PRECISA, pero solo
 *    esta poblada para pedidos creados DESPUES de este cambio Y por un
 *    cliente que envie `usuarioId` en el body de POST /api/v1/pedidos (hoy
 *    NINGUNO lo hace: el cliente de POS, components/pos/api.ts, esta fuera
 *    del alcance editable de esta tarea — ver gap documentado en el reporte).
 *    `null` = no registrado.
 *  - `cajeroTurnoNombre`: PROXY de respaldo, siempre disponible: el usuario
 *    que ABRIO el turno de caja (`Turno.usuarioAperturaId`) al que pertenece
 *    el pedido. En el modelo de esta demo (un turno abierto a la vez por
 *    ubicacion) suele coincidir con quien de hecho tomo el pedido, pero NO es
 *    exacto si mas de un cajero opera bajo el mismo turno abierto — se
 *    etiqueta explicitamente como "cajero de turno" en la UI (no "quien tomo
 *    el pedido") para no sobre-prometer precision que el dato no tiene.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const desde = searchParams.get("desde") || fechaISO(6);
      const hasta = searchParams.get("hasta") || fechaISO(0);

      const db = getDb();
      const filas: FilaTiempoPedido[] = db.pedidos
        .filter((p) => pedidoEnRangoFecha(p.creadoEn, desde, hasta))
        .map((p) => {
          const turno = db.turnos.find((t) => t.id === p.turnoId);
          const creador = p.creadoPorUsuarioId
            ? db.usuarios.find((u) => u.id === p.creadoPorUsuarioId)
            : undefined;
          const cajeroTurno = turno
            ? db.usuarios.find((u) => u.id === turno.usuarioAperturaId)
            : undefined;

          return {
            id: p.id,
            numeroOrden: p.numeroOrden,
            nombreCliente: p.nombreCliente,
            canal: p.canal,
            estado: p.estado,
            creadoEn: p.creadoEn,
            enviadoACocinaEn: p.enviadoACocinaEn,
            entregadoEn: p.entregadoEn,
            cerradoEn: p.cerradoEn,
            creadoPorNombre: creador?.nombre ?? null,
            cajeroTurnoNombre: cajeroTurno?.nombre ?? null,
          };
        })
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

      return Response.json({ pedidos: filas, desde, hasta });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
