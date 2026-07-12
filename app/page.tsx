"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/shell/I18nProvider";

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
    <main className="pos-notouch min-h-screen bg-ck-cream flex flex-col items-center justify-center p-8">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image
          src="/cropped-Logo.webp"
          alt="Chicken Kitchen"
          width={220}
          height={90}
          priority
        />
        <h1 className="text-2xl font-bold text-ck-dark">{t("home.titulo")}</h1>
        <p className="max-w-xl text-center text-sm text-neutral-600">
          {t("home.descripcion")}
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-ck-red hover:shadow-md"
          >
            <div className="text-lg font-semibold text-ck-red">{tile.titulo}</div>
            <div className="mt-1 text-sm text-neutral-600">{tile.desc}</div>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-xs text-neutral-400">
        {t("home.footer")}
      </p>
    </main>
  );
}
