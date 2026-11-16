import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fde6e6",
          200: "#fbd0d0",
          300: "#f7a8a8",
          400: "#f17676",
          500: "#e94560",
          600: "#d6234a",
          700: "#b41a3d",
          800: "#961938",
          900: "#801936",
          950: "#470818",
        },
        navy: {
          50: "#f0f1f8",
          100: "#dde0ef",
          200: "#c2c6e1",
          300: "#9ba2cd",
          400: "#7279b5",
          500: "#535a9e",
          600: "#434885",
          700: "#393d6c",
          800: "#33365a",
          900: "#2d304d",
          950: "#1a1a2e",
        },
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Source Serif Pro", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
