import { useId, useMemo, useState, type MouseEvent } from "react";
import { marginSeries } from "../lib/events";
import { endEpoch, epochAt, isVisible } from "../lib/geometry";
import type { Ephemeris, Horizon } from "../lib/types";

const LUNAR_DAY_MS = 29.53 * 86_400_000;

interface VisibilitySegment {
  startMs: number;
  endMs: number;
  visible: boolean;
}

function buildSegments(
  eph: Ephemeris,
  horizon: Horizon,
  body: "sun" | "earth",
  winStartMs: number,
  winEndMs: number
): VisibilitySegment[] {
  const margins = marginSeries(eph, horizon, body);
  const stepMs = eph.step_minutes * 60_000;
  const segs: VisibilitySegment[] = [];

  for (let i = 0; i < margins.length; i++) {
    const t0 = epochAt(eph, i);
    const t1 = i < margins.length - 1 ? epochAt(eph, i + 1) : t0 + stepMs;
    if (t1 <= winStartMs || t0 >= winEndMs) continue;

    const clampedStart = Math.max(t0, winStartMs);
    const clampedEnd = Math.min(t1, winEndMs);
    const vis = isVisible(margins[i]);

    const prev = segs[segs.length - 1];
    if (prev && prev.visible === vis && Math.abs(prev.endMs - clampedStart) <= stepMs) {
      prev.endMs = clampedEnd;
    } else {
      segs.push({ startMs: clampedStart, endMs: clampedEnd, visible: vis });
    }
  }
  return segs;
}

interface TimelineStripsProps {
  ephemeris: Ephemeris;
  horizon: Horizon;
  nowMs: number;
  windowStartMs: number;
  onSelectTime: (epochMs: number) => void;
  compact?: boolean;
}

