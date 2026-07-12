/**
 * Motor de respuestas del chatbot de ayuda — DUENO: shell de UI (etapa 3 de 3
 * de este proyecto).
 *
 * ============================================================================
 * DEMO: esto es un motor de REGLAS/PALABRAS CLAVE simple (matching de
 * substrings normalizados), NO un modelo de lenguaje real. En PRODUCCION esto
 * se reemplazaria por una llamada real a un LLM (ej. Claude via Anthropic API,
 * ver claude-api en el equipo de Digenius) con contexto del sistema POS
 * (manual, permisos del usuario, historial de la conversacion, etc.) para dar
 * respuestas mas ricas y manejar preguntas fuera de este catalogo fijo.
 * ============================================================================
 *
 * Cubre las preguntas tipicas de un cajero/empleado de mostrador listadas en
 * el requisito de negocio de esta etapa: reembolso, marcar producto agotado
 * (86), abrir/cerrar turno de caja, registrar jornada (entrada/salida), alta
 * de empleado, generar nomina, cambiar idioma, cambiar modo oscuro. Se agrego
 * un tema extra (reportes) por ser una pregunta razonable del mismo publico.
 *
 * `responder()` NO depende de React ni de APIs de navegador: es logica pura,
 * facil de probar con casos simples (ver ejemplos abajo). La UI
 * (components/shell/ChatbotWidget.tsx) es quien la invoca y decide si ademas
 * lee la respuesta en voz alta.
 */

import type { Idioma } from "@/lib/shell/I18nProvider";

interface Intencion {
  id: string;
  /** Palabras/frases clave (ES + EN mezcladas) que disparan esta intencion. */
  palabrasClave: string[];
  respuesta: Record<Idioma, string>;
}

/** Minusculas + sin acentos, para que el matching no dependa de tildes/mayusculas. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function coincideAlgunaPalabra(textoNormalizado: string, palabrasClave: string[]): boolean {
  return palabrasClave.some((palabra) => textoNormalizado.includes(normalizar(palabra)));
}

/**
 * Catalogo de intenciones. El ORDEN importa: se evalua de arriba hacia abajo y
 * gana la primera que haga match, asi que las frases mas especificas van
 * primero y la intencion generica de "ayuda/menu" queda casi al final (justo
 * antes del fallback), para no "robarle" el match a temas especificos cuando
 * el usuario combina palabras (ej. "necesito ayuda con un reembolso").
 */
