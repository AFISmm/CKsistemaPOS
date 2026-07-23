/**
 * Sesion DEMO por correo+PIN — DUENO: shell de UI (etapa 1 de 3 de este proyecto).
 *
 * IMPORTANTE: esto es una simulacion de autenticacion para la demo, NO el
 * mecanismo de produccion. No hay JWT, cookies de servidor, ni comparacion
 * segura de secretos (bcrypt/argon2, S-10). Se valida el PIN en texto plano
 * contra `Usuario.pinHash` con el formato sembrado `"demo:<pin>"` (mismo
 * formato usado en toda la app, ver lib/db/store.ts y lib/data/rrhh-seed.ts).
 *
 * La etapa 2 de este proyecto (fuera de alcance aqui) reemplazara este login
 * por el flujo TOTP + verificacion facial descrito en los ADRs de seguridad
 * (docs/adr/0005-seguridad-pci-y-tokenizacion-de-pagos.md y el agente
 * seguridad-accesos-pos); el contrato de UsuarioSinPin/Rol de aqui deberia
 * poder reutilizarse tal cual en ese reemplazo.
 *
 * Alcance DEMO: solo se puede iniciar sesion con usuarios de la ubicacion
 * piloto (Miami, FL) — es la unica tienda con datos de demo completos.
 *
 * FLUJO POR CORREO (agregado en esta etapa): /login ahora pide primero el
 * correo. `verificarCorreo` resuelve, SIN exponer datos sensibles, si ese
 * correo ya es un Empleado y si ya tiene PIN habilitado (usuarioId asignado
 * por un gerente via "Completar onboarding"). `iniciarSesion` ya NO valida el
 * PIN contra "cualquier usuario de la tienda piloto": resuelve el Empleado
 * puntual por email -> su usuarioId -> y valida el PIN SOLO contra el
 * pinHash de ESE Usuario. Por seguridad basica (incluso en demo), el error
 * es siempre el mismo mensaje generico sin importar cual de las tres cosas
 * fallo (correo no existe / empleado sin usuarioId / PIN incorrecto).
 *
 * BLOQUEO POR INTENTOS FALLIDOS (agregado en Fase A, revision 2026-07-22,
 * plan de seguridad para produccion): 3 intentos de PIN fallidos consecutivos
 * para el MISMO Usuario bloquean el login por PIN 5 minutos (ver
 * lib/auth/bloqueoPin.ts, mismo patron y mismos numeros que el bloqueo de
 * verificacion facial de lib/jornada/bloqueo.ts). Antes de este cambio no
 * habia ningun limite: se podian probar PINs de 4 digitos indefinidamente.
 */

import { getDb } from "@/lib/db/store";
import type { Rol, Usuario } from "@/lib/domain/types";
import { obtenerEmpleadoPorEmail } from "@/lib/rrhh/empleados";
import { bloqueadoHastaPin, registrarIntentoFallidoPin, reiniciarIntentosPin } from "./bloqueoPin";
import { ErrorAuth } from "./errores";

/** Usuario sin el campo `pinHash` (nunca se debe exponer al cliente). */
export type UsuarioSinPin = Omit<Usuario, "pinHash">;

function sinPin(usuario: Usuario): UsuarioSinPin {
  const { pinHash: _pinHash, ...resto } = usuario;
  return resto;
}

function rolDe(rolId: string): Rol {
  const rol = getDb().roles.find((r) => r.id === rolId);
  if (!rol) {
    throw new ErrorAuth("rol_no_encontrado", "El usuario no tiene un rol valido asignado.", 500);
  }
  return rol;
}

