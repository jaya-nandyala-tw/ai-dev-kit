import type { Metadata } from "next";
import "./globals.css";
import { LocalOnlyBanner } from "@/components/LocalOnlyBanner";
import { ToastHost } from "@/components/ui/ToastHost";
import { GlobalHelpFab } from "@/components/ui/GlobalHelpFab";

export const metadata: Metadata = {
  title: "AI Starter Kit — Onboarding",
  description: "Guided setup dashboard for adopting the AI Starter Kit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <LocalOnlyBanner />
        <div className="mx-auto max-w-[100rem] px-6 py-8 lg:px-10">{children}</div>
        <ToastHost />
        <GlobalHelpFab />
      </body>
    </html>
  );
}
