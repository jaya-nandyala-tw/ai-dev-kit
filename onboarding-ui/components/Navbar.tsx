"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGlobalHelp } from "@/components/ui/HelpProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS: { href: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { href: "/", label: "Home", isActive: (p) => p === "/" },
  {
    href: "/steps/stack-profile",
    label: "Setup",
    isActive: (p) => p.startsWith("/steps") || p.startsWith("/recommendations"),
  },
  { href: "/context", label: "Context", isActive: (p) => p.startsWith("/context") },
];

// Sticky, every page (mounted once in layout.tsx below the local-only warning banner). "Setup"
// always points at the first guided-flow step rather than trying to guess where a given visitor
// left off — ProgressRail/the homepage Roadmap handle resuming mid-flow.
export function Navbar() {
  const pathname = usePathname();
  const openHelp = useGlobalHelp();

  return (
    <nav
      className="sticky top-0 z-30 border-b border-[var(--border-soft)]"
      style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto max-w-[100rem] px-6 lg:px-10 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 shrink-0" style={{ background: "var(--accent)" }} />
          <span className="mono text-xs font-bold uppercase tracking-wider">AI Starter Kit</span>
        </Link>

        <div className="flex items-center gap-1 h-full">
          {LINKS.map((link) => {
            const active = link.isActive(pathname ?? "");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`h-full flex items-center mono text-xs uppercase tracking-wide px-3 border-b-2 transition-colors ${
                  active ? "" : "text-[var(--muted)] hover:text-[var(--text)] border-transparent"
                }`}
                style={active ? { color: "var(--accent)", borderColor: "var(--accent)" } : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={openHelp}
            className="h-full flex items-center mono text-xs uppercase tracking-wide px-3 border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Help
          </button>
          <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
