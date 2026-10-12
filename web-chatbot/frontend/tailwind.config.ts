import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          DEFAULT: "#0A0A0C",
          800: "#151519",
          700: "#1C1D22",
          600: "#25262C",
          500: "#33353C",
        },
        gold: {
          DEFAULT: "#C9A24B",
          bright: "#E8C874",
          dim: "#8A6F33",
          50: "rgba(201, 162, 75, 0.08)",
        },
        silver: {
          DEFAULT: "#B9BDC6",
          text: "#9498A1",
          line: "#33353C",
        },
        paper: "#F2F0EA",
        ink: "#1B1C1E",
        "ink-soft": "#5B5D63",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.06)",
        panel: "0 24px 60px -12px rgba(0, 0, 0, 0.55)",
        fab: "0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(201, 162, 75, 0.25)",
      },
      borderRadius: {
        chat: "20px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        panelIn: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        breathe: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201, 162, 75, 0.28)" },
          "50%": { boxShadow: "0 0 0 8px rgba(201, 162, 75, 0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.35s ease-out",
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        panelIn: "panelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        breathe: "breathe 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
