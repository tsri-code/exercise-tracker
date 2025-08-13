"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/workouts", label: "Workouts" },
  { href: "/routines", label: "Routines" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
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
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex px-3 py-2 rounded-full text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            Menu
          </button>
          <Link
            href={pathname?.startsWith("/calories") ? "/" : "/calories/personal"}
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-colors"
          >
            {pathname?.startsWith("/calories") ? "Exercise Tracker" : "Calorie Counter"}
          </Link>
        </div>
      </nav>
      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`${open ? "block" : "hidden"} md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl`}
      >
        <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-md ${
                  active ? "bg-white text-black" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href={pathname?.startsWith("/calories") ? "/" : "/calories/personal"}
            className="md:hidden mt-1 px-3 py-2 rounded-md bg-cyan-400 text-black font-semibold"
          >
            {pathname?.startsWith("/calories") ? "Exercise Tracker" : "Calorie Counter"}
          </Link>
        </div>
      </div>
    </header>
  );
}
