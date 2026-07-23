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
 *    Esta es la pagina de "Terminal de Cajero" (revisar pedidos enviados a
 *    cocina y cobrar). El armado de un pedido nuevo vive en /pos/nuevo (ver
 *    subitems abajo) — es un submodulo del mismo permiso, NO una pagina
 *    aparte con su propio permiso.
 *  - "/kds" ("cocina.actualizarEstado"): unico permiso de cocina sembrado en
 *    lib/db/store.ts; solo rol-cocina ve la pantalla de cocina en este MVP.
 *  - "/reportes" ("reportes.ver"): NO existia un permiso natural para
 *    reportes en el RBAC sembrado. Se agrego este permiso nuevo, otorgado
 *    SOLO a rol-gerente (ver lib/db/store.ts), porque las metricas de
 *    ventas/arqueo son informacion gerencial en el MVP. Desde esta iteracion
 *    YA NO es un modulo top-level: vive como sub-item de "Terminal de
 *    Cajero" (ver SUB-ITEMS abajo), porque en la practica quien cobra
 *    (rol-gerente) es quien tambien consulta el arqueo del dia.
 *  - "/empleados" ("empleados.gestionar") y "/nomina" ("nomina.ver"): mismo
 *    caso; permisos nuevos otorgados solo a rol-gerente, porque alta/baja de
 *    personal y calculo de pago son operaciones gerenciales, no de
 *    mostrador/cocina. Desde esta iteracion se fusionaron en UN SOLO modulo
 *    padre de sidebar ("Personal", href "/empleados") con dos sub-items — las
 *    paginas /empleados y /nomina en si NO cambiaron, solo como se navega a
 *    ellas (ver SUB-ITEMS abajo).
 *  - "/menu" ("menu.gestionar"): agregar/editar platos del catalogo es una
 *    operacion gerencial (mismo criterio que empleados/nomina de arriba);
 *    otorgado solo a rol-gerente y rol-developer (ver PERMISOS_GERENCIALES en
 *    lib/db/store.ts).
 *
 * SUB-ITEMS Y DESPLEGABLES (acordeon):
 * Hoy hay DOS modulos padre con `subitems`, ambos con el MISMO patron de
 * UI en Sidebar.tsx: colapsados por defecto, se despliegan al hacer clic en
 * el padre (que ADEMAS sigue navegando a su propio href — sigue siendo un
 * link real) o automaticamente si el usuario ya esta parado en la ruta del
 * padre o de cualquiera de sus sub-items al cargar la pagina.
 *
 *  1. "/pos" ("Terminal de Cajero"): sub-items "Nuevo pedido" (/pos/nuevo),
 *     "Historial de pedidos" (/pos/historial) y "Reportes" (/reportes, con
 *     permiso propio "reportes.ver" — ver campo `permiso` en SubItemNavegacion
 *     mas abajo). Nuevo pedido/historial NO llevan `permiso` propio: heredan
 *     el permiso del modulo padre ("pedido.crear").
 *  2. "/empleados" ("Personal"): sub-items "Gestion de Empleados" (/empleados,
 *     permiso "empleados.gestionar") y "Nomina" (/nomina, permiso
 *     "nomina.ver"). A diferencia del caso anterior, AMBOS sub-items llevan
 *     `permiso` propio (no heredan del padre) porque el modulo padre debe
 *     ser visible para un usuario que tenga CUALQUIERA de los dos permisos
 *     (ver `modulosVisiblesParaRol` mas abajo), y cada sub-item se filtra
 *     individualmente por SU propio permiso.
 *
 * Un sub-item sin `permiso` propio hereda el `permiso` de su modulo padre
 * (ver `subitemVisible` mas abajo). NO generalices el patron de acordeon a
 * otros modulos salvo que producto lo pida explicitamente.
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

export interface SubItemNavegacion {
  href: string;
  /** Clave de i18n (lib/i18n/en.json / es.json) para el texto visible. */
  labelKey: string;
  /**
   * Permiso propio del sub-item. Si se omite, hereda el `permiso` del modulo
   * padre (ver `subitemVisible` mas abajo) — ese es el caso de "Nuevo
   * pedido"/"Historial de pedidos" bajo "Terminal de Cajero". Si se declara,
   * el sub-item se filtra SOLO por este permiso, sin importar el `permiso`
   * del padre — ese es el caso de "Reportes" (bajo Terminal de Cajero) y de
   * ambos sub-items de "Personal" (Gestion de Empleados / Nomina).
   */
  permiso?: string;
}

export interface ModuloNavegacion {
  href: string;
  /** Clave de i18n (lib/i18n/en.json / es.json) para el texto visible. */
  labelKey: string;
  /** null = visible para cualquier usuario autenticado, sin importar su rol. */
  permiso: string | null;
  /**
   * Sub-items en desplegable (acordeon), colapsados por defecto. Ver nota
   * "SUB-ITEMS Y DESPLEGABLES" arriba para el detalle de UI y de permisos.
   */
  subitems?: SubItemNavegacion[];
}

