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
      fontSize: {
        xs: ["0.8rem", { lineHeight: "1.15rem" }],
        sm: ["0.925rem", { lineHeight: "1.4rem" }],
        base: ["1.0625rem", { lineHeight: "1.65rem" }],
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],
        xl: ["1.375rem", { lineHeight: "1.85rem" }],
        "2xl": ["1.625rem", { lineHeight: "2.1rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
