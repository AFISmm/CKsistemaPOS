/**
 * WebAuthn (Web Authentication API) — REFUERZO REAL de la verificacion
 * facial del chequeo de inicio de jornada — DUENO: rrhh-personal-pos (etapa
 * 2). Convive con la simulacion existente (lib/jornada/bloqueo.ts,
 * reportarIntentoFacial en lib/jornada/marcaje.ts): NO la reemplaza ni la
 * modifica. Ver app/jornada/marcar/page.tsx para el punto de integracion —
 * al terminar el gesto biometrico real, el cliente llama a la MISMA
 * `reportarIntentoFacial(empleadoId, exitoso)` que usan los botones
 * "Simular exito/fallo", para reusar exactamente la misma logica de conteo
 * de intentos / bloqueo de 5 minutos / avance de paso.
 *
 * QUE ES REAL Y QUE ES SIMPLIFICACION DE DEMO (documentado explicitamente,
 * igual que las demas notas de simplificacion del proyecto):
 *
 *  - REAL: `navigator.credentials.create()` / `.get()` en el navegador del
 *    dispositivo del empleado, con `authenticatorAttachment: "platform"` y
 *    `userVerification: "required"`, hace que el SISTEMA OPERATIVO exija el
 *    gesto biometrico de PLATAFORMA (Face ID, Touch ID, Windows Hello) antes
 *    de devolver cualquier credencial al navegador. Ese gesto biometrico es
 *    real — lo exige el SO, no esta simulado por este codigo. No hace falta
 *    ninguna libreria de servidor para que el navegador muestre ese prompt:
 *    es soporte de plataforma nativo del navegador (spec WebAuthn / Level 2).
 *
 *  - SIMPLIFICACION DE DEMO (alcance acordado explicitamente con el dueno de
 *    producto, dado el tiempo disponible): este servidor NO implementa la
 *    verificacion criptografica de la asercion WebAuthn — es decir, NO
 *    valida `attestationObject`/`authenticatorData`/`clientDataJSON` ni la
 *    firma contra la clave publica registrada, ni lleva un contador
 *    anti-replay por credencial. Hacer eso correctamente (parseo CBOR,
 *    cadena de certificados de atestacion, verificacion de firma, etc.)
 *    requeriria una libreria de servidor WebAuthn completa (ej.
 *    `@simplewebauthn/server`), fuera de alcance de esta demo. Aqui el
 *    servidor solo:
 *      (a) genera un challenge aleatorio criptografico (crypto.randomBytes)
 *          para que las opciones que se envian al navegador no sean
 *          predecibles, pero NO lo guarda ni lo valida de vuelta — sin
 *          verificacion de firma, validar el challenge de vuelta no aporta
 *          seguridad real adicional en esta demo (haria falta ademas un
 *          store efimero con expiracion, que se omite a proposito);
 *      (b) en el registro, guarda el `credentialId` (string opaco) que
 *          devuelve `create()` en `Empleado.credencialWebauthnId`;
 *      (c) en usos posteriores, confirma que existe una credencial
 *          registrada para ese empleado (paso obligatorio) y deja que el
 *          navegador exija de nuevo el gesto biometrico via `get()`.
 *    La señal de confianza real de esta demo es "el SO ya exigio Face
 *    ID/Touch ID/Windows Hello antes de que el navegador devolviera una
 *    credencial" — no "el servidor verifico criptograficamente esa
 *    credencial". PRODUCCION SI necesitaria la verificacion de firma
 *    completa (y probablemente atestacion) para no confiar ciegamente en lo
 *    que el cliente reporta.
 *
 *  - Modelo de UNA credencial por empleado (no un array de credenciales por
 *    dispositivo): ver comentario en Empleado.credencialWebauthnId
 *    (lib/domain/types.ts). Suficiente para demostrar el flujo; produccion
 *    permitiria multiples dispositivos por empleado.
 */

import { randomBytes } from "crypto";
import { obtenerEmpleado } from "../rrhh/empleados";
import { ErrorJornada } from "./errores";

