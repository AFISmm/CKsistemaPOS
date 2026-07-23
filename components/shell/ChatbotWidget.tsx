"use client";

/**
 * Widget flotante de chat de ayuda — DUENO: shell de UI (etapa 3 de 3 de este
 * proyecto). Se monta UNA sola vez desde components/shell/AppShell.tsx, junto
 * al cierre del layout con sidebar/topbar (ver comentario en ese archivo), asi
 * que aparece sobre cualquier pantalla YA AUTENTICADA de la app.
 *
 * Punto de montaje elegido (documentado): NO aparece en /login, en
 * /jornada/pantalla (pantalla kiosko compartida de la tienda, sin distracciones
 * a proposito) ni en /jornada/marcar (flujo enfocado de un solo paso desde el
 * celular del empleado) porque esas tres rutas se renderizan "desnudas" (sin
 * el layout de sidebar/topbar) en AppShell.tsx — montar el widget ahi mismo
 * (y no con una lista de rutas excluidas aparte) hace que la exclusion sea
 * automatica y no se pueda olvidar al agregar una ruta sin-guard nueva.
 *
 * Responsabilidades:
 *  - Boton flotante que abre/cierra el panel (esquina inferior derecha).
 *  - Historial de mensajes usuario/bot, input de texto, boton de microfono
 *    (STT) y selector de modo de respuesta texto/audio (TTS).
 *  - El "cerebro" de las respuestas es lib/chatbot/respuestas.ts: un motor de
 *    REGLAS/PALABRAS CLAVE, NO un LLM real (ver DEMO aviso en ese archivo y en
 *    README-DEMO.md). La demora antes de responder es SIMULADA (setTimeout
 *    corto) para dar sensacion de "el bot esta pensando"; no hay ninguna
 *    llamada de red involucrada.
 *  - La voz (entrada STT / salida TTS) es 100% del navegador, ver
 *    lib/chatbot/voz.ts — sin backend ni claves de API.
 *
 * MODO "MANOS LIBRES" (Fase A, revision 2026-07-22 seccion 3.2): ademas del
 * selector Texto/Audio de arriba (que solo controla si la respuesta se LEE en
 * voz alta), un boton separado activa una sesion de conversacion encadenada:
 * escuchar -> responder -> hablar -> volver a escuchar, sin que el usuario
 * tenga que volver a tocar el boton de microfono entre turnos.
 *
 * DECISION DE DISENO (documentada a proposito, ver enunciado de la tarea):
 * NO se usa `continuous: true` de `SpeechRecognition` para escucha
 * ininterrumpida real. `continuous` deja el reconocedor abierto indefinidamente
 * incluso sin voz, lo cual en la practica es POCO CONFIABLE entre navegadores
 * (Chrome lo corta solo tras un rato de silencio de todas formas) y consume
 * bateria/mic de forma continua sin necesidad. En su lugar: activar "manos
 * libres" arranca UNA sesion de escucha (igual que tocar el microfono
 * manualmente); en cuanto el reconocedor entrega una transcripcion FINAL, se
 * envia el mensaje, se lee la respuesta en voz alta (SIEMPRE, sin importar el
 * toggle Texto/Audio: manos libres implica audio) y, al terminar de leerla
 * (evento `onend` de la sintesis de voz, ver `hablar()` en lib/chatbot/voz.ts),
 * se arranca automaticamente el SIGUIENTE turno de escucha. El usuario "activa
 * la sesion con un solo tap" y esta se mantiene sola entre turnos hasta que la
 * desactiva (o cierra el panel del chat, ver el efecto que la apaga al cerrar).
 * No hay reintento automatico si el reconocimiento de voz de UN turno falla
 * (evento `onerror`, ej. silencio prolongado o permiso denegado): evita bucles
 * de reintento sobre un error persistente; el usuario puede tocar el
 * microfono de nuevo o reactivar manos libres.
 *
 * Requiere AMBAS capacidades (STT para escuchar Y TTS para responder en voz);
 * reusa exactamente `sttDisponible()`/`ttsDisponible()` (mismo patron de
 * deteccion que el boton de microfono normal y el toggle "Audio" ya
 * existentes, ver lib/chatbot/voz.ts) — no se duplica el chequeo de otra forma.
 */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import { responder } from "@/lib/chatbot/respuestas";
