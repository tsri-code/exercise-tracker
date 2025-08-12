import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exercise Tracker",
  description:
    "Plan smart routines and track sets, reps, and weight with a sleek, robust UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-zinc-50 to-white text-gray-900`}
      >
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 py-8 min-h-[calc(100dvh-64px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
