import Link from "next/link";
import { ComparisonWorkbench } from "@/components/comparison/comparison-workbench";

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur md:flex-row md:items-center md:justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-violet-400">
                Mission Planning & Site Selection
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Landing Site Comparison & What-Changed Analysis
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/"
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Planner
            </Link>
            <Link
              href="/compare"
              className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-violet-300 transition"
            >
              Compare
            </Link>
            <Link
              href="/about"
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Methodology
            </Link>
          </nav>
        </header>

        <ComparisonWorkbench />
      </div>
    </main>
  );
}
