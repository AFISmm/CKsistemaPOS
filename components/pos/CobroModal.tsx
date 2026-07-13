"use client";

import { useEffect, useState } from "react";
import type { Pago, Pedido } from "@/lib/domain/types";
import { aCentavos, formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { registrarPago, type MetodoCobro, type PagoResponse } from "./api";

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
  const { t } = useI18n();

  const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
    aprobado: { texto: t("pos.cobro.estadoAprobado"), clase: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    rechazado: { texto: t("pos.cobro.estadoRechazado"), clase: "bg-red-100 text-ck-red dark:bg-red-950/40 dark:text-red-300" },
    encolado: { texto: t("pos.cobro.estadoEncolado"), clase: "bg-ck-gold/20 text-ck-gold" },
    pendiente: { texto: t("pos.cobro.estadoPendiente"), clase: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200" },
    reembolsado: { texto: t("pos.cobro.estadoReembolsado"), clase: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200" },
  };

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
      setErrorMsg(textoErrorApi(err, t, "pos.cobro.errorNoPudoRegistrarPago"));
    } finally {
      setEnviando(false);
    }
  }

  const banner = ultimoResultado ? ETIQUETA_ESTADO[ultimoResultado.estado] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-lg font-bold text-ck-dark dark:text-neutral-100">
            {t("pos.cobro.titulo", { numero: pedido.numeroOrden })}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-2 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={t("pos.cobro.cerrar")}
          >
            &times;
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
          <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
            <span>{t("pos.cobro.totalOrden")}</span>
            <span className="font-semibold">{formatearDinero(pedido.total)}</span>
          </div>
          <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
            <span>{t("pos.cobro.yaPagado")}</span>
            <span>{formatearDinero(pedido.total - saldoPendiente)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1 text-base font-bold text-ck-red dark:border-neutral-700">
            <span>{t("pos.cobro.saldoPendiente")}</span>
            <span>{formatearDinero(saldoPendiente)}</span>
          </div>
        </div>

        {historialPagos.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400">
              {t("pos.cobro.pagosRegistrados")}
            </p>
            <ul className="space-y-1">
              {historialPagos.map((p) => (
                <li key={p.id} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-300">
                  <span>
                    {p.metodo === "efectivo" ? t("pos.cobro.efectivo") : t("pos.cobro.tarjeta")} ·{" "}
                    {ETIQUETA_ESTADO[p.estado]?.texto ?? p.estado}
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
            {t("pos.cobro.sinConexionAviso")}
          </div>
        )}

        {saldoPendiente <= 0 ? (
          <p className="rounded-xl bg-green-50 p-4 text-center text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {t("pos.cobro.pagadaCompleto")}
          </p>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMetodo("efectivo")}
                className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                  metodo === "efectivo" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark dark:bg-neutral-800 dark:text-neutral-100"
                }`}
              >
                {t("pos.cobro.efectivo")}
              </button>
              <button
                type="button"
                onClick={() => setMetodo("tarjeta")}
                className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                  metodo === "tarjeta" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark dark:bg-neutral-800 dark:text-neutral-100"
                }`}
              >
                {t("pos.cobro.tarjeta")}
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("pos.cobro.montoACobrarLabel")}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              {excedeSaldo && (
                <p className="mt-1 text-xs font-semibold text-ck-red dark:text-red-400">
                  {t("pos.cobro.excedeSaldo", { monto: formatearDinero(saldoPendiente) })}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("pos.cobro.propinaLabel")}{" "}
                {propinaYaAplicada && t("pos.cobro.propinaYaRegistrada")}
              </label>
              {!propinaYaAplicada && (
                <div className="mb-2 flex gap-2">
                  {PORCENTAJES_PROPINA.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => calcularPropinaPorcentaje(pct)}
                      className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-ck-dark hover:border-ck-red dark:border-neutral-600 dark:text-neutral-100"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPropinaTexto("0.00")}
                    className="flex-1 rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
                  >
                    {t("pos.cobro.sinPropina")}
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-ck-dark disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:disabled:bg-neutral-800/50"
              />
            </div>

            {metodo === "efectivo" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {t("pos.cobro.montoRecibidoLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={montoRecibidoTexto}
                  onChange={(e) => setMontoRecibidoTexto(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">{t("pos.cobro.cambio")}</span>
                  <span className={`font-bold ${cambio < 0 ? "text-ck-red dark:text-red-400" : "text-ck-dark dark:text-neutral-100"}`}>
                    {formatearDinero(Math.max(0, cambio))}
                  </span>
                </div>
              </div>
            )}

            {metodo === "tarjeta" && (
              <div className="mb-3 space-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={offline}
                    onChange={(e) => setOffline(e.target.checked)}
                  />
                  {t("pos.cobro.modoOffline")}
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={forzarRechazo}
                    onChange={(e) => setForzarRechazo(e.target.checked)}
                  />
                  {t("pos.cobro.forzarRechazo")}
                </label>
              </div>
            )}

            {errorMsg && <p className="mb-3 text-sm font-semibold text-ck-red dark:text-red-400">{errorMsg}</p>}

            <button
              type="button"
              disabled={!formularioValido || enviando}
              onClick={confirmarPago}
              className={`w-full rounded-xl py-4 text-lg font-bold text-white active:scale-95 ${
                !formularioValido || enviando ? "cursor-not-allowed bg-neutral-300 dark:bg-neutral-700" : "bg-ck-red"
              }`}
            >
              {enviando
                ? t("pos.cobro.procesando")
                : t("pos.cobro.cobrarBoton", { monto: formatearDinero(monto + propina) })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
