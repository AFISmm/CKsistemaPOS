"use client";

/**
 * /jornada/codigo-gerencial — panel gerencial del codigo de autorizacion
 * DIARIO — DUENO: rrhh-personal-pos / seguridad de acceso (Fase A, idea de
 * innovacion de la llamada de revision 2026-07-22: alternativa simple a un
 * push remoto real -- fuera de alcance de este plazo -- para autorizar
 * acciones gerenciales, ej. anulaciones/descuentos, cuando el gerente no
 * puede teclear su PIN en persona).
 *
 * A diferencia de /jornada/pantalla (kiosko fijo, sin sesion, cualquiera lo
 * ve), esta pagina SI corre dentro del shell normal (login requerido, ver
 * app/layout.tsx/AppShell) y ademas se auto-restringe en el CLIENTE a
 * usuarios cuyo rol tenga el permiso "pedido.descuento.autorizar" (el mismo
 * permiso gerencial ya sembrado en lib/db/store.ts). Mismo nivel de honestidad
 * que el resto de esta demo: es un gate de UI, NO una proteccion real de
 * backend (ver la nota de seguridad completa en lib/jornada/codigoGerencial.ts)
 * -- no hay un guard server-side todavia en ningun endpoint de esta app.
 *
 * Dos secciones:
 *  1. El codigo vigente HOY (para que un gerente lo lea/dicte por telefono o
 *     chat a un cajero que necesita autorizacion y el gerente no esta en la
 *     tienda).
 *  2. "Verificar codigo": cualquiera con este codigo a mano puede confirmar
 *     si es valido para HOY -- esta es la demostracion end-to-end del
 *     mecanismo de VALIDACION (validarCodigoGerencial), el punto de uso de
 *     ejemplo que pide la tarea. Wirear esto como paso obligatorio dentro del
 *     flujo real de descuentos/anulaciones (lib/sales/engine.ts) queda para
 *     quien sea dueno de ese archivo.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { useSesion } from "@/lib/shell/SesionProvider";
import { listarUbicaciones } from "@/components/empleados/api";
import {
  obtenerCodigoGerencialVigente,
  validarCodigoGerencial,
} from "@/components/jornada/api";
import type { Ubicacion } from "@/lib/domain/types";

/** Permiso gerencial ya sembrado (ver PERMISOS_GERENCIALES en lib/db/store.ts) reusado como gate de esta pagina. */
const PERMISO_REQUERIDO = "pedido.descuento.autorizar";

function formatearHms(totalSegundos: number): string {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

export default function CodigoGerencialPage() {
  const { t } = useI18n();
  const { usuarioActual, cargando } = useSesion();

  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [codigoAVerificar, setCodigoAVerificar] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<boolean | null>(null);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);

  const autorizado = Boolean(usuarioActual?.rol.permisos.includes(PERMISO_REQUERIDO));

  useEffect(() => {
    if (!autorizado) return;
    let vivo = true;
    listarUbicaciones()
      .then((ubicaciones) => {
        if (!vivo) return;
        const activa = ubicaciones.find((u) => u.activo) ?? ubicaciones[0] ?? null;
        setUbicacion(activa);
      })
      .catch(() => {
        if (vivo) setError(t("jornada.codigoGerencial.errorUbicacion"));
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizado]);

  useEffect(() => {
    if (!ubicacion) return;
    let vivo = true;
    obtenerCodigoGerencialVigente(ubicacion.id)
      .then((vigente) => {
        if (!vivo) return;
        setCodigo(vigente.codigo);
        setSegundosRestantes(vigente.segundosRestantes);
        setError(null);
      })
      .catch((err) => {
        if (vivo) setError(textoErrorApi(err, t, "jornada.codigoGerencial.errorCodigo"));
      });
    return () => {
      vivo = false;
    };
  }, [ubicacion, t]);

  async function verificar() {
    if (!ubicacion || !codigoAVerificar.trim() || verificando) return;
    setVerificando(true);
    setErrorVerificacion(null);
    setResultadoVerificacion(null);
    try {
      const { valido } = await validarCodigoGerencial(ubicacion.id, codigoAVerificar.trim());
      setResultadoVerificacion(valido);
    } catch (err) {
      setErrorVerificacion(textoErrorApi(err, t, "jornada.codigoGerencial.errorCodigo"));
    } finally {
      setVerificando(false);
    }
  }

  if (cargando) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("shell.cargando")}</p>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="rounded-2xl border border-ck-red/40 bg-red-50 p-6 text-center dark:bg-red-950/30">
          <h1 className="mb-2 text-lg font-bold text-ck-red">
            {t("jornada.codigoGerencial.noAutorizadoTitulo")}
          </h1>
          <p className="text-sm text-ck-dark dark:text-neutral-300">
            {t("jornada.codigoGerencial.noAutorizadoMensaje")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-xl font-black text-ck-dark dark:text-neutral-100">
        {t("jornada.codigoGerencial.titulo")}
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        {t("jornada.codigoGerencial.subtitulo")}
      </p>

      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {ubicacion ? ubicacion.nombre : t("jornada.codigoGerencial.cargando")}
        </p>
        <p className="mb-3 font-mono text-5xl font-black tabular-nums text-ck-dark dark:text-neutral-100">
          {codigo ?? "------"}
        </p>
        {codigo && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("jornada.codigoGerencial.rotaEn", { tiempo: formatearHms(segundosRestantes) })}
          </p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-ck-red">{error}</p>}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-1 text-base font-bold text-ck-dark dark:text-neutral-100">
          {t("jornada.codigoGerencial.verificarTitulo")}
        </h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {t("jornada.codigoGerencial.verificarInstruccion")}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={codigoAVerificar}
            onChange={(e) => {
              setCodigoAVerificar(e.target.value.replace(/\D/g, "").slice(0, 6));
              setResultadoVerificacion(null);
            }}
            placeholder={t("jornada.codigoGerencial.verificarPlaceholder")}
            className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-center text-xl tracking-[0.3em] text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="button"
            onClick={verificar}
            disabled={verificando || codigoAVerificar.length !== 6 || !ubicacion}
            className="min-h-[44px] rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {t("jornada.codigoGerencial.verificarBoton")}
          </button>
        </div>

        {resultadoVerificacion === true && (
          <p className="mt-3 text-sm font-semibold text-green-700 dark:text-green-400">
            {t("jornada.codigoGerencial.verificarValido")}
          </p>
        )}
        {resultadoVerificacion === false && (
          <p className="mt-3 text-sm font-semibold text-ck-red">
            {t("jornada.codigoGerencial.verificarInvalido")}
          </p>
        )}
        {errorVerificacion && (
          <p className="mt-3 text-sm font-semibold text-ck-red">{errorVerificacion}</p>
        )}
      </section>

      <p className="mt-6 rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-center text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
        {t("jornada.codigoGerencial.demoAviso")}
      </p>
    </main>
  );
}
