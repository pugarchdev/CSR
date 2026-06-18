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
          50: '#0f172a',  // Inverted text
          100: '#1e293b', // Inverted text
          200: '#334155', // Inverted text
          300: '#475569',
          400: '#57667a',
          450: '#57667a',
          455: '#57667a',
          500: '#64748b',
          550: '#94a3b8',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0', // Inverted border
          850: '#cbd5e1', // Inverted border
          855: '#cbd5e1',
          900: '#ffffff', // Inverted card bg
          950: '#f8fafc', // Inverted main bg
          955: '#f1f5f9', // Inverted header bg
        },
        zinc: {
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          800: '#e2e8f0',
          900: '#ffffff',
          955: '#f1f5f9',
          950: '#f8fafc',
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
