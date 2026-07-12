/**
 * Semilla de personal DEMO — DUENO: rrhh-personal-pos.
 *
 * Analoga a lib/data/catalog.ts (menu-inventario-pos): datos DEMO razonables,
 * NO reales. 5 empleados "activo" (mezcla cajero/cocina/gerente en Miami FL y
 * Austin TX) + 1 empleado en "onboarding" para poder demostrar el flujo de
 * alta -> completar onboarding -> activo desde la UI.
 *
 * Dos empleados reutilizan a proposito los `Usuario` ya sembrados en
 * lib/db/store.ts ("user-cajero-demo", "user-gerente-demo") para que los
 * pagos/propinas que ya genera la demo de POS (turno abierto por esos
 * usuarios) se puedan liquidar de inmediato en /nomina sin pasos extra.
 * Los demas empleados obtienen un Usuario nuevo (creado aqui mismo, como si
 * ya hubieran completado onboarding).
 *
 * Marcajes: se generan ~2 semanas hacia atras desde "hoy" (momento en que se
 * siembra el almacen) para poblar /empleados/[id] y /nomina con datos
 * realistas sin marcar manualmente. Un empleado (Jose, cajero TX) trabaja 6
 * dias en la semana en curso para poder mostrar horas extra (>40h/semana).
 */

import type { Empleado, HorarioTurno, Marcaje, SeedRrhh, Usuario } from "../domain/types";

const UBICACION_MIAMI = "ubic-miami-fl";
const UBICACION_AUSTIN = "ubic-austin-tx";

let contador = 0;
function nid(prefijo: string): string {
  contador += 1;
  return `${prefijo}-${contador}`;
}

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function horaISO(base: Date, horas: number, minutos: number): string {
  const d = new Date(base);
  d.setHours(horas, minutos, 0, 0);
  return d.toISOString();
}

/** Usuarios de login adicionales creados como parte de esta semilla (empleados ya onboarded). */
export const usuariosAdicionalesRrhh: Usuario[] = [
  {
    id: "user-cocina-demo",
    ubicacionId: UBICACION_MIAMI,
    nombre: "Maria Fernanda Lopez",
    pinHash: "demo:1111",
    rolId: "rol-cocina",
    activo: true,
  },
  {
    id: "user-cajero-tx-demo",
    ubicacionId: UBICACION_AUSTIN,
    nombre: "Jose Martinez",
    pinHash: "demo:2222",
    rolId: "rol-cajero",
    activo: true,
  },
  {
    id: "user-cocina-tx-demo",
    ubicacionId: UBICACION_AUSTIN,
    nombre: "Laura Sanchez",
    pinHash: "demo:3333",
    rolId: "rol-cocina",
    activo: true,
  },
];

/**
 * Genera un par de marcajes (entrada/salida) para un dia dado, `offsetDias`
 * atras de "hoy". Devuelve [] si el turno no aplica (usado para simular dias
 * de descanso).
 */
function generarMarcajesDia(
  empleadoId: string,
  ubicacionId: string,
  hoy: Date,
  offsetDias: number,
  horaEntrada: number,
  horaSalida: number,
  minutosTardanza = 0
): Marcaje[] {
  const dia = new Date(hoy);
  dia.setDate(dia.getDate() - offsetDias);

  const entrada: Marcaje = {
    id: nid("marcaje"),
    empleadoId,
    ubicacionId,
    tipo: "entrada",
    timestamp: horaISO(dia, horaEntrada, minutosTardanza),
    dentroDeGeofence: true,
    identidadVerificada: true,
    tardanza: minutosTardanza > 10,
    // Semilla historica anterior a la etapa 2 (TOTP + verificacion facial): sin metodo distinguido.
    metodoVerificacion: null,
  };
  const salida: Marcaje = {
    id: nid("marcaje"),
    empleadoId,
    ubicacionId,
    tipo: "salida",
    timestamp: horaISO(dia, horaSalida, 0),
    dentroDeGeofence: true,
    identidadVerificada: true,
    tardanza: false,
    metodoVerificacion: null,
  };
  return [entrada, salida];
}