import {
  crearReconocedorVoz,
  detenerLectura,
  extraerTranscripcion,
  hablar,
  sttDisponible,
  ttsDisponible,
  type ReconocedorVoz,
} from "@/lib/chatbot/voz";

type ModoRespuesta = "texto" | "audio";

interface MensajeChat {
  id: string;
  autor: "usuario" | "bot";
  texto: string;
}

/** Genera un id de mensaje sin depender de crypto.randomUUID (algunos navegadores viejos no lo tienen). */
let contadorMensajes = 0;
function idMensaje(): string {
  contadorMensajes += 1;
  return `msg-${Date.now()}-${contadorMensajes}`;
}

export default function ChatbotWidget() {
  const { idioma, t } = useI18n();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [entradaTexto, setEntradaTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [modo, setModo] = useState<ModoRespuesta>("texto");
  const [escuchando, setEscuchando] = useState(false);
  const [errorVoz, setErrorVoz] = useState(false);
  // Modo "manos libres" (ver comentario de cabecera del componente).
  const [manosLibres, setManosLibres] = useState(false);

  // Soporte de navegador: se calcula una sola vez en el cliente (evita
  // desajuste de hidratacion SSR/CSR, ya que en el servidor no hay `window`).
  const [puedeStt, setPuedeStt] = useState(false);
  const [puedeTts, setPuedeTts] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const mensajesRef = useRef<HTMLDivElement>(null);
  const reconocedorRef = useRef<ReconocedorVoz | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref espejo de `manosLibres`: los callbacks de `hablar()`/`reconocedor` se
  // crean en el momento de iniciar esa lectura/escucha y pueden ejecutarse
  // varios turnos despues — leer el STATE ahi capturaria el valor de ESE
  // render (stale closure) si el usuario desactivo manos libres mientras
  // tanto. La ref siempre tiene el valor mas reciente.
  const manosLibresRef = useRef(false);

  useEffect(() => {
    setPuedeStt(sttDisponible());
    setPuedeTts(ttsDisponible());
  }, []);

  useEffect(() => {
    manosLibresRef.current = manosLibres;
  }, [manosLibres]);

  // Cerrar el panel apaga manos libres (y cualquier escucha/lectura en curso):
  // no tiene sentido seguir escuchando por el microfono con el chat cerrado.
  useEffect(() => {
    if (!abierto && manosLibresRef.current) {
      setManosLibres(false);
      reconocedorRef.current?.abort();
      detenerLectura();
    }
  }, [abierto]);

  // Si el navegador no soporta lectura en voz alta, el modo "audio" no tiene
  // sentido (no habria nada distinto que hacer con el) — se fuerza "texto".
  useEffect(() => {
    if (!puedeTts && modo === "audio") setModo("texto");
  }, [puedeTts, modo]);

  // Mensaje de bienvenida la primera vez que se abre el panel.
  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([{ id: idMensaje(), autor: "bot", texto: t("chatbot.bienvenida") }]);
    }
    // Solo debe dispararse al abrir, no en cada cambio de idioma/t.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Autoscroll al ultimo mensaje / indicador de "pensando".
  useEffect(() => {
    mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pensando]);

  // Cerrar con click fuera del panel (mismo patron que NotificacionesPanel).
  useEffect(() => {
    if (!abierto) return;
    function manejarClicFuera(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, [abierto]);

  // Limpieza al desmontar: no dejar timers ni lectura de voz colgando.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      reconocedorRef.current?.abort();
      detenerLectura();
    };
  }, []);

  function manejarEnviar(mensajeCrudo: string) {
    const texto = mensajeCrudo.trim();
    if (!texto || pensando) return;

    setMensajes((prev) => [...prev, { id: idMensaje(), autor: "usuario", texto }]);
    setEntradaTexto("");
    setPensando(true);

    // Demora SIMULADA (no hay ninguna llamada de red real detras de esto) para
    // dar sensacion de "el bot esta pensando" antes de mostrar la respuesta.
    const demoraMs = 450 + Math.random() * 350;
    timeoutRef.current = setTimeout(() => {
      const respuesta = responder(texto, idioma);
      setMensajes((prev) => [...prev, { id: idMensaje(), autor: "bot", texto: respuesta }]);
      setPensando(false);
      // Manos libres implica leer la respuesta en voz alta SIEMPRE (sin eso
      // no habria forma de saber que responder sin mirar la pantalla), sin
      // importar el toggle Texto/Audio de arriba.
      if (modo === "audio" || manosLibresRef.current) {
        hablar(respuesta, idioma, () => {
          // Encadena el siguiente turno de escucha SOLO si manos libres sigue
          // activo en este momento (pudo haberse apagado mientras se leia).
          if (manosLibresRef.current) iniciarEscucha();
        });
      }
    }, demoraMs);
  }

  function manejarEnviarFormulario(e: React.FormEvent) {
    e.preventDefault();
    manejarEnviar(entradaTexto);
  }

  /**
   * Arranca UNA sesion de reconocimiento de voz (comun al boton de microfono
   * manual y al encadenado de manos libres, ver comentario de cabecera).
   * No hace nada si STT no esta soportado, ya se esta escuchando, o el bot
   * esta "pensando" (evita solaparse con la respuesta en curso).
   */
  function iniciarEscucha() {
    if (!puedeStt || pensando) return;

    const reconocedor = crearReconocedorVoz(idioma);
    if (!reconocedor) return;

    setErrorVoz(false);
    setEntradaTexto("");
    reconocedorRef.current = reconocedor;

    reconocedor.onresult = (evento) => {
      const { final, intermedio } = extraerTranscripcion(evento);
      if (final) {
        setEntradaTexto("");
        manejarEnviar(final);
      } else {
        setEntradaTexto(intermedio);
      }
    };
    reconocedor.onerror = () => {
      setErrorVoz(true);
      setEscuchando(false);
      // Deliberadamente SIN reintento automatico aqui (ver decision de diseno
      // en el comentario de cabecera): un error de reconocimiento (silencio
      // prolongado, permiso denegado, etc.) no debe convertirse en un bucle.
    };
    reconocedor.onend = () => {
      setEscuchando(false);
      reconocedorRef.current = null;
    };

    reconocedor.start();
    setEscuchando(true);
  }

  function alternarMicrofono() {
    if (!puedeStt) return;

    if (escuchando) {
      reconocedorRef.current?.stop();
      return;
    }

    iniciarEscucha();
  }

  /** Activa/desactiva el modo manos libres (ver comentario de cabecera del componente). */
  function alternarManosLibres() {
    if (!(puedeStt && puedeTts)) return;

    const siguiente = !manosLibres;
    setManosLibres(siguiente);

    if (!siguiente) {
      // Se desactiva: no dejar una escucha/lectura colgando de la sesion anterior.
      reconocedorRef.current?.abort();
      detenerLectura();
    } else if (!escuchando && !pensando) {
      // Se activa: arranca el primer turno de escucha de inmediato (tap unico
      // para iniciar la sesion, ver decision de diseno documentada arriba).
      iniciarEscucha();
    }
  }

  function manejarSugerencia(texto: string) {
    manejarEnviar(texto);
  }

  const mostrarSugerencias = abierto && mensajes.length <= 1 && !pensando;
  const sugerencias = [
    t("chatbot.sugerenciaReembolso"),
    t("chatbot.sugerenciaAgotado"),
    t("chatbot.sugerenciaJornada"),
    t("chatbot.sugerenciaNomina"),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? t("chatbot.botonCerrar") : t("chatbot.botonAbrir")}
        aria-expanded={abierto}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-ck-red text-white shadow-lg transition hover:brightness-110 sm:bottom-6 sm:right-6"
      >
        {abierto ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("chatbot.titulo")}
            className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-neutral-900 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[36rem] sm:w-96 sm:rounded-2xl sm:border sm:border-neutral-200 sm:shadow-2xl sm:dark:border-neutral-800"
          >
            <div className="flex min-h-[56px] items-center justify-between gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-ck-dark dark:text-neutral-100">
                  {t("chatbot.titulo")}
                </h2>
                <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                  {t("chatbot.demoAviso")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t("chatbot.botonCerrar")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg text-neutral-500 hover:bg-ck-cream dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                &times;
              </button>
            </div>

            <div
              className="flex items-center gap-1 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800"
              role="group"
              aria-label={t("chatbot.modoEtiqueta")}
            >
              <span className="mr-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {t("chatbot.modoEtiqueta")}
              </span>
              <button
                type="button"
                onClick={() => setModo("texto")}
                aria-pressed={modo === "texto"}
                className={`min-h-[32px] rounded-full px-3 text-xs font-bold transition ${
                  modo === "texto"
                    ? "bg-ck-red text-white"
                    : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {t("chatbot.modoTexto")}
              </button>
              <button
                type="button"
                onClick={() => puedeTts && setModo("audio")}
                aria-pressed={modo === "audio"}
                disabled={!puedeTts}
                title={puedeTts ? undefined : t("chatbot.ttsNoSoportado")}
                className={`min-h-[32px] rounded-full px-3 text-xs font-bold transition ${
                  modo === "audio"
                    ? "bg-ck-red text-white"
                    : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
                } ${!puedeTts ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {t("chatbot.modoAudio")}
              </button>

              {/* Modo manos libres: solo tiene sentido si el navegador soporta
                  STT (para escuchar); si ademas no soporta TTS, se muestra
                  deshabilitado con el mismo mensaje que ya usa el boton
                  "Audio" de arriba (reusa `puedeTts`, no duplica el chequeo). */}
              {puedeStt && (
                <button
                  type="button"
                  onClick={alternarManosLibres}
                  aria-pressed={manosLibres}
                  aria-label={manosLibres ? t("chatbot.manosLibresDesactivar") : t("chatbot.manosLibresActivar")}
                  disabled={!puedeTts}
                  title={puedeTts ? undefined : t("chatbot.ttsNoSoportado")}
                  className={`ml-auto min-h-[32px] rounded-full px-3 text-xs font-bold transition ${
                    manosLibres
                      ? "bg-ck-red text-white"
                      : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
                  } ${!puedeTts ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {t("chatbot.manosLibres")}
                </button>
              )}
            </div>

            <div ref={mensajesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {mensajes.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.autor === "usuario" ? "items-end" : "items-start"}`}>
                  <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {m.autor === "usuario" ? t("chatbot.tu") : t("chatbot.asistente")}
                  </span>
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      m.autor === "usuario"
                        ? "bg-ck-red text-white"
                        : "bg-ck-cream text-ck-dark dark:bg-neutral-800 dark:text-neutral-100"
                    }`}
                  >
                    {m.texto}
                  </p>
                </div>
              ))}

              {pensando && (
                <div className="flex flex-col items-start">
                  <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {t("chatbot.asistente")}
                  </span>
                  <p className="flex items-center gap-1 rounded-2xl bg-ck-cream px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <span aria-hidden="true" className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                    </span>
                    <span className="sr-only">{t("chatbot.pensando")}</span>
                  </p>
                </div>
              )}

              {mostrarSugerencias && (
                <div className="pt-1">
                  <p className="mb-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {t("chatbot.sugerenciasTitulo")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => manejarSugerencia(s)}
                        className="min-h-[32px] rounded-full border border-neutral-300 px-2.5 text-xs text-neutral-600 hover:bg-ck-cream dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!puedeStt && (
              <p className="border-t border-neutral-200 px-4 pt-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                {t("chatbot.sttNoSoportado")}
              </p>
            )}
            {errorVoz && (
              <p className="px-4 pt-2 text-[11px] text-ck-red">{t("chatbot.errorVoz")}</p>
            )}
            {manosLibres && !escuchando && !pensando && (
              <p className="px-4 pt-2 text-[11px] font-semibold text-ck-red">{t("chatbot.manosLibresActivo")}</p>
            )}
            {escuchando && (
              <p className="px-4 pt-2 text-[11px] font-semibold text-ck-red">{t("chatbot.escuchando")}</p>
            )}

            <form onSubmit={manejarEnviarFormulario} className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
              {puedeStt && (
                <button
                  type="button"
                  onClick={alternarMicrofono}
                  aria-label={escuchando ? t("chatbot.microfonoDetener") : t("chatbot.microfono")}
                  aria-pressed={escuchando}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
                    escuchando
                      ? "bg-ck-red text-white"
                      : "text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}

              <input
                type="text"
                value={entradaTexto}
                onChange={(e) => setEntradaTexto(e.target.value)}
                placeholder={t("chatbot.placeholder")}
                aria-label={t("chatbot.placeholder")}
                className="min-h-[44px] flex-1 rounded-full border border-neutral-300 bg-white px-4 text-sm text-ck-dark outline-none focus:border-ck-red dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />

              <button
                type="submit"
                disabled={!entradaTexto.trim() || pensando}
                aria-label={t("chatbot.enviar")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ck-red text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M4 12l16-8-6 8 6 8-16-8Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
