/**
 * Registro del Service Worker del terminal de cajero — F1-T3
 * (DUENO: frontend-mostrador-kiosco-pos). Ver public/sw.js para la
 * estrategia de cache del app shell y la explicacion de por que /api/** (el
 * catalogo) queda fuera del SW (se cachea en IndexedDB, ver lib/offline/db.ts).
 *
 * Se registra SOLO desde las paginas del terminal de cajero (app/pos/page.tsx,
 * app/pos/nuevo/page.tsx via lib/offline/useEstadoSync.ts), no desde el
 * layout raiz de toda la app: esta tarea es resiliencia offline del MOSTRADOR,
 * no una PWA-wide de todo el sistema (kds/nomina/empleados quedan fuera de
 * alcance, ver reporte de la tarea).
 */

let intentoDeRegistro = false;

export function registrarServiceWorker(): void {
  if (intentoDeRegistro) return;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  intentoDeRegistro = true;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si el registro falla (ej. entorno sin soporte, o dev server sin
      // HTTPS/localhost), la app sigue funcionando igual: el SW es una
      // mejora progresiva, no una dependencia dura del flujo de venta.
    });
  });
}
