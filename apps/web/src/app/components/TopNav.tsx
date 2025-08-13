"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/workouts", label: "Workouts" },
  { href: "/routines", label: "Routines" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <nav className="relative mx-auto max-w-6xl px-4 h-16 flex items-center justify-between text-white">
        <Link href="/" className="font-semibold tracking-tight">
          Exercise Tracker
        </Link>

        {/* Centered nav */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-full transition-colors ${
                  active
                    ? "bg-white text-black"
                    : "text-white/80 ring-1 ring-white/10 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/planner"
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
