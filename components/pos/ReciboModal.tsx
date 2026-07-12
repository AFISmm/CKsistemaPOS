"use client";

import { useEffect, useState } from "react";
import type { Pago, Pedido } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";

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
  const [impreso, setImpreso] = useState(false);

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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mb-2 text-4xl">✓</div>
        <h2 className="text-xl font-bold text-ck-dark">Pago completado</h2>
        <p className="mb-4 text-sm text-neutral-500">Orden #{pedido.numeroOrden}</p>

        <div className="mb-4 rounded-xl bg-neutral-50 p-4 text-left text-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">Detalle</p>
          <ul className="mb-3 space-y-1">
            {pedido.lineas.map((linea) => (
              <li key={linea.id} className="flex justify-between text-neutral-700">
                <span>
                  {linea.cantidad}x {linea.descripcion}
                </span>
                <span>{formatearDinero(linea.subtotalLinea)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-neutral-200 pt-2">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>{formatearDinero(pedido.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Descuento</span>
              <span>-{formatearDinero(pedido.descuentoTotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Impuesto</span>
              <span>{formatearDinero(pedido.impuestoTotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Propina</span>
              <span>{formatearDinero(pedido.propinaTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-ck-dark">
              <span>Total</span>
              <span>{formatearDinero(pedido.total)}</span>
            </div>
            {totalCambio > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Cambio entregado</span>
                <span>{formatearDinero(totalCambio)}</span>
              </div>
            )}
          </div>

          <p className="mb-1 mt-3 text-xs font-semibold uppercase text-neutral-500">
            Metodo(s) de pago
          </p>
          <ul className="space-y-1">
            {pagos.map((p) => (
              <li key={p.id} className="flex justify-between text-neutral-700">
                <span>
                  {p.metodo === "efectivo" ? "Efectivo" : "Tarjeta"}
                  {p.ultimos4 ? ` ****${p.ultimos4}` : ""} · {p.estado}
                </span>
                <span>{formatearDinero(p.monto + p.propina)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-4 text-xs font-medium text-green-700">
          {impreso ? "Recibo impreso (demo)" : "Imprimiendo recibo..."}
        </p>

        <button
          type="button"
          onClick={onNuevoPedido}
          className="w-full rounded-xl bg-ck-red py-4 text-lg font-bold text-white active:scale-95"
        >
          Nuevo pedido
        </button>
      </div>
    </div>
  );
}
