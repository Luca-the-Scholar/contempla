import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'serif': ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        glow: {
          gold: "hsl(var(--glow-gold))",
          amber: "hsl(var(--glow-amber))",
          purple: "hsl(var(--glow-purple))",
          // Legacy names for compatibility
          blue: "hsl(var(--glow-blue))",
          orange: "hsl(var(--glow-orange))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        'glow-sm': '0 0 12px hsl(var(--glow-gold) / 0.15)',
        'glow-md': '0 4px 24px hsl(var(--glow-gold) / 0.2)',
        'glow-lg': '0 8px 48px hsl(var(--glow-gold) / 0.25)',
        'glow-gold-sm': '0 0 12px hsl(var(--glow-gold) / 0.15)',
        'glow-gold-md': '0 4px 24px hsl(var(--glow-gold) / 0.2)',
        'glow-gold-lg': '0 8px 48px hsl(var(--glow-gold) / 0.25)',
        'glow-amber-sm': '0 0 12px hsl(var(--glow-amber) / 0.15)',
        'glow-amber-md': '0 4px 24px hsl(var(--glow-amber) / 0.2)',
        'glow-amber-lg': '0 8px 48px hsl(var(--glow-amber) / 0.25)',
        'soft': '0 4px 20px hsl(var(--background) / 0.5)',
        'elevated': '0 8px 32px hsl(0 0% 0% / 0.35)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(var(--glow-gold) / 0.25)",
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(var(--glow-gold) / 0.4)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
