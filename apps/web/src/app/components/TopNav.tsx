"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/planner", label: "Planner" },
  { href: "/workouts", label: "Workouts" },
  { href: "/exercises", label: "Exercises" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">Exercise Tracker</Link>
        <div className="flex items-center gap-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-md transition-colors ${
                pathname === l.href
                  ? "bg-zinc-900 text-white"
                  : "hover:bg-zinc-100 text-zinc-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}


