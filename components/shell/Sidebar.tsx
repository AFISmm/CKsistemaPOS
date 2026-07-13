"use client";

/**
 * Sidebar de navegacion IZQUIERDO (distinto del panel de notificaciones, que
 * es derecho). Consume UNICAMENTE lib/navigation/modulos.ts (nunca una lista
 * duplicada aqui) y lo filtra por el rol del usuario actual.
 *
 * Un solo nivel, sin submodulos. Fijo en desktop (>= lg, 1024px); por debajo
 * de ese breakpoint es un drawer que se abre/cierra con el boton hamburguesa
 * de la barra superior (ver Topbar.tsx / AppShell.tsx).
 *
 * Bloque inferior (debajo del nav, encima del aviso demo): el boton
 * "Gestionar perfiles" (solo visible si el rol tiene el permiso
 * "usuarios.gestionar", ver lib/db/store.ts) y el boton de "Cerrar sesion".
 * Ambos vivian antes en Topbar.tsx; se movieron aqui a pedido de producto
 * para agrupar las acciones de cuenta/sesion en un solo lugar. El saludo al
 * usuario (`usuarioActual.nombre`) SIGUE en Topbar.tsx.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { modulosVisiblesParaRol } from "@/lib/navigation/modulos";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import GestionarPerfilesModal from "@/components/shell/GestionarPerfilesModal";

interface SidebarProps {
  abierto: boolean;
  onCerrar: () => void;
}

export default function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioActual, logout } = useSesion();
  const { t } = useI18n();
  const modulos = modulosVisiblesParaRol(usuarioActual?.rol);
  const [mostrarPerfiles, setMostrarPerfiles] = useState(false);

  const puedeGestionarPerfiles = usuarioActual?.rol.permisos.includes("usuarios.gestionar") ?? false;

  function manejarLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      {/* Backdrop movil, solo visible cuando el drawer esta abierto (< lg). */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-900 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <Image
            src="/cropped-Logo.webp"
            alt="Chicken Kitchen"
            width={110}
            height={44}
            priority
          />
        </div>

        <nav className="flex-1 space-y-1 px-2 pb-4" aria-label={t("sidebar.inicio")}>
          {modulos.map((modulo) => {
            const activo = pathname === modulo.href;
            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                onClick={onCerrar}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition ${
                  activo
                    ? "bg-ck-red text-white"
                    : "text-neutral-700 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {t(modulo.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-neutral-100 px-2 py-2 dark:border-neutral-800">
          {puedeGestionarPerfiles && (
            <button
              type="button"
              onClick={() => setMostrarPerfiles(true)}
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-neutral-700 transition hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t("sidebar.gestionarPerfiles")}
            </button>
          )}
          <button
            type="button"
            onClick={manejarLogout}
            className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm font-bold text-ck-red transition hover:bg-ck-cream dark:hover:bg-neutral-800"
          >
            {t("topbar.cerrarSesion")}
          </button>
        </div>

        <p className="border-t border-neutral-100 px-4 py-3 text-[11px] leading-snug text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
          {t("sidebar.demoAviso")}
        </p>
      </aside>

      {mostrarPerfiles && (
        <GestionarPerfilesModal onCerrar={() => setMostrarPerfiles(false)} />
      )}
    </>
  );
}
