import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lunar Landing Site Planner",
  description: "When are the Sun and Earth above the horizon at a lunar landing site? NASA Space Apps 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
          Data: NASA/JPL Horizons, LRO LOLA. See About / Method for sources, assumptions and limits.
        </footer>
      </body>
    </html>
  );
}
