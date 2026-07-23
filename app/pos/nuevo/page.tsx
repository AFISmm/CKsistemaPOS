"use client";

/**
 * Nuevo Pedido — submodulo de Terminal de Cajero (app/pos), no un modulo
 * nuevo del sidebar (ver lib/navigation/modulos.ts, sub-item "/pos/nuevo").
 *
 * Esta pantalla arma el pedido del cliente: elegir categorias/productos,
 * modificadores, cantidades, notas, marcar "para llevar" y aplicar
 * descuentos si aplica.
 *
 * FLUJO COBRAR-VS-COCINA CONFIGURABLE (Fase A, revision 2026-07-22 seccion
 * 2.1 — ver `ModoOperacionUbicacion` en lib/domain/types.ts y la nota de
 * cabecera de lib/sales/engine.ts):
 *  - "mostrador" (default de la tienda piloto): ESTA pantalla YA tiene el
 *    boton "Cobrar" (a diferencia de antes de esta iteracion) — el cajero
 *    cobra en cuanto el ticket tiene lineas, sin tener que enviar a cocina
 *    primero. Al completarse el pago (saldoPendiente <= 0) esta pantalla
 *    dispara AUTOMATICAMENTE `enviarACocina` (el cajero no tiene que
 *    acordarse de un paso aparte) y muestra el recibo; por eso el boton
 *    manual "Enviar a Cocina" se OCULTA en este modo (ver
 *    `ocultarBotonEnviarACocina` en components/pos/Ticket.tsx) — dejaria de
 *    tener sentido como accion separada.
 *  - "mesa" (flujo clasico, ej. la ubicacion demo de Austin): esta pantalla
 *    se comporta EXACTAMENTE como antes de esta iteracion — sin boton de
 *    cobrar ni recibo aqui, solo "Enviar a Cocina"; cobrar sigue siendo
 *    responsabilidad de app/pos/page.tsx una vez que cocina entrega el
 *    pedido a caja (estado "entregado").
 *
 * El modo se resuelve consultando `GET /api/v1/ubicaciones` y buscando la
 * ubicacion del pedido recien creado (`pedido.ubicacionId`); si por algun
 * motivo no se puede resolver (red/datos legados), se asume "mostrador" por
 * ser el default real de la tienda piloto (mismo fallback que
 * `modoOperacionDePedido` en lib/sales/engine.ts).
 */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import type { ModoOperacionUbicacion, Pago, Pedido, Producto } from "@/lib/domain/types";
import {
  actualizarLinea,
  agregarLinea,
  aplicarDescuento,
  crearPedido,
  enviarACocina,
  marcarParaLlevar,
  obtenerCatalogo,
  obtenerPedido,
  obtenerUbicaciones,
  type CatalogoResponse,
  type PagoResponse,
} from "@/components/pos/api";
import CategoriasTabs from "@/components/pos/CategoriasTabs";
import ProductosGrid from "@/components/pos/ProductosGrid";
import ModificadorModal from "@/components/pos/ModificadorModal";
import DescuentoModal from "@/components/pos/DescuentoModal";
import CobroModal from "@/components/pos/CobroModal";
import ReciboModal from "@/components/pos/ReciboModal";
import Ticket from "@/components/pos/Ticket";
import { useEstadoSync } from "@/lib/offline/useEstadoSync";

// DEMO: sin login de cajero en esta pantalla; se usa el usuario demo sembrado
// en lib/db/store.ts (rol cajero) para las acciones que requieren usuarioId.
const USUARIO_DEMO_ID = "user-cajero-demo";

