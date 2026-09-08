import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // A deliberately bumped type scale — NOT a root font-size/rem multiplier. That approach
      // (briefly tried) rescaled every rem-based value in the app at once, including layout
      // geometry that has to satisfy exact math (e.g. the sidebar timeline's connector line
      // centered under a node circle via `left-4` = half of `w-8`) — harmless on its own, but
      // any future arbitrary-px value anywhere would drift out of sync with it. Overriding just
      // `fontSize` here scales text only; spacing/sizing utilities (`p-*`, `w-*`, `gap-*`, the
      // `left-4`/`w-8` pair above) are untouched and stay correct.
      //
      // xs–3xl: tuned for this app's dense working surfaces (forms, tables, diffs).
      // 4xl–9xl: Bold Typography's poster scale, added on top — only ever used on the "front
      // door" (the welcome hero). Dense surfaces never reach 4xl.
      fontSize: {
        xs: ["0.8rem", { lineHeight: "1.15rem" }],
        sm: ["0.925rem", { lineHeight: "1.4rem" }],
        base: ["1.0625rem", { lineHeight: "1.65rem" }],
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],
        xl: ["1.375rem", { lineHeight: "1.85rem" }],
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "4xl": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "5xl": ["3.5rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "6xl": ["4.5rem", { lineHeight: "0.98", letterSpacing: "-0.05em" }],
        "7xl": ["6rem", { lineHeight: "0.95", letterSpacing: "-0.06em" }],
        "8xl": ["8rem", { lineHeight: "0.92", letterSpacing: "-0.06em" }],
        "9xl": ["10rem", { lineHeight: "0.9", letterSpacing: "-0.06em" }],
      },
      // Tracking scale — used via the existing `tracking-*` utilities everywhere (headlines get
      // `tracking-tight`, labels get `wide`/`wider`/`widest`). Dialed back twice now from the
      // original Bold Typography spec values (tight was -0.04em, then -0.02em): `tracking-tight`
      // is a plain utility class, so on any element that also carries a `text-4xl`..`text-9xl`
      // size class (the Hero H1, etc.), it doesn't layer on top of — it *overrides* — that size's
      // own bundled letterSpacing below, because both compile to plain `.class{letter-spacing:…}`
      // rules and Tailwind emits letterSpacing utilities after fontSize ones. So `tracking-tight`
      // is really the letter-spacing every heading in this app gets, poster-scale hero included,
      // not just the smaller dialog/section titles — and even -0.02em still read as cramped at
      // 6xl/7xl sizes, where an em-based value turns into several real pixels of tightening.
      letterSpacing: {
        tighter: "-0.015em",
        tight: "-0.01em",
        normal: "0em",
        wide: "0.05em",
        wider: "0.1em",
        widest: "0.2em",
      },
      // Sharp edges match sharp type — zero out every named radius except `full`, which stays
      // available for the handful of deliberately-round shapes (spinner, terminal traffic-light
      // dots). This is the leverage point: every `rounded-lg`/`rounded-[10px]` elsewhere in the
      // app goes sharp automatically, with no JSX changes required.
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter Tight", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
