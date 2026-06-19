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
          navy: "#0b2e4a",
          blue: "#12325a",
          saffron: "#d97706",
          green: "#166534",
          mist: "#f5f7fb",
          line: "#d7dee8",
          ink: "#102033",
          muted: "#5b6b80",
        },
        primary: {
          DEFAULT: "#1e3a8a", // Navy Blue
          dark: "#172554",
          light: "#3b82f6"
        },
        accent: {
          DEFAULT: "#f97316", // Saffron
          glow: "#ea580c",
          blue: "#1d4ed8"
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
          50: '#fff7ed', // Mapped to orange/saffron tints
          100: '#ffedd5',
          400: '#fdba74',
          450: '#f97316',
          500: '#f97316', // Saffron
          550: '#f97316',
          600: '#ea580c', // Darker Saffron
          650: '#d97706',
          700: '#c2410c',
          750: '#9a3412',
        },
        indigo: {
          50: '#eff6ff', // Mapped to navy blue tints
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          650: '#1e40af', // Navy Blue
          700: '#1e3a8a',
          750: '#172554',
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"]
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(15, 23, 42, 0.05)",
        neon: "0 4px 15px rgba(249, 115, 22, 0.12)",
        "neon-pink": "0 4px 15px rgba(30, 58, 138, 0.12)"
      }
    },
  },
  plugins: [],
};
