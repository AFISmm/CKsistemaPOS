import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca Chicken Kitchen (demo). Actualizada a pedido del
        // dueno de producto: naranja/amarillo, sin rojo. Se mantiene el
        // nombre de token `ck.red` (usado en decenas de archivos) mas su
        // VALOR cambio a naranja, para no tener que renombrar la clase en
        // todo el proyecto. `ck.gold` paso de dorado apagado a un amarillo
        // mas vivo para reforzar la combinacion naranja+amarillo.
        // Nota: el rojo estandar de Tailwind (`red-*`, ej. `text-red-700`,
        // `bg-red-50`) SI se conserva para estados de error/peligro
        // (validaciones, "Dar de baja"): es una convencion de UX distinta
        // del color de marca, no una referencia a `ck.red`.
        ck: {
          red: "#EA580C", // antes #c8102e (rojo) -> ahora naranja (color de marca principal)
          dark: "#1a1a1a",
          cream: "#f7f3ec",
          gold: "#EAB308", // antes #d4a017 (dorado apagado) -> ahora amarillo vivo (acento)
        },
      },
    },
  },
  plugins: [],
};

export default config;
