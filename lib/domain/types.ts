/**
 * Contrato de tipos compartido — DEMO POS Chicken Kitchen.
 *
 * Fuente: docs/arquitectura.md seccion 5 (modelo de datos, 19 entidades).
 * Restricciones aplicadas:
 *  - C-NOMBRES: entidades PascalCase, campos camelCase (en espanol).
 *  - C-DINERO: TODOS los montos son ENTEROS DE CENTAVOS (number). Nunca float de dolares.
 *              Ej: 1099 = $10.99. Usar formatearDinero() para mostrar.
 *  - C-SNAPSHOT: LineaDePedido y Pago congelan precios al vender.
 *  - C-TENANT: toda entidad transaccional lleva ubicacionId.
 *  - C-PCI: en Pago solo token + ultimos4, nunca PAN/CVV.
 *
 * Nota demo: los ids se generan con crypto.randomUUID (v4). El contrato de produccion
 * pide UUID v7 ordenable; se documenta como simplificacion de demo.
 */

// ---------- Enums / uniones ----------

export type EstadoUbicacion = "FL" | "TX";

export type CanalPedido =
  | "mostrador"
  | "kiosco"
  | "online"
  | "delivery"
  | "catering";

export type EstadoPedido =
  | "abierto"
  | "enviadoCocina"
  | "enPreparacion"
  | "listo"
  | "entregado"
  | "cobrado"
  | "cancelado";

/** Estado de cocina por linea/ticket (flujo KDS: recibido -> preparando -> listo). */
export type EstadoCocina = "recibido" | "preparando" | "listo";

export type MetodoPago = "efectivo" | "tarjeta" | "otro";

export type EstadoPago =
  | "aprobado"
  | "rechazado"
  | "pendiente"
  | "reembolsado"
  | "encolado"; // store-and-forward offline (demo)

export type TipoModificador = "agregar" | "sin" | "sustituir";

/**
 * AGREGADO (Fase B, 2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * seccion 2.3 / Anexo A.1 y docs/requisitos.md S-16): clasificacion de
 * PRESENTACION/AGRUPACION de un `Modificador`, para que la UI de toma de
 * pedido pueda agrupar visualmente las opciones de forma sensata (toppings
 * vs. salsas/aderezos vs. sustituciones), independiente de `TipoModificador`
 * (que es la clasificacion de MECANICA: como afecta precio/receta).
 *  - "topping": extra tipo topping (viene de la hoja/categoria real "Toppings").
 *  - "salsa": salsa o aderezo (hojas/categorias reales "Sauces" / "Dressings").
 *  - "sustitucion": intercambio que afecta inventario de forma relevante
 *    (siempre que `tipo === "sustituir"`).
 *  - "otro": cualquier otro caso (ej. "sin X" que quita un insumo, tallas,
 *    extras genericos de la hoja "Modifiers").
 * DEMO: ver heuristica de poblacion en lib/data/catalog-modificadores.demo.ts.
 */
export type CategoriaModificador = "topping" | "salsa" | "sustitucion" | "otro";

/**
 * AGREGADO (Fase B, 2026-07-22, ver docs/requisitos.md S-16): catalogo DEMO de
 * alergenos comunes usado para etiquetar `Insumo.alergenos`. Lista basica tipo
 * FDA "Big 9" simplificada a los alergenos relevantes para insumos de cocina
 * QSR observados en el recetario real (no es una lista regulatoria completa).
 */
export type TipoAlergeno =
  | "lacteos"
  | "gluten"
  | "huevo"
  | "soya"
  | "frutosSecos"
  | "mariscos";

export type EstadoTurno = "abierto" | "cerrado";

/**
 * AGREGADO (Fase A, revision 2026-07-22 seccion 2.1 "cobrar-vs-enviar-a-cocina
 * configurable"): modo de operacion de una `Ubicacion`, usado por
 * backend-ventas-pos (lib/sales/engine.ts) para decidir CUANDO se permite
 * cobrar un pedido relativo a cocina:
 *  - "mostrador" (servicio de mostrador/contador, SIN meseros): se cobra
 *    ANTES de enviar a cocina — flujo por DEFECTO para Chicken Kitchen (ver
 *    docs/analisis-revision-20260722-modulos-innovacion-seguridad.md). El
 *    pedido puede llegar a estado "cobrado" directamente desde "abierto"; de
 *    ahi `enviarACocina` lo mete a la cola de cocina sin tocar ese estado ya
 *    terminal (ver comentario largo en engine.ts).
 *  - "mesa" (servicio a la mesa, CON meseros): se cobra AL FINAL, como en el
 *    flujo clasico ya implementado (abierto -> enviadoCocina -> ... ->
 *    entregado -> cobrado). Ambos modelos son reales segun los dos revisores
 *    con experiencia operativa (mostrador puro vs. servicio a la mesa); NO se
 *    elimina codigo del flujo "mesa", solo deja de ser el default.
 */
