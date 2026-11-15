import type { Horizon } from "@/lib/data";

export default function MockBanner({ hz }: { hz?: Horizon }) {
  if (!hz || !hz.dem_source.toUpperCase().includes("MOCK")) return null;
  return (
    <div className="rounded-md border border-amber-500 bg-amber-950 p-2 text-sm text-amber-200">
      ⚠ MOCK DATA: values shown are placeholders, not real ephemeris or terrain. Do not present as results.
    </div>
  );
}
