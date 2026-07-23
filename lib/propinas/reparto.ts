/**
 * Reparto de propinas por rol — logica PURA (Fase B, revision 2026-07-22
 * seccion "reparto de propinas por rol/puntos"). DUENO: nomina-pos.
 *
 * ==========================================================================
 * QUE ES ESTO Y QUE NO ES (leer antes de tocar este archivo)
 * ==========================================================================
 * Este modulo es una HERRAMIENTA OPERATIVA DE REFERENCIA para ayudar a un
 * gerente a repartir la propina EN EFECTIVO de un turno de caja entre los
 * empleados que trabajaron ese turno, segun un % configurable por rol. NO es
 * un registro contable ni fiscal: el efectivo, por naturaleza, se
 * autorreporta y no es 100% rastreable por el sistema (a diferencia de la
 * propina con tarjeta, que ya queda registrada por el PSP) — esta es
 * exactamente la salvedad honesta que ya senalo un revisor con experiencia
 * operativa real (ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md,
 * "reparto de propinas por rol/puntos (herramienta operativa, no contable)").
 * NO hay boton de "pagar" aqui (mismo criterio que la reduccion de alcance
 * S-17 de lib/nomina/calculo.ts): esto SOLO calcula un numero de referencia
 * que un gerente puede usar para repartir el efectivo fisico del cajon, o
 * para alimentar su propio sistema de nomina/ERP externo.
 *
 * ==========================================================================
 * DECISION DE DISENO 1: % por rol, no "puntos" (son equivalentes)
 * ==========================================================================
 * El feedback original describe esto como "reparto por rol/puntos". Un
 * sistema de puntos (ej. cajero=3 puntos, cocina=2 puntos) y un sistema de
 * porcentaje configurable (ej. cajero=60%, cocina=40%) son MATEMATICAMENTE
 * equivalentes: un sistema de puntos es solo un porcentaje sin normalizar
 * (ver `PORCENTAJE_OBJETIVO_TOTAL` abajo: se normaliza igual). Se eligio %
 * por ser mas simple de mostrar/editar en una UI de gerente ("cajero recibe
 * 60% de la propina en efectivo del turno") sin tener que explicarle a nadie
 * que es un "punto".
 *
 * ==========================================================================
 * DECISION DE DISENO 2: donde vive el % configurado (Rol.porcentajePropinaDemo)
 * ==========================================================================
 * Se agrego un campo OPCIONAL `porcentajePropinaDemo` a `Rol` (lib/domain/types.ts)
 * en vez de crear una entidad/coleccion nueva en el store: `Rol` ya es la
 * unidad natural de configuracion (un % por rol, no por empleado individual),
 * ya vive en `Db.roles` (lib/db/store.ts) y ya tiene un endpoint de listado
 * (GET /api/v1/roles). Evita una tabla `ConfiguracionRepartoPropinas`
 * paralela que tendria que mantenerse sincronizada 1:1 con `Rol` de todas
 * formas (un rol borrado/agregado tendria que reflejarse en ambos lados).
 *
 * ==========================================================================
 * DECISION DE DISENO 3: "quien trabajo este turno" (MVP, ver `empleadosQueTrabajaronTurno`)
 * ==========================================================================
 * Este demo NO tiene un concepto de "empleados asignados a ESTE turno de
 * caja especifico" (Turno == apertura/cierre de CAJA, ver nota de nombres en
 * lib/domain/types.ts; HorarioTurno == turno de TRABAJO programado, son
 * conceptos distintos). La aproximacion MVP mas honesta con los datos que ya
 * existen: un empleado "trabajo" un Turno de caja si tiene al menos un
 * intervalo de asistencia (par marcaje entrada->salida, ver
 * `emparejarIntervalos` en lib/rrhh/asistencia.ts) que SE SOLAPA con la
 * ventana [Turno.abiertoEn, Turno.cerradoEn] en la MISMA ubicacion. Esto
 * reutiliza el reloj checador ya construido (Marcaje) en vez de inventar un
 * campo nuevo tipo "empleadosDelTurno" en `Turno` (que hubiera requerido
 * tocar lib/sales/engine.ts, fuera del alcance recomendado de esta tarea).
 * LIMITACION DOCUMENTADA: un empleado que marco entrada/salida pero no tuvo
 * contacto real con clientes (ej. tomo un descanso largo) igual cuenta como
 * "presente" — mismo nivel de precision que el resto del reloj checador DEMO.
 *
 * ==========================================================================
 * DECISION DE DISENO 4: redondeo de centavos (metodo del mayor residuo)
 * ==========================================================================
 * `propinaTotalCentavos` es un ENTERO (C-DINERO); pero el % de cada empleado
 * casi nunca produce un numero entero de centavos exacto. Se usa el metodo
 * clasico de "mayor residuo" (largest remainder / metodo Hamilton, el mismo
 * usado para repartir escanos en varios sistemas electorales proporcionales):
 *  1) a cada empleado se le asigna el PISO (floor) de su parte exacta,
 *  2) los centavos que sobran (total - suma de pisos) se reparten UNO A UNO,
 *     en orden de mayor parte fraccionaria descartada primero,
 *  3) empate de fraccion -> gana el empleado de rol con mayor % configurado,
 *     empate final -> orden alfabetico de `empleadoId` (deterministico, para
 *     que la funcion sea pura/reproducible en pruebas).
 * Esto GARANTIZA que la suma de las partes es SIEMPRE exactamente igual a
 * `propinaTotalCentavos` (nunca se pierde ni se inventa un centavo).
 */

