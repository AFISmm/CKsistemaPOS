"use client";

/**
 * /login — sesion DEMO por correo + PIN (etapa 1 de 3 de este proyecto).
 *
 * Estructura pedida por el dueno de producto: DOS pestanas explicitas y
 * siempre visibles, "Iniciar sesion" / "Registrarse" (en vez del flujo
 * anterior que decidia automaticamente segun un lookup de correo):
 *  - "Iniciar sesion": correo + PIN habilitados de una sola vez (teclado
 *    numerico). Al enviar, se resuelve el correo contra el Empleado puntual
 *    (GET /api/v1/auth/verificar-correo) para dar un mensaje claro si el
 *    correo no existe o si el empleado todavia no tiene PIN asignado por un
 *    gerente, y si todo esta en orden se valida {email, pin} contra ESE
 *    Usuario especifico (POST /api/v1/auth/login).
 *  - "Registrarse": formulario de auto-alta (nombre, apellido, ultimos 4 del
 *    SSN, correo, telefono) -> POST /api/v1/auth/registrar. Crea un Empleado
 *    en "onboarding"; NO inicia sesion (no hay PIN todavia, lo asigna un
 *    gerente via "Completar onboarding"). Los correos @digeniusai.com
 *    (desarrolladores/staff del proyecto) NO necesitan SSN: el campo se
 *    oculta automaticamente si el correo termina en ese dominio (ver
 *    lib/auth/registro.ts para la validacion equivalente server-side).
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
import { PAISES, banderaDesdeCodigoPais } from "@/lib/data/paises";

const LONGITUD_PIN = 4;
const DIGITOS_FILA_1 = ["1", "2", "3"];
const DIGITOS_FILA_2 = ["4", "5", "6"];
const DIGITOS_FILA_3 = ["7", "8", "9"];

/** Dominio de correo de desarrolladores/staff de Digenius: no requieren SSN. */
const DOMINIO_DEVELOPERS = /@digeniusai\.com$/i;

/** Tienda piloto (Miami/Austin) -> Estados Unidos como default razonable del selector. */
const PAIS_TELEFONO_DEFAULT = "US";

type Modo = "login" | "registro";

