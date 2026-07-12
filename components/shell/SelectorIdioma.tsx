"use client";

import { useI18n, type Idioma } from "@/lib/shell/I18nProvider";

const OPCIONES: Idioma[] = ["en", "es"];

/** Selector EN/ES de la barra superior. Cambia el idioma en caliente, sin recargar. */
export default function SelectorIdioma() {
  const { idioma, setIdioma, t } = useI18n();

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("topbar.idioma")}
    >
      {OPCIONES.map((opcion) => {
        const activo = idioma === opcion;
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => setIdioma(opcion)}
            aria-pressed={activo}
            title={t("topbar.idioma")}
            className={`grid h-11 w-11 place-items-center rounded-lg text-sm font-bold transition ${
              activo
                ? "bg-ck-red text-white"
                : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {opcion.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
