"use client";

/**
 * Sistema de internacionalizacion (i18n) propio y simple — DUENO: shell de UI
 * (etapa 1). Sin librerias externas: los diccionarios son JSON planos en
 * lib/i18n/en.json y lib/i18n/es.json, cargados como modulos (resolveJsonModule).
 *
 * Alcance de esta etapa: SOLO se tradujeron los textos visibles del shell
 * nuevo (sidebar, barra superior, login, panel de notificaciones). Las
 * paginas de negocio existentes (/pos, /kds, /reportes, /empleados, /nomina)
 * siguen con texto quemado en espanol; se traducirian progresivamente en una
 * iteracion futura reemplazando esos strings por `t("clave")`.
 *
 * Persistencia: localStorage bajo el namespace `ck-pos:idioma`, GLOBAL de
 * navegador (no por usuario). En produccion la preferencia de idioma se
 * guardaria en el backend, ligada al `Usuario` (junto con el resto de su
 * perfil), para que viaje entre dispositivos.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/lib/i18n/en.json";
import es from "@/lib/i18n/es.json";

export type Idioma = "en" | "es";

const DICCIONARIOS: Record<Idioma, Record<string, string>> = { en, es };
const CLAVE_STORAGE = "ck-pos:idioma";

interface I18nContextValue {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  t: (clave: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Ingles ("en") es el idioma por defecto en la primera carga, es decir,
  // cuando no hay preferencia previa guardada en localStorage.
  const [idioma, setIdiomaState] = useState<Idioma>("en");

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      if (guardado === "en" || guardado === "es") setIdiomaState(guardado);
    } catch {
      // localStorage no disponible (ej. modo privado estricto): se mantiene "en".
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  function setIdioma(siguiente: Idioma) {
    setIdiomaState(siguiente);
    try {
      window.localStorage.setItem(CLAVE_STORAGE, siguiente);
    } catch {
      // Sin localStorage: el cambio de idioma sigue aplicando en memoria.
    }
  }

  const t = useMemo(() => {
    return (clave: string, vars?: Record<string, string | number>) => {
      const diccionario = DICCIONARIOS[idioma];
      let texto = diccionario[clave] ?? DICCIONARIOS.en[clave] ?? clave;
      if (vars) {
        for (const [nombre, valor] of Object.entries(vars)) {
          texto = texto.replace(new RegExp(`\\{\\{${nombre}\\}\\}`, "g"), String(valor));
        }
      }
      return texto;
    };
  }, [idioma]);

  const value = useMemo<I18nContextValue>(
    () => ({ idioma, setIdioma, t }),
    [idioma, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>.");
  return ctx;
}