export type ModoOperacionUbicacion = "mostrador" | "mesa";

export type TipoEventoAuditoria =
  | "descuentoAplicado"
  | "reembolso"
  | "cancelacion"
  | "ajusteInventario"
  | "aperturaCajon"
  | "producto86"
  | "cierreZ"
  | "ventaConfirmada"
  | "pagoRegistrado"
  // ---- Modulo Empleados/Nomina (rrhh-personal-pos / nomina-pos) ----
  | "altaEmpleado"
  | "bajaEmpleado"
  | "cambioRolEmpleado"
  | "alertaAsistencia"
  | "nominaGenerada"
  /** AGREGADO (Fase A, revision 2026-07-22 seccion 2.2): edicion de tarifa/hora de un Empleado ya existente (independiente de su rol). */
  | "cambioTarifaEmpleado"
  /** AGREGADO (Fase A, revision 2026-07-22 seccion 2.2): edicion de un HorarioTurno ya asignado (fecha/horas). */
  | "cambioHorarioEmpleado";

// ---------- Empleados / turnos de trabajo / asistencia (owner: rrhh-personal-pos) ----------
// NOTA DE NOMBRES: `Turno` (arriba) es el turno DE CAJA/registradora (apertura/cierre Z).
// `HorarioTurno` es el turno DE TRABAJO programado de un Empleado. Son conceptos
// distintos y no deben confundirse ni reutilizarse entre si.

export type EstadoEmpleado = "onboarding" | "activo" | "inactivo";

export interface Empleado {
  id: string;
  ubicacionId: string;
  nombre: string;
  email: string;
  telefono: string;
  rolId: string;
  fechaContratacion: string; // ISO date (YYYY-MM-DD)
  estado: EstadoEmpleado;
  /** Tarifa por hora en CENTAVOS (C-DINERO), usada por nomina-pos. */
  tarifaHoraCentavos: number;
  /** Link opcional al Usuario de login (rol RBAC/PIN). Se crea al completar onboarding. */
  usuarioId: string | null;
  /** Motivo de baja (solo si estado === "inactivo"). */
  motivoBaja: string | null;
  /**
   * AGREGADO EN ETAPA 1 (auto-registro desde /login): SOLO los ULTIMOS 4
   * digitos del SSN (Social Security Number), NUNCA el numero completo.
   * Mismo principio que C-PCI en `Pago` (solo token + ultimos4, nunca
   * PAN/CVV) y que la verificacion facial simulada de `Marcaje` (nunca datos
   * biometricos reales): esta demo se despliega publicamente en internet
   * (Vercel) sin autenticacion real de servidor, asi que el dato sensible se
   * minimiza DESDE EL ORIGEN — el cliente nunca envia ni el servidor nunca
   * almacena el SSN completo (ver app/api/v1/auth/registrar/route.ts y
   * lib/auth/registro.ts, que rechazan cualquier valor que no sean EXACTAMENTE
   * 4 digitos). `null` = no aplica (empleados semilla existentes, o
   * empleados dados de alta manualmente por un gerente sin este dato).
   * Produccion: dato real de SSN completo requeriria cifrado en reposo,
   * control de acceso estricto (least privilege) y cumplimiento normativo
   * (ver nota de cumplimiento en README-DEMO.md).
   */
  ssnUltimos4: string | null;
  /**
   * AGREGADO EN ETAPA 2, refuerzo de verificacion facial (ver lib/jornada/webauthn.ts):
   * id (base64url) de la credencial de WebAuthn (Face ID / Touch ID / Windows
   * Hello) registrada para ESTE empleado en el ULTIMO dispositivo desde el que
   * se registro. Modelo simplificado de demo: solo UNA credencial por
   * empleado (no un array de credenciales por dispositivo, como haria un
   * sistema WebAuthn completo) — registrar de nuevo desde otro dispositivo
   * simplemente reemplaza esta credencial. `null` = el empleado todavia no
   * registro Face ID/Touch ID en ningun dispositivo (usa los botones de
   * simulacion, ver app/jornada/marcar/page.tsx).
   */
  credencialWebauthnId: string | null;
  creadoEn: string;
}