import type { Rol } from "../domain/types";

/** Suma objetivo (en puntos porcentuales) contra la que se valida la configuracion de roles. */
export const PORCENTAJE_OBJETIVO_TOTAL = 100;

// ---------- Validacion de configuracion ----------

export interface FilaValidacionRol {
  rolId: string;
  nombre: string;
  /** `Rol.porcentajePropinaDemo` ya resuelto (0 si no esta configurado). */
  porcentaje: number;
}

export interface ValidacionPorcentajesReparto {
  filas: FilaValidacionRol[];
  /** Suma de `porcentaje` de TODOS los roles (incluyendo los que valen 0). */
  sumaPorcentajes: number;
  /** true si `sumaPorcentajes === PORCENTAJE_OBJETIVO_TOTAL` (100). */
  sumaEsSensata: boolean;
}

/**
 * Valida que los `%` de propina configurados (DEMO) por rol sumen 100 en
 * total. NO lanza si no suman 100 (un gerente puede estar editando a medio
 * camino); solo informa para que la UI de configuracion muestre una
 * advertencia. La suma "esperada" es de TODOS los roles, incluyendo los que
 * a proposito valen 0% (ej. gerente/developer, ver seed de lib/db/store.ts):
 * un 0% explicito SI cuenta para la suma (es una decision deliberada, no un
 * dato faltante).
 */
export function validarPorcentajesReparto(roles: Rol[]): ValidacionPorcentajesReparto {
  const filas: FilaValidacionRol[] = roles.map((r) => ({
    rolId: r.id,
    nombre: r.nombre,
    porcentaje: r.porcentajePropinaDemo ?? 0,
  }));
  const sumaPorcentajes = filas.reduce((acc, f) => acc + f.porcentaje, 0);
  return {
    filas,
    sumaPorcentajes,
    sumaEsSensata: sumaPorcentajes === PORCENTAJE_OBJETIVO_TOTAL,
  };
}

/** Entero 0-100 valido para `Rol.porcentajePropinaDemo`. */
export function porcentajeReparteValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 100;
}

// ---------- "Quien trabajo este turno" (MVP, ver Decision de diseno 3) ----------

/** Forma minima de `Turno` que necesita esta funcion (evita acoplar el modulo a lib/db). */
export interface TurnoParaPresencia {
  ubicacionId: string;
  abiertoEn: string; // ISO datetime
  cerradoEn: string | null; // ISO datetime; null = turno todavia abierto
}

/** Forma minima de un intervalo de asistencia ya emparejado (ver `emparejarIntervalos`, lib/rrhh/asistencia.ts). */
export interface IntervaloParaPresencia {
  empleadoId: string;
  inicio: string; // ISO datetime (marcaje "entrada")
  fin: string; // ISO datetime (marcaje "salida")
}

/** Forma minima de `Empleado` que necesita esta funcion. */
export interface EmpleadoParaPresencia {
  id: string;
  nombre: string;
  rolId: string;
  ubicacionId: string;
}

export interface EmpleadoPresente {
  empleadoId: string;
  nombre: string;
  rolId: string;
}

/**
 * Empleados que "trabajaron" el `turno` dado: aquellos con al menos un
 * intervalo de asistencia que se solapa con [turno.abiertoEn, turno.cerradoEn]
 * en la misma ubicacion (ver Decision de diseno 3 arriba). Si el turno sigue
 * abierto (`cerradoEn === null`), se usa `ahora` (o `new Date().toISOString()`
 * si se omite) como fin provisional de la ventana.
 */
