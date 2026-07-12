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
        // Paleta de marca Chicken Kitchen (demo, aproximada a la identidad rojo/carbon)
        ck: {
          red: "#c8102e",
          dark: "#1a1a1a",
          cream: "#f7f3ec",
          gold: "#d4a017",
        },
      },
    },
  },
  plugins: [],
};

export default config;