/** Turno de trabajo PROGRAMADO de un empleado (no confundir con `Turno` de caja). */
export interface HorarioTurno {
  id: string;
  empleadoId: string;
  ubicacionId: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  horaInicioProgramada: string; // "HH:MM" 24h, hora local de la tienda (demo)
  horaFinProgramada: string; // "HH:MM" 24h
}

export type TipoMarcaje = "entrada" | "salida";

/**
 * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada — ver lib/jornada/*):
 * metodo por el que se verifico la identidad de ESE marcaje especifico.
 *  - "facial": verificacion facial SIMULADA (exitosa) + codigo TOTP de la
 *    pantalla central de la tienda (prueba de presencia fisica).
 *  - "pinRespaldo": plan B tras agotar 3 intentos faciales fallidos; PIN de
 *    respaldo contra Usuario.pinHash (no prueba presencia fisica).
 */
export type MetodoVerificacionMarcaje = "facial" | "pinRespaldo";

/**
 * Evento de reloj checador (marcaje). Modelo inspirado en proveedores tipo
 * XmartClock (marcaje movil/desktop, geofencing, verificacion de identidad),
 * pero es 100% DEMO: `dentroDeGeofence` e `identidadVerificada` son flags
 * SIMULADOS desde la UI (checkboxes "simular fuera de zona" / "simular fallo
 * de verificacion"), no hay GPS ni reconocimiento facial real. Ver README-DEMO.md.
 *
 * Desde etapa 2, este mismo registro tambien es la salida del flujo de
 * "chequeo de inicio de jornada" (TOTP + verificacion facial simulada desde
 * el celular del empleado, ver lib/jornada/*): ese flujo llama a
 * `registrarMarcaje` (lib/rrhh/asistencia.ts) con overrides explicitos de
 * `dentroDeGeofence`/`identidadVerificada` (no los checkboxes de simulacion)
 * y ademas puebla `metodoVerificacion`.
 */
export interface Marcaje {
  id: string;
  empleadoId: string;
  ubicacionId: string;
  tipo: TipoMarcaje;
  timestamp: string; // ISO datetime
  /** Simulado (o, desde etapa 2, "true" real cuando el codigo TOTP probo presencia): dentro del geofence de la tienda. */
  dentroDeGeofence: boolean;
  /** Simulado (o, desde etapa 2, "true" real cuando paso verificacion facial simulada / PIN de respaldo): identidad verificada. */
  identidadVerificada: boolean;
  /** Calculado contra HorarioTurno del dia (si existe) al momento del marcaje "entrada". */
  tardanza: boolean;
  /** AGREGADO EN ETAPA 2: metodo de verificacion. `null` = marcaje legado/semilla o del flujo manual /empleados/[id] (no distinguen metodo). */
  metodoVerificacion: MetodoVerificacionMarcaje | null;
}

/**
 * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada): estado de intentos de
 * verificacion facial por empleado. Vive en el store en memoria
 * (Db.bloqueosVerificacionFacial, ver lib/db/store.ts) igual que el resto del
 * estado DEMO. NO es un evento auditable (EventoDeAuditoria): es estado
 * transitorio de seguridad para el bloqueo temporal de 5 minutos tras 3
 * fallos consecutivos (ver lib/jornada/bloqueo.ts).
 */
export interface EstadoVerificacionFacial {
  empleadoId: string;
  intentosFallidosConsecutivos: number;
  /** ISO datetime hasta el cual el metodo facial esta bloqueado para este empleado; null = no bloqueado. */
  bloqueadoHasta: string | null;
}

/**
 * AGREGADO EN ETAPA 2 (seguridad de acceso, S-17 llamada 2026-07-22): estado
 * de intentos de PIN fallidos por Usuario para el login de /login (owner:
 * shell de UI / lib/auth). Mismo patron EXACTO que `EstadoVerificacionFacial`
 * de arriba: vive en el store en memoria (Db.bloqueosPin, ver lib/db/store.ts),
 * NO es un evento auditable, es estado transitorio de seguridad para el
 * bloqueo temporal tras fallos consecutivos (ver lib/auth/bloqueoPin.ts).
 * Se indexa por `usuarioId` (no por email): solo se crea/incrementa cuando el
 * login ya resolvio un Usuario real contra el email ingresado (ver
 * lib/auth/autenticacion.ts), igual que el bloqueo facial se indexa por
 * `empleadoId` ya resuelto.
 */