const CAMPOS_REGISTRO_VACIO = {
  nombre: "",
  apellido: "",
  ssnUltimos4: "",
  telefonoNumero: "",
  email: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { usuarioActual, cargando, login } = useSesion();
  const { t } = useI18n();

  const [modo, setModo] = useState<Modo>("login");

  // --- Iniciar sesion ---
  const [emailLogin, setEmailLogin] = useState("");
  const [pin, setPin] = useState("");

  // --- Registrarse ---
  const [registro, setRegistro] = useState(CAMPOS_REGISTRO_VACIO);
  const [paisTelefono, setPaisTelefono] = useState(PAIS_TELEFONO_DEFAULT);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesion activa, /login no tiene nada que hacer.
  useEffect(() => {
    if (!cargando && usuarioActual) router.replace("/");
  }, [cargando, usuarioActual, router]);

  function cambiarModo(siguiente: Modo) {
    setModo(siguiente);
    setError(null);
    setPin("");
    setRegistroExitoso(false);
  }

  function agregarDigito(digito: string) {
    setError(null);
    setPin((prev) => (prev.length >= LONGITUD_PIN ? prev : prev + digito));
  }

  function borrarUltimo() {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }

  async function manejarSubmitLogin(e: FormEvent) {
    e.preventDefault();
    const emailLimpio = emailLogin.trim();
    if (!emailLimpio || !pin || enviando) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      setError(t("login.email.errorFormato"));
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const { registrado, pinHabilitado } = await verificarCorreo(emailLimpio);
      if (!registrado) {
        setError(t("login.errorNoRegistrado"));
        return;
      }
      if (!pinHabilitado) {
        setError(t("login.pendiente.mensaje", { email: emailLimpio }));
        return;
      }
      await login(emailLimpio, pin);
      router.replace("/");
    } catch (err) {
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

  const registroEsDeveloper = DOMINIO_DEVELOPERS.test(registro.email.trim());
  const indicativoSeleccionado =
    PAISES.find((p) => p.codigo === paisTelefono)?.indicativo ?? "+1";

  async function manejarSubmitRegistro(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await registrarEmpleado({
        nombre: registro.nombre.trim(),
        apellido: registro.apellido.trim(),
        // Correos @digeniusai.com (desarrolladores) no requieren SSN, ver
        // lib/auth/registro.ts (misma regla validada de nuevo server-side).
        ssnUltimos4: registroEsDeveloper ? null : registro.ssnUltimos4.trim(),
        email: registro.email.trim(),
        // Indicativo del pais elegido en el selector + numero nacional, ej.
        // "+1 3055550100". `telefono` sigue siendo un solo string en el
        // backend (sin cambio de esquema), solo se compone aqui.
        telefono: `${indicativoSeleccionado} ${registro.telefonoNumero.trim()}`.trim(),
      });
      setRegistroExitoso(true);
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

  const registroValido =
    registro.nombre.trim() &&
    registro.apellido.trim() &&
    registro.telefonoNumero.trim() &&
    registro.email.trim() &&
    (registroEsDeveloper || registro.ssnUltimos4.length === 4);

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

        <h1 className="mb-4 text-lg font-bold text-ck-dark dark:text-neutral-100">
          {t("login.titulo")}
        </h1>

        {/* Pestanas, siempre visibles: elegir entre iniciar sesion o registrarse. */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => cambiarModo("login")}
            aria-pressed={modo === "login"}
            className={`min-h-[40px] rounded-lg text-sm font-bold transition ${
              modo === "login"
                ? "bg-ck-red text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {t("login.tabIniciarSesion")}
          </button>
          <button
            type="button"
            onClick={() => cambiarModo("registro")}
            aria-pressed={modo === "registro"}
            className={`min-h-[40px] rounded-lg text-sm font-bold transition ${
              modo === "registro"
                ? "bg-ck-red text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {t("login.tabRegistrarse")}
          </button>
        </div>

        {modo === "login" && (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.subtituloIniciarSesion")}
            </p>

            <form onSubmit={manejarSubmitLogin}>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={emailLogin}
                onChange={(e) => {
                  setEmailLogin(e.target.value);
                  setError(null);
                }}
                aria-label={t("login.email.campoEmail")}
                placeholder="nombre@chickenkitchen.demo"
                className="mb-3 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              <input
                type="password"
                inputMode="numeric"
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
                  disabled={enviando || !pin || !emailLogin.trim()}
                  className="min-h-[44px] rounded-xl bg-ck-red py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95"
                >
                  {enviando ? t("login.entrando") : t("login.entrar")}
                </button>
              </div>
            </form>

            <p className="mt-4 rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
              {t("login.demoAviso")}
            </p>
            <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
              {t("login.credencialesDemo")}
            </p>
          </>
        )}

        {modo === "registro" && !registroExitoso && (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.subtituloRegistro")}
            </p>

            <form onSubmit={manejarSubmitRegistro} className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoEmail")}
                <input
                  required
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={registro.email}
                  onChange={(e) => setRegistro((r) => ({ ...r, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="nombre@chickenkitchen.demo"
                />
              </label>

              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t("login.registro.campoNombre")}
                <input
                  required
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
                <div className="mt-1 flex gap-2">
                  <select
                    aria-label={t("login.registro.campoPais")}
                    value={paisTelefono}
                    onChange={(e) => setPaisTelefono(e.target.value)}
                    className="w-28 shrink-0 rounded-xl border border-neutral-300 bg-white px-2 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {PAISES.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {banderaDesdeCodigoPais(p.codigo)} {p.indicativo}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    value={registro.telefonoNumero}
                    onChange={(e) =>
                      setRegistro((r) => ({ ...r, telefonoNumero: e.target.value }))
                    }
                    className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </label>

              {registroEsDeveloper ? (
                <p className="rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
                  {t("login.registro.ssnOmitidoDeveloper")}
                </p>
              ) : (
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
              )}

              {error && (
                <p className="text-sm font-semibold text-ck-red" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando || !registroValido}
                className="min-h-[44px] w-full rounded-xl bg-ck-red py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95"
              >
                {enviando ? t("login.registro.enviando") : t("login.registro.enviar")}
              </button>
            </form>
          </>
        )}

        {modo === "registro" && registroExitoso && (
          <>
            <p className="mb-1 mt-3 text-sm font-bold text-ck-dark dark:text-neutral-100">
              {t("login.registroExitoso.titulo")}
            </p>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("login.registroExitoso.mensaje")}
            </p>
            <button
              type="button"
              onClick={() => cambiarModo("login")}
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
