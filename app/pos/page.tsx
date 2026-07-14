"use client";

/**
 * Terminal de Cajero (/pos) — pagina PRINCIPAL del modulo del mismo nombre en
 * el sidebar (ver lib/navigation/modulos.ts). Desde esta iteracion, esta
 * pantalla YA NO arma pedidos (eso vive en el sub-item "Nuevo pedido",
 * app/pos/nuevo/page.tsx): pasa a ser la pantalla de REVISAR los pedidos que
 * cocina ya termino y envio a caja (estado "entregado", ver `enviarACaja` en
 * lib/sales/engine.ts) y COBRARLOS.
 *
 * Flujo completo del pedido (documentado aqui para quien llegue a este
 * archivo sin el contexto de las otras piezas):
 *   1. Cajero arma el pedido en /pos/nuevo y lo "Envia a cocina"
 *      (estado "abierto" -> "enviadoCocina").
 *   2. Cocina (/kds) lo prepara: "Empezar" (-> "enPreparacion"), "Listo"
 *      (-> "listo" cuando todas las lineas terminan) y finalmente
 *      "Enviar a caja" (-> "entregado", fija `entregadoEn`).
 *   3. AQUI: la lista de abajo muestra todos los pedidos "entregado"
 *      (GET /api/v1/pedidos?estado=entregado), con polling ligero (5s, mas
 *      lento que el KDS que es cada 2.5s) + boton manual de actualizar. Click
 *      en una fila carga su detalle completo y lo muestra en el panel derecho
 *      reutilizando components/pos/Ticket.tsx — el MISMO componente que usa
 *      /pos/nuevo, pero esta vez CON la prop `onAbrirCobro` (ahora opcional,
 *      ver Ticket.tsx) para poder cobrar. Al completarse el pago
 *      (CobroModal -> saldoPendiente <= 0) el pedido pasa a "cobrado"
 *      (backend, lib/sales/engine.ts `registrarPagoEnPedido`) y se muestra
 *      ReciboModal; al cerrarlo, el pedido ya no aparece en esta lista.
 *
 * El calculo de dinero (subtotal/descuento/impuesto/propina/total, saldo
 * pendiente) es SIEMPRE responsabilidad del backend (backend-ventas-pos) —
 * este archivo nunca recalcula montos, solo muestra lo que el servidor
 * devuelve.
 */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import type { Pago, Pedido } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import {
  actualizarLinea,
  aplicarDescuento,
  enviarACocina,
  listarPedidosPorEstado,
  obtenerPedido,
  type PagoResponse,
} from "@/components/pos/api";
import Ticket from "@/components/pos/Ticket";
import DescuentoModal from "@/components/pos/DescuentoModal";
import CobroModal from "@/components/pos/CobroModal";
import ReciboModal from "@/components/pos/ReciboModal";

// DEMO: sin login de cajero en esta pantalla; se usa el usuario demo sembrado
// en lib/db/store.ts (rol cajero) para las acciones que requieren usuarioId.
const USUARIO_DEMO_ID = "user-cajero-demo";

/** Polling de la lista de "por cobrar", deliberadamente mas lento que el KDS
 * (2.5s, ver lib/kitchen/kds.ts POLLING_MS): esta pantalla no tiene la misma
 * presion de tiempo real que la cocina. */
const POLLING_LISTA_MS = 5000;

