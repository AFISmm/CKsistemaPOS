# Chicken Kitchen POS — DEMO funcional (Digenius)

> **AVISO IMPORTANTE — ESTO ES UNA DEMO DE VALIDACION FUNCIONAL, NO PRODUCCION.**
> La arquitectura aprobada (ver `docs/arquitectura.md`, ADR-0001/0002) es **hibrida
> hub-and-spoke** con un **Store Server local por tienda**, PostgreSQL, offline-first
> y fuera de la ruta critica de la nube. Eso **no es compatible con Vercel**
> (serverless, sin estado persistente ni LAN). Para esta demo se autorizo una
> **simplificacion**: una **unica app Next.js** desplegable en Vercel que simula el
> flujo completo (mostrador &rarr; KDS &rarr; cobro &rarr; descuento de inventario)
> usando **estado en memoria** (singleton sobre `globalThis`). Esta desviacion es
> deliberada y temporal; el diseno de produccion sigue siendo el de los ADR.

## Que es esta demo

App unica Next.js (App Router, TypeScript, Tailwind) que corre el flujo POS completo
de Chicken Kitchen con datos reales de marca/menu y datos DEMO de precios, recetas,
impuestos, pagos y hardware.

- Marca y menu reales de https://chickenkitchen.com (categorias CHOP-CHOP BOWLS,
  WRAPITO, SALADS, GRILLED BREAST MEALS, CHEESADILLA, KIDS, SIDES, DESSERTS, DRINKS,
  13 SIGNATURE SAUCES).
- Tienda piloto: Miami, FL (15738 SW 72nd Street).

## Correr localmente

```bash
npm install
npm run build   # verificacion de compilacion
npm run dev     # http://localhost:3000
```

Rutas: `/` (inicio) · `/pos` (cajero) · `/kds` (cocina) · `/reportes` (reportes).

## Mocks y datos DEMO — REEMPLAZAR ANTES DE PRODUCCION

| Area | Que es demo | Reemplazar por |
|------|-------------|----------------|
| **Persistencia** | Estado en memoria (`lib/db/store.ts`, globalThis). Se reinicia en cold starts de Vercel. | Store Server local + PostgreSQL (ADR-0002/0004). |
| **PSP / tarjeta** | PSP mock en memoria (`lib/payments/`) que simula autorizacion EMV y modo offline store-and-forward. | Integracion semi-integrada/P2PE con PSP real (ADR-0005). |
| **Hardware** | Impresora, cajon, lector EMV, escaner = stubs que loguean a consola (`lib/hardware/`). | Drivers ESC/POS reales, SDK EMV, etc. |
| **Impuestos** | Tasas DEMO: FL 7% (Miami-Dade), TX 8.25%. | Tasas confirmadas por finanzas (S-06/S-08). |
| **Precios y recetas** | DEMO razonables tipo fast-casual (el sitio no publica precios/recetas). | Precios y recetas oficiales de Chicken Kitchen. |
| **IDs** | UUID v4 (`crypto.randomUUID`). | UUID v7 ordenable (C-ID). |
| **Eventos en vivo** | Polling HTTP (KDS/CFD). | Bus WebSocket/NATS en LAN (ADR-0003). |
| **PIN / auth** | Hash de demo (`demo:1234`). | bcrypt/argon2 (S-10). |

## Disposicion de archivos (contrato de integracion)

```
/app                      rutas Next (UI + API)
  /pos                    UI cajero              [frontend-mostrador-kiosco-pos]
  /kds                    UI cocina              [kds-cocina-pos]
  /reportes               UI reportes            [reportes-analitica-pos, fase 3]
  /api/v1/...             route handlers REST    (ver dueno por recurso)
/lib
  /domain/types.ts        contrato de tipos      [orquestador]  (no editar firmas)
  /db/store.ts            almacen en memoria     [orquestador]  (no redefinir colecciones)
  /data/catalog.ts        semilla de catalogo    [menu-inventario-pos]
  /inventory/*            logica de inventario   [menu-inventario-pos]
  /sales/*                motor de ticket/total  [backend-ventas-pos]
  /payments/*             PSP mock + pagos       [pagos-pos]
  /kitchen/*              estado de cocina       [kds-cocina-pos]
  /hardware/*             stubs de perifericos   [hardware-perifericos-pos, fase 3]
/public/cropped-Logo.webp logo real de marca
```

Reglas: dinero en **centavos enteros**; nombres del modelo en espanol (C-NOMBRES);
`backend-ventas` es el **unico** que calcula total/impuesto/saldo.