export function TimelineStrips({
  ephemeris,
  horizon,
  nowMs,
  windowStartMs,
  onSelectTime,
  compact = false,
}: TimelineStripsProps) {
  const uid = useId().replace(/:/g, "");
  const dataStartMs = Date.parse(ephemeris.start_utc);
  const dataEndMs = endEpoch(ephemeris);
  const winStartMs = Math.max(dataStartMs, windowStartMs);
  const winEndMs = Math.min(dataEndMs, winStartMs + LUNAR_DAY_MS);
  const effectiveSpanMs = Math.max(3_600_000, winEndMs - winStartMs);

  const [hovered, setHovered] = useState<{
    body: "Sun" | "Earth";
    seg: VisibilitySegment;
  } | null>(null);

  const sunSegs = useMemo(
    () => buildSegments(ephemeris, horizon, "sun", winStartMs, winEndMs),
    [ephemeris, horizon, winStartMs, winEndMs]
  );

  const earthSegs = useMemo(
    () => buildSegments(ephemeris, horizon, "earth", winStartMs, winEndMs),
    [ephemeris, horizon, winStartMs, winEndMs]
  );

  const ticks = useMemo(() => {
    const out: Array<{ ms: number; label: string; pct: number }> = [];
    const dayStep = 5 * 86_400_000;
    for (let t = winStartMs; t <= winEndMs; t += dayStep) {
      out.push({
        ms: t,
        label: new Date(t).toISOString().slice(5, 10),
        pct: ((t - winStartMs) / effectiveSpanMs) * 100,
      });
    }
    return out;
  }, [winStartMs, winEndMs, effectiveSpanMs]);

  const nowPct = Math.max(
    0,
    Math.min(100, ((nowMs - winStartMs) / effectiveSpanMs) * 100)
  );

  const handleStripClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.round(winStartMs + frac * effectiveSpanMs);
    onSelectTime(targetMs);
  };

  const formatRange = (seg: VisibilitySegment) => {
    const s = new Date(seg.startMs).toISOString().slice(0, 16).replace("T", " ");
    const e = new Date(seg.endMs).toISOString().slice(0, 16).replace("T", " ");
    const hours = ((seg.endMs - seg.startMs) / 3_600_000).toFixed(1);
    return `${s} → ${e} UTC (${hours} h)`;
  };

  return (
    <section
      aria-label="One lunar day visibility timeline strips"
      className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-[#edf0f5]">
            Visibility Strips — 1 Lunar Day ({((winEndMs - winStartMs) / 86_400_000).toFixed(1)} days)
          </h2>
          <p className="font-mono text-xs text-[#9aa3b2] tabular-nums">
            {new Date(winStartMs).toISOString().slice(0, 10)} to{" "}
            {new Date(winEndMs).toISOString().slice(0, 10)} UTC · Click any bar to scrub
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#9aa3b2]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-4 rounded-[2px] border border-[#eab354] bg-[#eab354]/85"
              />
              <span>Sunlit (diagonal stripe)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-4 rounded-[2px] border border-[#56B4E9] bg-[#56B4E9]/85"
              />
              <span>Earth visible (cross hatch)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-4 rounded-[2px] border border-[#1f2530] bg-[#090b10]"
              />
              <span>Below terrain</span>
            </span>
          </div>
        )}
      </div>

      <div className="relative space-y-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[#eab354]">Sun above horizon</span>
            <span className="font-mono text-[11px] text-[#9aa3b2]">
              {sunSegs
                .filter((s) => s.visible)
                .reduce((acc, s) => acc + (s.endMs - s.startMs) / 3_600_000, 0)
                .toFixed(1)}{" "}
              h sunlit in window
            </span>
          </div>
          <svg
            viewBox="0 0 1000 32"
            preserveAspectRatio="none"
            onClick={handleStripClick}
            onMouseLeave={() => setHovered(null)}
            role="img"
            aria-label="Sun visibility strip across one lunar day"
            className="h-8 w-full cursor-pointer rounded-[4px] border border-[#1f2530] bg-[#090b10]"
          >
            <defs>
              <pattern
                id={`sun-pat-${uid}`}
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="10" height="10" fill="#eab354" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="10"
                  stroke="#573d14"
                  strokeWidth="2.5"
                />
              </pattern>
            </defs>
            {sunSegs.map((seg, idx) => {
              const x = ((seg.startMs - winStartMs) / effectiveSpanMs) * 1000;
              const w = Math.max(
                1,
                ((seg.endMs - seg.startMs) / effectiveSpanMs) * 1000
              );
              return (
                <rect
                  key={idx}
                  x={x}
                  y={0}
                  width={w}
                  height={32}
                  fill={seg.visible ? `url(#sun-pat-${uid})` : "#090b10"}
                  onMouseEnter={() => setHovered({ body: "Sun", seg })}
                />
              );
            })}
            <line
              x1={nowPct * 10}
              y1={0}
              x2={nowPct * 10}
              y2={32}
              stroke="#edf0f5"
              strokeWidth={2.5}
            />
          </svg>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[#56B4E9]">Earth above horizon</span>
            <span className="font-mono text-[11px] text-[#9aa3b2]">
              {earthSegs
                .filter((s) => s.visible)
                .reduce((acc, s) => acc + (s.endMs - s.startMs) / 3_600_000, 0)
                .toFixed(1)}{" "}
              h DTE in window
            </span>
          </div>
          <svg
            viewBox="0 0 1000 32"
            preserveAspectRatio="none"
            onClick={handleStripClick}
            onMouseLeave={() => setHovered(null)}
            role="img"
            aria-label="Earth visibility strip across one lunar day"
            className="h-8 w-full cursor-pointer rounded-[4px] border border-[#1f2530] bg-[#090b10]"
          >
            <defs>
              <pattern
                id={`earth-pat-${uid}`}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="#56B4E9" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="#0C4A6E"
                  strokeWidth="2"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="8"
                  y2="0"
                  stroke="#0C4A6E"
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>
            {earthSegs.map((seg, idx) => {
              const x = ((seg.startMs - winStartMs) / effectiveSpanMs) * 1000;
              const w = Math.max(
                1,
                ((seg.endMs - seg.startMs) / effectiveSpanMs) * 1000
              );
              return (
                <rect
                  key={idx}
                  x={x}
                  y={0}
                  width={w}
                  height={32}
                  fill={seg.visible ? `url(#earth-pat-${uid})` : "#090b10"}
                  onMouseEnter={() => setHovered({ body: "Earth", seg })}
                />
              );
            })}
            <line
              x1={nowPct * 10}
              y1={0}
              x2={nowPct * 10}
              y2={32}
              stroke="#edf0f5"
              strokeWidth={2.5}
            />
          </svg>
        </div>

        <div className="relative h-5 border-t border-[#1f2530] pt-1">
          {ticks.map((t) => (
            <span
              key={t.ms}
              style={{ left: `${Math.min(92, t.pct)}%` }}
              className="absolute font-mono text-[10px] text-[#687283] tabular-nums"
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="min-h-[30px] flex items-center rounded-[4px] border border-[#1f2530] bg-[#0b0e14] px-3 py-1.5 font-mono text-xs tabular-nums">
          {hovered ? (
            <span className="text-[#edf0f5]">
              <span className="font-semibold">
                {hovered.body}: {hovered.seg.visible ? "Visible" : "Below horizon"}
              </span>{" "}
              · {formatRange(hovered.seg)}
            </span>
          ) : (
            <span className="text-[#687283]">
              Hover a segment to inspect exact UTC window · Click anywhere on a bar to jump
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
