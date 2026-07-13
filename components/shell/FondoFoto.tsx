"use client";

import Image from "next/image";

interface FondoFotoProps {
  /**
   * "landing": overlay ligero (deja ver bastante la foto), usado en la
   * pantalla de Inicio (app/page.tsx), pensada para verse como una portada.
   * "denso" (default): overlay mucho mas opaco, pensado para paginas de
   * negocio con tablas/formularios densos (POS, KDS, Reportes, Empleados,
   * Nomina): la foto solo se insinua en los espacios alrededor de las
   * tarjetas/tablas, que mantienen su propio fondo solido — la legibilidad
   * de esos datos manda sobre la estetica ahi.
   */
  intensidad?: "landing" | "denso";
}

/**
 * Capa de fondo compartida (foto del local + degradado de marca encima para
 * que el texto siga siendo legible). Patron ORIGINAL validado visualmente en
 * la pantalla de Inicio (app/page.tsx) — este componente solo lo encapsula
 * para poder reutilizarlo en el resto de los modulos (POS, KDS, Reportes,
 * Empleados, Nomina) sin duplicar el markup.
 *
 * IMPORTANTE — z-index EXPLICITO (z-0 en esta capa, z-10 en el contenido que
 * la envuelve), NUNCA negativo: con z-index negativo esta capa terminaba
 * pintandose detras del fondo solido (bg-ck-cream / dark:bg-neutral-950) del
 * layout exterior (components/shell/AppShell.tsx no crea su propio contexto
 * de apilamiento), y la foto quedaba practicamente invisible. No reintroduzcas
 * ese bug.
 *
 * Uso esperado en cada pagina consumidora:
 *   <main className="relative min-h-screen overflow-hidden ...">
 *     <FondoFoto intensidad="denso" />
 *     <div className="relative z-10 ...">... contenido real ...</div>
 *   </main>
 */
export default function FondoFoto({ intensidad = "denso" }: FondoFotoProps) {
  const overlay =
    intensidad === "landing"
      ? "bg-gradient-to-b from-ck-dark/70 via-ck-red/35 to-ck-dark/75 dark:from-black/80 dark:via-ck-red/35 dark:to-black/85"
      : "bg-ck-cream/90 dark:bg-neutral-950/95";

  return (
    <div className="absolute inset-0 z-0">
      <Image src="/LOGOchickenkitchen.webp" alt="" fill priority className="object-cover" />
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  );
}
