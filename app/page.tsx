import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const tiles = [
    { href: "/pos", titulo: "Terminal de Cajero", desc: "Tomar y cobrar pedidos de mostrador" },
    { href: "/kds", titulo: "Pantalla de Cocina (KDS)", desc: "Ver y avanzar comandas" },
    { href: "/reportes", titulo: "Reportes del dia", desc: "Ventas, mix y arqueo (demo)" },
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
        <h1 className="text-2xl font-bold text-ck-dark">Sistema POS — DEMO</h1>
        <p className="max-w-xl text-center text-sm text-neutral-600">
          Demo funcional end-to-end (mostrador &rarr; cocina &rarr; cobro &rarr;
          inventario). Estado en memoria, PSP y hardware simulados. No es la
          arquitectura de produccion aprobada.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-ck-red hover:shadow-md"
          >
            <div className="text-lg font-semibold text-ck-red">{t.titulo}</div>
            <div className="mt-1 text-sm text-neutral-600">{t.desc}</div>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-xs text-neutral-400">
        Chicken Kitchen &middot; Tienda piloto: Miami, FL (15738 SW 72nd St)
      </p>
    </main>
  );
}