export interface EstadoBloqueoPin {
  usuarioId: string;
  intentosFallidosConsecutivos: number;
  /** ISO datetime hasta el cual el login por PIN esta bloqueado para este usuario; null = no bloqueado. */
  bloqueadoHasta: string | null;
}

/**
 * Reporte de horas trabajadas (nombre historico del tipo: "recibo de pago")
 * — owner: nomina-pos.
 *
 * DECISION DE ALCANCE (S-17, ver `docs/requisitos.md` y
 * `docs/analisis-revision-20260722-modulos-innovacion-seguridad.md`, llamada
 * de revision 2026-07-22 con Diego Cataño y Mateo Franco, ambos con
 * experiencia operativa real en restaurantes): el calculo real de tarifa por
 * hora, el neto a pagar, y cualquier accion de "pagar" se RETIRAN del alcance
 * de produccion del POS. Motivo: un error o manipulacion de tarifas dentro
 * del POS puede generar pagos incorrectos sin los controles de un sistema de
 * nomina/ERP dedicado ("normalmente la nomina arranca en el ERP", nunca en el
 * POS — cita directa de un revisor). Este modulo ahora es SOLO un reporte de
 * referencia (horas regulares/extra + propinas) para alimentar un sistema de
 * nomina/ERP externo; ver `lib/nomina/calculo.ts`.
 *
 * `brutoCentavos`/`retencionCentavos`/`netoCentavos` se MANTIENEN en este
 * tipo unicamente para no romper codigo existente que los referencia (riesgo
 * de build con el plazo ajustado). YA NO se calculan — `correrNomina` siempre
 * los deja en 0 — y NO deben mostrarse ni interpretarse como un pago real en
 * ninguna UI. Si en el futuro se confirma que nada los lee, se pueden
 * eliminar del tipo.
 *
 * Dinero en CENTAVOS enteros (C-DINERO); horas en MINUTOS enteros (mismo
 * principio: nunca floats para cantidades que se suman/reportan).
 */
export interface ReciboDePago {
  id: string;
  empleadoId: string;
  periodoInicio: string; // ISO date (YYYY-MM-DD), inclusive
  periodoFin: string; // ISO date (YYYY-MM-DD), inclusive
  horasRegularesMin: number; // minutos enteros
  horasExtraMin: number; // minutos enteros
  /** Propinas del periodo: dato de REFERENCIA para el ERP externo, no un pago calculado/emitido por este modulo. */
  propinasCentavos: number;
  /** @deprecated Ya no se calcula (decision de alcance S-17): siempre 0. Se mantiene solo para no romper el tipo/build. NO usar como pago real. */
  brutoCentavos: number;
  /** @deprecated Ya no se calcula (decision de alcance S-17): siempre 0. Se mantiene solo para no romper el tipo/build. NO usar como pago real. */
  retencionCentavos: number;
  /** @deprecated Ya no se calcula (decision de alcance S-17): siempre 0. Se mantiene solo para no romper el tipo/build. NO usar como pago real. */
  netoCentavos: number;
  generadoEn: string; // ISO datetime
}

/** Semilla demo de personal (owner: rrhh-personal-pos), analoga a SeedCatalogo. */
export interface SeedRrhh {
  empleados: Empleado[];
  horariosTurno: HorarioTurno[];
  /** Marcajes historicos (ultimas ~2 semanas) para poder correr nomina de demo sin marcar manualmente. */
  marcajesIniciales: Marcaje[];
}

// ---------- Entidades ----------

export interface Ubicacion {
  id: string;
  codigo: string;
  nombre: string;
  estado: EstadoUbicacion;
  zonaHoraria: string;
  direccion: string;
  moneda: "USD";
  activo: boolean;
  /**
   * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada): secreto TOTP (RFC 6238
   * simplificado, ver lib/jornada/totp.ts) usado para generar/validar el
   * codigo de 6 digitos que rota cada 10s en la pantalla central de la
   * tienda (/jornada/pantalla). NUNCA se expone al celular del empleado ni se
   * devuelve en ningun endpoint publico; solo se lee server-side. DEMO:
   * valor fijo sembrado en lib/db/store.ts (produccion: secreto aleatorio
   * fuerte por tienda, con aprovisionamiento/rotacion seguros).
   */
  secretoTotp: string;
  /**
   * AGREGADO (Fase A, revision 2026-07-22 seccion 2.1): ver `ModoOperacionUbicacion`.
   * Default de la tienda piloto (Miami, ver lib/db/store.ts): "mostrador"
   * (cobrar antes de enviar a cocina), por ser el modelo correcto de Chicken
   * Kitchen (contador, sin meseros). La ubicacion demo de Austin se siembra en
   * "mesa" a proposito, para poder demostrar/probar que ambos modos son
   * reales y conviven en el mismo codigo.
   */
  modoOperacion: ModoOperacionUbicacion;
}

