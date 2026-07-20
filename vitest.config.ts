import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Configuracion minima de Vitest — F1-T3 (DUENO: frontend-mostrador-kiosco-pos).
 *
 * Este repo no tenia runner de pruebas configurado (ver package.json antes de
 * esta tarea). Se elige Vitest por ser el que mejor integra con Next.js 14 +
 * TypeScript sin configuracion extra (entiende ESM/TS de inmediato, no
 * necesita babel/ts-jest).
 *
 * `lib/sales/__tests__/**` y `lib/kitchen/kds.test.ts` (DUENOS:
 * backend-ventas-pos / kds-pos respectivamente) quedan EXCLUIDOS a proposito:
 * esos archivos usan `import { test } from "node:test"` (el runner nativo de
 * Node, no Vitest) — importarlos desde Vitest hace que node:test registre y
 * corra sus propios tests por su cuenta (con su propio reporte TAP) por
 * fuera del ciclo de vida de Vitest, y Vitest los reporta como "sin pruebas"
 * en ese archivo (falso negativo: `No test suite found`), ademas de imprimir
 * doble salida confusa. Se confirmo el problema real corriendo
 * `npx vitest run` antes de agregar esta exclusion (ver reporte de la
 * tarea). Se corren tal cual con el runner nativo de Node (`node --test`) si
 * hace falta. Si esos modulos migran sus pruebas a Vitest en su propia
 * tarea, se puede quitar esta exclusion sin tocar nada de F1-T3.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      ".next/**",
      "lib/sales/__tests__/**",
      "lib/kitchen/kds.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
