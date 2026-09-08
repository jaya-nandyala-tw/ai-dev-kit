import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { LocalOnlyBanner } from "@/components/LocalOnlyBanner";
import { Navbar } from "@/components/Navbar";
import { ToastHost } from "@/components/ui/ToastHost";
import { GlobalHelpFab } from "@/components/ui/GlobalHelpFab";
import { HelpProvider } from "@/components/ui/HelpProvider";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";

// next/font/google self-hosts + optimizes these (no render-blocking CDN request, no manual
// <link> tags) — the idiomatic Next.js way to load webfonts, exposed as CSS variables that
// tailwind.config.ts's fontFamily theme and globals.css both reference.
const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "500"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Starter Kit — Onboarding",
  description: "Guided setup wizard for adopting the AI Starter Kit.",
};

// Runs before paint, first thing in <body> — reads the persisted theme choice and sets
// data-theme on <html> synchronously, so there's no flash of the default (light) theme before
// a returning dark-mode user's preference applies. Light with no localStorage entry is the
// correct default, so this only ever needs to *add* dark, never remove it.
const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("onboarding-ui-theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HelpProvider>
          <LocalOnlyBanner />
          <Navbar />
          <NoiseOverlay />
          <div className="mx-auto max-w-[100rem] px-6 py-8 lg:px-10">{children}</div>
          <ToastHost />
          <GlobalHelpFab />
        </HelpProvider>
      </body>
    </html>
  );
}