export interface ReglaDeImpuesto {
  id: string;
  ubicacionId: string;
  jurisdiccion: string;
  nombre: string;
  /** Tasa decimal, ej 0.07 = 7%. DEMO: confirmar con finanzas (S-06/S-08). */
  tasa: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  aplicaAExentos: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  /** Precio base en CENTAVOS. */
  precioBase: number;
  gravable: boolean;
  esCombo: boolean;
  disponible86: boolean; // true = disponible; false = agotado (86)
  activo: boolean;
}

export interface ComboComponente {
  grupoSeleccion: string;
  obligatorio: boolean;
  /** ids de Producto elegibles para este slot. */
  opciones: string[];
}

export interface Combo {
  id: string;
  productoId: string;
  componentes: ComboComponente[];
}

export interface GrupoModificador {
  id: string;
  productoId: string;
  nombre: string;
  minSelecciones: number;
  maxSelecciones: number;
  obligatorio: boolean;
}

export interface Modificador {
  id: string;
  grupoModificadorId: string;
  nombre: string;
  /** Delta de precio en CENTAVOS (0 si "sin X"). */
  precioDelta: number;
  disponible86: boolean;
  tipo: TipoModificador;
  /**
   * AGREGADO (Fase B, 2026-07-22): clasificacion de PRESENTACION/AGRUPACION
   * (ver `CategoriaModificador`). OPCIONAL a proposito (mismo criterio que
   * otros campos agregados de este contrato, ej. `Pedido.paraLlevar`): asi
   * fixtures existentes de otras tareas que construyen un `Modificador` a
   * mano (ej. lib/sales/__tests__/totales.test.ts, fuera del alcance
   * editable de esta tarea) siguen compilando sin declarar este campo nuevo.
   * `undefined` se trata como "otro" en el codigo que lo consume.
   */
  categoria?: CategoriaModificador;
  /**
   * AGREGADO (Fase B, 2026-07-22, ver docs/requisitos.md S-16): id del
   * `Insumo` que este modificador agrega/quita/sustituye en la receta del
   * producto (ej. un modificador "sin Queso" apunta al Insumo "Queso"). Se
   * usa para poder OMITIR automaticamente el alergeno de ese insumo en la
   * comanda cuando `tipo === "sin"` y el cliente selecciona ese modificador
   * (ver lib/menu/alergenos.ts). OPCIONAL: la mayoria de modificadores
   * "agregar" de sabor/tamano no necesitan este dato; `null`/`undefined` =
   * no aplica o no se pudo mapear a un insumo especifico del catalogo real.
   */
  insumoAfectadoId?: string | null;
}

