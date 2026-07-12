"use client";

import type { Pedido } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  pedido: Pedido | null;
  actualizandoLineaId: string | null;
  enviandoACocina: boolean;
  onCambiarCantidad: (lineaId: string, nuevaCantidad: number) => void;
  onEliminarLinea: (lineaId: string) => void;
  onEnviarACocina: () => void;
  onAbrirDescuento: () => void;
  onAbrirCobro: () => void;
}

/**
 * Ticket en vivo (panel derecho). SIEMPRE muestra los totales tal como los
 * devuelve el backend (subtotal/descuento/impuesto/propina/total en centavos).
 * Nunca se recalcula nada de dinero en el cliente.
 */
export default function Ticket({
  pedido,
  actualizandoLineaId,
  enviandoACocina,
  onCambiarCantidad,
  onEliminarLinea,
  onEnviarACocina,
  onAbrirDescuento,
  onAbrirCobro,
}: Props) {
  const { t } = useI18n();

  const ETIQUETA_ESTADO_COCINA: Record<string, string> = {
    recibido: t("pos.ticket.estadoRecibido"),
    preparando: t("pos.ticket.estadoPreparando"),
    listo: t("pos.ticket.estadoListo"),
  };

  if (!pedido) {
    return (
      <aside className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:w-96">
        <p className="text-sm text-neutral-400">{t("pos.ticket.cargandoPedido")}</p>
      </aside>
    );
  }

  const hayLineas = pedido.lineas.length > 0;
  const puedeEnviarACocina =
    hayLineas && (pedido.estado === "abierto" || pedido.estado === "enviadoCocina");
  const yaEnviado = pedido.estado !== "abierto";

  return (
    <aside className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm lg:w-96">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4">
        <div>
          <h2 className="text-lg font-bold text-ck-dark">
            {t("pos.ticket.orden", { numero: pedido.numeroOrden })}
          </h2>
          <p className="text-xs text-neutral-500">
            {pedido.nombreCliente || t("pos.ticket.clienteMostrador")}
          </p>
        </div>
        {yaEnviado && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            {t("pos.ticket.enviadoACocina")}
          </span>
        )}
      </div>

      <div className="max-h-[45vh] flex-1 overflow-y-auto p-4">
        {!hayLineas && (
          <p className="py-6 text-center text-sm text-neutral-400">
            {t("pos.ticket.tocaProducto")}
          </p>
        )}
        <ul className="space-y-3">
          {pedido.lineas.map((linea) => {
            const bloqueada = actualizandoLineaId === linea.id;
            return (
              <li key={linea.id} className="rounded-lg border border-neutral-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ck-dark">{linea.descripcion}</p>
                    {linea.modificadores.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {linea.modificadores.map((mod) => (
                          <li key={mod.id} className="text-xs text-neutral-500">
                            {mod.tipo === "sin"
                              ? t("pos.ticket.modSinPrefijo")
                              : t("pos.ticket.modAgregarPrefijo")}
                            {mod.descripcion}
                            {mod.precioDelta !== 0 && ` (${formatearDinero(mod.precioDelta)})`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {linea.notas && (
                      <p className="mt-1 text-xs italic text-neutral-400">
                        {t("pos.ticket.notaPrefijo", { nota: linea.notas })}
                      </p>
                    )}
                    {yaEnviado && (
                      <span className="mt-1 inline-block text-[11px] font-semibold text-ck-gold">
                        {ETIQUETA_ESTADO_COCINA[linea.estadoCocina] ?? linea.estadoCocina}
                      </span>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold text-ck-dark">
                    {formatearDinero(linea.subtotalLinea)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={bloqueada}
                      onClick={() => onCambiarCantidad(linea.id, linea.cantidad - 1)}
                      className="h-9 w-9 rounded-full bg-neutral-200 text-lg font-bold text-ck-dark active:scale-95 disabled:opacity-40"
                      aria-label={t("pos.ticket.restarUnidad")}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-semibold">{linea.cantidad}</span>
                    <button
                      type="button"
                      disabled={bloqueada}
                      onClick={() => onCambiarCantidad(linea.id, linea.cantidad + 1)}
                      className="h-9 w-9 rounded-full bg-neutral-200 text-lg font-bold text-ck-dark active:scale-95 disabled:opacity-40"
                      aria-label={t("pos.ticket.sumarUnidad")}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={bloqueada}
                    onClick={() => onEliminarLinea(linea.id)}
                    className="text-xs font-semibold text-ck-red underline disabled:opacity-40"
                  >
                    {t("pos.ticket.quitar")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-1 border-t border-neutral-200 p-4 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>{t("pos.ticket.subtotal")}</span>
          <span>{formatearDinero(pedido.subtotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>{t("pos.ticket.descuento")}</span>
          <span>-{formatearDinero(pedido.descuentoTotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>{t("pos.ticket.impuesto")}</span>
          <span>{formatearDinero(pedido.impuestoTotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>{t("pos.ticket.propina")}</span>
          <span>{formatearDinero(pedido.propinaTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-2 text-lg font-bold text-ck-dark">
          <span>{t("pos.ticket.total")}</span>
          <span>{formatearDinero(pedido.total)}</span>
        </div>
      </div>

      <div className="space-y-2 p-4 pt-0">
        <button
          type="button"
          onClick={onAbrirDescuento}
          disabled={!hayLineas}
          className="w-full rounded-xl border border-ck-gold py-2 text-sm font-semibold text-ck-gold disabled:opacity-40"
        >
          {t("pos.ticket.aplicarDescuento")}
        </button>
        <button
          type="button"
          onClick={onEnviarACocina}
          disabled={!puedeEnviarACocina || enviandoACocina}
          className="w-full rounded-xl bg-ck-dark py-3 text-base font-bold text-white active:scale-95 disabled:opacity-40"
        >
          {enviandoACocina ? t("pos.ticket.enviando") : t("pos.ticket.enviarACocina")}
        </button>
        <button
          type="button"
          onClick={onAbrirCobro}
          disabled={!hayLineas}
          className="w-full rounded-xl bg-ck-red py-4 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
        >
          {t("pos.ticket.cobrar", { monto: formatearDinero(pedido.total) })}
        </button>
      </div>
    </aside>
  );
}
