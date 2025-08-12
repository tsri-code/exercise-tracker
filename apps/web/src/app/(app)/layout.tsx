import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      {children}
    </section>
  );
}


