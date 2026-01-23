import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "#d1d5db",
            "--tw-prose-headings": "#00CED1",
            "--tw-prose-lead": "#9ca3af",
            "--tw-prose-links": "#00CED1",
            "--tw-prose-bold": "#ffffff",
            "--tw-prose-counters": "#00CED1",
            "--tw-prose-bullets": "#00CED1",
            "--tw-prose-hr": "rgba(0, 206, 209, 0.3)",
            "--tw-prose-quotes": "#e5e7eb",
            "--tw-prose-quote-borders": "#00CED1",
            "--tw-prose-captions": "#9ca3af",
            "--tw-prose-code": "#d4af37",
            "--tw-prose-pre-code": "#e5e7eb",
            "--tw-prose-pre-bg": "#151515",
            "--tw-prose-th-borders": "rgba(0, 206, 209, 0.3)",
            "--tw-prose-td-borders": "rgba(0, 206, 209, 0.2)",
            lineHeight: "1.8",
            p: {
              marginTop: "1.25em",
              marginBottom: "1.25em",
            },
            h1: {
              fontFamily: "Cinzel, serif",
              fontWeight: "600",
              marginTop: "1.5em",
              marginBottom: "0.75em",
            },
            h2: {
              fontFamily: "Cinzel, serif",
              fontWeight: "600",
              marginTop: "1.75em",
              marginBottom: "0.75em",
              borderBottomWidth: "1px",
              borderBottomColor: "rgba(0, 206, 209, 0.2)",
              paddingBottom: "0.5em",
            },
            h3: {
              fontFamily: "Cinzel, serif",
              fontWeight: "600",
              marginTop: "1.5em",
              marginBottom: "0.5em",
            },
            h4: {
              fontFamily: "Cinzel, serif",
              fontWeight: "600",
              marginTop: "1.25em",
              marginBottom: "0.5em",
            },
            blockquote: {
              fontStyle: "italic",
              borderLeftWidth: "4px",
              backgroundColor: "rgba(0, 206, 209, 0.05)",
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
              paddingLeft: "1.5em",
              paddingRight: "1em",
              borderRadius: "0 0.5rem 0.5rem 0",
            },
            code: {
              backgroundColor: "rgba(212, 175, 55, 0.1)",
              padding: "0.25em 0.4em",
              borderRadius: "0.25em",
              fontWeight: "500",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            pre: {
              borderRadius: "0.5rem",
              border: "1px solid rgba(0, 206, 209, 0.2)",
            },
            a: {
              textDecoration: "none",
              borderBottomWidth: "1px",
              borderBottomColor: "rgba(0, 206, 209, 0.3)",
              transition: "all 150ms ease-in-out",
              "&:hover": {
                color: "#d4af37",
                borderBottomColor: "#d4af37",
              },
            },
            ul: {
              paddingLeft: "1.5em",
            },
            ol: {
              paddingLeft: "1.5em",
            },
            li: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            hr: {
              marginTop: "2em",
              marginBottom: "2em",
            },
            img: {
              borderRadius: "0.5rem",
              border: "1px solid rgba(0, 206, 209, 0.2)",
            },
            table: {
              borderRadius: "0.5rem",
              overflow: "hidden",
            },
            th: {
              backgroundColor: "rgba(0, 206, 209, 0.1)",
              fontFamily: "Cinzel, serif",
            },
          },
        },
      },
      colors: {
        "band-dark": {
          DEFAULT: "#0a0a0a",
          50: "#1a1a1a",
          100: "#151515",
          200: "#121212",
          300: "#0f0f0f",
          400: "#0c0c0c",
          500: "#0a0a0a",
          600: "#080808",
          700: "#050505",
          800: "#030303",
          900: "#000000",
        },
        "band-sea": {
          DEFAULT: "#00CED1",
          50: "#e0fffe",
          100: "#b3fffd",
          200: "#80fffc",
          300: "#4dfff9",
          400: "#26f5ef",
          500: "#00CED1",
          600: "#00a8aa",
          700: "#008385",
          800: "#006163",
          900: "#004547",
        },
        "band-red": {
          DEFAULT: "#8b0000",
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#f87171",
          400: "#dc2626",
          500: "#b91c1c",
          600: "#8b0000",
          700: "#7f1d1d",
          800: "#5c1414",
          900: "#450a0a",
        },
        "band-gold": {
          DEFAULT: "#d4af37",
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#d4af37",
          600: "#b8960f",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
        // Colores de profundidad marina (efecto inmersión)
        // De turquesa iluminado arriba a azul profundo abajo
        "depth": {
          surface: "#0a1215",      // Superficie - azul turquesa oscuro
          shallow: "#091418",      // Aguas poco profundas - turquesa
          mid: "#071216",          // Media profundidad
          deep: "#050f14",         // Profundidad - más oscuro
          abyss: "#030a10",        // El abismo - azul muy profundo
        },
      },
      fontFamily: {
        metal: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [typography],
};