export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  umbralStockBajo: number;
  /**
   * AGREGADO (Fase B, 2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
   * Anexo A.2): ESTIMADO DEMO de costo unitario en CENTAVOS enteros
   * (C-DINERO), en la misma `unidadMedida` del insumo. El import real de
   * Recetario_Simplificado.xlsx (scripts/importar-recetario.js) EXCLUYE
   * deliberadamente la columna "Costo ($)" del archivo fuente porque se
   * verifico que no es confiable (ej. "SALT IODIZED GRANULAR" usada 185
   * veces implica costo-por-onza entre $0.019 y $3.58 segun la receta,
   * ~180x de varianza — ver Anexo). Este campo NO viene de esa columna: es
   * una estimacion razonable tipo mayoreo US para el TIPO de insumo (ver
   * lib/data/catalog-insumos-costos.demo.ts), poblada como DEMO explicita
   * pendiente de validar contra facturas reales de Chicken Kitchen.
   * OPCIONAL: `undefined` = sin estimar (no deberia ocurrir para los 84
   * insumos reales sembrados, ver reporte de la tarea; catalogos/fixtures
   * antiguos sin este campo siguen compilando).
   */
  costoUnitarioCentavos?: number;
  /**
   * AGREGADO (Fase B, 2026-07-22, ver docs/requisitos.md S-16): alergenos
   * DEMO de este insumo, detectados por una HEURISTICA DE PALABRAS CLAVE
   * sobre `nombre` (ver lib/data/catalog-insumos-alergenos.demo.ts) — NO son
   * datos reales verificados de Chicken Kitchen ni de un nutriologo. Antes
   * de un lanzamiento real, operaciones debe confirmar/corregir esta lista
   * (ver S-16 en docs/requisitos.md). OPCIONAL: `undefined`/`[]` = sin
   * alergenos detectados por la heuristica (no necesariamente "sin alergenos
   * reales").
   */
  alergenos?: TipoAlergeno[];
  /**
   * AGREGADO (Fase B, 2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
   * Anexo A.3 y docs/requisitos.md S-14): si este Insumo es en realidad un
   * PRODUCTO ELABORADO/INTERMEDIO preparado en tienda a partir de otros
   * insumos (ej. una salsa hecha en casa), este campo apunta al `Receta.id`
   * que define SUS insumos base (tipicamente la misma Receta ya asociada al
   * Producto vendible equivalente de ese insumo, si existe uno — ver
   * lib/data/catalog-real.ts). null/undefined = insumo comprado tal cual, SIN
   * receta propia (comportamiento por defecto y actual de los 84 insumos
   * reales importados). Consumido recursivamente por
   * lib/inventory/bom.ts (`explotarAInsumosBase`) tanto para el descuento de
   * stock (lib/inventory/inventario.ts) como para el costeo
   * (lib/menu/costeo.ts), para que un producto que use este insumo cascade
   * correctamente 2 niveles (ver Anexo A.3 para el UNICO ejemplo demo
   * poblado). S-14 sigue abierto: pendiente confirmar con operaciones que
   * salsas reales se preparan en tienda vs. se compran ya hechas.
   */
  recetaBaseId?: string | null;
}

export interface Receta {
  id: string;
  productoId: string;
  activo: boolean;
}

export interface RecetaInsumo {
  id: string;
  recetaId: string;
  insumoId: string;
  cantidad: number;
}

export interface Stock {
  id: string;
  ubicacionId: string;
  insumoId: string;
  cantidadActual: number;
  actualizadoEn: string;
}

export interface LineaModificador {
  id: string;
  lineaDePedidoId: string;
  modificadorId: string;
  descripcion: string; // snapshot
  precioDelta: number; // snapshot, centavos
  tipo: TipoModificador;
}

export interface LineaDePedido {
  id: string;
  pedidoId: string;
  productoId: string;
  descripcion: string; // snapshot del nombre
  cantidad: number;
  precioUnitario: number; // snapshot, centavos (incluye deltas de modificadores)
  subtotalLinea: number; // centavos = precioUnitario * cantidad
  gravable: boolean; // snapshot
  notas: string;
  estadoCocina: EstadoCocina;
  modificadores: LineaModificador[];
}

