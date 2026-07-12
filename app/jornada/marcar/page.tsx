"use client";

/**
 * /jornada/marcar — flujo del CELULAR del empleado (chequeo de inicio de
 * jornada, etapa 2) — DUENO: rrhh-personal-pos. Mobile-first: es la pantalla
 * que mas importa que se vea bien en un telefono.
 *
 * Exenta del guard de sesion del shell (ver components/shell/AppShell.tsx):
 * se abre desde el celular PERSONAL del empleado, que normalmente no tiene
 * la sesion PIN de la tienda. La identidad/presencia aqui se prueban con
 * verificacion facial simulada + codigo TOTP de la pantalla central
 * (/jornada/pantalla), no con el login del shell.
 *
 * Pasos: (1) elegir empleado + entrada/salida -> (2) verificacion facial
 * SIMULADA (mock, dos botones "exitosa"/"fallida" para poder DEMOSTRAR el
 * flujo de fallo/bloqueo; 3 fallos consecutivos bloquean el metodo facial 5
 * minutos, con PIN de respaldo como plan B) -> (3) codigo TOTP de 6 digitos
 * de la pantalla central -> confirmacion.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import { useSesion } from "@/lib/shell/SesionProvider";
import SelectorIdioma from "@/components/shell/SelectorIdioma";
import ToggleTema from "@/components/shell/ToggleTema";
import type { Empleado, Marcaje, TipoMarcaje } from "@/lib/domain/types";
import {
  ErrorApi,
  consultarBloqueo,
  listarEmpleadosActivos,
  marcarPorFacial,
  marcarPorPinRespaldo,
  reportarIntentoFacial,
} from "@/components/jornada/api";

type Paso = "seleccion" | "facial" | "codigo" | "pinRespaldo" | "confirmado";

const MAX_INTENTOS = 3;

function formatearMmSs(totalSegundos: number): string {
  const m = Math.floor(totalSegundos / 60);
  const s = totalSegundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MarcarJornadaPage() {
  const { t } = useI18n();
  const { usuarioActual } = useSesion();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState<TipoMarcaje>("entrada");
  const [paso, setPaso] = useState<Paso>("seleccion");

  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<string | null>(null);
  const [segundosBloqueo, setSegundosBloqueo] = useState(0);

  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marcaje, setMarcaje] = useState<Marcaje | null>(null);

  useEffect(() => {
    let vivo = true;
    listarEmpleadosActivos()
      .then((data) => {
        if (!vivo) return;
        setEmpleados(data);
        const propio = usuarioActual ? data.find((e) => e.usuarioId === usuarioActual.id) : undefined;
        setEmpleadoId(propio?.id ?? data[0]?.id ?? "");
      })
      .catch((err) => {
        if (vivo) setErrorCarga(err instanceof ErrorApi ? err.message : t("jornada.marcar.errorGenerico"));
      })
      .finally(() => {
        if (vivo) setCargandoEmpleados(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  // Cuenta regresiva del bloqueo: solo UI, la fuente de verdad sigue siendo el servidor.
  useEffect(() => {
    if (!bloqueadoHasta) {
      setSegundosBloqueo(0);
      return;
    }
    function tick() {
      const restante = Math.max(0, Math.round((new Date(bloqueadoHasta as string).getTime() - Date.now()) / 1000));
      setSegundosBloqueo(restante);
      if (restante <= 0) {
        setBloqueadoHasta(null);
        setIntentosFallidos(0);
      }
    }
    tick();
    const intervalo = setInterval(tick, 1000);
    return () => clearInterval(intervalo);
  }, [bloqueadoHasta]);

  async function irAVerificacion() {
    if (!empleadoId) return;
    setError(null);
    try {
      const estado = await consultarBloqueo(empleadoId);
      setBloqueadoHasta(estado.bloqueadoHasta);
    } catch {
      // Si la consulta falla, se sigue igual: cada intento real vuelve a validar contra el servidor.
    }
    setPaso("facial");
  }

  async function simularFacial(exitoso: boolean) {
    setError(null);
    try {
      const resultado = await reportarIntentoFacial(empleadoId, exitoso);
      if (exitoso) {
        setIntentosFallidos(0);
        setBloqueadoHasta(null);
        setCodigo("");
        setPaso("codigo");
        return;
      }
      setIntentosFallidos((prev) => prev + 1);
      setBloqueadoHasta(resultado.bloqueadoHasta);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : t("jornada.marcar.errorGenerico"));
    }
  }

  async function enviarCodigo() {
    if (!empleadoId || codigo.trim().length !== 6) return;
    setEnviando(true);
    setError(null);
    try {
      const m = await marcarPorFacial({ empleadoId, tipo, codigo: codigo.trim() });
      setMarcaje(m);
      setPaso("confirmado");
    } catch (err) {
      if (err instanceof ErrorApi) {
        setError(err.message);
        if (err.codigo === "bloqueado_temporalmente") {
          try {
            const estado = await consultarBloqueo(empleadoId);
            setBloqueadoHasta(estado.bloqueadoHasta);
          } catch {
            // sin datos frescos: se queda con el mensaje de error igual.
          }
          setPaso("facial");
        }
      } else {
        setError(t("jornada.marcar.errorGenerico"));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function enviarPin() {
    if (!empleadoId || !pin.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const m = await marcarPorPinRespaldo({ empleadoId, tipo, pin: pin.trim() });
      setMarcaje(m);
      setBloqueadoHasta(null);
      setIntentosFallidos(0);
      setPaso("confirmado");
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : t("jornada.marcar.errorGenerico"));
    } finally {
      setEnviando(false);
    }
  }

  function reiniciarFlujo() {
    setPaso("seleccion");
    setCodigo("");
    setPin("");
    setMarcaje(null);
    setError(null);
    setIntentosFallidos(0);
    setBloqueadoHasta(null);
  }

  const empleadoSeleccionado = empleados.find((e) => e.id === empleadoId) ?? null;

  return (
    <main className="min-h-screen bg-ck-cream p-4 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-ck-dark dark:text-neutral-100">
            {t("jornada.marcar.titulo")}
          </h1>
          <div className="flex items-center gap-1">
            <SelectorIdioma />
            <ToggleTema />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {paso === "seleccion" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("jornada.marcar.subtitulo")}
              </p>

              {errorCarga && <p className="text-sm font-semibold text-ck-red">{errorCarga}</p>}

              <label className="flex flex-col gap-1 text-sm font-semibold text-ck-dark dark:text-neutral-200">
                {t("jornada.marcar.empleado")}
                <select
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  disabled={cargandoEmpleados}
                  className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 text-base text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo("entrada")}
                  className={`min-h-[44px] rounded-xl border px-3 py-3 text-sm font-bold ${
                    tipo === "entrada"
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {t("jornada.marcar.tipoEntrada")}
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("salida")}
                  className={`min-h-[44px] rounded-xl border px-3 py-3 text-sm font-bold ${
                    tipo === "salida"
                      ? "border-ck-red bg-ck-red text-white"
                      : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {t("jornada.marcar.tipoSalida")}
                </button>
              </div>

              <button
                type="button"
                onClick={irAVerificacion}
                disabled={!empleadoId || cargandoEmpleados}
                className="min-h-[44px] w-full rounded-xl bg-ck-red px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("jornada.marcar.continuar")}
              </button>
            </div>
          )}

          {paso === "facial" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-ck-dark dark:text-neutral-100">
                {t("jornada.marcar.pasoFacialTitulo")}
              </h2>

              {bloqueadoHasta ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-ck-red/40 bg-red-50 p-3 text-sm text-ck-red dark:bg-red-950/30">
                    <p className="font-bold">{t("jornada.marcar.bloqueadoTitulo")}</p>
                    <p>
                      {t("jornada.marcar.bloqueadoDetalle", { tiempo: formatearMmSs(segundosBloqueo) })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaso("pinRespaldo")}
                    className="min-h-[44px] w-full rounded-xl bg-ck-gold px-4 py-3 text-sm font-bold text-ck-dark"
                  >
                    {t("jornada.marcar.usarPinRespaldo")}
                  </button>
                  <button
                    type="button"
                    onClick={reiniciarFlujo}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    {t("jornada.marcar.cancelar")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid aspect-square place-items-center rounded-xl bg-neutral-900 text-neutral-500">
                    <span className="text-sm">{t("jornada.marcar.facialInstruccion")}</span>
                  </div>

                  {intentosFallidos > 0 && (
                    <p className="text-center text-xs font-semibold text-ck-red">
                      {t("jornada.marcar.intentosFallidos", {
                        n: intentosFallidos,
                        max: MAX_INTENTOS,
                      })}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => simularFacial(true)}
                    className="min-h-[44px] w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white"
                  >
                    {t("jornada.marcar.simularExito")}
                  </button>
                  <button
                    type="button"
                    onClick={() => simularFacial(false)}
                    className="min-h-[44px] w-full rounded-xl bg-ck-red px-4 py-3 text-sm font-bold text-white"
                  >
                    {t("jornada.marcar.simularFallo")}
                  </button>
                  <button
                    type="button"
                    onClick={reiniciarFlujo}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    {t("jornada.marcar.cancelar")}
                  </button>
                </div>
              )}

              {error && <p className="text-sm font-semibold text-ck-red">{error}</p>}
            </div>
          )}

          {paso === "codigo" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-ck-dark dark:text-neutral-100">
                {t("jornada.marcar.pasoCodigoTitulo")}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("jornada.marcar.codigoInstruccion")}
              </p>

              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("jornada.marcar.codigoPlaceholder")}
                autoFocus
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              {error && <p className="text-sm font-semibold text-ck-red">{error}</p>}

              <button
                type="button"
                onClick={enviarCodigo}
                disabled={enviando || codigo.length !== 6}
                className="min-h-[44px] w-full rounded-xl bg-ck-red px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {enviando ? t("jornada.marcar.enviando") : t("jornada.marcar.enviarCodigo")}
              </button>
              <button
                type="button"
                onClick={reiniciarFlujo}
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              >
                {t("jornada.marcar.cancelar")}
              </button>
            </div>
          )}

          {paso === "pinRespaldo" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-ck-dark dark:text-neutral-100">
                {t("jornada.marcar.pinRespaldoTitulo")}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("jornada.marcar.pinRespaldoInstruccion")}
              </p>

              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("jornada.marcar.pinPlaceholder")}
                autoFocus
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              {error && <p className="text-sm font-semibold text-ck-red">{error}</p>}

              <button
                type="button"
                onClick={enviarPin}
                disabled={enviando || !pin}
                className="min-h-[44px] w-full rounded-xl bg-ck-gold px-4 py-3 text-sm font-bold text-ck-dark disabled:opacity-50"
              >
                {enviando ? t("jornada.marcar.enviando") : t("jornada.marcar.enviarPin")}
              </button>
              <button
                type="button"
                onClick={reiniciarFlujo}
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              >
                {t("jornada.marcar.cancelar")}
              </button>
            </div>
          )}

          {paso === "confirmado" && marcaje && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl text-green-700 dark:bg-green-900/30">
                &#10003;
              </div>
              <h2 className="text-lg font-bold text-ck-dark dark:text-neutral-100">
                {t("jornada.marcar.exitoTitulo")}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("jornada.marcar.exitoDetalle", {
                  empleado: empleadoSeleccionado?.nombre ?? "",
                  tipo:
                    marcaje.tipo === "entrada"
                      ? t("jornada.marcar.tipoEntrada")
                      : t("jornada.marcar.tipoSalida"),
                  hora: new Date(marcaje.timestamp).toLocaleTimeString(),
                })}
              </p>
              <p className="text-xs text-neutral-400">
                {marcaje.metodoVerificacion === "pinRespaldo"
                  ? t("jornada.marcar.metodoPinRespaldo")
                  : t("jornada.marcar.metodoFacial")}
              </p>
              <button
                type="button"
                onClick={reiniciarFlujo}
                className="min-h-[44px] w-full rounded-xl bg-ck-red px-4 py-3 text-sm font-bold text-white"
              >
                {t("jornada.marcar.marcarOtro")}
              </button>
            </div>
          )}
        </div>

        <p className="rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-center text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
          {t("jornada.marcar.demoAviso")}
        </p>
      </div>
    </main>
  );
}
