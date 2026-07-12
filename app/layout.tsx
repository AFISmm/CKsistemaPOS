import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chicken Kitchen POS — DEMO",
  description:
    "Demo funcional del sistema POS de Chicken Kitchen (Digenius). No es la arquitectura de produccion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
