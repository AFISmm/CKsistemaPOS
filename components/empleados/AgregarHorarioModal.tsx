"use client";

/**
 * Modal "Agregar horario" — crea un HorarioTurno (turno de trabajo
 * PROGRAMADO) para un empleado. Boton disparador: fila del empleado en
 * app/empleados/page.tsx (accion junto a "Completar onboarding"/"Dar de
 * baja").
 *
 * Aviso de horas extra (>40h/semana, criterio lunes-domingo, mismo que
 * lib/nomina/calculo.ts y lib/rrhh/horarios.ts): ANTES de guardar, se
 * consulta cuantos minutos ya estan programados para ese empleado en la
 * MISMA semana (GET /api/v1/horarios) y se le suma la duracion del horario
 * nuevo. Si el total supera 40h, se muestra una confirmacion explicita
 * ("Cancelar" / "Autorizar y guardar") ANTES de llamar a POST
 * /api/v1/horarios; si el usuario cancela, no se guarda nada. Si no se
 * supera el limite, se guarda directo sin mostrar el aviso.
 *
 * La suma cliente-side de minutos por semana replica intencionalmente la
 * logica simple de lib/rrhh/horarios.ts (minutosHorario/claveSemanaDeFecha)
 * porque ese calculo debe poder hacerse ANTES de persistir (dry-run), sin
 * bloquear el guardado si el usuario autoriza el exceso. El backend vuelve a
 * calcular el mismo total al crear (defensa en profundidad / verificable
 * via curl directo).
 */

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { crearHorario, listarHorarios, type NuevoHorarioBody } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

const LIMITE_HORAS_REGULARES_SEMANA_MIN = 40 * 60;

function fechaHoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function minutosDesdeHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function lunesDeSemana(fechaIso: string): string {
  const d = new Date(`${fechaIso}T00:00:00.000Z`);
  const dia = d.getUTCDay(); // 0 = domingo .. 6 = sabado
  const diferenciaALunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() + diferenciaALunes);
  return lunes.toISOString().slice(0, 10);
}

function domingoDeSemana(lunesIso: string): string {
  const d = new Date(`${lunesIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function formatearHoras(minutos: number): string {
  return (minutos / 60).toFixed(1).replace(/\.0$/, "");
}

export default function AgregarHorarioModal({
  empleado,
  onCreado,
  onCancelar,
}: {
  empleado: Empleado;
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [paso, setPaso] = useState<"form" | "confirmando">("form");
  const [minutosTotalesSemana, setMinutosTotalesSemana] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    const body: NuevoHorarioBody = {
      empleadoId: empleado.id,
      ubicacionId: empleado.ubicacionId,
      fecha,
      horaInicioProgramada: horaInicio,
      horaFinProgramada: horaFin,
    };
    setEnviando(true);
    setError(null);
    try {
      await crearHorario(body);
      onCreado();
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoCrearHorario"));
      setPaso("form");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const duracionNuevoMin = minutosDesdeHHMM(horaFin) - minutosDesdeHHMM(horaInicio);
    if (duracionNuevoMin <= 0) {
      setError(t("empleados.modal.errorRangoHoras"));
      return;
    }

    setEnviando(true);
    try {
      const lunes = lunesDeSemana(fecha);
      const domingo = domingoDeSemana(lunes);
      const existentes = await listarHorarios({ empleadoId: empleado.id, desde: lunes, hasta: domingo });
      const minutosExistentes = existentes.reduce(
        (acc, h) => acc + (minutosDesdeHHMM(h.horaFinProgramada) - minutosDesdeHHMM(h.horaInicioProgramada)),
        0
      );
      const total = minutosExistentes + duracionNuevoMin;

      if (total > LIMITE_HORAS_REGULARES_SEMANA_MIN) {
        setMinutosTotalesSemana(total);
        setPaso("confirmando");
        setEnviando(false);
        return;
      }

      await guardar();
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoCrearHorario"));
      setEnviando(false);
    }
  }

  if (paso === "confirmando") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
          <h2 className="mb-2 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("empleados.modal.overtimeTitulo")}</h2>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t("empleados.modal.overtimeMensaje", {
              nombre: empleado.nombre,
              horas: formatearHoras(minutosTotalesSemana),
            })}
          </p>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaso("form")}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("empleados.modal.cancelar")}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={guardar}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("empleados.modal.guardando") : t("empleados.modal.overtimeAutorizar")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("empleados.modal.horarioTitulo")}</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {t("empleados.modal.horarioDescripcion", { nombre: empleado.nombre })}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("empleados.modal.campoFecha")}
            <input
              required
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {t("empleados.modal.campoHoraInicio")}
              <input
                required
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {t("empleados.modal.campoHoraFin")}
              <input
                required
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("empleados.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("empleados.modal.guardando") : t("empleados.modal.guardarHorario")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
