import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef8ff",
          100: "#d9edff",
          200: "#b6dcff",
          300: "#83c3ff",
          400: "#3796ff",
          500: "#0d75f9",
          600: "#0056d8",
          700: "#0045b0",
          800: "#00398f",
          900: "#032f72",
        },
        surface: {
          50: "#f8fafc",
          100: "#eef2f7",
          200: "#e0e7ef",
          300: "#c8d4e1",
          400: "#9fb6c9",
          500: "#7495ae",
          600: "#597292",
          700: "#455873",
          800: "#38455c",
          900: "#243041",
        },
      },
      boxShadow: {
        elegant: "0 30px 60px -15px rgb(15 23 42 / 0.25)",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.95)", opacity: "0.65" },
          "70%": { transform: "scale(1.5)", opacity: "0" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
