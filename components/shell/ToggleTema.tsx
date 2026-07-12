"use client";

import { useTema } from "@/lib/shell/TemaProvider";
import { useI18n } from "@/lib/shell/I18nProvider";

/** Boton de la barra superior para alternar modo claro/oscuro. */
export default function ToggleTema() {
  const { tema, alternarTema } = useTema();
  const { t } = useI18n();
  const esOscuro = tema === "oscuro";
  const etiqueta = esOscuro ? t("topbar.temaClaro") : t("topbar.temaOscuro");

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid h-11 w-11 place-items-center rounded-lg text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {esOscuro ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
