"use client";

/**
 * Modo oscuro/claro del shell — DUENO: shell de UI (etapa 1).
 * Aplica/quita la clase `dark` en <html> (tailwind.config.ts: darkMode: "class")
 * y persiste la preferencia en localStorage bajo el namespace `ck-pos:tema`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Tema = "claro" | "oscuro";

const CLAVE_STORAGE = "ck-pos:tema";

interface TemaContextValue {
  tema: Tema;
  setTema: (tema: Tema) => void;
  alternarTema: () => void;
}

const TemaContext = createContext<TemaContextValue | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  // Claro por defecto salvo que haya una preferencia guardada.
  const [tema, setTemaState] = useState<Tema>("claro");

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      if (guardado === "claro" || guardado === "oscuro") setTemaState(guardado);
    } catch {
      // localStorage no disponible: se mantiene "claro".
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "oscuro");
  }, [tema]);

  function setTema(siguiente: Tema) {
    setTemaState(siguiente);
    try {
      window.localStorage.setItem(CLAVE_STORAGE, siguiente);
    } catch {
      // Sin localStorage: el cambio de tema sigue aplicando en memoria.
    }
  }

  function alternarTema() {
    setTema(tema === "claro" ? "oscuro" : "claro");
  }

  return (
    <TemaContext.Provider value={{ tema, setTema, alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema(): TemaContextValue {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema debe usarse dentro de <TemaProvider>.");
  return ctx;
}
