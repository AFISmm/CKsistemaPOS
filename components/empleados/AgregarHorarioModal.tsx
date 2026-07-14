"use client";

/**
 * Modal "Agregar horario" — despliega un CALENDARIO SEMANAL (lunes-domingo)
 * para programar el horario de un empleado. Boton disparador: fila del
 * empleado en app/empleados/page.tsx ("Add schedule") y el boton "Change
 * schedule" del panel Gestionar Perfiles en app/perfiles/page.tsx.
 *
 * Diseno: 7 filas (Lun..Dom). Cada fila SIN horario ya cargado esa semana
 * permite marcar "trabaja este dia" + hora inicio/fin. Cada fila QUE YA
 * tiene un HorarioTurno cargado (ver GET /api/v1/horarios) se muestra
 * bloqueada/solo-lectura con sus horas, para no crear un registro duplicado
 * el mismo dia (lib/rrhh/horarios.ts NO valida colisiones, simplemente
 * apila registros — el bloqueo se hace aqui, client-side).
 *
 * Guardado: al confirmar se llama a crearHorario UNA VEZ POR CADA dia
 * marcado con horas validas, secuencialmente (for...await). Si alguno falla
 * a mitad de camino, los dias que SI se alcanzaron a guardar quedan
 * bloqueados (igual que un dia con horario preexistente) y los que faltan
 * siguen editables para reintentar — no se pierde de vista el progreso.
 *
 * Aviso de horas extra (>40h/semana, criterio lunes-domingo, mismo que
 * lib/nomina/calculo.ts y lib/rrhh/horarios.ts): ANTES de guardar se suma la
 * duracion de TODOS los dias marcados en el formulario MAS los minutos de
 * los dias que ya estaban cargados esa semana (recien consultados via GET
 * /api/v1/horarios). Si el total supera 40h, se muestra la misma
 * confirmacion explicita ("Cancelar" / "Autorizar y guardar") que ya existia
 * antes de este rediseno; si no se supera, se guarda directo.
 *
 * La suma cliente-side de minutos por semana replica intencionalmente la
 * logica simple de lib/rrhh/horarios.ts (minutosHorario/claveSemanaDeFecha)
 * porque ese calculo debe poder hacerse ANTES de persistir (dry-run), sin
 * bloquear el guardado si el usuario autoriza el exceso. El backend vuelve a
 * calcular el mismo total al crear cada horario (defensa en profundidad /
 * verificable via curl directo).
 */

import { useEffect, useState } from "react";
import type { Empleado, HorarioTurno } from "@/lib/domain/types";
import { crearHorario, listarHorarios, type NuevoHorarioBody } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

const LIMITE_HORAS_REGULARES_SEMANA_MIN = 40 * 60;

/** Claves i18n del nombre abreviado de cada dia, en orden lunes(0)..domingo(6). */
const CLAVES_DIA = [
  "empleados.modal.diaLun",
  "empleados.modal.diaMar",
  "empleados.modal.diaMie",
  "empleados.modal.diaJue",
  "empleados.modal.diaVie",
  "empleados.modal.diaSab",
  "empleados.modal.diaDom",
] as const;

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

