"use client";

/**
 * Sidebar de navegacion IZQUIERDO (distinto del panel de notificaciones, que
 * es derecho). Consume UNICAMENTE lib/navigation/modulos.ts (nunca una lista
 * duplicada aqui) y lo filtra por el rol del usuario actual.
 *
 * Un solo nivel para la mayoria de modulos, sin submodulos. Fijo en desktop
 * (>= lg, 1024px); por debajo de ese breakpoint es un drawer que se abre/cierra
 * con el boton hamburguesa de la barra superior (ver Topbar.tsx / AppShell.tsx).
 *
 * EXCEPCION: "Terminal de Cajero" (/pos) es el UNICO modulo con `subitems`
 * (ver lib/navigation/modulos.ts). Sus sub-items ("Nuevo pedido"/"Historial de
 * pedidos") se renderizan siempre visibles, indentados debajo del link padre
 * (sin expandir/colapsar) — reemplazan a los botones que antes vivian en el
 * header de app/pos/page.tsx. No generalices este patron a otros modulos.
 *
 * Bloque inferior (debajo del nav, encima del aviso demo), de arriba a
 * abajo: "Mi Perfil", "Gestionar perfiles" (solo visible si el rol tiene el
 * permiso "usuarios.gestionar", ver lib/db/store.ts) y el boton de "Cerrar
 * sesion". El saludo al usuario (`usuarioActual.nombre`) SIGUE en Topbar.tsx.
 *
 * "Gestionar perfiles" navega a /perfiles (pagina completa del portal) — a
 * pedido de producto, YA NO abre un modal/ventana emergente (ver
 * app/perfiles/page.tsx, que reemplazo a components/shell/GestionarPerfilesModal.tsx).
 *
 * "Mi Perfil" (app/mi-perfil/page.tsx) navega a /mi-perfil y, a diferencia de
 * "Gestionar perfiles" (que gestiona A OTROS), es SIEMPRE visible con
 * cualquier sesion activa, sin chequeo de permiso: cualquier usuario logueado
 * puede editar su propio nombre/email/telefono y cambiar su propio PIN ahi
 * (caso de uso principal: cuentas developer/@digeniusai.com, que no tienen un
 * gerente que les gestione el perfil — ver decision de producto documentada
 * en lib/db/store.ts `ROL_DEVELOPER_ID`).
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { modulosVisiblesParaRol } from "@/lib/navigation/modulos";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";

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
              <div key={modulo.href}>
                <Link
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
                {modulo.subitems && modulo.subitems.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {modulo.subitems.map((sub) => {
                      const subActivo = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onCerrar}
                          aria-current={subActivo ? "page" : undefined}
                          className={`flex min-h-[36px] items-center rounded-lg pl-8 pr-3 text-xs font-semibold transition ${
                            subActivo
                              ? "bg-ck-red text-white"
                              : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-400 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {t(sub.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-neutral-100 px-2 py-2 dark:border-neutral-800">
          {usuarioActual && (
            <Link
              href="/mi-perfil"
              onClick={onCerrar}
              aria-current={pathname === "/mi-perfil" ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition ${
                pathname === "/mi-perfil"
                  ? "bg-ck-red text-white"
                  : "text-neutral-700 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {t("sidebar.miPerfil")}
            </Link>
          )}
          {puedeGestionarPerfiles && (
            <Link
              href="/perfiles"
              onClick={onCerrar}
              aria-current={pathname === "/perfiles" ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold transition ${
                pathname === "/perfiles"
                  ? "bg-ck-red text-white"
                  : "text-neutral-700 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {t("sidebar.gestionarPerfiles")}
            </Link>
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
    </>
  );
}
