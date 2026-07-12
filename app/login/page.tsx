"use client";

/**
 * /login — sesion DEMO por PIN (etapa 1 de 3 de este proyecto).
 *
 * DEMO: valida el PIN contra Usuario.pinHash ("demo:<pin>") de la ubicacion
 * piloto (Miami, FL). No hay JWT/cookies de servidor: al validar se guarda
 * el usuarioId en localStorage (ver lib/shell/SesionProvider.tsx). La etapa
 * 2 de este proyecto reemplazara este login por el flujo TOTP + verificacion
 * facial descrito en los ADR de seguridad.
 */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import { ErrorApi } from "@/components/shell/api";
import SelectorIdioma from "@/components/shell/SelectorIdioma";
import ToggleTema from "@/components/shell/ToggleTema";

const LONGITUD_PIN = 4;
const DIGITOS_FILA_1 = ["1", "2", "3"];
const DIGITOS_FILA_2 = ["4", "5", "6"];
const DIGITOS_FILA_3 = ["7", "8", "9"];

export default function LoginPage() {
  const router = useRouter();
  const { usuarioActual, cargando, login } = useSesion();
  const { t } = useI18n();

  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesion activa, /login no tiene nada que hacer.
  useEffect(() => {
    if (!cargando && usuarioActual) router.replace("/");
  }, [cargando, usuarioActual, router]);

  function agregarDigito(digito: string) {
    setError(null);
    setPin((prev) => (prev.length >= LONGITUD_PIN ? prev : prev + digito));
  }

  function borrarUltimo() {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await login(pin);
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
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {t("login.subtitulo")}
        </p>

        <form onSubmit={manejarSubmit}>
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

        <p className="mt-4 rounded-lg border border-ck-gold/40 bg-ck-gold/10 p-2 text-[11px] leading-snug text-ck-dark dark:text-neutral-300">
          {t("login.demoAviso")}
        </p>
        <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          {t("login.pinesDemo")}
        </p>
      </div>
    </main>
  );
}
