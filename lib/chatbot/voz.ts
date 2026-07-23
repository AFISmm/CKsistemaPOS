"use client";

/**
 * Integracion de voz del chatbot de ayuda — DUENO: shell de UI (etapa 3 de 3
 * de este proyecto). 100% del lado del cliente, usando las Web Speech APIs
 * del navegador: SIN backend, SIN claves de API, SIN servicio externo de voz.
 *
 * - Entrada de voz (STT): `SpeechRecognition` / `webkitSpeechRecognition`
 *   (soportado en Chrome/Edge; NO en todos los navegadores, ej. Firefox no lo
 *   soporta al momento de escribir esto). `sttDisponible()` detecta el
 *   soporte para que la UI oculte/deshabilite el boton de microfono con un
 *   mensaje claro en vez de romperse.
 * - Salida de voz (TTS): `window.speechSynthesis` + `SpeechSynthesisUtterance`
 *   (soporte mucho mas amplio; SI esta en el lib.dom.d.ts estandar de
 *   TypeScript). `ttsDisponible()` detecta el soporte por completitud, aunque
 *   es raro que falte en un navegador moderno.
 *
 * `SpeechRecognition` NO forma parte del lib.dom.d.ts estandar de TypeScript
 * (a diferencia de `SpeechSynthesisUtterance`, que si esta incluido) porque
 * sigue siendo una API no estandarizada entre navegadores. Por eso se declaran
 * aqui tipos minimos propios (`declare global`) en vez de depender de tipos
 * de terceros (@types/dom-speech-recognition) para no agregar una dependencia
 * nueva solo para esta demo.
 */

import type { Idioma } from "@/lib/shell/I18nProvider";

interface ResultadoReconocimiento {
  readonly transcript: string;
}

interface AlternativaReconocimiento {
  readonly [indice: number]: ResultadoReconocimiento;
  readonly length: number;
  readonly isFinal: boolean;
}

interface EventoResultadoReconocimiento extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly [indice: number]: AlternativaReconocimiento;
    readonly length: number;
  };
}

/** Forma minima de la API de reconocimiento de voz que este modulo necesita. */
export interface ReconocedorVoz extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((evento: EventoResultadoReconocimiento) => void) | null;
  onerror: ((evento: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ReconocedorVoz;
    webkitSpeechRecognition?: new () => ReconocedorVoz;
  }
}

/** Mapea el idioma de la app (etapa 1) al codigo BCP-47 que esperan las Web Speech APIs. */
function codigoIdiomaVoz(idioma: Idioma): string {
  return idioma === "es" ? "es-ES" : "en-US";
}

/** true si el navegador soporta reconocimiento de voz (entrada por microfono). */
export function sttDisponible(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** true si el navegador soporta lectura en voz alta (texto-a-voz). */
export function ttsDisponible(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Crea un reconocedor de voz listo para usar (idioma configurado, resultados
 * intermedios activados para poder mostrar la transcripcion en vivo). Devuelve
 * `null` si el navegador no soporta STT — el llamador debe verificar
 * `sttDisponible()` antes, pero esta funcion tambien es defensiva.
 */
export function crearReconocedorVoz(idioma: Idioma): ReconocedorVoz | null {
  if (typeof window === "undefined") return null;
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return null;

  const reconocedor = new Constructor();
  reconocedor.lang = codigoIdiomaVoz(idioma);
  reconocedor.interimResults = true;
  reconocedor.continuous = false;
  reconocedor.maxAlternatives = 1;
  return reconocedor;
}

/**
 * Extrae el texto final (ya confirmado) y el texto intermedio (aun
 * transcribiendose) de un evento `onresult`, a partir de `resultIndex`.
 */
export function extraerTranscripcion(evento: EventoResultadoReconocimiento): {
  final: string;
  intermedio: string;
} {
  let final = "";
  let intermedio = "";
  for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
    const alternativa = evento.results[i];
    const texto = alternativa[0]?.transcript ?? "";
    if (alternativa.isFinal) final += texto;
    else intermedio += texto;
  }
  return { final, intermedio };
}

/**
 * Lee `texto` en voz alta en el idioma dado. Cancela cualquier lectura en
 * curso primero (evita superponer audios si el usuario encadena preguntas).
 * No lanza si `speechSynthesis` no esta disponible o falla: simplemente omite
 * la lectura en voz alta (la respuesta en texto siempre queda en el chat).
 *
 * `alTerminar` (AGREGADO para el modo "manos libres" del chatbot, ver
 * ChatbotWidget.tsx): callback opcional invocado cuando la lectura TERMINA
 * (evento `onend`) o si FALLA a mitad de camino (`onerror`) — en ambos casos
 * se llama, para que quien encadena "escuchar de nuevo" despues de hablar
 * (modo manos libres) nunca se quede esperando para siempre si el audio
 * falla. Si `ttsDisponible()` es false o `speechSynthesis.speak` lanza de
 * entrada, se invoca `alTerminar` igual (de forma sincrona) para no romper esa
 * cadena. Los llamadores existentes que no pasan este parametro (modo
 * "Audio" normal del chatbot) no cambian de comportamiento.
 */
export function hablar(texto: string, idioma: Idioma, alTerminar?: () => void): void {
  if (!ttsDisponible()) {
    alTerminar?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = codigoIdiomaVoz(idioma);
    if (alTerminar) {
      utterance.onend = () => alTerminar();
      utterance.onerror = () => alTerminar();
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Navegador con speechSynthesis presente pero fallando en runtime: se omite en silencio.
    alTerminar?.();
  }
}

/** Detiene cualquier lectura en voz alta en curso (ej. al cerrar el panel de chat). */
export function detenerLectura(): void {
  if (!ttsDisponible()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Sin efecto si ya no habia nada leyendose.
  }
}
