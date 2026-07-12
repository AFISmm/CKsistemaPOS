"use client";

import { useEffect, useState } from "react";
import type { Pago, Pedido } from "@/lib/domain/types";
import { aCentavos, formatearDinero } from "@/lib/domain/types";
import { ErrorApi, registrarPago, type MetodoCobro, type PagoResponse } from "./api";

interface Props {
  pedido: Pedido;
  saldoPendiente: number;
  propinaAcumulada: number;
  historialPagos: Pago[];
  sinConexion: boolean;
  onCerrar: () => void;
  onPagoRegistrado: (resultado: PagoResponse) => void;
}

const PORCENTAJES_PROPINA = [10, 15, 20];

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  aprobado: { texto: "Pago aprobado", clase: "bg-green-100 text-green-700" },
  rechazado: { texto: "Pago rechazado", clase: "bg-red-100 text-ck-red" },
  encolado: { texto: "Encolado (offline) — se confirmara al reconectar", clase: "bg-ck-gold/20 text-ck-gold" },
  pendiente: { texto: "Pago pendiente", clase: "bg-neutral-200 text-neutral-700" },
  reembolsado: { texto: "Reembolsado", clase: "bg-neutral-200 text-neutral-700" },
};

/**
 * Modal de cobro. Soporta efectivo, tarjeta (simulada, con offline / rechazo
 * forzado para demostrar los tres caminos del PSP mock) y pago MIXTO: cada
 * envio es un pago parcial contra el saldo pendiente; el modal permanece
 * abierto mientras saldoPendiente > 0 para permitir varios metodos.
 */
