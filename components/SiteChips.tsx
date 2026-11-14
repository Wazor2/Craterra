import type { Site } from "@/lib/data";

export default function SiteChips({ sites, value, onChange }: { sites: Site[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Landing site">
      {sites.map((s) => (
        <button key={s.id} role="radio" aria-checked={value === s.id} onClick={() => onChange(s.id)}
          className={`rounded-full border px-3 py-1 text-sm ${value === s.id ? "border-sky-400 bg-sky-900" : "border-slate-600 hover:bg-slate-800"}`}>
          {s.name}
        </button>
      ))}
    </div>
  );
}