const INTENCIONES: Intencion[] = [
  {
    id: "reembolso",
    palabrasClave: ["reembolso", "reembolsar", "devolucion", "devolver el dinero", "refund"],
    respuesta: {
      es: "Para hacer un reembolso: en el ticket del pedido, abre el pago original del cliente y selecciona 'Reembolsar', indica el motivo y confirma. El sistema revierte el cobro; si tu tienda exige autorizacion del gerente, pidela antes de confirmar.",
      en: "To process a refund: open the customer's original payment on the order ticket, select 'Refund', enter a reason and confirm. The system reverses the charge; if your store requires manager approval, get it before confirming.",
    },
  },
  {
    id: "agotado86",
    palabrasClave: ["agotado", "86", "sin stock", "se acabo", "sold out", "out of stock"],
    respuesta: {
      es: "Para marcar un producto como agotado (86): en la pantalla de productos del POS busca la opcion '86' sobre ese producto y confirmala. Quedara atenuado y no se podra vender hasta que lo reactives cuando vuelva el stock.",
      en: "To mark a product as sold out (86): on the POS products screen, find the '86' option on that item and confirm it. It will show dimmed and can't be sold until you re-enable it once stock is back.",
    },
  },
  {
    id: "turnoCaja",
    palabrasClave: [
      "turno de caja",
      "abrir turno",
      "cerrar turno",
      "abrir caja",
      "cerrar caja",
      "cierre z",
      "open shift",
      "close shift",
      "open register",
      "close register",
    ],
    respuesta: {
      es: "Para abrir tu turno de caja: inicia sesion en /pos al comienzo del dia; el sistema abre el turno con tu usuario y el monto inicial de caja. Para cerrarlo al final del dia: haz el cierre de turno (cierre Z), cuenta el efectivo fisico y comparalo contra lo que calculo el sistema.",
      en: "To open your cash register shift: sign in at /pos at the start of the day; the system opens the shift under your user with the starting cash amount. To close it at the end of the day: run the shift close (Z report), count the physical cash and compare it against what the system calculated.",
    },
  },
  {
    id: "jornada",
    palabrasClave: [
      "marcar entrada",
      "marcar salida",
      "mi jornada",
      "registrar mi jornada",
      "reloj checador",
      "clock in",
      "clock out",
      "clock-in",
      "time clock",
    ],
    respuesta: {
      es: "Para registrar tu jornada (entrada/salida): desde tu celular entra a /jornada/marcar, elige entrada o salida, completa la verificacion facial (simulada en esta demo) y escribe el codigo de 6 digitos que muestra la pantalla central de la tienda (/jornada/pantalla). Si la verificacion facial falla 3 veces, puedes usar tu PIN de respaldo.",
      en: "To clock in or out: on your phone go to /jornada/marcar, choose clock in or out, complete the facial verification (simulated in this demo) and enter the 6-digit code shown on the store's central screen (/jornada/pantalla). If facial verification fails 3 times, you can use your backup PIN.",
    },
  },
  {
    id: "altaEmpleado",
    palabrasClave: [
      "alta de empleado",
      "dar de alta",
      "doy de alta",
      "das de alta",
      "de alta",
      "nuevo empleado",
      "agregar empleado",
      "add employee",
      "new employee",
      "onboarding",
    ],
    respuesta: {
      es: "Para dar de alta un empleado: en /empleados crea el registro con sus datos personales, rol y tienda (queda en estado 'onboarding'). Luego completa el onboarding para asignarle PIN y activar su acceso de inicio de sesion.",
      en: "To add a new employee: in /empleados create the record with their personal details, role and store (it starts in 'onboarding' status). Then complete onboarding to assign a PIN and activate their login access.",
    },
  },
  {
    id: "nomina",
    palabrasClave: [
      "nomina",
      "genero la nomina",
      "generar nomina",
      "recibo de pago",
      "payroll",
      "generate payroll",
      "pay stub",
      "paystub",
    ],
    respuesta: {
      es: "Para generar la nomina: entra a /nomina, elige el periodo (semana) y genera el calculo. El sistema toma las jornadas registradas, separa horas regulares y extra, suma propinas y aplica la retencion, generando un recibo de pago por empleado.",
      en: "To generate payroll: go to /nomina, pick the pay period (week) and run the calculation. The system uses recorded clock-ins, splits regular vs. overtime hours, adds tips and applies withholding, producing a pay stub per employee.",
    },
  },
  {
    id: "idioma",
    palabrasClave: ["cambiar idioma", "cambio de idioma", "idioma", "change language", "language"],
    respuesta: {
      es: "Para cambiar el idioma: usa el selector EN/ES de la barra superior (arriba a la derecha). El cambio aplica de inmediato en toda la app.",
      en: "To change the language: use the EN/ES selector in the top bar (top right). The change applies immediately across the app.",
    },
  },
  {
    id: "modoOscuro",
    palabrasClave: ["modo oscuro", "modo claro", "tema oscuro", "tema claro", "dark mode", "light mode"],
    respuesta: {
      es: "Para cambiar entre modo claro y oscuro: usa el boton de sol/luna en la barra superior. Tu preferencia se guarda en este dispositivo.",
      en: "To switch between light and dark mode: use the sun/moon button in the top bar. Your preference is saved on this device.",
    },
  },
  {
    id: "reportes",
    palabrasClave: ["reporte", "reportes", "ventas del dia", "arqueo", "sales report"],
    respuesta: {
      es: "Para ver los reportes del dia (ventas, mix de productos, arqueo): entra a /reportes desde el menu lateral (disponible para el rol de gerente).",
      en: "To see the day's reports (sales, product mix, cash count): go to /reportes from the side menu (available to the manager role).",
    },
  },
  {
    id: "ayudaGeneral",
    palabrasClave: ["ayuda", "que puedes hacer", "what can you do", "help", "menu", "opciones"],
    respuesta: {
      es: "Puedo ayudarte con: reembolsos, marcar un producto agotado (86), abrir/cerrar turno de caja, registrar tu jornada (entrada/salida), dar de alta un empleado, generar la nomina, o cambiar el idioma/modo oscuro. Preguntame sobre cualquiera de esos temas.",
      en: "I can help with: refunds, marking a product sold out (86), opening/closing a cash register shift, clocking in/out, adding a new employee, generating payroll, or changing the language/dark mode. Ask me about any of those.",
    },
  },
];

const RESPUESTA_GENERICA: Record<Idioma, string> = {
  es: "No tengo una respuesta exacta para eso. Prueba con otra palabra clave (por ejemplo: reembolso, agotado, turno, jornada, empleado, nomina, idioma, modo oscuro) o consulta el manual del sistema.",
  en: "I don't have an exact answer for that. Try another keyword (for example: refund, sold out, shift, clock in, employee, payroll, language, dark mode) or check the system manual.",
};

/**
 * Devuelve la respuesta del motor de reglas para `mensajeUsuario`, en el
 * `idioma` activo de la app. El matching de palabras clave es bilingue (ES/EN
 * mezclado en cada intencion), asi que el usuario puede escribir en cualquiera
 * de los dos idiomas y aun asi obtiene la respuesta en el idioma de la app
 * (requisito de negocio: "debe respetar el idioma seleccionado en la app").
 */
export function responder(mensajeUsuario: string, idioma: Idioma): string {
  const textoNormalizado = normalizar(mensajeUsuario);
  if (!textoNormalizado) return RESPUESTA_GENERICA[idioma];

  for (const intencion of INTENCIONES) {
    if (coincideAlgunaPalabra(textoNormalizado, intencion.palabrasClave)) {
      return intencion.respuesta[idioma];
    }
  }
  return RESPUESTA_GENERICA[idioma];
}