export default function CobroModal({
  pedido,
  saldoPendiente,
  propinaAcumulada,
  historialPagos,
  sinConexion,
  onCerrar,
  onPagoRegistrado,
}: Props) {
  const [metodo, setMetodo] = useState<MetodoCobro>("efectivo");
  const [montoTexto, setMontoTexto] = useState((saldoPendiente / 100).toFixed(2));
  const [propinaTexto, setPropinaTexto] = useState("0.00");
  const [montoRecibidoTexto, setMontoRecibidoTexto] = useState("");
  const [offline, setOffline] = useState(sinConexion);
  const [forzarRechazo, setForzarRechazo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<Pago | null>(null);

  const propinaYaAplicada = propinaAcumulada > 0;

  // Cada vez que el saldo pendiente cambia (tras un pago parcial), refresca
  // el monto sugerido para el siguiente tender.
  useEffect(() => {
    setMontoTexto((saldoPendiente / 100).toFixed(2));
    setMontoRecibidoTexto("");
    if (propinaYaAplicada) setPropinaTexto("0.00");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldoPendiente]);

  const monto = Math.max(0, Math.round(Number(montoTexto || 0) * 100));
  const propina = propinaYaAplicada ? 0 : Math.max(0, aCentavos(Number(propinaTexto || 0)));
  const montoRecibido = aCentavos(Number(montoRecibidoTexto || 0));
  const totalACobrarAhora = monto + propina;
  const cambio = metodo === "efectivo" ? montoRecibido - totalACobrarAhora : 0;

  const excedeSaldo = monto > saldoPendiente;
  const montoInvalido = monto <= 0 || excedeSaldo;
  const efectivoInsuficiente = metodo === "efectivo" && montoRecibido < totalACobrarAhora;
  const formularioValido = !montoInvalido && !efectivoInsuficiente;

  function calcularPropinaPorcentaje(pct: number) {
    const base = pedido.subtotal; // sugerencia sobre subtotal (practica habitual QSR)
    setPropinaTexto(((base * pct) / 100 / 100).toFixed(2));
  }

  async function confirmarPago() {
    if (!formularioValido || enviando) return;
    setEnviando(true);
    setErrorMsg(null);
    try {
      const resultado = await registrarPago({
        pedidoId: pedido.id,
        metodo,
        monto,
        propina,
        montoRecibido: metodo === "efectivo" ? montoRecibido : undefined,
        offline: metodo === "tarjeta" ? offline : undefined,
        forzarRechazo: metodo === "tarjeta" ? forzarRechazo : undefined,
      });
      setUltimoResultado(resultado.pago);
      onPagoRegistrado(resultado);
    } catch (err) {
      setErrorMsg(err instanceof ErrorApi ? err.message : "No se pudo registrar el pago.");
    } finally {
      setEnviando(false);
    }
  }

  const banner = ultimoResultado ? ETIQUETA_ESTADO[ultimoResultado.estado] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-lg font-bold text-ck-dark">Cobrar orden #{pedido.numeroOrden}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-2 text-2xl leading-none text-neutral-400 hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-neutral-50 p-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Total de la orden</span>
            <span className="font-semibold">{formatearDinero(pedido.total)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Ya pagado</span>
            <span>{formatearDinero(pedido.total - saldoPendiente)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1 text-base font-bold text-ck-red">
            <span>Saldo pendiente</span>
            <span>{formatearDinero(saldoPendiente)}</span>
          </div>
        </div>

        {historialPagos.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-neutral-500">
              Pagos registrados
            </p>
            <ul className="space-y-1">
              {historialPagos.map((p) => (
                <li key={p.id} className="flex justify-between text-xs text-neutral-600">
                  <span>
                    {p.metodo === "efectivo" ? "Efectivo" : "Tarjeta"} · {p.estado}
                  </span>
                  <span>{formatearDinero(p.monto + p.propina)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {banner && (
          <div className={`mb-4 rounded-xl px-3 py-2 text-sm font-semibold ${banner.clase}`}>
            {banner.texto}
          </div>
        )}

        {sinConexion && (
          <div className="mb-4 rounded-xl bg-ck-gold/20 px-3 py-2 text-xs font-semibold text-ck-gold">
            Sin conexion detectada: el pago con tarjeta se encolara (offline) para no
            bloquear al cajero.
          </div>
        )}

        {saldoPendiente <= 0 ? (
          <p className="rounded-xl bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
            Esta orden ya esta pagada por completo.
          </p>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMetodo("efectivo")}
                className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                  metodo === "efectivo" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark"
                }`}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodo("tarjeta")}
                className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                  metodo === "tarjeta" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark"
                }`}
              >
                Tarjeta
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Monto a cobrar ahora (USD)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
              {excedeSaldo && (
                <p className="mt-1 text-xs font-semibold text-ck-red">
                  No puede superar el saldo pendiente ({formatearDinero(saldoPendiente)}).
                </p>
              )}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                Propina {propinaYaAplicada && "(ya registrada en esta orden)"}
              </label>
              {!propinaYaAplicada && (
                <div className="mb-2 flex gap-2">
                  {PORCENTAJES_PROPINA.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => calcularPropinaPorcentaje(pct)}
                      className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-ck-dark hover:border-ck-red"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPropinaTexto("0.00")}
                    className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-neutral-500"
                  >
                    Sin propina
                  </button>
                </div>
              )}
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={propinaYaAplicada}
                value={propinaTexto}
                onChange={(e) => setPropinaTexto(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base disabled:bg-neutral-100"
              />
            </div>

            {metodo === "efectivo" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                  Monto recibido del cliente (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={montoRecibidoTexto}
                  onChange={(e) => setMontoRecibidoTexto(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
                />
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-neutral-500">Cambio</span>
                  <span className={`font-bold ${cambio < 0 ? "text-ck-red" : "text-ck-dark"}`}>
                    {formatearDinero(Math.max(0, cambio))}
                  </span>
                </div>
              </div>
            )}

            {metodo === "tarjeta" && (
              <div className="mb-3 space-y-2 rounded-xl bg-neutral-50 p-3">
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={offline}
                    onChange={(e) => setOffline(e.target.checked)}
                  />
                  Modo offline (store-and-forward, demo)
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={forzarRechazo}
                    onChange={(e) => setForzarRechazo(e.target.checked)}
                  />
                  Forzar rechazo (demo)
                </label>
              </div>
            )}

            {errorMsg && <p className="mb-3 text-sm font-semibold text-ck-red">{errorMsg}</p>}

            <button
              type="button"
              disabled={!formularioValido || enviando}
              onClick={confirmarPago}
              className={`w-full rounded-xl py-4 text-lg font-bold text-white active:scale-95 ${
                !formularioValido || enviando ? "cursor-not-allowed bg-neutral-300" : "bg-ck-red"
              }`}
            >
              {enviando ? "Procesando..." : `Cobrar ${formatearDinero(monto + propina)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