export function empleadosQueTrabajaronTurno(
  turno: TurnoParaPresencia,
  intervalos: IntervaloParaPresencia[],
  empleados: EmpleadoParaPresencia[],
  ahora: string = new Date().toISOString()
): EmpleadoPresente[] {
  const finVentana = turno.cerradoEn ?? ahora;
  const empleadosPorId = new Map(
    empleados.filter((e) => e.ubicacionId === turno.ubicacionId).map((e) => [e.id, e])
  );

  const presentesIds = new Set<string>();
  for (const intervalo of intervalos) {
    if (!empleadosPorId.has(intervalo.empleadoId)) continue;
    const seSolapa = intervalo.inicio <= finVentana && intervalo.fin >= turno.abiertoEn;
    if (seSolapa) presentesIds.add(intervalo.empleadoId);
  }

  return [...presentesIds].map((id) => {
    const e = empleadosPorId.get(id)!;
    return { empleadoId: e.id, nombre: e.nombre, rolId: e.rolId };
  });
}

// ---------- Propina en efectivo de un turno ----------

/** Forma minima de `Pago` que necesita esta funcion. */
export interface PagoParaPropina {
  turnoId: string;
  metodo: string; // "efectivo" | "tarjeta" | "otro"
  estado: string; // "aprobado" | ...
  propina: number; // centavos
}

/**
 * Suma la propina EN EFECTIVO (metodo === "efectivo", estado === "aprobado")
 * de un turno de caja. Deliberadamente EXCLUYE propina con tarjeta: esa ya
 * queda registrada/rastreada por el PSP y normalmente se liquida por canal
 * de pago aparte (no por el cajon de efectivo de la tienda); mezclarla aqui
 * inflaria el monto a repartir en efectivo fisico. Centavos enteros (C-DINERO).
 */
export function propinaEfectivoDeTurno(turnoId: string, pagos: PagoParaPropina[]): number {
  return pagos
    .filter((p) => p.turnoId === turnoId && p.metodo === "efectivo" && p.estado === "aprobado")
    .reduce((acc, p) => acc + p.propina, 0);
}

// ---------- Calculo de reparto (metodo del mayor residuo, ver Decision de diseno 4) ----------

export interface FilaRepartoPropina {
  empleadoId: string;
  nombre: string;
  rolId: string;
  nombreRol: string;
  /** % configurado (DEMO) del ROL de este empleado, sin normalizar (0-100). */
  porcentajeConfigurado: number;
  /** % efectivo de ESTE empleado sobre el total del turno, YA normalizado contra los roles presentes (0-100, con hasta 2 decimales). */
  porcentajeNormalizado: number;
  /** Parte final en CENTAVOS enteros (C-DINERO); la suma de todas las filas es SIEMPRE igual a `propinaTotalCentavos`. */
  montoCentavos: number;
}

export interface ResultadoRepartoPropinas {
  propinaTotalCentavos: number;
  empleadosPresentes: number;
  filas: FilaRepartoPropina[];
  /**
   * Aviso legible para la UI (ej. "no hay empleados presentes" o "ningun rol
   * presente tiene % configurado, se repartio en partes iguales"). `null` si
   * el calculo se hizo con la configuracion normal (sin fallback).
   */
  advertencia: string | null;
}

/**
 * Calcula el reparto de `propinaTotalCentavos` (propina en efectivo de UN
 * turno) entre `empleadosPresentes`, segun el `%` configurado del ROL de
 * cada uno (`Rol.porcentajePropinaDemo`), NORMALIZADO contra la suma de los %
 * de los roles que en verdad tienen empleados presentes ese turno (si un rol
 * configurado no trabajo ese turno, su % simplemente no participa — el resto
 * se reparte proporcionalmente entre los que si trabajaron).
 *
 * FALLBACK (documentado, no silencioso): si NINGUN rol presente tiene % > 0
 * configurado (ej. demo recien sembrada sin configurar, o alguien puso todo
 * en 0), se reparte en PARTES IGUALES entre los empleados presentes y se
 * devuelve `advertencia` explicando el fallback — nunca se devuelve un
 * reparto vacio si hay empleados presentes y propina > 0.
 */
