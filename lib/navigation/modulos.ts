/**
 * Fuente UNICA de verdad de los modulos del sidebar — DUENO: shell de UI
 * (etapa 1 de 3 de este proyecto). NO dupliques esta lista en ningun
 * componente: el Sidebar (components/shell/Sidebar.tsx) solo LEE este
 * arreglo y lo filtra contra `usuarioActual.rol.permisos`.
 *
 * Mapeo de permisos (decision de modelado documentada aqui a proposito):
 *  - "/" (Inicio): permiso null -> visible para cualquier usuario autenticado,
 *    sin importar su rol.
 *  - "/pos" ("pedido.crear"): lo tienen rol-cajero y rol-gerente; rol-cocina no.
 *  - "/kds" ("cocina.actualizarEstado"): unico permiso de cocina sembrado en
 *    lib/db/store.ts; solo rol-cocina ve la pantalla de cocina en este MVP.
 *  - "/reportes" ("reportes.ver"): NO existia un permiso natural para
 *    reportes en el RBAC sembrado. Se agrego este permiso nuevo, otorgado
 *    SOLO a rol-gerente (ver lib/db/store.ts), porque las metricas de
 *    ventas/arqueo son informacion gerencial en el MVP.
 *  - "/empleados" ("empleados.gestionar") y "/nomina" ("nomina.ver"): mismo
 *    caso; permisos nuevos otorgados solo a rol-gerente, porque alta/baja de
 *    personal y calculo de pago son operaciones gerenciales, no de
 *    mostrador/cocina.
 *
 * EXTENSION FUTURA: agrega aqui los nuevos modulos de sidebar cuando se
 * creen. Los flujos de las etapas 2 ("jornada" TOTP + verificacion facial) y
 * 3 (chatbot de ayuda) de este proyecto, AMBAS YA IMPLEMENTADAS, NO son
 * modulos de sidebar:
 *  - Etapa 2: son dos rutas aparte, `/jornada/pantalla` (pantalla
 *    compartida/kiosko de la tienda) y `/jornada/marcar` (celular del
 *    empleado), ambas exentas del guard de sesion del shell — no tendria
 *    sentido que aparecieran en ESTE sidebar porque no dependen de la sesion
 *    PIN ni del rol logueado (ver components/shell/AppShell.tsx,
 *    `RUTAS_SIN_GUARD`).
 *  - Etapa 3: `components/shell/ChatbotWidget.tsx` es un widget flotante
 *    montado directo en AppShell.tsx (no una ruta), disponible sobre
 *    cualquier pantalla ya autenticada.
 * Ninguno de los dos debe agregarse a este arreglo.
 */

import type { Rol } from "@/lib/domain/types";

export interface ModuloNavegacion {
  href: string;
  /** Clave de i18n (lib/i18n/en.json / es.json) para el texto visible. */
  labelKey: string;
  /** null = visible para cualquier usuario autenticado, sin importar su rol. */
  permiso: string | null;
}

export const MODULOS_NAVEGACION: ModuloNavegacion[] = [
  { href: "/", labelKey: "sidebar.inicio", permiso: null },
  { href: "/pos", labelKey: "sidebar.pos", permiso: "pedido.crear" },
  { href: "/kds", labelKey: "sidebar.kds", permiso: "cocina.actualizarEstado" },
  { href: "/reportes", labelKey: "sidebar.reportes", permiso: "reportes.ver" },
  { href: "/empleados", labelKey: "sidebar.empleados", permiso: "empleados.gestionar" },
  { href: "/nomina", labelKey: "sidebar.nomina", permiso: "nomina.ver" },
];

/** Filtra MODULOS_NAVEGACION contra los permisos del rol dado. */
export function modulosVisiblesParaRol(rol: Rol | null | undefined): ModuloNavegacion[] {
  if (!rol) return [];
  return MODULOS_NAVEGACION.filter(
    (m) => m.permiso === null || rol.permisos.includes(m.permiso)
  );
}
