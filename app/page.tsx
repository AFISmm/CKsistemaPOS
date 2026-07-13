"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";

export default function Home() {
  const { t } = useI18n();

  const tiles = [
    { href: "/pos", titulo: t("home.tilePosTitulo"), desc: t("home.tilePosDesc") },
    { href: "/kds", titulo: t("home.tileKdsTitulo"), desc: t("home.tileKdsDesc") },
    { href: "/reportes", titulo: t("home.tileReportesTitulo"), desc: t("home.tileReportesDesc") },
    { href: "/empleados", titulo: t("home.tileEmpleadosTitulo"), desc: t("home.tileEmpleadosDesc") },
    { href: "/nomina", titulo: t("home.tileNominaTitulo"), desc: t("home.tileNominaDesc") },
  ];

  return (
    <main className="pos-notouch relative min-h-screen overflow-hidden">
      {/* Foto del local + degradado de marca: ver components/shell/FondoFoto.tsx
          para el mecanismo compartido (foto + overlay + z-index explicitos).
          Esta pantalla usa la variante "landing" (overlay mas ligero, deja
          ver mas la foto) que fue la original validada visualmente aqui;
          las demas paginas de negocio usan la variante "denso". */}
      <FondoFoto intensidad="landing" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:bg-neutral-900/90">
            <Image
              src="/cropped-Logo.webp"
              alt="Chicken Kitchen"
              width={220}
              height={90}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md dark:text-neutral-100">
            {t("home.titulo")}
          </h1>
          <p className="max-w-xl text-center text-sm text-white/90 drop-shadow-md dark:text-neutral-200">
            {t("home.descripcion")}
          </p>
        </div>
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-lg backdrop-blur-sm transition hover:border-ck-gold hover:bg-white hover:shadow-xl dark:border-neutral-700/60 dark:bg-neutral-900/90 dark:hover:bg-neutral-900"
            >
              <div className="text-lg font-semibold text-ck-red">{tile.titulo}</div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{tile.desc}</div>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-xs text-white/80 drop-shadow-md dark:text-neutral-400">
          {t("home.footer")}
        </p>
      </div>
    </main>
  );
}