export const MODULOS_NAVEGACION: ModuloNavegacion[] = [
  { href: "/", labelKey: "sidebar.inicio", permiso: null },
  {
    href: "/pos",
    labelKey: "sidebar.pos",
    permiso: "pedido.crear",
    subitems: [
      { href: "/pos/nuevo", labelKey: "sidebar.pos.nuevoPedido" },
      { href: "/pos/historial", labelKey: "sidebar.pos.historial" },
      { href: "/reportes", labelKey: "sidebar.reportes", permiso: "reportes.ver" },
    ],
  },
  { href: "/kds", labelKey: "sidebar.kds", permiso: "cocina.actualizarEstado" },
  {
    href: "/empleados",
    labelKey: "sidebar.personal",
    permiso: "empleados.gestionar",
    subitems: [
      { href: "/empleados", labelKey: "sidebar.personal.empleados", permiso: "empleados.gestionar" },
      { href: "/nomina", labelKey: "sidebar.nomina", permiso: "nomina.ver" },
      // AGREGADO (Fase B, revision 2026-07-22 seccion "reparto de propinas por
      // rol/puntos"): mismo permiso que Nomina ("nomina.ver") — es informacion
      // gerencial/financiera de referencia del mismo tipo, ver app/propinas.
      { href: "/propinas", labelKey: "sidebar.propinas", permiso: "nomina.ver" },
    ],
  },
  { href: "/menu", labelKey: "sidebar.menu", permiso: "menu.gestionar" },
];

/**
 * Un sub-item sin `permiso` propio hereda el del modulo padre (permisoPadre).
 * `permisoPadre === null` (caso hipotetico, hoy no ocurre) => siempre visible.
 */
export function subitemVisible(
  sub: SubItemNavegacion,
  permisoPadre: string | null,
  rol: Rol | null | undefined
): boolean {
  const requerido = sub.permiso ?? permisoPadre;
  if (requerido === null) return true;
  return !!rol && rol.permisos.includes(requerido);
}

/**
 * Filtra MODULOS_NAVEGACION contra los permisos del rol dado. Un modulo con
 * `subitems` es visible si el rol tiene el permiso del propio modulo O el
 * permiso propio de AL MENOS UNO de sus sub-items (caso "Personal": un
 * usuario con solo "nomina.ver" debe ver el modulo padre aunque no tenga
 * "empleados.gestionar").
 */
export function modulosVisiblesParaRol(rol: Rol | null | undefined): ModuloNavegacion[] {
  if (!rol) return [];
  return MODULOS_NAVEGACION.filter((m) => {
    if (m.permiso === null) return true;
    if (rol.permisos.includes(m.permiso)) return true;
    return (m.subitems ?? []).some((s) => s.permiso !== undefined && rol.permisos.includes(s.permiso));
  });
}

/** Sub-items de `modulo` visibles para `rol` (respeta herencia de permiso, ver `subitemVisible`). */
export function subitemsVisiblesDelModulo(
  modulo: ModuloNavegacion,
  rol: Rol | null | undefined
): SubItemNavegacion[] {
  return (modulo.subitems ?? []).filter((s) => subitemVisible(s, modulo.permiso, rol));
}

/**
 * FASE A (revision 2026-07-22, seccion 2.5 "saltar el sidebar para roles de
 * un solo modulo"): hallazgo real de la llamada de revision — si un usuario
 * logueado solo tiene permiso para UN modulo de negocio (ademas de "/"
 * Inicio, que es especial), debe aterrizar DIRECTO en la pantalla de ese
 * modulo al iniciar sesion, sin ver el sidebar ni el dashboard de tarjetas de
 * "/" (ver components/shell/AppShell.tsx, que consume las dos funciones de
 * abajo para decidir el bypass; app/page.tsx es ese dashboard de tarjetas).
 *
 * REGLA DE CONTEO, EXPLICITA A PROPOSITO (facil de errar por un off-by-one):
 * "/" (Inicio) NUNCA cuenta como uno de los modulos para este calculo, sin
 * importar que `modulosVisiblesParaRol` SI lo incluya en la lista que pinta
 * el Sidebar (permiso `null` = siempre visible, ver arriba). Es decir: un
 * rol-cajero (permiso unico "pedido.crear") tiene, para este calculo,
 * EXACTAMENTE 1 modulo "real" ("/pos") — no 2. Un rol-gerente (con
 * "pedido.crear" + "empleados.gestionar"/"nomina.ver" + "menu.gestionar" +
 * "cocina.actualizarEstado", ver PERMISOS_GERENCIALES en lib/db/store.ts)
 * tiene 3+ modulos reales y por lo tanto NUNCA activa este bypass: sigue
 * viendo el sidebar completo igual que hoy.
 */

/** `MODULOS_NAVEGACION` visibles para `rol`, EXCLUYENDO "/" Inicio (ver regla de conteo arriba). */
export function modulosRealesVisiblesParaRol(rol: Rol | null | undefined): ModuloNavegacion[] {
  return modulosVisiblesParaRol(rol).filter((m) => m.href !== "/");
}

/**
 * Si `rol` tiene EXACTAMENTE UN modulo real visible (ver
 * `modulosRealesVisiblesParaRol`), lo devuelve — es el modulo al que
 * AppShell.tsx debe redirigir de inmediato y para el que debe omitir el
 * sidebar. `null` en cualquier otro caso (0 modulos: rol sin permisos/sin
 * sesion; o 2+: el usuario sigue viendo el sidebar completo, sin bypass).
 */
export function moduloUnicoVisibleParaRol(rol: Rol | null | undefined): ModuloNavegacion | null {
  const reales = modulosRealesVisiblesParaRol(rol);
  return reales.length === 1 ? reales[0] : null;
}