export default function NuevoPedidoPage() {
  const { t } = useI18n();
  const [catalogo, setCatalogo] = useState<CatalogoResponse | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [categoriaActivaId, setCategoriaActivaId] = useState<string | null>(null);

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [productoEnModal, setProductoEnModal] = useState<Producto | null>(null);
  const [agregandoLinea, setAgregandoLinea] = useState(false);
  const [actualizandoLineaId, setActualizandoLineaId] = useState<string | null>(null);
  const [enviandoACocina, setEnviandoACocina] = useState(false);

  const [mostrarDescuento, setMostrarDescuento] = useState(false);
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false);
  const [errorDescuento, setErrorDescuento] = useState<string | null>(null);

  // ---------- Flujo cobrar-vs-cocina configurable (Fase A) ----------
  const [modoOperacion, setModoOperacion] = useState<ModoOperacionUbicacion>("mostrador");
  const [alternandoParaLlevar, setAlternandoParaLlevar] = useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [saldoPendienteCobro, setSaldoPendienteCobro] = useState<number | null>(null);
  const [pagosRealizados, setPagosRealizados] = useState<Pago[]>([]);
  const [mostrarRecibo, setMostrarRecibo] = useState(false);

  // ---------- Estado offline (visible, sin bloquear al cajero) + cola F1-T3 ----------
  const { sinConexion, pendientes } = useEstadoSync();

  // ---------- Inicializacion: crear pedido + cargar catalogo + modo de operacion ----------
  const iniciar = useCallback(async () => {
    setCargandoInicial(true);
    setErrorInicial(null);
    try {
      const [nuevoPedido, cat, ubicaciones] = await Promise.all([
        crearPedido({ canal: "mostrador" }),
        obtenerCatalogo(),
        obtenerUbicaciones().catch(() => []),
      ]);
      setPedido(nuevoPedido);
      setCatalogo(cat);
      const ubicacionDelPedido = ubicaciones.find((u) => u.id === nuevoPedido.ubicacionId);
      // Default "mostrador" si no se pudo resolver (sin red / dato legado):
      // mismo fallback que `modoOperacionDePedido` en lib/sales/engine.ts.
      setModoOperacion(ubicacionDelPedido?.modoOperacion ?? "mostrador");
      const primeraActiva = [...cat.categorias]
        .filter((c) => c.activo)
        .sort((a, b) => a.orden - b.orden)[0];
      setCategoriaActivaId(primeraActiva?.id ?? null);
      setMostrarDescuento(false);
      setProductoEnModal(null);
      setMostrarCobro(false);
      setSaldoPendienteCobro(null);
      setPagosRealizados([]);
      setMostrarRecibo(false);
    } catch (err) {
      setErrorInicial(textoErrorApi(err, t, "pos.errorNoPudoIniciar"));
    } finally {
      setCargandoInicial(false);
    }
    // "iniciar" se mantiene con identidad estable (deps []) a proposito: el
    // useEffect de abajo lo dispara una sola vez al montar. Si dependiera de
    // "t" (cambia de identidad al alternar idioma), cambiar el idioma
    // reiniciaria el pedido en curso del cajero, algo inaceptable en un POS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  const refrescarPedido = useCallback(async (pedidoId: string) => {
    try {
      const actualizado = await obtenerPedido(pedidoId);
      setPedido(actualizado);
      return actualizado;
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoActualizarPedido"));
      return null;
    }
  }, [t]);

  // ---------- Seleccion de producto / modificadores ----------
  function manejarSeleccionProducto(producto: Producto) {
    if (!pedido || !catalogo) return;
    const grupos = catalogo.gruposModificador.filter((g) => g.productoId === producto.id);
    if (grupos.length === 0) {
      agregarLineaRapida(producto.id);
    } else {
      setProductoEnModal(producto);
    }
  }

  async function agregarLineaRapida(productoId: string) {
    if (!pedido) return;
    setAgregandoLinea(true);
    setErrorGlobal(null);
    try {
      await agregarLinea(pedido.id, { productoId, cantidad: 1 });
      await refrescarPedido(pedido.id);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoAgregarProducto"));
    } finally {
      setAgregandoLinea(false);
    }
  }

  async function confirmarModificadores(datos: {
    modificadorIds: string[];
    cantidad: number;
    notas: string;
  }) {
    if (!pedido || !productoEnModal) return;
    setAgregandoLinea(true);
    setErrorGlobal(null);
    try {
      await agregarLinea(pedido.id, {
        productoId: productoEnModal.id,
        cantidad: datos.cantidad,
        modificadorIds: datos.modificadorIds,
        notas: datos.notas || undefined,
      });
      await refrescarPedido(pedido.id);
      setProductoEnModal(null);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoAgregarProducto"));
    } finally {
      setAgregandoLinea(false);
    }
  }

  // ---------- Cambios de linea en el ticket ----------
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

  // ---------- Enviar a cocina ----------
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

  // ---------- Para llevar (empaque automatico, Fase A) ----------
  async function alternarParaLlevar(paraLlevar: boolean) {
    if (!pedido) return;
    setAlternandoParaLlevar(true);
    setErrorGlobal(null);
    try {
      await marcarParaLlevar(pedido.id, paraLlevar);
      await refrescarPedido(pedido.id);
    } catch (err) {
      setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoMarcarParaLlevar"));
    } finally {
      setAlternandoParaLlevar(false);
    }
  }

  // ---------- Cobro (flujo mostrador pay-first, Fase A) ----------
  function abrirCobro() {
    if (!pedido) return;
    setSaldoPendienteCobro((prev) => prev ?? pedido.total);
    setMostrarCobro(true);
  }

  function manejarPagoRegistrado(resultado: PagoResponse) {
    setPedido(resultado.pedido);
    setSaldoPendienteCobro(resultado.saldoPendiente);
    setPagosRealizados((prev) => [...prev, resultado.pago]);
    if (
      resultado.saldoPendiente <= 0 &&
      (resultado.pago.estado === "aprobado" || resultado.pago.estado === "encolado")
    ) {
      setMostrarCobro(false);
      setMostrarRecibo(true);
      // Flujo mostrador pay-first: el pedido acaba de saldarse ("cobrado")
      // ANTES de pasar por cocina; disparamos el envio a cocina de inmediato
      // (el cajero no tiene que acordarse de un paso aparte, ver nota de
      // cabecera del archivo). Si esto llegara a fallar (ej. red), no
      // bloqueamos el recibo (el cobro YA ocurrio) — solo avisamos en
      // errorGlobal; el pedido queda "cobrado" pero sin `enviadoACocinaEn`,
      // recuperable reintentando desde la pantalla de KDS/soporte si hiciera
      // falta (caso borde, no bloqueante para la demo).
      enviarACocina(resultado.pedido.id)
        .then((actualizado) => setPedido(actualizado))
        .catch((err) => setErrorGlobal(textoErrorApi(err, t, "pos.errorNoPudoEnviarCocina")));
    }
  }

  const propinaAcumuladaCobro = pagosRealizados.reduce((acc, p) => acc + p.propina, 0);

  /** Cierra el recibo y arranca un pedido nuevo (mismo criterio que "Reiniciar" del flujo mesa). */
  async function cerrarReciboYReiniciar() {
    setMostrarRecibo(false);
    await iniciar();
  }

  // ---------- Reiniciar (empezar otro pedido tras enviar el actual a cocina) ----------
  async function reiniciarPedido() {
    await iniciar();
  }

  // ---------- Render ----------

  if (cargandoInicial) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-ck-cream dark:bg-neutral-950">
        <FondoFoto />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image src="/cropped-Logo.webp" alt="Chicken Kitchen" width={160} height={64} priority />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("pos.cargandoTerminal")}</p>
        </div>
      </main>
    );
  }

  if (errorInicial || !pedido || !catalogo) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-ck-cream p-6 text-center dark:bg-neutral-950">
        <FondoFoto />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image src="/cropped-Logo.webp" alt="Chicken Kitchen" width={160} height={64} priority />
          <p className="max-w-md text-sm font-semibold text-ck-red dark:text-red-400">
            {errorInicial ?? t("pos.errorCargaTerminal")}
          </p>
          <button
            type="button"
            onClick={iniciar}
            className="rounded-xl bg-ck-red px-6 py-3 text-base font-bold text-white active:scale-95"
          >
            {t("pos.reintentar")}
          </button>
        </div>
      </main>
    );
  }

  const productosDeCategoria = catalogo.productos.filter(
    (p) => p.categoriaId === categoriaActivaId
  );
  const gruposDelProductoEnModal = productoEnModal
    ? catalogo.gruposModificador.filter((g) => g.productoId === productoEnModal.id)
    : [];
  const pedidoYaEnviado = pedido.estado !== "abierto";

  return (
    <main className="pos-notouch relative flex min-h-screen flex-col overflow-hidden bg-ck-cream dark:bg-neutral-950">
      <FondoFoto />
      <header className="relative z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Image src="/cropped-Logo.webp" alt="Chicken Kitchen" width={100} height={40} priority />
          <div>
            <p className="text-sm font-bold text-ck-dark dark:text-neutral-100">{t("pos.nuevo.headerTitulo")}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Miami, FL &middot; 15738 SW 72nd Street
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(sinConexion || pendientes > 0) && (
            <span className="rounded-full bg-ck-gold/20 px-3 py-1 text-xs font-semibold text-ck-gold">
              {pendientes > 0 ? t("pos.pendientesSincronizar", { n: pendientes }) : t("pos.sinConexion")}
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

      {pedidoYaEnviado && (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-green-50 px-4 py-2 text-sm dark:bg-green-950/30">
          <span className="font-semibold text-green-700 dark:text-green-300">
            {t("pos.nuevo.avisoEnviado")}
          </span>
          <button
            type="button"
            onClick={reiniciarPedido}
            className="rounded-lg bg-ck-red px-4 py-2 text-xs font-bold text-white active:scale-95"
          >
            {t("pos.nuevo.botonReiniciar")}
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex-1">
          <CategoriasTabs
            categorias={catalogo.categorias}
            categoriaActivaId={categoriaActivaId}
            onSeleccionar={setCategoriaActivaId}
          />
          <div className="mt-4">
            {agregandoLinea && (
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">{t("pos.agregandoAlTicket")}</p>
            )}
            <ProductosGrid
              productos={productosDeCategoria}
              onSeleccionar={manejarSeleccionProducto}
            />
          </div>
        </section>

        <Ticket
          pedido={pedido}
          actualizandoLineaId={actualizandoLineaId}
          enviandoACocina={enviandoACocina}
          onCambiarCantidad={cambiarCantidadLinea}
          onEliminarLinea={eliminarLinea}
          onEnviarACocina={manejarEnviarACocina}
          onAbrirDescuento={() => setMostrarDescuento(true)}
          onCambiarParaLlevar={alternarParaLlevar}
          paraLlevarEnviando={alternandoParaLlevar}
          onAbrirCobro={modoOperacion === "mostrador" ? abrirCobro : undefined}
          ocultarBotonEnviarACocina={modoOperacion === "mostrador"}
        />
      </div>

      {productoEnModal && (
        <ModificadorModal
          producto={productoEnModal}
          grupos={gruposDelProductoEnModal}
          modificadores={catalogo.modificadores}
          enviando={agregandoLinea}
          onConfirmar={confirmarModificadores}
          onCancelar={() => setProductoEnModal(null)}
        />
      )}

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
          saldoPendiente={saldoPendienteCobro ?? pedido.total}
          propinaAcumulada={propinaAcumuladaCobro}
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
          onNuevoPedido={cerrarReciboYReiniciar}
        />
      )}
    </main>
  );
}
