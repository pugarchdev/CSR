/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        gov: {
          navy: "#0d1c3a",
          blue: "#14274e",
          saffron: "#f7941d",
          green: "#43a047",
          mist: "#f4f5f7",
          line: "#e0e4ea",
          ink: "#333333",
          muted: "#6b7280",
        },
        primary: {
          DEFAULT: "#14274e", // National portal navy
          dark: "#0d1c3a",
          light: "#1789d6"
        },
        accent: {
          DEFAULT: "#f7941d", // Portal saffron/orange
          glow: "#e07f00",
          blue: "#1789d6"
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
          955: "#f1f5f9",
        },
        zinc: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
          955: "#f4f4f5",
        },
        violet: {
          50: '#fef6ea', // Mapped to portal saffron tints
          100: '#fdeacd',
          400: '#fab55e',
          450: '#f7941d',
          500: '#f7941d', // Portal saffron
          550: '#f7941d',
          600: '#e07f00', // Darker saffron
          650: '#c96f00',
          700: '#a95d00',
          750: '#7f4600',
        },
        indigo: {
          50: '#e3f0fa', // Mapped to portal navy/blue tints
          100: '#c4ddf2',
          400: '#4aa3e0',
          500: '#1789d6',
          600: '#146fb0',
          650: '#1a3563',
          700: '#14274e',
          750: '#0d1c3a',
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"]
      },
      boxShadow: {
        // Flat design system — shadows disabled, borders convey elevation
        glass: "none",
        neon: "none",
        "neon-pink": "none"
      }
    },
  },
  plugins: [],
};