export function getSeedRrhh(): SeedRrhh {
  const hoy = new Date();

  const empAna: Empleado = {
    id: "emp-ana-cajero",
    ubicacionId: UBICACION_MIAMI,
    nombre: "Ana Rodriguez",
    email: "ana.rodriguez@chickenkitchen.demo",
    telefono: "305-555-0101",
    rolId: "rol-cajero",
    fechaContratacion: "2024-03-15",
    estado: "activo",
    tarifaHoraCentavos: 1500, // $15.00/hr DEMO
    usuarioId: "user-cajero-demo",
    motivoBaja: null,
    creadoEn: "2024-03-15T09:00:00.000Z",
  };

  const empCarlos: Empleado = {
    id: "emp-carlos-gerente",
    ubicacionId: UBICACION_MIAMI,
    nombre: "Carlos Gomez",
    email: "carlos.gomez@chickenkitchen.demo",
    telefono: "305-555-0102",
    rolId: "rol-gerente",
    fechaContratacion: "2022-11-01",
    estado: "activo",
    tarifaHoraCentavos: 2200, // $22.00/hr DEMO
    usuarioId: "user-gerente-demo",
    motivoBaja: null,
    creadoEn: "2022-11-01T09:00:00.000Z",
  };

  const empMaria: Empleado = {
    id: "emp-maria-cocina",
    ubicacionId: UBICACION_MIAMI,
    nombre: "Maria Fernanda Lopez",
    email: "maria.lopez@chickenkitchen.demo",
    telefono: "305-555-0103",
    rolId: "rol-cocina",
    fechaContratacion: "2023-06-20",
    estado: "activo",
    tarifaHoraCentavos: 1600, // $16.00/hr DEMO
    usuarioId: "user-cocina-demo",
    motivoBaja: null,
    creadoEn: "2023-06-20T09:00:00.000Z",
  };

  const empJose: Empleado = {
    id: "emp-jose-cajero-tx",
    ubicacionId: UBICACION_AUSTIN,
    nombre: "Jose Martinez",
    email: "jose.martinez@chickenkitchen.demo",
    telefono: "512-555-0104",
    rolId: "rol-cajero",
    fechaContratacion: "2023-09-05",
    estado: "activo",
    tarifaHoraCentavos: 1450, // $14.50/hr DEMO
    usuarioId: "user-cajero-tx-demo",
    motivoBaja: null,
    creadoEn: "2023-09-05T09:00:00.000Z",
  };

  const empLaura: Empleado = {
    id: "emp-laura-cocina-tx",
    ubicacionId: UBICACION_AUSTIN,
    nombre: "Laura Sanchez",
    email: "laura.sanchez@chickenkitchen.demo",
    telefono: "512-555-0105",
    rolId: "rol-cocina",
    fechaContratacion: "2024-01-10",
    estado: "activo",
    tarifaHoraCentavos: 1550, // $15.50/hr DEMO
    usuarioId: "user-cocina-tx-demo",
    motivoBaja: null,
    creadoEn: "2024-01-10T09:00:00.000Z",
  };

  // Empleado en onboarding: demuestra el flujo alta -> completar onboarding -> activo.
  const empKevin: Empleado = {
    id: "emp-kevin-onboarding",
    ubicacionId: UBICACION_MIAMI,
    nombre: "Kevin Diaz",
    email: "kevin.diaz@chickenkitchen.demo",
    telefono: "305-555-0106",
    rolId: "rol-cajero",
    fechaContratacion: fechaISO(hoy),
    estado: "onboarding",
    tarifaHoraCentavos: 1400, // $14.00/hr DEMO
    usuarioId: null,
    motivoBaja: null,
    creadoEn: hoy.toISOString(),
  };

  const empleados: Empleado[] = [empAna, empCarlos, empMaria, empJose, empLaura, empKevin];

  // Horarios programados de hoy (para poder demostrar deteccion de tardanza).
  const horariosTurno: HorarioTurno[] = [
    {
      id: nid("horario"),
      empleadoId: empAna.id,
      ubicacionId: UBICACION_MIAMI,
      fecha: fechaISO(hoy),
      horaInicioProgramada: "08:00",
      horaFinProgramada: "16:00",
    },
    {
      id: nid("horario"),
      empleadoId: empMaria.id,
      ubicacionId: UBICACION_MIAMI,
      fecha: fechaISO(hoy),
      horaInicioProgramada: "07:00",
      horaFinProgramada: "15:00",
    },
    {
      id: nid("horario"),
      empleadoId: empJose.id,
      ubicacionId: UBICACION_AUSTIN,
      fecha: fechaISO(hoy),
      horaInicioProgramada: "08:00",
      horaFinProgramada: "16:00",
    },
  ];

  // Marcajes historicos (~2 semanas): Ana y Maria trabajan L-V (5 dias, 8h),
  // Jose trabaja L-S en la semana en curso (6 dias, 8h => 48h, para ilustrar
  // horas extra >40h/semana), Laura trabaja L-V. Se generan de offset 13 (hace
  // ~2 semanas) a offset 0 (hoy), saltando fines de semana segun corresponda.
  const marcajesIniciales: Marcaje[] = [];
  for (let offset = 13; offset >= 0; offset--) {
    const dia = new Date(hoy);
    dia.setDate(dia.getDate() - offset);
    const diaSemana = dia.getDay(); // 0 = domingo, 6 = sabado

    const esLunesAViernes = diaSemana >= 1 && diaSemana <= 5;
    const esLunesASabado = diaSemana >= 1 && diaSemana <= 6;

    if (esLunesAViernes) {
      marcajesIniciales.push(
        ...generarMarcajesDia(empAna.id, UBICACION_MIAMI, hoy, offset, 8, 16, offset === 0 ? 18 : 0)
      );
      marcajesIniciales.push(
        ...generarMarcajesDia(empMaria.id, UBICACION_MIAMI, hoy, offset, 7, 15)
      );
      marcajesIniciales.push(
        ...generarMarcajesDia(empLaura.id, UBICACION_AUSTIN, hoy, offset, 9, 17)
      );
    }
    if (esLunesASabado) {
      marcajesIniciales.push(
        ...generarMarcajesDia(empJose.id, UBICACION_AUSTIN, hoy, offset, 8, 16)
      );
    }
  }

  return { empleados, horariosTurno, marcajesIniciales };
}
