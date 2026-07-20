/**
 * Service Worker del terminal de cajero — F1-T3 (DUENO: frontend-mostrador-kiosco-pos).
 * Ver docs/arquitectura.md §2.1/§3/§9.6: la terminal PWA debe seguir cargando
 * (app shell: HTML/JS/CSS/imagenes) aunque no haya red.
 *
 * DECISION DE DISEÑO (documentada, ver tambien el reporte de la tarea): este
 * SW cachea el APP SHELL (paginas, bundles JS/CSS con hash, imagenes) con una
 * estrategia "cache-primero, refrescar en segundo plano" (stale-while-
 * revalidate). Deliberadamente NO intercepta ni cachea /api/** (incluido
 * /api/v1/catalogo): esos datos son mutables y con logica de negocio propia
 * (86 de productos, precios), y ya se cachean con mas control (TTL implicito
 * por "ultimo bueno conocido", lectura tipada) en IndexedDB desde la app
 * (ver lib/offline/db.ts `catalogoCache`, usado por components/pos/api.ts
 * `obtenerCatalogo`). Tener DOS caches independientes para lo mismo (Cache
 * Storage del SW + IndexedDB de la app) invitaria a inconsistencias sobre
 * cual es la version "buena" cuando ambas quedan desactualizadas a la vez;
 * al dejarlo fuera del SW hay una sola fuente de verdad para el catalogo
 * offline.
 *
 * Las ESCRITURAS (POST/PATCH/DELETE) nunca se tocan aqui: ese flujo
 * (encolar en `colaEscritura` + reproducir en orden) vive enteramente en
 * lib/offline/queue.ts, corriendo en el hilo de la app, no en el Service
 * Worker (mas simple de razonar y de probar con Vitest).
 */

const CACHE_NAME = "ck-pos-shell-v1";

// Rutas conocidas de antemano para pre-cachear en la instalacion (mejor
// esfuerzo: si alguna falla -ej. primera visita sin red todavia- no rompe la
// instalacion del resto). Los bundles JS/CSS con hash de Next.js se agregan
// solos al cache la primera vez que se piden (ver el handler de "fetch").
const RUTAS_PRECACHE = ["/pos", "/pos/nuevo", "/cropped-Logo.webp", "/LOGOchickenkitchen.webp"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(RUTAS_PRECACHE.map((ruta) => cache.add(ruta).catch(() => {}))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET: escrituras nunca pasan por el cache del SW (ver nota de
  // cabecera: la cola offline vive en lib/offline/queue.ts).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no interceptar terceros
  if (url.pathname.startsWith("/api/")) return; // datos: ver nota de cabecera

  event.respondWith(
    caches.match(request).then((respuestaCacheada) => {
      const desdeRed = fetch(request)
        .then((respuesta) => {
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => respuestaCacheada);

      // Cache-primero (respuesta instantanea si ya existe) + revalidacion en
      // segundo plano; sin cache previo, se espera la red (y si tampoco hay
      // red ni cache, la promesa se rechaza y el navegador maneja el error
      // de navegacion/recurso como lo haria sin Service Worker).
      return respuestaCacheada || desdeRed;
    })
  );
});
