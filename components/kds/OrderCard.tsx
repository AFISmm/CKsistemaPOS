"use client";

import type { Pedido } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import {
  clasesEstado,
  estadoCocinaAgregado,
  excedeSla,
  formatearCronometro,
  msTranscurridos,
} from "@/lib/kitchen/kds";

/** Traduce el canal de origen del pedido a una clave de i18n (kds.canal.*). */
const CLAVE_CANAL: Record<Pedido["canal"], string> = {
  mostrador: "kds.canal.mostrador",
  kiosco: "kds.canal.kiosco",
  online: "kds.canal.online",
  delivery: "kds.canal.delivery",
  catering: "kds.canal.catering",
};

/** Traduce el estado de cocina agregado a una clave de i18n (kds.estado.*). */
const CLAVE_ESTADO: Record<string, string> = {
  recibido: "kds.estado.recibido",
  preparando: "kds.estado.preparando",
  listo: "kds.estado.listo",
};

interface Props {
  pedido: Pedido;
  ahoraMs: number;
  /** true = ya llego a "listo" y esta en periodo de gracia antes de salir de la cola. */
  atenuado: boolean;
  /** true = hay una accion (POST) en curso para este pedido; deshabilita botones. */
  enProgreso: boolean;
  onAvanzar: (pedido: Pedido) => void;
}

/** Tarjeta de comanda individual del KDS. Solo presentacion; sin fetch propio. */
export default function OrderCard({
  pedido,
  ahoraMs,
  atenuado,
  enProgreso,
  onAvanzar,
}: Props) {
  const { t } = useI18n();
  const estado = estadoCocinaAgregado(pedido);
  const clases = clasesEstado(estado);
  const transcurridoMs = msTranscurridos(pedido.creadoEn, ahoraMs);
  const enAlerta = excedeSla(pedido.creadoEn, ahoraMs) && estado !== "listo";

  return (
    <section
      aria-label={t("kds.comandaAria", { numero: pedido.numeroOrden })}
      className={`flex flex-col rounded-2xl border-4 bg-neutral-900 shadow-lg transition-opacity duration-700 ${clases.borde} ${
        atenuado ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* Franja de estado */}
      <div
        className={`flex items-center justify-between rounded-t-xl px-4 py-2 ${clases.franja}`}
      >
        <span className="text-lg font-extrabold uppercase tracking-wide text-neutral-950">
          {t(CLAVE_ESTADO[estado] ?? "kds.estado.recibido")}
        </span>
        <span className="rounded-full bg-neutral-950/20 px-3 py-1 text-sm font-bold uppercase text-neutral-950">
          {t(CLAVE_CANAL[pedido.canal] ?? "kds.canal.mostrador")}
        </span>
      </div>

      {/* Cabecera: numero, cliente, cronometro */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div>
          <div className="text-4xl font-black leading-none text-white">
            #{pedido.numeroOrden}
          </div>
          <div className="mt-1 max-w-[10rem] truncate text-lg font-semibold text-neutral-300">
            {pedido.nombreCliente || t("kds.cliente")}
          </div>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-right font-mono text-3xl font-bold tabular-nums ${
            enAlerta ? "animate-pulse bg-red-700 text-white" : "text-neutral-200"
          }`}
          aria-label={t("kds.tiempoAria")}
        >
          {formatearCronometro(transcurridoMs)}
          {enAlerta && (
            <div className="text-xs font-bold uppercase tracking-wider">
              {t("kds.slaExcedido")}
            </div>
          )}
        </div>
      </div>

      {/* Lineas de pedido */}
      <div className="flex-1 space-y-3 px-4 py-3">
        {pedido.lineas.map((linea) => (
          <div
            key={linea.id}
            className="rounded-lg bg-neutral-800/70 px-3 py-2 leading-snug"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {linea.cantidad}×
              </span>
              <span className="text-xl font-semibold text-white">
                {linea.descripcion}
              </span>
              <span
                className={`ml-auto rounded px-2 py-0.5 text-xs font-bold uppercase ${
                  clasesEstado(linea.estadoCocina).franja
                } text-neutral-950`}
              >
                {t(CLAVE_ESTADO[linea.estadoCocina] ?? "kds.estado.recibido")}
              </span>
            </div>

            {linea.modificadores.length > 0 && (
              <ul className="mt-1 ml-8 space-y-0.5">
                {linea.modificadores.map((m) => (
                  <li
                    key={m.id}
                    className={`text-base font-medium ${
                      m.tipo === "sin"
                        ? "text-red-400"
                        : m.tipo === "sustituir"
                          ? "text-sky-300"
                          : "text-lime-300"
                    }`}
                  >
                    {m.tipo === "sin"
                      ? t("kds.modSin", { desc: m.descripcion })
                      : m.tipo === "sustituir"
                        ? t("kds.modCambiar", { desc: m.descripcion })
                        : t("kds.modAgregar", { desc: m.descripcion })}
                  </li>
                ))}
              </ul>
            )}

            {linea.notas && (
              <div className="mt-1 ml-8 text-base italic text-yellow-300">
                {t("kds.nota", { nota: linea.notas })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Acciones */}
      {!atenuado && (
        <div className="p-3">
          {estado === "recibido" && (
            <button
              type="button"
              disabled={enProgreso}
              onClick={() => onAvanzar(pedido)}
              className="w-full rounded-xl bg-neutral-100 py-5 text-2xl font-extrabold uppercase text-neutral-900 shadow active:scale-[0.98] disabled:opacity-50"
            >
              {enProgreso ? t("kds.enviando") : t("kds.empezar")}
            </button>
          )}
          {estado === "preparando" && (
            <button
              type="button"
              disabled={enProgreso}
              onClick={() => onAvanzar(pedido)}
              className="w-full rounded-xl bg-emerald-500 py-5 text-2xl font-extrabold uppercase text-neutral-950 shadow active:scale-[0.98] disabled:opacity-50"
            >
              {enProgreso ? t("kds.enviando") : t("kds.listoBoton")}
            </button>
          )}
          {estado === "listo" && (
            <div className="w-full rounded-xl bg-emerald-900 py-4 text-center text-xl font-bold uppercase text-emerald-300">
              {t("kds.ordenLista")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