const CLAVE_CANAL: Record<Pedido["canal"], string> = {
  mostrador: "kds.canal.mostrador",
  kiosco: "kds.canal.kiosco",
  online: "kds.canal.online",
  delivery: "kds.canal.delivery",
  catering: "kds.canal.catering",
};

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleTimeString("es-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TerminalCajeroPage() {
  const { t } = useI18n();

  // ---------- Lista de pedidos "entregado" (por cobrar) ----------
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // ---------- Detalle del pedido seleccionado ----------
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [actualizandoLineaId, setActualizandoLineaId] = useState<string | null>(null);
  const [enviandoACocina, setEnviandoACocina] = useState(false);

  const [mostrarDescuento, setMostrarDescuento] = useState(false);
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  const [errorDescuento, setErrorDescuento] = useState<string | null>(null);

  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);
  const [pagosRealizados, setPagosRealizados] = useState<Pago[]>([]);
  const [mostrarRecibo, setMostrarRecibo] = useState(false);

  const [sinConexion, setSinConexion] = useState(false);

  // ---------- Deteccion de estado offline (visible, sin bloquear al cajero) ----------
  useEffect(() => {
    if (typeof navigator !== "undefined") setSinConexion(!navigator.onLine);
    const marcarOnline = () => setSinConexion(false);
    const marcarOffline = () => setSinConexion(true);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  // ---------- Carga de la lista "por cobrar" (poll + refresh manual) ----------
  const cargarLista = useCallback(async () => {
    try {
      const lista = await listarPedidosPorEstado("entregado");
      const ordenados = [...lista].sort((a, b) =>
        (a.entregadoEn ?? a.creadoEn).localeCompare(b.entregadoEn ?? b.creadoEn)
      );
      setPedidos(ordenados);
      setErrorLista(null);
    } catch (err) {
      setErrorLista(textoErrorApi(err, t, "pos.cobrar.errorCarga"));
    } finally {
      setCargandoLista(false);
    }
  }, [t]);

  useEffect(() => {
    cargarLista();
    const intervalo = setInterval(cargarLista, POLLING_LISTA_MS);
    return () => clearInterval(intervalo);
  }, [cargarLista]);

  // ---------- Seleccion de pedido / carga de detalle ----------
  const cargarDetalle = useCallback(
    async (pedidoId: string) => {
      setCargandoDetalle(true);
      setErrorGlobal(null);
      try {
        const detalle = await obtenerPedido(pedidoId);
        setPedido(detalle);
        setSaldoPendiente(null);
        setPagosRealizados([]);
        setMostrarCobro(false);
        setMostrarRecibo(false);
        setMostrarDescuento(false);
      } catch (err) {
        setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoActualizarPedido"));
      } finally {
        setCargandoDetalle(false);
      }
    },
    [t]
  );

  function seleccionarPedido(pedidoId: string) {
    setPedidoSeleccionadoId(pedidoId);
    cargarDetalle(pedidoId);
  }

  const refrescarPedido = useCallback(
    async (pedidoId: string) => {
      try {
        const actualizado = await obtenerPedido(pedidoId);
        setPedido(actualizado);
        return actualizado;
      } catch (err) {
        setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoActualizarPedido"));
        return null;
      }
    },
    [t]
  );

  // ---------- Cambios de linea en el ticket (mismas reglas de backend que /pos/nuevo) ----------
  async function cambiarCantidadLinea(lineaId: string, nuevaCantidad: number) {
    if (!pedido) return;
    setActualizandoLineaId(lineaId);
    setErrorGlobal(null);
    try {
      if (nuevaCantidad <= 0) {
        await actualizarLinea(pedido.id, lineaId, { eliminar: true });
      } else {
        await actualizarLinea(pedido.id, lineaId, { cantidad: nuevaCantidad });
      }
      await refrescarPedido(pedido.id);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoActualizarLinea"));
    } finally {
      setActualizandoLineaId(null);
    }
  }

  async function eliminarLinea(lineaId: string) {
    if (!pedido) return;
    setActualizandoLineaId(lineaId);
    setErrorGlobal(null);
    try {
      await actualizarLinea(pedido.id, lineaId, { eliminar: true });
      await refrescarPedido(pedido.id);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoQuitarLinea"));
    } finally {
      setActualizandoLineaId(null);
    }
  }

  // ---------- Enviar a cocina (deshabilitado por Ticket salvo estado abierto/enviadoCocina; un
  // pedido "entregado" nunca cumple esa condicion, pero se cablea el handler igual por
  // consistencia con el componente compartido). ----------
  async function manejarEnviarACocina() {
    if (!pedido) return;
    setEnviandoACocina(true);
    setErrorGlobal(null);
    try {
      await enviarACocina(pedido.id);
      await refrescarPedido(pedido.id);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoEnviarCocina"));
    } finally {
      setEnviandoACocina(false);
    }
  }

  // ---------- Descuento ----------
  async function confirmarDescuento(input: {
    tipo: "monto" | "porcentaje";
    valor: number;
    motivo: string;
  }) {
    if (!pedido) return;
    setAplicandoDescuento(true);
    setErrorDescuento(null);
    try {
      await aplicarDescuento(pedido.id, { ...input, usuarioId: USUARIO_DEMO_ID });
      await refrescarPedido(pedido.id);
      setMostrarDescuento(false);
    } catch (err) {
      setErrorDescuento(textoErrorApi(err, t, "pos.errorNoPudoAplicarDescuento"));
    } finally {
      setAplicandoDescuento(false);
    }
  }

  // ---------- Cobro ----------
  function abrirCobro() {
    if (!pedido) return;
    setSaldoPendiente((prev) => prev ?? pedido.total);
    setMostrarCobro(true);
  }

  function manejarPagoRegistrado(resultado: PagoResponse) {
    setPedido(resultado.pedido);
    setSaldoPendiente(resultado.saldoPendiente);
    setPagosRealizados((prev) => [...prev, resultado.pago]);
    if (
      resultado.saldoPendiente <= 0 &&
      (resultado.pago.estado === "aprobado" || resultado.pago.estado === "encolado")
    ) {
      setMostrarCobro(false);
      setMostrarRecibo(true);
      // El pedido acaba de pasar a "cobrado": ya no debe aparecer en la lista
      // de "por cobrar". Re-consultamos de inmediato en vez de esperar al
      // proximo tick del polling.
      cargarLista();
    }
  }

  const propinaAcumulada = pagosRealizados.reduce((acc, p) => acc + p.propina, 0);

  /** Cierra el recibo y limpia la seleccion: el pedido ya esta "cobrado" y salio de la lista. */
  function cerrarReciboYDeseleccionar() {
    setMostrarRecibo(false);
    setPedido(null);
    setPedidoSeleccionadoId(null);
    setSaldoPendiente(null);
    setPagosRealizados([]);
  }

  // ---------- Render ----------

  return (
    <main className="pos-notouch relative flex min-h-screen flex-col overflow-hidden bg-ck-cream dark:bg-neutral-950">
      <FondoFoto />
      <header className="relative z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Image src="/cropped-Logo.webp" alt="Chicken Kitchen" width={100} height={40} priority />
          <div>
            <p className="text-sm font-bold text-ck-dark dark:text-neutral-100">{t("pos.headerTitulo")}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Miami, FL &middot; 15738 SW 72nd Street
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sinConexion && (
            <span className="rounded-full bg-ck-gold/20 px-3 py-1 text-xs font-semibold text-ck-gold">
              {t("pos.sinConexion")}
            </span>
          )}
        </div>
      </header>

      {errorGlobal && (
        <div className="relative z-10 flex items-center justify-between bg-red-50 px-4 py-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">
          <span>{errorGlobal}</span>
          <button type="button" onClick={() => setErrorGlobal(null)} className="font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ck-dark dark:text-neutral-100">
              {t("pos.cobrar.titulo")}
            </h1>
            <button
              type="button"
              onClick={cargarLista}
              className="rounded-lg border border-ck-red px-4 py-2 text-xs font-semibold text-ck-red active:scale-95 dark:border-red-400 dark:text-red-400"
            >
              {t("pos.cobrar.actualizar")}
            </button>
          </div>

          {cargandoLista ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("pos.cobrar.cargando")}</p>
          ) : errorLista ? (
            <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorLista}
            </div>
          ) : pedidos.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
              {t("pos.cobrar.sinPedidos")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">{t("pos.cobrar.colOrden")}</th>
                    <th className="px-4 py-3">{t("pos.cobrar.colCliente")}</th>
                    <th className="px-4 py-3">{t("pos.cobrar.colCanal")}</th>
                    <th className="px-4 py-3">{t("pos.cobrar.colHora")}</th>
                    <th className="px-4 py-3 text-right">{t("pos.cobrar.colTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const seleccionada = p.id === pedidoSeleccionadoId;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => seleccionarPedido(p.id)}
                        className={`cursor-pointer border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                          seleccionada
                            ? "bg-ck-red/10 dark:bg-red-900/20"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-ck-dark dark:text-neutral-100">
                          #{p.numeroOrden}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                          {p.nombreCliente || t("pos.ticket.clienteMostrador")}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                          {t(CLAVE_CANAL[p.canal] ?? "kds.canal.mostrador")}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                          {formatearHora(p.entregadoEn)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-ck-dark dark:text-neutral-100">
                          {formatearDinero(p.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {pedido ? (
          <Ticket
            pedido={pedido}
            actualizandoLineaId={actualizandoLineaId}
            enviandoACocina={enviandoACocina}
            onCambiarCantidad={cambiarCantidadLinea}
            onEliminarLinea={eliminarLinea}
            onEnviarACocina={manejarEnviarACocina}
            onAbrirDescuento={() => setMostrarDescuento(true)}
            onAbrirCobro={abrirCobro}
          />
        ) : (
          <aside className="flex w-full flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900 lg:w-96">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {cargandoDetalle ? t("pos.cobrar.cargandoDetalle") : t("pos.cobrar.seleccionaPedido")}
            </p>
          </aside>
        )}
      </div>

      {mostrarDescuento && pedido && (
        <DescuentoModal
          pedido={pedido}
          enviando={aplicandoDescuento}
          error={errorDescuento}
          onConfirmar={confirmarDescuento}
          onCancelar={() => {
            setMostrarDescuento(false);
            setErrorDescuento(null);
          }}
        />
      )}

      {mostrarCobro && pedido && (
        <CobroModal
          pedido={pedido}
          saldoPendiente={saldoPendiente ?? pedido.total}
          propinaAcumulada={propinaAcumulada}
          historialPagos={pagosRealizados}
          sinConexion={sinConexion}
          onCerrar={() => setMostrarCobro(false)}
          onPagoRegistrado={manejarPagoRegistrado}
        />
      )}

      {mostrarRecibo && pedido && (
        <ReciboModal
          pedido={pedido}
          pagos={pagosRealizados}
          onNuevoPedido={cerrarReciboYDeseleccionar}
        />
      )}
    </main>
  );
}
