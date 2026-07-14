"use client";

/**
 * /perfiles — "Gestionar perfiles" como PANTALLA COMPLETA (a pedido del dueno
 * de producto: antes era un modal/ventana emergente abierto desde el
 * sidebar; ahora es una pagina normal del portal, igual que /empleados o
 * /nomina). El contenido y la logica son los mismos que tenia el modal
 * anterior (components/shell/GestionarPerfilesModal.tsx, eliminado): lista
 * EMPLEADOS (no solo Usuario) con su horario de la semana, PIN de acceso y
 * tarifa por hora, cada uno editable.
 *
 * Acceso: el link del sidebar solo se muestra con el permiso
 * "usuarios.gestionar" (ver components/shell/Sidebar.tsx y lib/db/store.ts),
 * mismo criterio de visibilidad que el resto de paginas gerenciales de esta
 * demo (no hay guard de servidor adicional, ver limitaciones ya documentadas
 * en README-DEMO.md).
 *
 * Las acciones puntuales (cambiar PIN, cambiar horario) siguen siendo
 * modales pequenos de una sola accion, igual que en /empleados (onboarding,
 * baja, agregar horario) — lo que pidio el dueno de producto es que la
 * PANTALLA PRINCIPAL de gestion no sea un popup, no que cada micro-accion
 * dentro de ella deje de serlo.
 *
 * REGLA DURA: solo habla con el backend via components/shell/api.ts y
 * components/empleados/api.ts (mismo patron ya establecido) — nunca importa
 * lib/db, lib/auth ni lib/rrhh en runtime (salvo lib/rrhh/formatoHorario.ts,
 * deliberadamente puro, ver comentario en ese archivo).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado, HorarioTurno, Rol } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";
import {
  agruparHorariosPorEmpleado,
  domingoDeSemana,
  formatearResumenHorarioSemana,
  lunesDeSemanaActual,
} from "@/lib/rrhh/formatoHorario";
import {
  cambiarPinUsuario,
  listarRoles,
  listarUsuarios,
  type UsuarioConPinDemo,
} from "@/components/shell/api";
import { editarEmpleado, listarEmpleados, listarHorarios } from "@/components/empleados/api";
import AgregarHorarioModal from "@/components/empleados/AgregarHorarioModal";
import FondoFoto from "@/components/shell/FondoFoto";

export default function GestionarPerfilesPage() {
  const { t, idioma } = useI18n();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioConPinDemo[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [horariosPorEmpleado, setHorariosPorEmpleado] = useState<Map<string, HorarioTurno[]>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cambiandoPinDe, setCambiandoPinDe] = useState<UsuarioConPinDemo | null>(null);
  const [horarioDe, setHorarioDe] = useState<Empleado | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lunes = lunesDeSemanaActual();
      const domingo = domingoDeSemana(lunes);
      const [empleadosData, usuariosData, rolesData, horariosData] = await Promise.all([
        listarEmpleados(),
        listarUsuarios(),
        listarRoles(),
        listarHorarios({ desde: lunes, hasta: domingo }),
      ]);
      setEmpleados(empleadosData);
      setUsuarios(usuariosData);
      setRoles(rolesData);
      setHorariosPorEmpleado(agruparHorariosPorEmpleado(horariosData));
    } catch (err) {
      setError(textoErrorApi(err, t, "perfiles.modal.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nombreRol(rolId: string): string {
    const interno = roles.find((r) => r.id === rolId)?.nombre ?? rolId;
    return nombreRolTraducido(interno, t);
  }

  function actualizarEmpleadoEnLista(empleado: Empleado) {
    setEmpleados((prev) => prev.map((e) => (e.id === empleado.id ? empleado : e)));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">
              {t("perfiles.modal.titulo")}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t("perfiles.modal.descripcion")}
            </p>
          </div>
          <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
            {t("empleados.inicio")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("perfiles.modal.cargando")}</p>
        ) : (
          <ul className="space-y-3">
            {empleados.map((empleado) => {
              const usuario = empleado.usuarioId
                ? usuarios.find((u) => u.id === empleado.usuarioId)
                : undefined;
              return (
                <FilaEmpleado
                  key={empleado.id}
                  empleado={empleado}
                  usuario={usuario ?? null}
                  rolNombre={nombreRol(empleado.rolId)}
                  horarios={horariosPorEmpleado.get(empleado.id) ?? []}
                  idioma={idioma}
                  onCambiarPin={setCambiandoPinDe}
                  onCambiarHorario={setHorarioDe}
                  onGuardarTarifa={async (tarifaHoraCentavos) => {
                    const actualizado = await editarEmpleado(empleado.id, { tarifaHoraCentavos });
                    actualizarEmpleadoEnLista(actualizado);
                  }}
                />
              );
            })}
            {empleados.length === 0 && (
              <li className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
                {t("empleados.sinEmpleados")}
              </li>
            )}
          </ul>
        )}
      </div>

      {cambiandoPinDe && (
        <CambiarPinSubmodal
          usuario={cambiandoPinDe}
          onCambiado={() => {
            setCambiandoPinDe(null);
            cargar();
          }}
          onCancelar={() => setCambiandoPinDe(null)}
        />
      )}

      {horarioDe && (
        <AgregarHorarioModal
          empleado={horarioDe}
          onCreado={() => {
            setHorarioDe(null);
            cargar();
          }}
          onCancelar={() => setHorarioDe(null)}
        />
      )}
    </main>
  );
}

/** Fila de un empleado dentro de la pagina: horario/PIN/tarifa, cada uno con su propia edicion inline. */
function FilaEmpleado({
  empleado,
  usuario,
  rolNombre,
  horarios,
  idioma,
  onCambiarPin,
  onCambiarHorario,
  onGuardarTarifa,
}: {
  empleado: Empleado;
  usuario: UsuarioConPinDemo | null;
  rolNombre: string;
  horarios: HorarioTurno[];
  idioma: "es" | "en";
  onCambiarPin: (usuario: UsuarioConPinDemo) => void;
  onCambiarHorario: (empleado: Empleado) => void;
  onGuardarTarifa: (tarifaHoraCentavos: number) => Promise<void>;
}) {
  const { t } = useI18n();
  const [tarifaInput, setTarifaInput] = useState(() => (empleado.tarifaHoraCentavos / 100).toFixed(2));
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);
  const [errorTarifa, setErrorTarifa] = useState<string | null>(null);
  const [tarifaOk, setTarifaOk] = useState(false);

  // Un empleado sin Usuario todavia (onboarding no completado) no tiene PIN
  // que mostrar/cambiar: ver criterio en el pedido de producto.
  const sinAccesoTodavia = !usuario;
  const resumenHorario = formatearResumenHorarioSemana(horarios, idioma);

  async function guardarTarifa() {
    setErrorTarifa(null);
    const dolares = Number(tarifaInput);
    if (!Number.isFinite(dolares) || dolares <= 0) {
      setErrorTarifa(t("empleados.modal.errorTarifaInvalida"));
      return;
    }
    setGuardandoTarifa(true);
    try {
      await onGuardarTarifa(Math.round(dolares * 100));
      setTarifaOk(true);
      setTimeout(() => setTarifaOk(false), 1500);
    } catch (err) {
      setErrorTarifa(textoErrorApi(err, t, "perfiles.modal.errorNoPudoGuardarTarifa"));
    } finally {
      setGuardandoTarifa(false);
    }
  }

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ck-dark dark:text-neutral-100">{empleado.nombre}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{rolNombre}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {/* Horario asignado */}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            {t("perfiles.modal.horarioLabel")}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700 dark:text-neutral-300">
            {resumenHorario || t("perfiles.modal.sinHorario")}
          </p>
          <button
            type="button"
            onClick={() => onCambiarHorario(empleado)}
            className="mt-2 rounded-lg border border-ck-gold px-2 py-1 text-xs font-semibold text-ck-gold"
          >
            {t("perfiles.modal.cambiarHorario")}
          </button>
        </div>

        {/* PIN de acceso */}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            {t("perfiles.modal.pinLabel")}
          </p>
          {sinAccesoTodavia ? (
            <p className="mt-0.5 text-xs italic text-neutral-500 dark:text-neutral-400">
              {t("perfiles.modal.pinPendienteOnboarding")}
            </p>
          ) : (
            <>
              <p className="mt-0.5 font-mono text-sm text-ck-dark dark:text-neutral-100">
                {t("perfiles.modal.pinActual", { pin: usuario.pinActualDemo })}
              </p>
              <button
                type="button"
                onClick={() => onCambiarPin(usuario)}
                className="mt-2 rounded-lg border border-ck-red px-2 py-1 text-xs font-semibold text-ck-red dark:text-red-400"
              >
                {t("perfiles.modal.cambiarPin")}
              </button>
            </>
          )}
        </div>

        {/* Tarifa por hora */}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            {t("perfiles.modal.tarifaLabel")}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t("perfiles.modal.tarifaActualPrefijo", { monto: formatearDinero(empleado.tarifaHoraCentavos) })}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={tarifaInput}
              onChange={(e) => setTarifaInput(e.target.value)}
              className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <button
              type="button"
              disabled={guardandoTarifa}
              onClick={guardarTarifa}
              className="rounded-lg bg-ck-red px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
            >
              {guardandoTarifa ? t("perfiles.modal.guardando") : t("perfiles.modal.guardarTarifa")}
            </button>
          </div>
          {tarifaOk && (
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">{t("perfiles.modal.tarifaActualizada")}</p>
          )}
          {errorTarifa && <p className="mt-1 text-xs text-ck-red dark:text-red-300">{errorTarifa}</p>}
        </div>
      </div>
    </li>
  );
}

function CambiarPinSubmodal({
  usuario,
  onCambiado,
  onCancelar,
}: {
  usuario: UsuarioConPinDemo;
  onCambiado: () => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError(t("perfiles.modal.errorPinInvalido"));
      return;
    }
    if (pin !== pinConfirmar) {
      setError(t("perfiles.modal.errorPinNoCoincide"));
      return;
    }
    setEnviando(true);
    try {
      await cambiarPinUsuario(usuario.id, pin);
      setOk(true);
      setTimeout(onCambiado, 700);
    } catch (err) {
      setError(textoErrorApi(err, t, "perfiles.modal.errorNoPudoCambiar"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-1 text-base font-bold text-ck-dark dark:text-neutral-100">{t("perfiles.modal.cambiarPin")}</h3>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">{usuario.nombre}</p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}
        {ok && (
          <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {t("perfiles.modal.pinActualizado")}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("perfiles.modal.pinNuevo")}
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
            {t("perfiles.modal.pinConfirmar")}
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
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("perfiles.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("perfiles.modal.guardando") : t("perfiles.modal.guardarPin")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
