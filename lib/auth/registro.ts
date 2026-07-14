/**
 * Auto-registro de empleado desde /login (DEMO, etapa 1) — DUENO: shell de UI.
 *
 * Cuando alguien intenta iniciar sesion en /login con un correo que NO esta
 * registrado como email de ningun Empleado, la pantalla le ofrece este alta
 * de auto-servicio en vez de que un gerente tenga que teclear los datos. Es
 * el MISMO mecanismo de alta que ya existia (lib/rrhh/empleados.ts
 * `crearEmpleado`, usado por la pantalla /empleados del gerente): crea el
 * Empleado en estado "onboarding", SIN Usuario de login todavia. Un gerente
 * sigue siendo quien completa el onboarding y asigna el PIN (mismo modal
 * "Completar onboarding" / POST /api/v1/empleados/[id]/onboarding, ver
 * components/empleados/CompletarOnboardingModal.tsx) — este archivo no
 * duplica esa logica, solo hace que MAS empleados lleguen a "onboarding" sin
 * intervencion manual del gerente.
 *
 * Defaults DEMO (documentados para que el gerente los ajuste despues desde
 * Empleados/Gestionar Perfiles): rol "cajero" (el mas basico, rol-cajero),
 * tienda piloto (Miami, FL — default de crearEmpleado), $14.00/hr.
 *
 * EXCEPCION @digeniusai.com (a pedido del dueno de producto): estos correos
 * son cuentas de desarrolladores/staff del proyecto, NO empleados reales de
 * la tienda. NO pasan por aprobacion de un gerente ni por "onboarding":
 * se auto-activan en el momento del registro, con rol `rol-developer` (todos
 * los permisos, ver lib/db/store.ts) — son quienes otorgan permisos a los
 * demas empleados y cargan la informacion operativa del portal. Como no hay
 * gerente que les asigne PIN, lo eligen ellos mismos en el propio formulario
 * de registro (ver `pin` abajo), y este modulo llama internamente a
 * `completarOnboarding` (la MISMA funcion que usa el gerente en
 * "Completar onboarding") para crear su Usuario y activarlos de una vez, sin
 * duplicar esa logica.
 *
 * PRIVACIDAD DEL SSN: ver el comentario completo en
 * lib/domain/types.ts (Empleado.ssnUltimos4) y README-DEMO.md. Aqui se
 * revalida SERVER-SIDE que sean EXACTAMENTE 4 digitos numericos (nunca un
 * SSN completo), sin confiar solo en el enmascarado del cliente.
 */

import { completarOnboarding, crearEmpleado, obtenerEmpleadoPorEmail } from "../rrhh/empleados";
import type { Empleado } from "../domain/types";
import { ErrorAuth } from "./errores";

const ROL_DEFAULT_AUTOREGISTRO = "rol-cajero";
/** Rol de las cuentas @digeniusai.com: acceso total, ver lib/db/store.ts. */
const ROL_DEVELOPER = "rol-developer";
// $14.00/hr DEMO — el gerente lo ajusta despues desde Empleados/Gestionar Perfiles.
// (Irrelevante para cuentas developer, que no cobran nomina real, pero
// crearEmpleado exige el campo; se deja el mismo default por simplicidad.)
const TARIFA_DEFAULT_CENTAVOS = 1400;

/** Dominio de correo interno de Digenius (desarrolladores/staff tecnico del proyecto). */
const DOMINIO_DEVELOPERS = "@digeniusai.com";

/** true si el correo pertenece al dominio de desarrolladores (sin distinguir mayusculas). */
function esCorreoDeDeveloper(email: string): boolean {
  return email.toLowerCase().endsWith(DOMINIO_DEVELOPERS);
}

export interface RegistroInput {
  nombre: string;
  apellido: string;
  /**
   * SOLO los ultimos 4 digitos del SSN (nunca el numero completo). Opcional:
   * los correos @digeniusai.com (desarrolladores) NO requieren SSN, ver
   * `esCorreoDeDeveloper` abajo.
   */
  ssnUltimos4?: string | null;
  email: string;
  telefono: string;
  /**
   * PIN de acceso (4-6 digitos). REQUERIDO solo para correos @digeniusai.com:
   * como se auto-activan sin gerente, ellos mismos eligen su PIN aqui. Para
   * cualquier otro correo se ignora (el gerente asigna el PIN despues via
   * "Completar onboarding").
   */
  pin?: string | null;
}

