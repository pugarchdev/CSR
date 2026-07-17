/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ============================================
      // Color System
      // ============================================
      colors: {
        // Primary - Modern Blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#2563eb',
        },

        // Accent - Saffron/Orange
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f7941d',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#f7941d',
        },

        // Success - Green
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#43a047',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#43a047',
        },

        // Warning - Amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b',
        },

        // Danger - Red
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#c62828',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#c62828',
        },

        // Info - Blue
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1789d6',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#1789d6',
        },

        // Gray Scale
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },

        // Slate Scale
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },

        // Legacy gov colors for backwards compatibility
        gov: {
          navy: '#14274e',
          blue: '#14274e',
          saffron: '#f7941d',
          green: '#43a047',
          mist: '#f4f5f7',
          line: '#e0e4ea',
          ink: '#333333',
          muted: '#6b7280',
        },

        // Semantic colors
        background: '#f8fafc',
        foreground: '#0f172a',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#2563eb',

        // Glass colors
        glass: {
          white: 'rgba(255, 255, 255, 0.7)',
          border: 'rgba(255, 255, 255, 0.2)',
          hover: 'rgba(255, 255, 255, 0.85)',
        },
      },

      // ============================================
      // Typography
      // ============================================
      fontFamily: {
        sans: ['Inter', 'Poppins', 'Noto Sans', 'Noto Sans Devanagari', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'Poppins', 'sans-serif'],
      },

      fontSize: {
        '2xs': '0.625rem',  // 10px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
        '6xl': '3.75rem',   // 60px
        '7xl': '4.5rem',    // 72px
      },

      // ============================================
      // Spacing
      // ============================================
      spacing: {
        '4.5': '1.125rem',  // 18px
        '18': '4.5rem',     // 72px
        '22': '5.5rem',     // 88px
      },

      // ============================================
      // Border Radius
      // ============================================
      borderRadius: {
        'card': '14px',
        'glass': '16px',
        '4xl': '2rem',      // 32px
      },

      // ============================================
      // Shadows (Premium Elevation)
      // ============================================
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
        'md': '0 8px 20px -4px rgb(0 0 0 / 0.06), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
        'lg': '0 16px 32px -8px rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.04)',
        'xl': '0 24px 48px -12px rgb(0 0 0 / 0.12), 0 12px 24px -8px rgb(0 0 0 / 0.05)',
        '2xl': '0 32px 64px -16px rgb(0 0 0 / 0.16)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.04)',
        'none': 'none',
        // Premium glass & glow shadows
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 16px 48px 0 rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.15), 0 0 6px rgba(37, 99, 235, 0.1)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.15), 0 0 6px rgba(99, 102, 241, 0.1)',
        'elevation-1': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'elevation-2': '0 6px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)',
        'elevation-3': '0 16px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
      },

      // ============================================
      // Animation
      // ============================================
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1000': '1000ms',
      },

      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shimmerSweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(37, 99, 235, 0.1)' },
          '50%': { boxShadow: '0 0 25px rgba(37, 99, 235, 0.2)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'shimmer-sweep': 'shimmerSweep 1.5s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'spin': 'spin 1s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'count-up': 'countUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },

      // ============================================
      // Z-Index Scale
      // ============================================
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'fixed': '30',
        'drawer': '40',
        'modal-backdrop': '50',
        'modal': '60',
        'popover': '70',
        'tooltip': '80',
        'toast': '90',
      },

      // ============================================
      // Width & Height
      // ============================================
      width: {
        'sidebar': '280px',
        'sidebar-collapsed': '72px',
      },

      height: {
        'header': '64px',
        'header-mobile': '56px',
      },

      maxWidth: {
        '8xl': '88rem',    // 1408px
        '9xl': '96rem',    // 1536px
      },
    },
  },
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.tap-highlight-transparent': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        // Premium glass surface
        '.glass-surface': {
          'background': 'rgba(255, 255, 255, 0.7)',
          'backdrop-filter': 'blur(12px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(12px) saturate(180%)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        // Hover lift micro-interaction
        '.hover-lift': {
          'transition': 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            'transform': 'translateY(-4px)',
            'box-shadow': '0 16px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          },
        },
        // Focus ring for accessibility
        '.focus-ring': {
          '&:focus-visible': {
            'outline': 'none',
            'box-shadow': '0 0 0 3px rgba(37, 99, 235, 0.25)',
          },
        },
        // Gradient text utility
        '.gradient-text': {
          'background': 'linear-gradient(135deg, #2563eb, #7c3aed)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      });
    },
  ],
};
