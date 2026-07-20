/**
 * Arranque del drenado automatico de la cola offline — F1-T3
 * (DUENO: frontend-mostrador-kiosco-pos).
 *
 * El evento `online` del navegador NO es 100% confiable (ver MDN: en algunas
 * plataformas se dispara con falsos positivos, ej. al reconectar a un router
 * sin salida real a internet, o no se dispara en absoluto en ciertos casos).
 * Por eso, ademas de escuchar `online`, este modulo arma un temporizador
 * periodico de respaldo que reintenta el drenado igual (`drenarCola` es
 * barato/no-op si la cola esta vacia).
 *
 * Idempotente: llamar `iniciarAutoDrenado()` varias veces (ej. si /pos y
 * /pos/nuevo montan el mismo hook) no crea listeners/temporizadores duplicados.
 */

import { drenarCola } from "./queue";

const INTERVALO_REINTENTO_MS = 15_000;

let iniciado = false;

export function iniciarAutoDrenado(): void {
  if (iniciado) return;
  if (typeof window === "undefined") return; // SSR: nada que hacer
  iniciado = true;

  window.addEventListener("online", () => {
    void drenarCola();
  });

  setInterval(() => {
    void drenarCola();
  }, INTERVALO_REINTENTO_MS);

  // Intento inmediato por si ya hay red al montar (ej. escrituras que se
  // encolaron en una sesion anterior y quedaron pendientes en IndexedDB).
  void drenarCola();
}