/**
 * Verificacion de correo para /login (paso 1). Responde SOLO lo minimo
 * necesario para decidir la UI, sin exponer nada de otros empleados:
 *  - registrado=false -> el frontend muestra el formulario de auto-registro.
 *  - registrado=true, pinHabilitado=false -> el Empleado existe pero un
 *    gerente todavia no completo su onboarding (sin Usuario/PIN asignado
 *    todavia): el frontend muestra "pendiente de aprobacion", sin teclado.
 *  - registrado=true, pinHabilitado=true -> el frontend habilita el teclado
 *    de PIN para iniciar sesion con `iniciarSesion(email, pin)`.
 */
export function verificarCorreo(email: string): { registrado: boolean; pinHabilitado: boolean } {
  const empleado = obtenerEmpleadoPorEmail(email);
  if (!empleado) {
    return { registrado: false, pinHabilitado: false };
  }
  return { registrado: true, pinHabilitado: Boolean(empleado.usuarioId) };
}

/**
 * Valida {email, pin} y devuelve el usuario (sin pinHash) + su rol resuelto.
 * Resuelve el Empleado PUNTUAL por email -> su usuarioId -> y compara el PIN
 * solo contra el pinHash de ESE Usuario (no contra cualquier PIN de la
 * tienda). El error es siempre el mismo mensaje generico sin importar cual
 * de las tres cosas fallo (correo sin Empleado / Empleado sin usuarioId
 * todavia / PIN incorrecto) — por seguridad basica, incluso en demo.
 */
export function iniciarSesion(email: string, pin: string): { usuario: UsuarioSinPin; rol: Rol } {
  const emailLimpio = (email ?? "").trim();
  const pinLimpio = (pin ?? "").trim();
  if (!emailLimpio || !pinLimpio) {
    throw new ErrorAuth("credenciales_requeridas", "Ingresa tu correo y tu PIN.", 400);
  }

  const empleado = obtenerEmpleadoPorEmail(emailLimpio);
  const usuario = empleado?.usuarioId
    ? getDb().usuarios.find((u) => u.id === empleado.usuarioId && u.activo)
    : undefined;

  // Bloqueo por intentos fallidos: se consulta ANTES de comparar el PIN, y
  // rechaza incluso si el PIN enviado en ESTE intento es el correcto (el
  // bloqueo aplica al metodo completo por 5 minutos, no solo a los intentos
  // incorrectos que lo activaron) — mismo criterio que
  // lib/jornada/marcaje.ts (marcarPorFacial) con el bloqueo facial.
  if (usuario) {
    const bloqueo = bloqueadoHastaPin(usuario.id);
    if (bloqueo) {
      throw new ErrorAuth(
        "pin_bloqueado_temporalmente",
        "Demasiados intentos fallidos. Tu acceso por PIN esta bloqueado temporalmente; intenta de nuevo en unos minutos.",
        423
      );
    }
  }

  if (!usuario || usuario.pinHash !== `demo:${pinLimpio}`) {
    // Solo se cuenta como "intento fallido" contra el bloqueo cuando SI habia
    // un Usuario real contra el que comparar el PIN (ver nota de tradeoff de
    // enumeracion en lib/auth/bloqueoPin.ts): un correo inexistente nunca
    // acumula ni dispara bloqueo, porque no hay nada que proteger de fuerza
    // bruta todavia.
    if (usuario) registrarIntentoFallidoPin(usuario.id);
    throw new ErrorAuth("credenciales_invalidas", "Correo o PIN incorrectos.", 401);
  }

  reiniciarIntentosPin(usuario.id);
  return { usuario: sinPin(usuario), rol: rolDe(usuario.rolId) };
}

/**
 * Resuelve la sesion guardada en localStorage (solo el usuarioId) contra el
 * estado actual del servidor. Se llama en cada carga de pagina para no
 * confiar en datos viejos del navegador (ej. si el usuario fue dado de baja).
 */
export function obtenerSesion(usuarioId: string): { usuario: UsuarioSinPin; rol: Rol } {
  const usuario = getDb().usuarios.find((u) => u.id === usuarioId && u.activo);
  if (!usuario) {
    throw new ErrorAuth("sesion_invalida", "Sesion no encontrada o usuario inactivo.", 404);
  }
  return { usuario: sinPin(usuario), rol: rolDe(usuario.rolId) };
}

