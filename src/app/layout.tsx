import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lunar Landing Site Navigator",
  description: "Mission-planning app for lunar site illumination and Earth-visibility analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
