import type { Metadata } from "next";
import "./globals.css";
import { LocalOnlyBanner } from "@/components/LocalOnlyBanner";
import { ToastHost } from "@/components/ui/ToastHost";

export const metadata: Metadata = {
  title: "AI Starter Kit — Onboarding",
  description: "Guided setup dashboard for adopting the AI Starter Kit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <LocalOnlyBanner />
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
        <ToastHost />
      </body>
    </html>
  );
}