/** Nombre del "relying party" mostrado por el navegador en el prompt biometrico. */
const RP_NAME = "Chicken Kitchen POS (demo)";
const TIMEOUT_MS = 60_000;

function obtenerEmpleadoOrThrow(empleadoId: string) {
  const empleado = obtenerEmpleado(empleadoId);
  if (!empleado) {
    throw new ErrorJornada("empleado_no_encontrado", `Empleado ${empleadoId} no existe`, 404);
  }
  return empleado;
}

function generarChallengeBase64Url(): string {
  return randomBytes(32).toString("base64url");
}

export interface OpcionesRegistroWebauthn {
  challenge: string; // base64url
  rp: { name: string };
  user: { id: string; name: string; displayName: string }; // id en base64url
  pubKeyCredParams: { alg: number; type: "public-key" }[];
  authenticatorSelection: { authenticatorAttachment: "platform"; userVerification: "required" };
  timeout: number;
}

/**
 * POST /api/v1/jornada/webauthn/opciones-registro — opciones para
 * `navigator.credentials.create()` la primera vez que un empleado registra
 * Face ID/Touch ID/Windows Hello en un dispositivo. No se omite `rp.id`
 * explicito: se deja que el navegador use el origin actual (mismo efecto,
 * mas simple que resolver el hostname exacto de la request en el servidor).
 */
export function opcionesRegistro(empleadoId: string): OpcionesRegistroWebauthn {
  const empleado = obtenerEmpleadoOrThrow(empleadoId);
  return {
    challenge: generarChallengeBase64Url(),
    rp: { name: RP_NAME },
    user: {
      id: Buffer.from(empleado.id, "utf-8").toString("base64url"),
      name: empleado.email || empleado.nombre,
      displayName: empleado.nombre,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256, soportado por todos los autenticadores de plataforma relevantes
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
    timeout: TIMEOUT_MS,
  };
}

export interface RegistrarWebauthnInput {
  empleadoId: string;
  credentialId: string; // base64url, `credential.id` devuelto por create()
}

/**
 * POST /api/v1/jornada/webauthn/registrar — guarda el `credentialId` que
 * devolvio `navigator.credentials.create()` DESPUES de que el navegador ya
 * exigio (y el empleado completo) el gesto biometrico real. A partir de aqui
 * este empleado puede usar `navigator.credentials.get()` (ver opcionesLogin)
 * en usos posteriores desde el MISMO dispositivo.
 */
export function registrarCredencial(input: RegistrarWebauthnInput): { credencialWebauthnId: string } {
  const empleado = obtenerEmpleadoOrThrow(input.empleadoId);
  const credentialId = (input.credentialId ?? "").trim();
  if (!credentialId) {
    throw new ErrorJornada("credential_id_requerido", "credentialId es requerido", 422);
  }
  empleado.credencialWebauthnId = credentialId;
  return { credencialWebauthnId: credentialId };
}

export interface OpcionesLoginWebauthn {
  challenge: string; // base64url
  allowCredentials: { id: string; type: "public-key" }[]; // id en base64url
  userVerification: "required";
  timeout: number;
}

/**
 * POST /api/v1/jornada/webauthn/opciones-login — opciones para
 * `navigator.credentials.get()` cuando el empleado YA registro una
 * credencial en este dispositivo. Si todavia no registro ninguna, responde
 * 422 `sin_credencial_webauthn` para que el cliente caiga al flujo de
 * registro (ver app/jornada/marcar/page.tsx).
 */
export function opcionesLogin(empleadoId: string): OpcionesLoginWebauthn {
  const empleado = obtenerEmpleadoOrThrow(empleadoId);
  if (!empleado.credencialWebauthnId) {
    throw new ErrorJornada(
      "sin_credencial_webauthn",
      "Este empleado todavia no registro Face ID/Touch ID/Windows Hello en ningun dispositivo.",
      422
    );
  }
  return {
    challenge: generarChallengeBase64Url(),
    allowCredentials: [{ id: empleado.credencialWebauthnId, type: "public-key" }],
    userVerification: "required",
    timeout: TIMEOUT_MS,
  };
}
