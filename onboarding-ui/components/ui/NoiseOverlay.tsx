// Subtle fractal-noise grain overlay — the design system's specified texture: a tactile quality
// on the dark background, at ~1.5% opacity, implemented as an inline SVG data URI so there's no
// extra asset request. Purely ambient: fixed, full-viewport, pointer-events-none, below all
// content and below the toast/dialog z-index tiers (see HelpDialog.tsx for that scale).
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `url("${NOISE_SVG}")`,
        opacity: 0.015,
        mixBlendMode: "overlay",
      }}
    />
  );
}
