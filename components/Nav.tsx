import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="font-semibold">🌙 Lunar Landing Site Planner</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:underline">Planner</Link>
          <Link href="/compare/" className="hover:underline">Compare</Link>
          <Link href="/about/" className="hover:underline">About / Method</Link>
        </nav>
      </div>
    </header>
  );
}