/** Suma (o resta) `dias` dias calendario a una fecha ISO (YYYY-MM-DD), en UTC. */
function sumarDiasISO(fechaIso: string, dias: number): string {
  const d = new Date(`${fechaIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function formatearHoras(minutos: number): string {
  return (minutos / 60).toFixed(1).replace(/\.0$/, "");
}

/** Rango legible de la semana visible, ej. "13 - 19 jul 2026" (o "28 jun - 4 jul 2026" si cruza de mes). */
function formatearRangoSemana(lunesIso: string, domingoIso: string, idioma: "es" | "en"): string {
  const inicio = new Date(`${lunesIso}T00:00:00.000Z`);
  const fin = new Date(`${domingoIso}T00:00:00.000Z`);
  const locale = idioma === "es" ? "es-ES" : "en-US";
  const mesFormato = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const mismoMes =
    inicio.getUTCMonth() === fin.getUTCMonth() && inicio.getUTCFullYear() === fin.getUTCFullYear();
  const anio = fin.getUTCFullYear();
  if (mismoMes) {
    return `${inicio.getUTCDate()} - ${fin.getUTCDate()} ${mesFormato.format(fin)} ${anio}`;
  }
  return `${inicio.getUTCDate()} ${mesFormato.format(inicio)} - ${fin.getUTCDate()} ${mesFormato.format(fin)} ${anio}`;
}

/** Estado de una fila (un dia) del calendario semanal. */
interface FilaDia {
  fecha: string; // YYYY-MM-DD
  /** Horario YA persistido para este dia (precargado de la API, o agregado localmente tras un guardado exitoso de esta sesion). Si existe, la fila queda bloqueada/solo-lectura. */
  existente: HorarioTurno | null;
  trabaja: boolean;
  horaInicio: string;
  horaFin: string;
  error: string | null;
}

function filasVacias(lunes: string): FilaDia[] {
  return Array.from({ length: 7 }, (_, i) => ({
    fecha: sumarDiasISO(lunes, i),
    existente: null,
    trabaja: false,
    horaInicio: "09:00",
    horaFin: "17:00",
    error: null,
  }));
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
  const { t, idioma } = useI18n();
  const [lunes, setLunes] = useState(() => lunesDeSemana(fechaHoyISO()));
  const [dias, setDias] = useState<FilaDia[]>(() => filasVacias(lunesDeSemana(fechaHoyISO())));
  const [cargandoSemana, setCargandoSemana] = useState(false);
  const [paso, setPaso] = useState<"form" | "confirmando">("form");
  const [minutosTotalesSemana, setMinutosTotalesSemana] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** true en cuanto se guarda con exito al menos un dia en esta sesion del modal (para saber si "Cancelar" debe refrescar al padre). */
  const [algunoGuardado, setAlgunoGuardado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargandoSemana(true);
      setError(null);
      try {
        const domingo = domingoDeSemana(lunes);
        const existentes = await listarHorarios({ empleadoId: empleado.id, desde: lunes, hasta: domingo });
        if (cancelado) return;
        // El calendario ya se reinicio (filasVacias) al cambiar de semana (ver
        // irASemana) antes de que esta carga termine, y los campos quedan
        // deshabilitados mientras `cargandoSemana` es true, asi que aqui solo
        // hace falta marcar los dias que YA tienen horario cargado.
        setDias((base) =>
          base.map((f) => {
            const encontrado = existentes.find((h) => h.fecha === f.fecha);
            return encontrado ? { ...f, existente: encontrado } : f;
          })
        );
      } catch (err) {
        if (!cancelado) setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoCrearHorario"));
      } finally {
        if (!cancelado) setCargandoSemana(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunes, empleado.id]);

  function irASemana(deltaDias: number) {
    setDias(filasVacias(sumarDiasISO(lunes, deltaDias)));
    setLunes((actual) => sumarDiasISO(actual, deltaDias));
    setError(null);
  }

  function actualizarFila(fecha: string, cambios: Partial<FilaDia>) {
    setDias((previas) => previas.map((f) => (f.fecha === fecha ? { ...f, ...cambios, error: null } : f)));
  }

  /** Filas editables (sin horario existente) marcadas como "trabaja", listas para crear. */
  function candidatos(filas: FilaDia[]): FilaDia[] {
    return filas.filter((f) => !f.existente && f.trabaja);
  }

  function minutosExistentesSemana(filas: FilaDia[]): number {
    return filas.reduce((acc, f) => {
      if (!f.existente) return acc;
      return acc + (minutosDesdeHHMM(f.existente.horaFinProgramada) - minutosDesdeHHMM(f.existente.horaInicioProgramada));
    }, 0);
  }

  /** Guarda secuencialmente cada dia candidato. Si uno falla, deja los ya guardados bloqueados y el resto editable para reintentar. */
  async function guardar() {
    setEnviando(true);
    setError(null);
    let guardadosEnEstaCorrida = 0;
    try {
      // Se recalcula sobre el estado actual (no una copia capturada antes),
      // para reflejar reintentos tras una falla parcial previa.
      const pendientes = candidatos(dias);
      for (const fila of pendientes) {
        const body: NuevoHorarioBody = {
          empleadoId: empleado.id,
          ubicacionId: empleado.ubicacionId,
          fecha: fila.fecha,
          horaInicioProgramada: fila.horaInicio,
          horaFinProgramada: fila.horaFin,
        };
        try {
          const { horario } = await crearHorario(body);
          guardadosEnEstaCorrida += 1;
          setAlgunoGuardado(true);
          setDias((previas) => previas.map((f) => (f.fecha === fila.fecha ? { ...f, existente: horario, trabaja: true } : f)));
        } catch (err) {
          const totalPendiente = pendientes.length;
          const mensajeBase = textoErrorApi(err, t, "empleados.modal.errorNoPudoCrearHorario");
          setError(
            guardadosEnEstaCorrida > 0
              ? t("empleados.modal.errorGuardadoParcial", {
                  guardados: guardadosEnEstaCorrida,
                  total: totalPendiente,
                  detalle: mensajeBase,
                })
              : mensajeBase
          );
          setPaso("form");
          setEnviando(false);
          return;
        }
      }
      setPaso("form");
      onCreado();
    } finally {
      setEnviando(false);
    }
  }

  function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    // Validar rango horas por fila marcada.
    let hayErrorDeRango = false;
    const filasValidadas = dias.map((f) => {
      if (f.existente || !f.trabaja) return f;
      const duracion = minutosDesdeHHMM(f.horaFin) - minutosDesdeHHMM(f.horaInicio);
      if (duracion <= 0) {
        hayErrorDeRango = true;
        return { ...f, error: t("empleados.modal.errorRangoHoras") };
      }
      return { ...f, error: null };
    });
    if (hayErrorDeRango) {
      setDias(filasValidadas);
      return;
    }

    const pendientes = candidatos(dias);
    if (pendientes.length === 0) {
      setError(t("empleados.modal.errorSeleccionaDia"));
      return;
    }

    const duracionNuevaMin = pendientes.reduce(
      (acc, f) => acc + (minutosDesdeHHMM(f.horaFin) - minutosDesdeHHMM(f.horaInicio)),
      0
    );
    const total = minutosExistentesSemana(dias) + duracionNuevaMin;

    if (total > LIMITE_HORAS_REGULARES_SEMANA_MIN) {
      setMinutosTotalesSemana(total);
      setPaso("confirmando");
      return;
    }

    guardar();
  }

  function cerrar() {
    // Si ya se guardo algo en esta sesion (con o sin fallo parcial), el padre
    // debe refrescar su lista: onCreado() cumple ese rol en ambos usos
    // (app/empleados/page.tsx y app/perfiles/page.tsx). Si nada se guardo
    // todavia, se comporta igual que antes del rediseno (onCancelar puro).
    if (algunoGuardado) onCreado();
    else onCancelar();
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

  const domingo = domingoDeSemana(lunes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("empleados.modal.horarioTitulo")}</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {t("empleados.modal.horarioDescripcion", { nombre: empleado.nombre })}
        </p>

        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => irASemana(-7)}
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
          >
            {t("empleados.modal.semanaAnterior")}
          </button>
          <span className="text-sm font-bold text-ck-dark dark:text-neutral-100">
            {formatearRangoSemana(lunes, domingo, idioma)}
          </span>
          <button
            type="button"
            onClick={() => irASemana(7)}
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
          >
            {t("empleados.modal.semanaSiguiente")}
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {cargandoSemana ? (
              <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {t("empleados.modal.cargandoSemana")}
              </p>
            ) : (
              dias.map((f, i) => (
                <div
                  key={f.fecha}
                  className={`rounded-xl border p-3 ${
                    f.existente
                      ? "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60"
                      : "border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-bold text-ck-dark dark:text-neutral-100">{t(CLAVES_DIA[i])}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{f.fecha}</p>
                    </div>

                    {f.existente ? (
                      <div className="flex flex-1 flex-wrap items-center gap-3">
                        <span className="rounded-lg bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                          {f.existente.horaInicioProgramada} - {f.existente.horaFinProgramada}
                        </span>
                        <span className="text-xs italic text-neutral-500 dark:text-neutral-400">
                          {t("empleados.modal.diaYaTieneHorario")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={f.trabaja}
                            onChange={(e) => actualizarFila(f.fecha, { trabaja: e.target.checked })}
                            className="h-4 w-4 rounded border-neutral-300 text-ck-red focus:ring-ck-red dark:border-neutral-600"
                          />
                          {t("empleados.modal.trabajaEsteDia")}
                        </label>
                        <input
                          type="time"
                          aria-label={t("empleados.modal.campoHoraInicio")}
                          disabled={!f.trabaja}
                          value={f.horaInicio}
                          onChange={(e) => actualizarFila(f.fecha, { horaInicio: e.target.value })}
                          className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm text-ck-dark disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <span className="text-sm text-neutral-400">-</span>
                        <input
                          type="time"
                          aria-label={t("empleados.modal.campoHoraFin")}
                          disabled={!f.trabaja}
                          value={f.horaFin}
                          onChange={(e) => actualizarFila(f.fecha, { horaFin: e.target.value })}
                          className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm text-ck-dark disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                      </div>
                    )}
                  </div>
                  {f.error && <p className="mt-2 text-xs text-ck-red dark:text-red-300">{f.error}</p>}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex shrink-0 justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("empleados.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando || cargandoSemana}
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
