"use client";

/**
 * /login — sesion DEMO por correo + PIN (etapa 1 de 3 de este proyecto).
 *
 * Flujo de 2-3 pasos:
 *  1) Correo: GET /api/v1/auth/verificar-correo decide la rama:
 *     - registrado && pinHabilitado -> paso "pin" (teclado numerico, valida
 *       {email, pin} contra el Usuario puntual de ESE Empleado).
 *     - registrado && !pinHabilitado -> paso "pendiente" (el Empleado existe
 *       pero un gerente todavia no le asigno PIN via "Completar onboarding").
 *     - !registrado -> paso "registro" (auto-alta: nombre, apellido, ultimos
 *       4 del SSN, telefono; el email ya capturado se muestra fijo). Crea un
 *       Empleado en "onboarding" via POST /api/v1/auth/registrar; NO inicia
 *       sesion (no hay PIN todavia).
 *
 * DEMO: valida el PIN contra Usuario.pinHash ("demo:<pin>") de un Usuario
 * puntual. No hay JWT/cookies de servidor: al validar se guarda el usuarioId
 * en localStorage (ver lib/shell/SesionProvider.tsx). La etapa 2 de este
 * proyecto reemplazara este login por el flujo TOTP + verificacion facial
 * descrito en los ADR de seguridad.
 */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import { ErrorApi, registrarEmpleado, verificarCorreo } from "@/components/shell/api";
import SelectorIdioma from "@/components/shell/SelectorIdioma";
import ToggleTema from "@/components/shell/ToggleTema";

const LONGITUD_PIN = 4;
const DIGITOS_FILA_1 = ["1", "2", "3"];
const DIGITOS_FILA_2 = ["4", "5", "6"];
const DIGITOS_FILA_3 = ["7", "8", "9"];

type Paso = "email" | "pin" | "pendiente" | "registro" | "registroExitoso";

const CAMPOS_REGISTRO_VACIO = { nombre: "", apellido: "", ssnUltimos4: "", telefono: "" };

