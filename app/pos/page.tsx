"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import type { Pago, Pedido, Producto } from "@/lib/domain/types";
import {
  actualizarLinea,
  agregarLinea,
  aplicarDescuento,
  crearPedido,
  enviarACocina,
  obtenerCatalogo,
  obtenerPedido,
  type CatalogoResponse,
  type PagoResponse,
} from "@/components/pos/api";
import CategoriasTabs from "@/components/pos/CategoriasTabs";
import ProductosGrid from "@/components/pos/ProductosGrid";
import ModificadorModal from "@/components/pos/ModificadorModal";
import DescuentoModal from "@/components/pos/DescuentoModal";
import Ticket from "@/components/pos/Ticket";
import CobroModal from "@/components/pos/CobroModal";
import ReciboModal from "@/components/pos/ReciboModal";

// DEMO: sin login de cajero en esta pantalla; se usa el usuario demo sembrado
// en lib/db/store.ts (rol cajero) para las acciones que requieren usuarioId.
const USUARIO_DEMO_ID = "user-cajero-demo";

export default function TerminalCajeroPage() {
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

  // ---------- Inicializacion: crear pedido + cargar catalogo ----------
  const iniciar = useCallback(async () => {
    setCargandoInicial(true);
    setErrorInicial(null);
    try {
      const [nuevoPedido, cat] = await Promise.all([
        crearPedido({ canal: "mostrador" }),
        obtenerCatalogo(),
      ]);
      setPedido(nuevoPedido);
      setCatalogo(cat);
      const primeraActiva = [...cat.categorias]
        .filter((c) => c.activo)
        .sort((a, b) => a.orden - b.orden)[0];
      setCategoriaActivaId(primeraActiva?.id ?? null);
      setSaldoPendiente(null);
      setPagosRealizados([]);
      setMostrarRecibo(false);
      setMostrarCobro(false);
      setMostrarDescuento(false);
      setProductoEnModal(null);
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
    }
  }

  const propinaAcumulada = pagosRealizados.reduce((acc, p) => acc + p.propina, 0);

  async function manejarNuevoPedido() {
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
          <Link
            href="/pos/historial"
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold text-ck-dark active:scale-95 dark:border-neutral-700 dark:text-neutral-100"
          >
            {t("pos.historialLink")}
          </Link>
          <button
            type="button"
            onClick={manejarNuevoPedido}
            className="rounded-xl border border-ck-red px-4 py-2 text-sm font-bold text-ck-red active:scale-95"
          >
            {t("pos.nuevoPedido")}
          </button>
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
          onAbrirCobro={abrirCobro}
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
          onNuevoPedido={manejarNuevoPedido}
        />
      )}
    </main>
  );
}