/**
 * Usuario (sin pinHash) + PIN actual EN TEXTO PLANO, solo para el panel
 * "Gestionar perfiles" del sidebar.
 *
 * ============================================================================
 * NOTA DE CUMPLIMIENTO (leer con el mismo cuidado que las notas de PCI en
 * `Pago`, biometria simulada en `Marcaje`, y SSN en `Empleado.ssnUltimos4`,
 * lib/domain/types.ts):
 *
 * Mostrar `pinActualDemo` es POSIBLE y ACEPTABLE UNICAMENTE en esta demo
 * porque `Usuario.pinHash` NO es un hash criptografico real: se guarda
 * literalmente como el string `"demo:" + pin` (ver `cambiarPin` mas abajo y
 * `completarOnboarding` en lib/rrhh/empleados.ts). "Revelar el PIN" aqui es
 * entonces solo quitarle el prefijo `"demo:"` a un valor que NUNCA estuvo
 * realmente protegido — no hay ninguna operacion criptografica que revertir.
 *
 * EN PRODUCCION, con un hash real (bcrypt/argon2, ver S-10), ESTO ES
 * IMPOSIBLE Y JAMAS DEBE INTENTARSE: un hash criptografico de una sola via
 * (one-way) por diseno NO se puede "revertir" para recuperar el PIN/password
 * original — ni con el codigo fuente, ni con acceso a la base de datos, ni
 * con el algoritmo. Cualquier sistema real que pueda "mostrar la
 * contraseña/PIN actual" de un usuario, o bien no esta usando un hash
 * criptografico real, o esta filtrando el secreto por otra via (ambos son
 * hallazgos graves de seguridad). Esta funcionalidad es EXCLUSIVA de esta
 * demo puntual (a pedido de producto) y NO debe llevarse a produccion ni
 * usarse como referencia de diseno fuera de este contexto.
 * ============================================================================
 */
export interface UsuarioConPinDemo extends UsuarioSinPin {
  /** PIN de acceso actual EN TEXTO PLANO. Ver advertencia de cumplimiento arriba. */
  pinActualDemo: string;
}

/**
 * Lista todos los Usuario (sin pinHash real, mas `pinActualDemo` en texto
 * plano SOLO por el formato de almacenamiento demo, ver advertencia arriba)
 * para el panel "Gestionar perfiles" del sidebar (permiso
 * "usuarios.gestionar", ver lib/db/store.ts). DEMO: sin paginacion, la base
 * es pequena.
 */
export function listarUsuarios(): UsuarioConPinDemo[] {
  return getDb().usuarios.map((u) => ({
    ...sinPin(u),
    pinActualDemo: u.pinHash.replace(/^demo:/, ""),
  }));
}

/**
 * Cambia el PIN de acceso de un Usuario ("Cambiar PIN" del modal "Gestionar
 * perfiles"). Mismo formato de hash DEMO que el resto de la app
 * (`"demo:<pin>"`, ver lib/db/store.ts / lib/rrhh/empleados.ts). Se valida
 * server-side que sea EXACTAMENTE 4 digitos numericos, sin confiar solo en
 * la validacion del cliente.
 */
export function cambiarPin(usuarioId: string, pin: string): UsuarioSinPin {
  const usuario = getDb().usuarios.find((u) => u.id === usuarioId);
  if (!usuario) {
    throw new ErrorAuth("usuario_no_encontrado", `Usuario ${usuarioId} no existe`, 404);
  }
  if (!/^\d{4}$/.test(pin ?? "")) {
    throw new ErrorAuth("pin_invalido", "El PIN debe tener exactamente 4 digitos numericos.", 422);
  }
  usuario.pinHash = `demo:${pin}`;
  return sinPin(usuario);
}
