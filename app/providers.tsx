"use client";

/**
 * Composicion de los providers de contexto del shell (etapa 1): tema (modo
 * oscuro/claro), i18n y sesion DEMO. Se monta una sola vez en app/layout.tsx,
 * envolviendo <AppShell>. El orden importa poco aqui (no hay dependencias
 * cruzadas entre ellos), pero se mantiene tema/i18n por fuera de sesion para
 * que el login (que se renderiza sin shell) tambien pueda usarlos.
 */

import type { ReactNode } from "react";
import { TemaProvider } from "@/lib/shell/TemaProvider";
import { I18nProvider } from "@/lib/shell/I18nProvider";
import { SesionProvider } from "@/lib/shell/SesionProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TemaProvider>
      <I18nProvider>
        <SesionProvider>{children}</SesionProvider>
      </I18nProvider>
    </TemaProvider>
  );
}
