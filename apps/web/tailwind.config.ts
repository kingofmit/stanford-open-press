import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stanford Identity: Primary Colors
        cardinal: {
          DEFAULT: "#8C1515",
          light: "#B83A4B",
          dark: "#820000",
        },
        // Stanford Identity: Digital Interactive Colors
        "digital-red": {
          DEFAULT: "#B1040E",
          light: "#E50808",
          dark: "#820000",
        },
        "digital-blue": {
          DEFAULT: "#006CB8",
          light: "#6FC3FF",
          dark: "#00548F",
        },
        "digital-green": {
          DEFAULT: "#008566",
          light: "#1AECBA",
          dark: "#006F54",
        },
        // Stanford Identity: Neutrals
        "su-black": "#2E2D29",
        "cool-grey": "#53565A",
        fog: "#DAD7CB",
        stone: "#7F7776",
        // Stanford Accent Colors (selected)
        "palo-alto": "#175E54",
        "palo-verde": "#279989",
        poppy: "#E98300",
        plum: "#620059",
        // Backwards-compat aliases used across components
        brand: {
          50: "#fef2f4",
          100: "#fde3e7",
          200: "#fcccd4",
          300: "#f9a2b0",
          400: "#f26e84",
          500: "#B1040E",
          600: "#8C1515",
          700: "#820000",
          800: "#6B0F0F",
          900: "#5A1018",
          950: "#2F050A",
        },
        navy: {
          50: "#f5f5f5",
          100: "#e8e8e7",
          200: "#d4d3d1",
          300: "#b5b4b1",
          400: "#908f8c",
          500: "#7F7776",
          600: "#53565A",
          700: "#43423F",
          800: "#383734",
          900: "#2E2D29",
          950: "#1a1917",
        },
      },
      fontFamily: {
        heading: ["var(--font-source-sans)", '"Source Sans 3"', '"Source Sans Pro"', "sans-serif"],
        body: ["var(--font-source-serif)", '"Source Serif 4"', '"Source Serif Pro"', "Georgia", "serif"],
        sans: ["var(--font-source-sans)", '"Source Sans 3"', '"Source Sans Pro"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
