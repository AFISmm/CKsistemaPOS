"use client";

import { useEffect, useState } from "react";
import type { Pago, Pedido } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  pedido: Pedido;
  pagos: Pago[];
  onNuevoPedido: () => void;
}

/**
 * Recibo final: se muestra cuando el saldo pendiente llega a 0. Todos los
 * montos vienen del Pedido devuelto por el backend (fuente unica de verdad).
 * La "impresion" es simulada (stub de hardware, ver lib/hardware) — aqui solo
 * dejamos constancia en consola y en pantalla, tal como pide la demo.
 */
export default function ReciboModal({ pedido, pagos, onNuevoPedido }: Props) {
  const { t } = useI18n();
  const [impreso, setImpreso] = useState(false);

  const ETIQUETA_ESTADO_PAGO: Record<string, string> = {
    aprobado: t("pos.cobro.estadoAprobado"),
    rechazado: t("pos.cobro.estadoRechazado"),
    encolado: t("pos.cobro.estadoEncolado"),
    pendiente: t("pos.cobro.estadoPendiente"),
    reembolsado: t("pos.cobro.estadoReembolsado"),
  };

  useEffect(() => {
    // Simulacion de impresion de recibo (demo). En produccion: driver ESC/POS
    // real via lib/hardware (fase 3).
    // eslint-disable-next-line no-console
    console.log("[recibo-impreso-demo]", {
      orden: pedido.numeroOrden,
      total: pedido.total,
      pagos: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto, propina: p.propina })),
    });
    setImpreso(true);
  }, [pedido, pagos]);

  const totalCambio = pagos.reduce((acc, p) => acc + (p.cambio ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
        <div className="mb-2 text-4xl">✓</div>
        <h2 className="text-xl font-bold text-ck-dark dark:text-neutral-100">{t("pos.recibo.pagoCompletado")}</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {t("pos.recibo.orden", { numero: pedido.numeroOrden })}
        </p>

        <div className="mb-4 rounded-xl bg-neutral-50 p-4 text-left text-sm dark:bg-neutral-800">
          <p className="mb-2 text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
            {t("pos.recibo.detalle")}
          </p>
          <ul className="mb-3 space-y-1">
            {pedido.lineas.map((linea) => (
              <li key={linea.id} className="flex justify-between text-neutral-700 dark:text-neutral-200">
                <span>
                  {linea.cantidad}x {linea.descripcion}
                </span>
                <span>{formatearDinero(linea.subtotalLinea)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-700">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>{t("pos.recibo.subtotal")}</span>
              <span>{formatearDinero(pedido.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>{t("pos.recibo.descuento")}</span>
              <span>-{formatearDinero(pedido.descuentoTotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>{t("pos.recibo.impuesto")}</span>
              <span>{formatearDinero(pedido.impuestoTotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
              <span>{t("pos.recibo.propina")}</span>
              <span>{formatearDinero(pedido.propinaTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-ck-dark dark:text-neutral-100">
              <span>{t("pos.recibo.total")}</span>
              <span>{formatearDinero(pedido.total)}</span>
            </div>
            {totalCambio > 0 && (
              <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                <span>{t("pos.recibo.cambioEntregado")}</span>
                <span>{formatearDinero(totalCambio)}</span>
              </div>
            )}
          </div>

          <p className="mb-1 mt-3 text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
            {t("pos.recibo.metodosPago")}
          </p>
          <ul className="space-y-1">
            {pagos.map((p) => (
              <li key={p.id} className="flex justify-between text-neutral-700 dark:text-neutral-200">
                <span>
                  {p.metodo === "efectivo" ? t("pos.cobro.efectivo") : t("pos.cobro.tarjeta")}
                  {p.ultimos4 ? ` ****${p.ultimos4}` : ""} ·{" "}
                  {ETIQUETA_ESTADO_PAGO[p.estado] ?? p.estado}
                </span>
                <span>{formatearDinero(p.monto + p.propina)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-4 text-xs font-medium text-green-700 dark:text-green-400">
          {impreso ? t("pos.recibo.impreso") : t("pos.recibo.imprimiendo")}
        </p>

        <button
          type="button"
          onClick={onNuevoPedido}
          className="w-full rounded-xl bg-ck-red py-4 text-lg font-bold text-white active:scale-95"
        >
          {t("pos.recibo.nuevoPedido")}
        </button>
      </div>
    </div>
  );
}
