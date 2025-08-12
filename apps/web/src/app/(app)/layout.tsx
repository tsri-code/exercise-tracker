import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 border-b bg-white/70 backdrop-blur-sm z-10">
        <nav className="mx-auto max-w-6xl px-4 py-3 flex gap-6 text-sm">
          <a href="/" className="font-semibold">Exercise Tracker</a>
          <a href="/planner">Planner</a>
          <a href="/workouts">Workouts</a>
          <a href="/exercises">Exercises</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}


