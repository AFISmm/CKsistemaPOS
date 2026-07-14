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
 * PRIVACIDAD DEL SSN: ver el comentario completo en
 * lib/domain/types.ts (Empleado.ssnUltimos4) y README-DEMO.md. Aqui se
 * revalida SERVER-SIDE que sean EXACTAMENTE 4 digitos numericos (nunca un
 * SSN completo), sin confiar solo en el enmascarado del cliente.
 */

import { crearEmpleado, obtenerEmpleadoPorEmail } from "../rrhh/empleados";
import type { Empleado } from "../domain/types";
import { ErrorAuth } from "./errores";

const ROL_DEFAULT_AUTOREGISTRO = "rol-cajero";
// $14.00/hr DEMO — el gerente lo ajusta despues desde Empleados/Gestionar Perfiles.
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
}

/** Alta de empleado por auto-registro (primera vez). Ver aviso de archivo arriba. */
export function registrarEmpleado(input: RegistroInput): Empleado {
  const nombre = (input.nombre ?? "").trim();
  const apellido = (input.apellido ?? "").trim();
  const email = (input.email ?? "").trim();
  const telefono = (input.telefono ?? "").trim();
  const ssnUltimos4 = (input.ssnUltimos4 ?? "").trim();

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
  if (obtenerEmpleadoPorEmail(email)) {
    throw new ErrorAuth("correo_ya_registrado", "Ese correo ya esta registrado.", 409);
  }

  return crearEmpleado({
    nombre: `${nombre} ${apellido}`.trim(),
    email,
    telefono,
    rolId: ROL_DEFAULT_AUTOREGISTRO,
    // ubicacionId: se omite a proposito -> default de crearEmpleado (tienda piloto).
    tarifaHoraCentavos: TARIFA_DEFAULT_CENTAVOS,
    ssnUltimos4: esDeveloper ? (ssnUltimos4 || null) : ssnUltimos4,
  });
}
