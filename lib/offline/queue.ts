/**
 * Cola de escritura offline — F1-T3 (DUENO: frontend-mostrador-kiosco-pos).
 *
 * Logica sobre lib/offline/db.ts: encolar una escritura que fallo por red,
 * contar pendientes (para el indicador sutil en la UI) y "drenar" la cola
 * cuando vuelve la conexion, reproduciendo las escrituras contra la API real
 * EN EL ORDEN ORIGINAL (el propio id uuid v7 de cada entrada es ordenable por
 * tiempo, ver lib/offline/uuidv7.ts).
 *
 * Reglas de drenado (contrato del ticket):
 *   - Se reproduce en orden; cada entrada se quita de la cola SOLO tras una
 *     respuesta real de exito (2xx).
 *   - Un 409 (conflicto) se trata como "ya aplicado": se quita de la cola sin
 *     reintentar y sin duplicar (idempotencia del lado servidor).
 *   - Cualquier otro fallo (error de red o status de error != 409) DETIENE el
 *     drenado en esa entrada (no se salta al siguiente): las escrituras
 *     encoladas despues pueden depender causalmente de esta (ej. una linea
 *     depende de que el pedido exista), asi que saltarla rompe el orden.
 *     Se incrementa `intentos` y se reintenta en el proximo ciclo (evento
 *     `online` o el temporizador periodico, ver lib/offline/autoDrenado.ts).
 */

import {
  actualizarEntradaCola,
  agregarACola,
  contarPendientes as contarPendientesDb,
  eliminarDeCola,
  listarCola,
  type EscrituraEncolada,
} from "./db";
import { uuidv7 } from "./uuidv7";

export type { EscrituraEncolada };

type Escuchador = (pendientes: number) => void;
const escuchadores = new Set<Escuchador>();

/** Se suscribe a cambios en el numero de escrituras pendientes. Devuelve el des-suscriptor. */
export function alCambiarPendientes(cb: Escuchador): () => void {
  escuchadores.add(cb);
  return () => escuchadores.delete(cb);
}

async function notificarCambio(): Promise<void> {
  const n = await contarPendientesDb();
  for (const cb of escuchadores) cb(n);
}

export async function contarPendientes(): Promise<number> {
  return contarPendientesDb();
}

/** Encola una escritura que fallo por error de red. No lanza. */
export async function encolarEscritura(
  metodo: string,
  url: string,
  cuerpo: unknown
): Promise<EscrituraEncolada> {
  const entrada: EscrituraEncolada = {
    id: uuidv7(),
    metodo: metodo.toUpperCase(),
    url,
    cuerpo,
    creadoEn: new Date().toISOString(),
    intentos: 0,
  };
  await agregarACola(entrada);
  await notificarCambio();
  return entrada;
}

export interface ResultadoDrenado {
  sincronizados: number;
  conflictosIdempotentes: number;
  /** true si el drenado se detuvo antes de vaciar toda la cola (por un fallo). */
  detenidoPorFallo: boolean;
}

/**
 * Reproduce la cola en orden contra la API real. `fetchImpl` es inyectable
 * para pruebas (mock fetch); en produccion usa el `fetch` global del navegador.
 */
export async function drenarCola(
  fetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args)
): Promise<ResultadoDrenado> {
  const cola = await listarCola();
  let sincronizados = 0;
  let conflictosIdempotentes = 0;
  let detenidoPorFallo = false;

  for (const entrada of cola) {
    let respuesta: Response;
    try {
      const sinCuerpo = entrada.metodo === "GET" || entrada.metodo === "HEAD";
      respuesta = await fetchImpl(entrada.url, {
        method: entrada.metodo,
        headers: sinCuerpo ? undefined : { "Content-Type": "application/json" },
        body: sinCuerpo ? undefined : JSON.stringify(entrada.cuerpo),
      });
    } catch {
      // Seguimos sin conexion real: detenemos el drenado preservando el orden.
      entrada.intentos += 1;
      await actualizarEntradaCola(entrada);
      detenidoPorFallo = true;
      break;
    }

    if (respuesta.ok) {
      await eliminarDeCola(entrada.id);
      sincronizados += 1;
      continue;
    }

    if (respuesta.status === 409) {
      // Conflicto idempotente: el servidor indica que esta escritura ya se
      // aplico antes (ej. la respuesta original se perdio en la red pero la
      // escritura SI llego). Se trata como exito equivalente: se retira sin
      // reintentar y sin duplicar la operacion.
      await eliminarDeCola(entrada.id);
      conflictosIdempotentes += 1;
      continue;
    }

    // Otro error (4xx/5xx distinto de 409): detenemos el drenado aqui mismo.
    entrada.intentos += 1;
    await actualizarEntradaCola(entrada);
    detenidoPorFallo = true;
    break;
  }

  await notificarCambio();
  return { sincronizados, conflictosIdempotentes, detenidoPorFallo };
}
