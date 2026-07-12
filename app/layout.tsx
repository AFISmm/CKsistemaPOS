import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import AppShell from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Chicken Kitchen POS — DEMO",
  description:
    "Demo funcional del sistema POS de Chicken Kitchen (Digenius). No es la arquitectura de produccion.",
};

// lang="en" porque el idioma por defecto del shell (i18n, ver
// lib/shell/I18nProvider.tsx) es ingles en la primera carga; el atributo se
// actualiza en caliente desde el cliente al cambiar de idioma.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