export interface Pedido {
  id: string;
  ubicacionId: string;
  turnoId: string;
  numeroOrden: number; // secuencial por turno (RN-06)
  nombreCliente: string;
  canal: CanalPedido;
  estado: EstadoPedido;
  subtotal: number; // centavos
  descuentoTotal: number; // centavos
  impuestoTotal: number; // centavos
  propinaTotal: number; // centavos
  total: number; // centavos
  lineas: LineaDePedido[];
  creadoEn: string;
  /**
   * AGREGADO (ciclo de vida extendido de cocina/KDS): momento EXACTO en que el
   * pedido entro a cocina (transicion "abierto" -> "enviadoCocina", fijado por
   * `enviarACocina` en lib/sales/engine.ts). `null` mientras el pedido sigue
   * "abierto" en el mostrador. NO confundir con `creadoEn` (cuando el cajero
   * abrio el pedido; pueden pasar minutos mientras arma el ticket antes de
   * enviarlo). El temporizador de alerta de cocina (lib/kitchen/kds.ts,
   * `nivelAlertaTiempo`) se basa en ESTE campo (con fallback a `creadoEn` solo
   * si es `null`, por robustez ante datos legados/sembrados).
   */
  enviadoACocinaEn: string | null;
  /**
   * AGREGADO (ciclo de vida extendido de cocina/KDS): momento en que el
   * pedido salio del KDS hacia caja (transicion "listo" -> "entregado", fijado
   * por `enviarACaja` en lib/sales/engine.ts). `null` mientras no se ha
   * enviado a caja. Se usa en el submodulo de Historial de pedidos
   * (app/pos/historial) para calcular cuanto tiempo total tomo el pedido en
   * cocina (entregadoEn - enviadoACocinaEn).
   */
  entregadoEn: string | null;
  cerradoEn: string | null;
  /**
   * AGREGADO (Fase A, trazabilidad operativa de tiempos — 2026-07-22): id del
   * `Usuario` que ABRIO/CREO este pedido en el mostrador (el "cajero que tomo
   * la orden"), para el reporte de tiempos operativos (ver
   * lib/reportes/tiempos.ts y app/reportes/tiempos) que permite resolver
   * disputas de "quien causo la demora" y detectar patrones de cuello de
   * botella por hora del dia.
   *
   * GAP DOCUMENTADO Y DECISION DE DISENO: `crearPedido` (lib/sales/engine.ts,
   * owner backend-ventas-pos) NO recibe ni fija este campo — ese archivo esta
   * fuera del alcance editable de esta tarea (Fase A, ver restricciones de la
   * tarea). En su lugar, se estampa en la capa de ruta API (POST
   * /api/v1/pedidos, ver app/api/v1/pedidos/route.ts) mutando el MISMO objeto
   * `Pedido` que `crearPedido` ya devolvio y empujo a `getDb().pedidos`
   * (misma referencia en memoria) — no requiere tocar el motor de ventas.
   *
   * OPCIONAL a proposito (a diferencia de los demas campos de este contrato,
   * que son requeridos): asi los fixtures `Pedido` de pruebas/otras tareas
   * paralelas que construyen el objeto a mano (lib/sales/__tests__/*,
   * lib/kitchen/kds.test.ts, components/pos/__tests__/api.test.ts — ninguno
   * editable por esta tarea) siguen compilando sin declarar este campo nuevo.
   * `undefined`/`null` = pedido legado/sembrado sin creador registrado, o
   * creado por un cliente que todavia no envia `usuarioId` en el body (ver
   * limitacion documentada en el reporte de la tarea: el cliente de POS,
   * components/pos/api.ts y app/pos/nuevo, esta fuera del alcance editable de
   * esta tarea y AUN NO se actualizo para enviar ese campo).
   */
  creadoPorUsuarioId?: string | null;
  /**
   * AGREGADO (Fase A, revision 2026-07-22 seccion 2.6-parcial "empaque
   * automatico en para llevar"): true si el cajero marco este pedido como
   * "para llevar" (fulfillment del cliente), independiente de `canal` (que es
   * el ORIGEN del pedido — mostrador/kiosco/online/etc — no como se entrega).
   * Ver `marcarParaLlevar` en lib/sales/engine.ts: al pasar de false->true
   * agrega automaticamente el cargo de empaque (`empaqueTotal`) sin que el
   * cajero tenga que acordarse de hacerlo aparte.
   *
   * OPCIONAL (mismo criterio que `creadoPorUsuarioId` arriba): asi los
   * fixtures `Pedido` de otras tareas paralelas que construyen el objeto a
   * mano (lib/kitchen/kds.test.ts, components/pos/__tests__/api.test.ts,
   * ninguno editable por esta tarea) siguen compilando sin declarar este
   * campo. `undefined` se trata igual que `false` en todo el codigo nuevo.
   */
  paraLlevar?: boolean;
  /**
   * AGREGADO (Fase A, misma seccion 2.6-parcial): cargo plano de empaque en
   * CENTAVOS (C-DINERO), fijado por `marcarParaLlevar` cuando `paraLlevar`
   * pasa a true (0 en caso contrario). DECISION DE DISENO: se modela como un
   * cargo de orden aparte (sumado en `total`, ver formula documentada al
   * inicio de lib/sales/engine.ts) en vez de como una `LineaDePedido` con un
   * `Producto` real de catalogo, para no tener que dar de alta un SKU de
   * empaque en el catalogo (owner: menu-inventario-pos, fuera del alcance de
   * esta tarea) ni tocar `lib/data/catalog.ts`. Simplificacion de DEMO: en
   * produccion probablemente se modelaria como una linea de producto real
   * (para reportar consumo de insumos de empaque) y habria que confirmar con
   * finanzas si es gravable en cada jurisdiccion (mismo tipo de duda que
   * `ReglaDeImpuesto.aplicaAExentos`); aqui se trata como NO gravable.
   * OPCIONAL por el mismo motivo que `paraLlevar` arriba; `undefined` se
   * trata igual que `0`.
   */
  empaqueTotal?: number;
}

