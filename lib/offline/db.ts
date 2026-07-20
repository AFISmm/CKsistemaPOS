/**
 * Capa de IndexedDB del terminal de cajero offline-first — F1-T3
 * (DUENO: frontend-mostrador-kiosco-pos). Ver docs/arquitectura.md §2.1/§3/§9.6.
 *
 * Dos almacenes, tal como pide el ticket:
 *   - `catalogoCache`: ultima respuesta OK de GET /api/v1/catalogo + timestamp.
 *     Se usa como fallback cuando la red falla, para que el cajero pueda
 *     seguir tomando pedidos (ver components/pos/api.ts `obtenerCatalogo`).
 *   - `colaEscritura`: cola de escrituras (POST/PATCH/DELETE) que fallaron por
 *     error de red. Cada entrada es
 *     { id (uuid v7), metodo, url, cuerpo, creadoEn, intentos }.
 *     El propio `id` v7 (ordenable por tiempo) determina el orden de
 *     reproduccion (ver lib/offline/queue.ts `drenarCola`), sin necesitar un
 *     indice adicional por fecha.
 *
 * Sin dependencias nuevas (nada de Dexie): usa la API nativa `indexedDB`.
 * Para que este mismo modulo sea usable fuera del navegador (SSR de Next.js,
 * y las pruebas unitarias en Node sin `indexedDB`), cae automaticamente a un
 * almacen en memoria (`Map`) cuando `indexedDB` no existe en el entorno. Esto
 * ademas es justo lo que hace testeable la logica de cola (lib/offline/queue.ts)
 * con Vitest en Node sin necesitar un shim/dependencia extra (ej. fake-indexeddb):
 * en Node cae al Map, que se comporta igual para efectos de orden/CRUD.
 * Limitacion conocida de ese fallback: no persiste entre recargas (solo pasa
 * en navegadores sin IndexedDB, un caso hoy extremadamente raro).
 */

export interface CatalogoCacheEntry<T = unknown> {
  datos: T;
  guardadoEn: string; // ISO-8601
}

export interface EscrituraEncolada {
  id: string;
  metodo: string;
  url: string;
  cuerpo: unknown;
  creadoEn: string; // ISO-8601
  intentos: number;
}

const NOMBRE_DB = "ck-pos-offline";
const VERSION_DB = 1;
const ALMACEN_CATALOGO = "catalogoCache";
const ALMACEN_COLA = "colaEscritura";
const CLAVE_CATALOGO = "actual";

function hayIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

// ---------------------------------------------------------------------------
// Fallback en memoria (SSR / entorno de pruebas sin `indexedDB`)
// ---------------------------------------------------------------------------

const memoriaCatalogo = new Map<string, CatalogoCacheEntry>();
const memoriaCola = new Map<string, EscrituraEncolada>();

// ---------------------------------------------------------------------------
// Apertura de la base (solo camino navegador)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, VERSION_DB);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ALMACEN_CATALOGO)) {
        db.createObjectStore(ALMACEN_CATALOGO);
      }
      if (!db.objectStoreNames.contains(ALMACEN_COLA)) {
        db.createObjectStore(ALMACEN_COLA, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function conAlmacen<T>(
  nombre: string,
  modo: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return abrirDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(nombre, modo);
        const store = tx.objectStore(nombre);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ---------------------------------------------------------------------------
// catalogoCache
// ---------------------------------------------------------------------------

export async function guardarCatalogoCache<T>(datos: T): Promise<void> {
  const entrada: CatalogoCacheEntry<T> = { datos, guardadoEn: new Date().toISOString() };
  if (!hayIndexedDb()) {
    memoriaCatalogo.set(CLAVE_CATALOGO, entrada as CatalogoCacheEntry);
    return;
  }
  await conAlmacen(ALMACEN_CATALOGO, "readwrite", (store) =>
    store.put(entrada, CLAVE_CATALOGO)
  );
}

export async function obtenerCatalogoCache<T>(): Promise<CatalogoCacheEntry<T> | null> {
  if (!hayIndexedDb()) {
    return (memoriaCatalogo.get(CLAVE_CATALOGO) as CatalogoCacheEntry<T> | undefined) ?? null;
  }
  const resultado = await conAlmacen<CatalogoCacheEntry<T> | undefined>(
    ALMACEN_CATALOGO,
    "readonly",
    (store) => store.get(CLAVE_CATALOGO)
  );
  return resultado ?? null;
}

// ---------------------------------------------------------------------------
// colaEscritura
// ---------------------------------------------------------------------------

export async function agregarACola(entrada: EscrituraEncolada): Promise<void> {
  if (!hayIndexedDb()) {
    memoriaCola.set(entrada.id, entrada);
    return;
  }
  await conAlmacen(ALMACEN_COLA, "readwrite", (store) => store.put(entrada));
}

export async function actualizarEntradaCola(entrada: EscrituraEncolada): Promise<void> {
  return agregarACola(entrada);
}

export async function eliminarDeCola(id: string): Promise<void> {
  if (!hayIndexedDb()) {
    memoriaCola.delete(id);
    return;
  }
  await conAlmacen(ALMACEN_COLA, "readwrite", (store) => store.delete(id));
}

/** Lista la cola ordenada por `id` ascendente (uuid v7 => orden cronologico). */
export async function listarCola(): Promise<EscrituraEncolada[]> {
  let items: EscrituraEncolada[];
  if (!hayIndexedDb()) {
    items = Array.from(memoriaCola.values());
  } else {
    items = await conAlmacen<EscrituraEncolada[]>(ALMACEN_COLA, "readonly", (store) =>
      store.getAll()
    );
  }
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export async function contarPendientes(): Promise<number> {
  if (!hayIndexedDb()) return memoriaCola.size;
  return conAlmacen<number>(ALMACEN_COLA, "readonly", (store) => store.count());
}

/** Utilidad de pruebas: vacia ambos almacenes (memoria e IndexedDB si aplica). */
export async function _reiniciarParaPruebas(): Promise<void> {
  memoriaCatalogo.clear();
  memoriaCola.clear();
  if (hayIndexedDb()) {
    await conAlmacen(ALMACEN_CATALOGO, "readwrite", (store) => store.clear());
    await conAlmacen(ALMACEN_COLA, "readwrite", (store) => store.clear());
  }
}