export function calcularRepartoPropinas(
  propinaTotalCentavos: number,
  empleadosPresentes: EmpleadoPresente[],
  roles: Rol[]
): ResultadoRepartoPropinas {
  if (!Number.isInteger(propinaTotalCentavos) || propinaTotalCentavos < 0) {
    throw new Error("propinaTotalCentavos debe ser un entero de centavos >= 0");
  }

  if (empleadosPresentes.length === 0) {
    return {
      propinaTotalCentavos,
      empleadosPresentes: 0,
      filas: [],
      advertencia:
        "No hay empleados con asistencia registrada que se solape con este turno; no se pudo calcular un reparto.",
    };
  }

  const rolesPorId = new Map(roles.map((r) => [r.id, r]));

  // Cuantos empleados presentes hay por rol (para dividir el % del rol entre
  // ellos en partes iguales dentro del mismo rol).
  const conteoPorRol = new Map<string, number>();
  for (const e of empleadosPresentes) {
    conteoPorRol.set(e.rolId, (conteoPorRol.get(e.rolId) ?? 0) + 1);
  }

  // Suma de % configurado SOLO de los roles que tienen al menos 1 empleado presente.
  let sumaPctPresentes = 0;
  for (const rolId of conteoPorRol.keys()) {
    sumaPctPresentes += rolesPorId.get(rolId)?.porcentajePropinaDemo ?? 0;
  }

  const usaFallbackIgualitario = sumaPctPresentes <= 0;
  const advertencia = usaFallbackIgualitario
    ? "Ningun rol presente en este turno tiene un % de propina configurado (> 0); se repartio en partes iguales entre los empleados presentes (respaldo DEMO). Configura los % en /propinas."
    : null;

  interface Calculado {
    emp: EmpleadoPresente;
    rolPorcentaje: number;
    pesoNormalizado: number; // fraccion 0-1 del total
  }

  const calculados: Calculado[] = empleadosPresentes.map((emp) => {
    const rolPorcentaje = rolesPorId.get(emp.rolId)?.porcentajePropinaDemo ?? 0;
    if (usaFallbackIgualitario) {
      return { emp, rolPorcentaje, pesoNormalizado: 1 / empleadosPresentes.length };
    }
    const countEnRol = conteoPorRol.get(emp.rolId) ?? 1;
    // % del rol dividido en partes iguales entre sus empleados presentes,
    // luego normalizado contra la suma de % de los roles presentes.
    const pesoBase = rolPorcentaje / countEnRol;
    return { emp, rolPorcentaje, pesoNormalizado: pesoBase / sumaPctPresentes };
  });

  // Metodo del mayor residuo: piso de cada parte exacta, luego reparte los
  // centavos sobrantes uno a uno por mayor fraccion descartada.
  const conMontoExacto = calculados.map((c) => {
    const montoExacto = propinaTotalCentavos * c.pesoNormalizado;
    const montoBase = Math.floor(montoExacto);
    return { ...c, montoExacto, montoBase, resto: montoExacto - montoBase };
  });

  const sumaBase = conMontoExacto.reduce((acc, c) => acc + c.montoBase, 0);
  let centavosRestantes = propinaTotalCentavos - sumaBase;

  const ordenParaResiduo = [...conMontoExacto].sort((a, b) => {
    if (b.resto !== a.resto) return b.resto - a.resto;
    if (b.rolPorcentaje !== a.rolPorcentaje) return b.rolPorcentaje - a.rolPorcentaje;
    return a.emp.empleadoId.localeCompare(b.emp.empleadoId);
  });

  const montoFinalPorEmpleado = new Map<string, number>();
  for (const c of conMontoExacto) montoFinalPorEmpleado.set(c.emp.empleadoId, c.montoBase);
  for (let i = 0; i < ordenParaResiduo.length && centavosRestantes > 0; i++) {
    const id = ordenParaResiduo[i].emp.empleadoId;
    montoFinalPorEmpleado.set(id, (montoFinalPorEmpleado.get(id) ?? 0) + 1);
    centavosRestantes -= 1;
  }

  const filas: FilaRepartoPropina[] = conMontoExacto.map((c) => ({
    empleadoId: c.emp.empleadoId,
    nombre: c.emp.nombre,
    rolId: c.emp.rolId,
    nombreRol: rolesPorId.get(c.emp.rolId)?.nombre ?? c.emp.rolId,
    porcentajeConfigurado: c.rolPorcentaje,
    porcentajeNormalizado: Math.round(c.pesoNormalizado * 10000) / 100,
    montoCentavos: montoFinalPorEmpleado.get(c.emp.empleadoId) ?? 0,
  }));

  return {
    propinaTotalCentavos,
    empleadosPresentes: empleadosPresentes.length,
    filas,
    advertencia,
  };
}