export interface Pago {
  id: string;
  pedidoId: string;
  turnoId: string;
  metodo: MetodoPago;
  monto: number; // centavos (sin propina)
  propina: number; // centavos
  estado: EstadoPago;
  pspTokenId: string | null; // token del PSP, NUNCA PAN (C-PCI)
  pspReferencia: string | null;
  ultimos4: string | null;
  marca: string | null;
  montoRecibido: number | null; // efectivo entregado, centavos
  cambio: number | null; // centavos
  creadoEn: string;
}

export interface Turno {
  id: string;
  ubicacionId: string;
  usuarioAperturaId: string;
  abiertoEn: string;
  cerradoEn: string | null;
  fondoInicial: number; // centavos
  efectivoContado: number | null;
  diferencia: number | null;
  estado: EstadoTurno;
  reporteZ: ReporteZ | null;
  ultimoNumeroOrden: number; // para asignar numeroOrden secuencial
}

export interface ReporteZ {
  generadoEn: string;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalPropinas: number;
  totalImpuestos: number;
  totalDescuentos: number;
  numeroPedidos: number;
}

export interface Rol {
  id: string;
  nombre: string;
  permisos: string[];
  /**
   * AGREGADO (Fase B, revision 2026-07-22 seccion "reparto de propinas por
   * rol/puntos" — herramienta OPERATIVA, no contable, ver
   * docs/analisis-revision-20260722-modulos-innovacion-seguridad.md): % entero
   * (0-100) de la propina EN EFECTIVO de un turno de caja que le corresponde a
   * este rol, usado por `lib/propinas/reparto.ts` para calcular el reparto de
   * referencia por empleado presente en el turno (ver app/propinas). `[SUPUESTO]`
   * — son valores DEMO de arranque (ver seed en lib/db/store.ts), PENDIENTES de
   * confirmacion real de negocio; un gerente puede editarlos en /propinas.
   * `undefined`/`null` se trata como 0 (rol sin participacion en el reparto de
   * propinas, ej. gerente/developer) en toda la logica de calculo, NUNCA lanza.
   * Puntos vs. porcentaje son equivalentes (un sistema de puntos es solo un
   * porcentaje sin normalizar); se eligio porcentaje por ser mas simple de
   * mostrar/editar en la UI de un gerente. OPCIONAL a proposito: asi los
   * fixtures `Rol` de pruebas/otras tareas que construyen el objeto a mano
   * siguen compilando sin declarar este campo nuevo.
   */
  porcentajePropinaDemo?: number | null;
}

export interface Usuario {
  id: string;
  ubicacionId: string;
  nombre: string;
  pinHash: string; // DEMO: hash simple; produccion bcrypt/argon2 (S-10)
  rolId: string;
  activo: boolean;
}

export interface EventoDeAuditoria {
  id: string;
  ubicacionId: string;
  usuarioId: string | null;
  tipo: TipoEventoAuditoria;
  agregadoTipo: string;
  agregadoId: string;
  motivo: string;
  payload: Record<string, unknown>;
  ocurridoEn: string;
}

// ---------- Notificaciones (owner: shell de UI, etapa 1) ----------

export type TipoNotificacion =
  | "inventario"
  | "personal"
  | "nomina"
  | "pedido"
  | "sistema";

/**
 * Notificacion mostrada en el panel de campana de la barra superior.
 * DEMO: se siembran unas pocas notificaciones estaticas en lib/db/store.ts;
 * no hay generacion automatica en tiempo real todavia (produccion las
 * emitiria desde los modulos de dominio correspondientes al ocurrir el
 * evento, ej. producto86, alertaAsistencia, nominaGenerada).
 */
export interface Notificacion {
  id: string;
  ubicacionId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  /** Ruta interna a la que navegar al hacer click (null = sin destino). */
  entidadRelacionadaHref: string | null;
  creadaEn: string;
}

// ---------- Semilla de catalogo (owner: menu-inventario-pos) ----------

export interface SeedCatalogo {
  categorias: Categoria[];
  productos: Producto[];
  combos: Combo[];
  gruposModificador: GrupoModificador[];
  modificadores: Modificador[];
  insumos: Insumo[];
  recetas: Receta[];
  recetaInsumos: RecetaInsumo[];
  /** Nivel de stock inicial por insumo (para la ubicacion piloto). */
  stockInicial: { insumoId: string; cantidadActual: number }[];
}

// ---------- Utilidades de dinero (C-DINERO) ----------

/** Formatea centavos a string USD. Ej: 1099 -> "$10.99". */
export function formatearDinero(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

/** Convierte dolares (float) a centavos (int) de forma segura. Ej: 10.99 -> 1099. */
export function aCentavos(dolares: number): number {
  return Math.round(dolares * 100);
}