/** Alta de empleado por auto-registro (primera vez). Ver aviso de archivo arriba. */
export function registrarEmpleado(input: RegistroInput): Empleado {
  const nombre = (input.nombre ?? "").trim();
  const apellido = (input.apellido ?? "").trim();
  const email = (input.email ?? "").trim();
  const telefono = (input.telefono ?? "").trim();
  const ssnUltimos4 = (input.ssnUltimos4 ?? "").trim();
  const pin = (input.pin ?? "").trim();

  if (!nombre) {
    throw new ErrorAuth("nombre_requerido", "El nombre es requerido.", 422);
  }
  if (!apellido) {
    throw new ErrorAuth("apellido_requerido", "El apellido es requerido.", 422);
  }
  if (!email) {
    throw new ErrorAuth("email_requerido", "El correo es requerido.", 422);
  }
  if (!telefono) {
    throw new ErrorAuth("telefono_requerido", "El telefono es requerido.", 422);
  }

  // Correos @digeniusai.com son cuentas de desarrolladores/staff del proyecto,
  // no empleados reales de la tienda: no tiene sentido pedirles SSN. Para
  // cualquier otro correo, se sigue exigiendo el mismo formato de siempre
  // (EXACTAMENTE 4 digitos, nunca un SSN completo de 9), validado server-side
  // sin confiar solo en el enmascarado del cliente.
  const esDeveloper = esCorreoDeDeveloper(email);
  if (!esDeveloper && !/^\d{4}$/.test(ssnUltimos4)) {
    throw new ErrorAuth(
      "ssn_invalido",
      "Ingresa solo los ultimos 4 digitos del SSN (exactamente 4 digitos numericos).",
      422
    );
  }
  if (esDeveloper && ssnUltimos4 && !/^\d{4}$/.test(ssnUltimos4)) {
    // Si igual mandaron algo (ej. el cliente no oculto el campo a tiempo), que
    // por lo menos tenga el formato correcto en vez de guardar basura.
    throw new ErrorAuth(
      "ssn_invalido",
      "Si se incluye, el SSN debe ser exactamente 4 digitos numericos.",
      422
    );
  }
  // Las cuentas developer eligen su propio PIN aqui mismo (no hay gerente que
  // se los asigne despues); mismo formato que exige completarOnboarding.
  if (esDeveloper && !/^\d{4,6}$/.test(pin)) {
    throw new ErrorAuth("pin_invalido", "pin debe tener entre 4 y 6 digitos", 422);
  }
  if (obtenerEmpleadoPorEmail(email)) {
    throw new ErrorAuth("correo_ya_registrado", "Ese correo ya esta registrado.", 409);
  }

  const empleado = crearEmpleado({
    nombre: `${nombre} ${apellido}`.trim(),
    email,
    telefono,
    rolId: esDeveloper ? ROL_DEVELOPER : ROL_DEFAULT_AUTOREGISTRO,
    // ubicacionId: se omite a proposito -> default de crearEmpleado (tienda piloto).
    tarifaHoraCentavos: TARIFA_DEFAULT_CENTAVOS,
    ssnUltimos4: esDeveloper ? (ssnUltimos4 || null) : ssnUltimos4,
  });

  if (!esDeveloper) {
    // Empleado real de tienda: queda en "onboarding", pendiente de que un
    // gerente le asigne PIN via "Completar onboarding".
    return empleado;
  }

  // Cuenta developer: se activa de inmediato reutilizando la MISMA funcion
  // que usa el gerente para completar el onboarding de cualquier empleado
  // (crea el Usuario de login con el PIN elegido y pasa el Empleado a
  // "activo"), sin necesidad de aprobacion manual.
  return completarOnboarding(empleado.id, { pin });
}
