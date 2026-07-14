"use client";

/**
 * /mi-perfil — "Mi Perfil": CUALQUIER usuario logueado edita sus PROPIOS
 * datos (nombre/email/telefono) y cambia su PROPIO PIN de acceso, sin
 * necesitar el permiso "usuarios.gestionar" que usa "Gestionar perfiles"
 * (app/perfiles/page.tsx) para administrar A OTROS empleados.
 *
 * Caso de uso principal (a pedido de producto): las cuentas @digeniusai.com
 * (rol-developer, ver lib/db/store.ts `ROL_DEVELOPER_ID`) ya NO aparecen en
 * las listas operativas de la tienda (/empleados, /nomina, /perfiles) — no
 * tienen un gerente que les gestione el perfil, asi que este modulo es su
 * unica forma de mantener sus datos y PIN al dia. Cualquier otro rol tambien
 * puede usarlo (el link "Mi Perfil" del sidebar es SIEMPRE visible con
 * sesion activa, ver components/shell/Sidebar.tsx), aunque en la practica un
 * cajero/gerente normal ya tiene "Gestionar perfiles" para lo mismo.
 *
 * Vinculo usuarioId -> Empleado: `useSesion().usuarioActual.id` ES el
 * usuarioId (Usuario de login); se resuelve el Empleado asociado via
 * `obtenerEmpleadoPorUsuarioId` (components/empleados/api.ts ->
 * GET /api/v1/empleados?usuarioId=, ver lib/rrhh/empleados.ts).
 *
 * REGLA DURA (igual que app/perfiles/page.tsx): solo habla con el backend via
 * components/shell/api.ts y components/empleados/api.ts — nunca importa
 * lib/db, lib/auth ni lib/rrhh en runtime.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { editarEmpleado, obtenerEmpleadoPorUsuarioId } from "@/components/empleados/api";
import { cambiarPinUsuario } from "@/components/shell/api";
import FondoFoto from "@/components/shell/FondoFoto";

export default function MiPerfilPage() {
  const { t } = useI18n();
  const { usuarioActual, refrescarSesion } = useSesion();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuarioActual) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const emp = await obtenerEmpleadoPorUsuarioId(usuarioActual.id);
      setEmpleado(emp);
    } catch (err) {
      setError(textoErrorApi(err, t, "miPerfil.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [usuarioActual, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{t("miPerfil.titulo")}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("miPerfil.descripcion")}</p>
          </div>
          <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
            {t("miPerfil.inicio")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("miPerfil.cargando")}</p>
        ) : !usuarioActual || !empleado ? (
          !error && (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
              {t("miPerfil.sinEmpleado")}
            </p>
          )
        ) : (
          <div className="space-y-6">
            <DatosPersonalesForm
              empleado={empleado}
              onGuardado={(actualizado) => {
                setEmpleado(actualizado);
                refrescarSesion();
              }}
            />
            <CambiarPinPropio usuarioId={usuarioActual.id} />
          </div>
        )}
      </div>
    </main>
  );
}

/** Seccion "Mis datos": nombre/email/telefono editables, mismo patron de campos que OnboardingModal/app/perfiles/page.tsx. */
function DatosPersonalesForm({
  empleado,
  onGuardado,
}: {
  empleado: Empleado;
  onGuardado: (empleado: Empleado) => void;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(empleado.nombre);
  const [email, setEmail] = useState(empleado.email);
  const [telefono, setTelefono] = useState(empleado.telefono);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      const actualizado = await editarEmpleado(empleado.id, { nombre, email, telefono });
      onGuardado(actualizado);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch (err) {
      setError(textoErrorApi(err, t, "miPerfil.errorNoPudoGuardarDatos"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="mb-3 text-base font-bold text-ck-dark dark:text-neutral-100">{t("miPerfil.datosTitulo")}</h2>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}
      {ok && (
        <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {t("miPerfil.datosActualizados")}
        </div>
      )}

      <form onSubmit={manejarSubmit} className="space-y-3">
        <Campo etiqueta={t("miPerfil.campoNombre")}>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input"
          />
        </Campo>
        <Campo etiqueta={t("miPerfil.campoEmail")}>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Campo>
        <Campo etiqueta={t("miPerfil.campoTelefono")}>
          <input
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="input"
          />
        </Campo>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {guardando ? t("miPerfil.guardando") : t("miPerfil.guardarDatos")}
          </button>
        </div>
      </form>
      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #d4d4d4;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #1a1a1a;
          background-color: #ffffff;
        }
        .dark .input {
          border-color: #525252;
          background-color: #262626;
          color: #f5f5f5;
        }
      `}</style>
    </section>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
      {etiqueta}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/**
 * Seccion "Cambiar PIN": mismo patron de dos inputs (nuevo + confirmar) que
 * `CambiarPinSubmodal` en app/perfiles/page.tsx, pero como seccion inline (no
 * modal) y llamando SIEMPRE con el propio `usuarioId` del usuario logueado
 * (nunca el de otro usuario) via el endpoint YA EXISTENTE
 * PATCH /api/v1/auth/usuarios/[id]/pin.
 */
function CambiarPinPropio({ usuarioId }: { usuarioId: string }) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setOk(false);
    if (!/^\d{4}$/.test(pin)) {
      setError(t("miPerfil.errorPinInvalido"));
      return;
    }
    if (pin !== pinConfirmar) {
      setError(t("miPerfil.errorPinNoCoincide"));
      return;
    }
    setEnviando(true);
    try {
      await cambiarPinUsuario(usuarioId, pin);
      setOk(true);
      setPin("");
      setPinConfirmar("");
    } catch (err) {
      setError(textoErrorApi(err, t, "miPerfil.errorNoPudoCambiarPin"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="mb-1 text-base font-bold text-ck-dark dark:text-neutral-100">{t("miPerfil.pinTitulo")}</h2>
      <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">{t("miPerfil.pinDescripcion")}</p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}
      {ok && (
        <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {t("miPerfil.pinActualizado")}
        </div>
      )}

      <form onSubmit={manejarSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("miPerfil.pinNuevo")}
            <input
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="1234"
            />
          </label>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("miPerfil.pinConfirmar")}
            <input
              required
              value={pinConfirmar}
              onChange={(e) => setPinConfirmar(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="1234"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {enviando ? t("miPerfil.guardando") : t("miPerfil.guardarPin")}
          </button>
        </div>
      </form>
    </section>
  );
}