export default function LoginPage() {
  const router = useRouter();
  const { usuarioActual, cargando, login } = useSesion();
  const { t } = useI18n();

  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [registro, setRegistro] = useState(CAMPOS_REGISTRO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesion activa, /login no tiene nada que hacer.
  useEffect(() => {
    if (!cargando && usuarioActual) router.replace("/");
  }, [cargando, usuarioActual, router]);

  function volverAPasoEmail() {
    setPaso("email");
    setPin("");
    setRegistro(CAMPOS_REGISTRO_VACIO);
    setError(null);
  }

  function agregarDigito(digito: string) {
    setError(null);
    setPin((prev) => (prev.length >= LONGITUD_PIN ? prev : prev + digito));
  }

  function borrarUltimo() {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }

  async function manejarSubmitEmail(e: FormEvent) {
    e.preventDefault();
    const emailLimpio = email.trim();
    if (!emailLimpio || enviando) return;
    // Validacion basica de formato en el cliente (el backend no depende de esto).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      setError(t("login.email.errorFormato"));
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const { registrado, pinHabilitado } = await verificarCorreo(emailLimpio);
      if (registrado && pinHabilitado) {
        setPaso("pin");
      } else if (registrado) {
        setPaso("pendiente");
      } else {
        setPaso("registro");
      }
    } catch {
      setError(t("login.email.errorGenerico"));
    } finally {
      setEnviando(false);
    }
  }

  async function manejarSubmitPin(e: FormEvent) {
    e.preventDefault();
    if (!pin || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await login(email.trim(), pin);
      router.replace("/");
    } catch (err) {
      // Los mensajes de error del backend son texto fijo en espanol (fuera
      // de alcance de i18n en esta etapa); se traducen aqui por codigo HTTP
      // para que el login si respete el idioma elegido.
      if (err instanceof ErrorApi && err.status === 401) {
        setError(t("login.errorInvalido"));
      } else {
        setError(t("login.errorGenerico"));
      }
      setPin("");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarSubmitRegistro(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await registrarEmpleado({
        nombre: registro.nombre.trim(),
        apellido: registro.apellido.trim(),
        ssnUltimos4: registro.ssnUltimos4.trim(),
        email: email.trim(),
        telefono: registro.telefono.trim(),
      });
      setPaso("registroExitoso");
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 409) {
        setError(t("login.registro.errorCorreoRegistrado"));
      } else if (err instanceof ErrorApi && err.status === 422) {
        setError(t("login.registro.errorSsn"));
      } else {
        setError(t("login.registro.errorGenerico"));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ck-cream p-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <Image src="/cropped-Logo.webp" alt="Chicken Kitchen" width={120} height={48} priority />
          <div className="flex items-center gap-1">
            <SelectorIdioma />
            <ToggleTema />
          </div>
        </div>

        <h1 className="text-lg font-bold text-ck-dark dark:text-neutral-100">
          {t("login.titulo")}
        </h1>

        {paso === "email" && (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.subtitulo")}
            </p>
            <form onSubmit={manejarSubmitEmail}>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                aria-label={t("login.email.campoEmail")}
                placeholder="nombre@chickenkitchen.demo"
                className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              {error && (
                <p className="mb-3 text-sm font-semibold text-ck-red" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando || !email.trim()}
                className="min-h-[44px] w-full rounded-xl bg-ck-red py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95"
              >
                {enviando ? t("login.email.verificando") : t("login.email.continuar")}
              </button>
            </form>

            <p className="mt-4 rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
              {t("login.demoAviso")}
            </p>
            <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
              {t("login.credencialesDemo")}
            </p>
          </>
        )}

        {paso === "pin" && (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.pin.subtitulo", { email: email.trim() })}
            </p>

            <form onSubmit={manejarSubmitPin}>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                readOnly
                value={pin}
                aria-label={t("login.marcador")}
                placeholder="••••"
                className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              {error && (
                <p className="mb-3 text-sm font-semibold text-ck-red" role="alert">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[...DIGITOS_FILA_1, ...DIGITOS_FILA_2, ...DIGITOS_FILA_3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => agregarDigito(d)}
                    className="min-h-[44px] rounded-xl border border-neutral-200 py-3 text-lg font-semibold text-ck-dark active:scale-95 dark:border-neutral-700 dark:text-neutral-100"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={borrarUltimo}
                  className="min-h-[44px] rounded-xl border border-neutral-200 py-3 text-xs font-semibold text-neutral-500 active:scale-95 dark:border-neutral-700 dark:text-neutral-400"
                >
                  {t("login.borrar")}
                </button>
                <button
                  type="button"
                  onClick={() => agregarDigito("0")}
                  className="min-h-[44px] rounded-xl border border-neutral-200 py-3 text-lg font-semibold text-ck-dark active:scale-95 dark:border-neutral-700 dark:text-neutral-100"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={enviando || !pin}
                  className="min-h-[44px] rounded-xl bg-ck-red py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95"
                >
                  {enviando ? t("login.entrando") : t("login.entrar")}
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={volverAPasoEmail}
              className="mt-4 w-full text-center text-xs font-semibold text-neutral-500 underline dark:text-neutral-400"
            >
              {t("login.usarOtroCorreo")}
            </button>
          </>
        )}

        {paso === "pendiente" && (
          <>
            <p className="mb-1 mt-3 text-sm font-bold text-ck-dark dark:text-neutral-100">
              {t("login.pendiente.titulo")}
            </p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.pendiente.mensaje", { email: email.trim() })}
            </p>
            <button
              type="button"
              onClick={volverAPasoEmail}
              className="min-h-[44px] w-full rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-ck-dark dark:border-neutral-700 dark:text-neutral-100"
            >
              {t("login.usarOtroCorreo")}
            </button>
          </>
        )}

        {paso === "registro" && (
          <>
            <p className="mb-1 mt-3 text-sm font-bold text-ck-dark dark:text-neutral-100">
              {t("login.registro.titulo")}
            </p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.registro.subtitulo", { email: email.trim() })}
            </p>

            <form onSubmit={manejarSubmitRegistro} className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoEmail")}
                <input
                  disabled
                  readOnly
                  value={email.trim()}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                />
              </label>

              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoNombre")}
                <input
                  required
                  autoFocus
                  value={registro.nombre}
                  onChange={(e) => setRegistro((r) => ({ ...r, nombre: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>

              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoApellido")}
                <input
                  required
                  value={registro.apellido}
                  onChange={(e) => setRegistro((r) => ({ ...r, apellido: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>

              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoTelefono")}
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={registro.telefono}
                  onChange={(e) => setRegistro((r) => ({ ...r, telefono: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>

              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoSsn")}
                <input
                  required
                  inputMode="numeric"
                  minLength={4}
                  maxLength={4}
                  placeholder="1234"
                  value={registro.ssnUltimos4}
                  onChange={(e) =>
                    setRegistro((r) => ({
                      ...r,
                      // Enmascarado en el cliente: nunca se captura/envia el SSN
                      // completo, solo estos 4 digitos (ver nota de privacidad en
                      // lib/domain/types.ts Empleado.ssnUltimos4).
                      ssnUltimos4: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <span className="mt-1 block text-[11px] font-normal normal-case text-neutral-400 dark:text-neutral-500">
                  {t("login.registro.ssnAyuda")}
                </span>
              </label>

              {error && (
                <p className="text-sm font-semibold text-ck-red" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando || registro.ssnUltimos4.length !== 4}
                className="min-h-[44px] w-full rounded-xl bg-ck-red py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95"
              >
                {enviando ? t("login.registro.enviando") : t("login.registro.enviar")}
              </button>
            </form>

            <button
              type="button"
              onClick={volverAPasoEmail}
              className="mt-4 w-full text-center text-xs font-semibold text-neutral-500 underline dark:text-neutral-400"
            >
              {t("login.usarOtroCorreo")}
            </button>
          </>
        )}

        {paso === "registroExitoso" && (
          <>
            <p className="mb-1 mt-3 text-sm font-bold text-ck-dark dark:text-neutral-100">
              {t("login.registroExitoso.titulo")}
            </p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.registroExitoso.mensaje")}
            </p>
            <button
              type="button"
              onClick={volverAPasoEmail}
              className="min-h-[44px] w-full rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-ck-dark dark:border-neutral-700 dark:text-neutral-100"
            >
              {t("login.registroExitoso.volver")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
