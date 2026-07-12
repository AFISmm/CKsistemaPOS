"use client";

/**
 * Armazon de UI (shell) — DUENO: shell de UI. Se monta una sola vez desde
 * app/layout.tsx, envolviendo TODAS las rutas. Las 3 etapas de este proyecto
 * (shell, jornada TOTP+facial, chatbot de ayuda) ya estan implementadas.
 *
 * Responsabilidades:
 *  - Si no hay sesion activa (usuarioActual === null) y la ruta no es
 *    /login, redirige a /login (guard DEMO en el cliente; no hay middleware
 *    de servidor real, ver lib/shell/SesionProvider.tsx).
 *  - /login se renderiza "desnuda" (sin sidebar/topbar).
 *  - Cualquier otra ruta se envuelve con Sidebar (izquierdo, fijo en
 *    desktop) + Topbar (idioma, tema, notificaciones, logout) + el widget de
 *    chat flotante (ChatbotWidget, etapa 3).
 *
 * NOTAS DE INTEGRACION de las etapas 2 y 3 de este proyecto:
 *  - Etapa 2 (jornada TOTP + verificacion facial): se integro como DOS rutas
 *    exentas del guard de sesion (`RUTAS_SIN_GUARD` abajo), no como reemplazo
 *    del login por PIN:
 *      - /jornada/pantalla: pantalla COMPARTIDA de la tienda (tablet/terminal
 *        fija del gerente), sin usuario especifico asociado. Exigir la
 *        sesion demo del shell aqui no tendria sentido de negocio (cualquiera
 *        que este frente a esa tablet fisica en la tienda debe poder verla) y
 *        además se renderiza "desnuda" (sin sidebar/topbar), estilo kiosko.
 *      - /jornada/marcar: se abre desde el CELULAR PERSONAL del empleado, que
 *        normalmente no tiene (ni deberia necesitar) la sesion PIN del shell
 *        de la tienda. La verificacion facial simulada + codigo TOTP de la
 *        pantalla central son, en si mismas, el mecanismo de identidad/
 *        presencia de este flujo — no dependen del login por PIN.
 *    Si en el futuro se requiere estrictamente sesion tambien en estas dos
 *    rutas, basta con quitarlas de `RUTAS_SIN_GUARD`.
 *  - Etapa 3 (chatbot de ayuda, YA IMPLEMENTADA): `<ChatbotWidget />` se monta
 *    justo antes del cierre de este componente, como hermano del contenedor
 *    con Sidebar+Topbar+<main>, NO dentro de el — asi el boton flotante queda
 *    fijo sobre toda la pantalla sin importar el scroll interno de <main>.
 *    Al vivir en esta rama del componente (la de sesion activa), el widget
 *    NO aparece en /login ni en las rutas de `RUTAS_SIN_GUARD`
 *    (/jornada/pantalla, /jornada/marcar), que retornan antes de llegar aqui:
 *    esa exclusion es automatica, no una lista aparte que haya que mantener
 *    sincronizada. Ver el comentario de cabecera en ChatbotWidget.tsx para el
 *    razonamiento de negocio de esa exclusion. No es un modulo de sidebar
 *    (ver lib/navigation/modulos.ts).
 */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatbotWidget from "./ChatbotWidget";

const RUTA_LOGIN = "/login";

/** Rutas del chequeo de inicio de jornada (etapa 2): exentas del guard de sesion y se renderizan "desnudas" (ver comentario arriba). */
const RUTAS_SIN_GUARD = ["/jornada/pantalla", "/jornada/marcar"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioActual, cargando } = useSesion();
  const { t } = useI18n();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  const esLogin = pathname === RUTA_LOGIN;
  const esRutaSinGuard = esLogin || RUTAS_SIN_GUARD.some((r) => pathname?.startsWith(r));

  // Guard DEMO: sin sesion y fuera de /login o de una ruta exenta -> redirige a /login.
  useEffect(() => {
    if (!cargando && !usuarioActual && !esRutaSinGuard) {
      router.replace(RUTA_LOGIN);
    }
  }, [cargando, usuarioActual, esRutaSinGuard, router]);

  // Cierra el drawer movil del sidebar al navegar.
  useEffect(() => {
    setSidebarAbierto(false);
  }, [pathname]);

  if (esRutaSinGuard) {
    return <>{children}</>;
  }

  if (cargando || !usuarioActual) {
    return (
      <main className="grid min-h-screen place-items-center bg-ck-cream dark:bg-neutral-950">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("shell.cargando")}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ck-cream dark:bg-neutral-950">
      <Sidebar abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onAbrirSidebar={() => setSidebarAbierto(true)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {/* Etapa 3: widget flotante de chat de ayuda. Montado aqui (y no en una
          pagina especifica) para estar disponible en TODAS las pantallas ya
          autenticadas; al vivir dentro de esta rama del guard, queda excluido
          automaticamente de /login, /jornada/pantalla y /jornada/marcar (ver
          RUTAS_SIN_GUARD arriba y el comentario de ChatbotWidget.tsx). */}
      <ChatbotWidget />
    </div>
  );
}
