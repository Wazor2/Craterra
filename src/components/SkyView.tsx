import { useMemo, useState, type MouseEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { BodyState } from "../lib/events";
import { horizonAt, normaliseAz } from "../lib/geometry";
import type { LoadedHorizon } from "../lib/types";

interface SkyViewProps {
  horizon: LoadedHorizon;
  state: BodyState;
  compact?: boolean;
  defaultCenter?: "south" | "north";
}

export function SkyView({
  horizon,
  state,
  compact = false,
  defaultCenter = "south",
}: SkyViewProps) {
  const [centerMode, setCenterMode] = useState<"south" | "north">(defaultCenter);
  const [yRange, setYRange] = useState<[number, number]>(() => {
    const maxBody = Math.max(state.sunEl, state.earthEl);
    if (maxBody > 28) return [-20, 90];
    return [-10, 30];
  });
  const [hoverPos, setHoverPos] = useState<{
    az: number;
    el: number;
    terrain: number;
  } | null>(null);

  const width = compact ? 520 : 900;
  const height = compact ? 220 : 320;
  const pad = compact
    ? { top: 18, right: 16, bottom: 28, left: 38 }
    : { top: 24, right: 24, bottom: 36, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const centerAz = centerMode === "south" ? 180 : 0;
  const leftEdgeAz = normaliseAz(centerAz - 180);

  const azToX = (az: number) => {
    const offset = normaliseAz(az - leftEdgeAz);
    return pad.left + (offset / 360) * plotW;
  };

  const [yMin, yMax] = yRange;
  const elToY = (el: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, el));
    return pad.top + ((yMax - clamped) / (yMax - yMin)) * plotH;
  };

  const terrainPath = useMemo(() => {
    const samples: string[] = [];
    for (let step = 0; step <= 360; step++) {
      const az = normaliseAz(leftEdgeAz + step);
      const h = horizonAt(horizon.elev_deg, az);
      const x = pad.left + (step / 360) * plotW;
      const y = elToY(h);
      samples.push(`${step === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const linePath = samples.join(" ");
    const fillPath = `${linePath} L${(pad.left + plotW).toFixed(1)},${(
      pad.top + plotH
    ).toFixed(1)} L${pad.left.toFixed(1)},${(pad.top + plotH).toFixed(1)} Z`;
    return { linePath, fillPath };
  }, [horizon.elev_deg, leftEdgeAz, plotW, plotH, pad.left, pad.top, yMin, yMax]);

  const compassTicks = useMemo(() => {
    const labels: Array<{ az: number; label: string }> = [
      { az: 0, label: "N 0°" },
      { az: 45, label: "NE" },
      { az: 90, label: "E 90°" },
      { az: 135, label: "SE" },
      { az: 180, label: "S 180°" },
      { az: 225, label: "SW" },
      { az: 270, label: "W 270°" },
      { az: 315, label: "NW" },
    ];
    return labels.map((t) => ({
      ...t,
      x: azToX(t.az),
      major: t.az % 90 === 0,
    }));
  }, [leftEdgeAz, plotW, pad.left]);

  const yTicks = useMemo(() => {
    const span = yMax - yMin;
    const step = span <= 25 ? 5 : span <= 60 ? 10 : 30;
    const ticks: number[] = [];
    const first = Math.ceil(yMin / step) * step;
    for (let v = first; v <= yMax; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [yMin, yMax]);

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    if (
      svgX < pad.left ||
      svgX > pad.left + plotW ||
      svgY < pad.top ||
      svgY > pad.top + plotH
    ) {
      setHoverPos(null);
      return;
    }
    const az = normaliseAz(leftEdgeAz + ((svgX - pad.left) / plotW) * 360);
    const el = yMax - ((svgY - pad.top) / plotH) * (yMax - yMin);
    const terrain = horizonAt(horizon.elev_deg, az);
    setHoverPos({ az, el, terrain });
  };

  const handleZoomIn = () => {
    setYRange(([min, max]) => {
      if (max - min <= 16) return [min, max];
      return [Math.max(-90, min + 5), Math.min(90, max - 10)];
    });
  };

  const handleZoomOut = () => {
    setYRange(([min, max]) => {
      if (min <= -90 && max >= 90) return [-90, 90];
      return [Math.max(-90, min - 10), Math.min(90, max + 20)];
    });
  };

  const sunX = azToX(state.sunAz);
  const sunY = elToY(state.sunEl);
  const sunInBounds = state.sunEl >= yMin && state.sunEl <= yMax;

  const earthX = azToX(state.earthAz);
  const earthY = elToY(state.earthEl);
  const earthInBounds = state.earthEl >= yMin && state.earthEl <= yMax;

  return (
    <section
      aria-label="360-degree horizon sky view"
      className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4"
    >
      {horizon.isFlat && (
        <div
          role="status"
          className="mb-3 rounded-[4px] border border-[#d9826c]/50 bg-[#151922] px-3 py-2 text-xs font-medium text-[#d9826c]"
        >
          No terrain data yet: flat horizon assumed
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm sm:text-base font-semibold text-[#edf0f5]">
            Sky View — Horizon Silhouette &amp; Body Positions
          </h2>
          {!compact && (
            <p className="text-xs text-[#9aa3b2]">
              DEM: {horizon.dem_source} · Mast {horizon.mast_height_m.toFixed(1)} m
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Compass center"
            className="inline-flex rounded-[4px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => setCenterMode("south")}
              className={`rounded-[3px] px-2.5 py-1 font-medium whitespace-nowrap transition-colors ${
                centerMode === "south"
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              Center S
            </button>
            <button
              type="button"
              onClick={() => setCenterMode("north")}
              className={`rounded-[3px] px-2.5 py-1 font-medium whitespace-nowrap transition-colors ${
                centerMode === "north"
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              Center N
            </button>
          </div>

          <div className="inline-flex items-center gap-1 rounded-[4px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setYRange([-10, 30])}
              className={`rounded-[3px] px-2 py-1 whitespace-nowrap transition-colors ${
                yRange[0] === -10 && yRange[1] === 30
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              -10°..30°
            </button>
            <button
              type="button"
              onClick={() => setYRange([-90, 90])}
              className={`rounded-[3px] px-2 py-1 whitespace-nowrap transition-colors ${
                yRange[0] === -90 && yRange[1] === 90
                  ? "bg-[#1c212c] text-[#edf0f5]"
                  : "text-[#687283] hover:text-[#edf0f5]"
              }`}
            >
              Full Sky
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom elevation in"
              title="Zoom elevation in"
              className="p-1 text-[#9aa3b2] hover:text-[#edf0f5]"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom elevation out"
              title="Zoom elevation out"
              className="p-1 text-[#9aa3b2] hover:text-[#edf0f5]"
            >
              <ZoomOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="360-degree terrain horizon profile with Sun and Earth positions"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          className="w-full h-auto cursor-crosshair select-none rounded-[4px] border border-[#1f2530] bg-[#090b10]"
        >
          {yTicks.map((deg) => {
            const y = elToY(deg);
            return (
              <g key={deg}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={pad.left + plotW}
                  y2={y}
                  stroke={deg === 0 ? "#475166" : "#181d27"}
                  strokeWidth={deg === 0 ? 1.2 : 0.75}
                  strokeDasharray={deg === 0 ? "4 3" : undefined}
                />
                <text
                  x={pad.left - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-[#687283] text-[10px]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {deg}°
                </text>
              </g>
            );
          })}

          {compassTicks.map((t) => (
            <g key={t.az}>
              <line
                x1={t.x}
                y1={pad.top}
                x2={t.x}
                y2={pad.top + plotH}
                stroke={t.major ? "#222936" : "#131720"}
                strokeWidth={t.major ? 1 : 0.75}
              />
              <text
                x={t.x}
                y={height - 10}
                textAnchor="middle"
                className={
                  t.major
                    ? "fill-[#edf0f5] text-[11px] font-medium"
                    : "fill-[#687283] text-[9px]"
                }
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Lunar terrain silhouette */}
          <path d={terrainPath.fillPath} fill="#151922" fillOpacity={0.96} />
          <path
            d={terrainPath.linePath}
            fill="none"
            stroke="#9aa3b2"
            strokeWidth={1.5}
          />

          {/* Sun marker: Solar Gold Circle */}
          <g transform={`translate(${sunX}, ${sunY})`}>
            {!sunInBounds && (
              <text
                y={state.sunEl > yMax ? 14 : -10}
                textAnchor="middle"
                className="fill-[#eab354] text-[9px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {state.sunEl > yMax ? "▲" : "▼"} {state.sunEl.toFixed(1)}°
              </text>
            )}
            <circle
              r={compact ? 7 : 9}
              fill={state.sunVisible ? "#eab354" : "#090b10"}
              fillOpacity={state.sunVisible ? 0.95 : 0.9}
              stroke="#eab354"
              strokeWidth={2}
              strokeDasharray={state.sunVisible ? undefined : "3 2"}
            />
            {state.sunVisible && (
              <circle
                r={compact ? 12 : 14}
                fill="none"
                stroke="#eab354"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            )}
            <text
              x={sunX > pad.left + plotW - 80 ? -14 : 14}
              y={4}
              textAnchor={sunX > pad.left + plotW - 80 ? "end" : "start"}
              className="fill-[#f5d896] text-[11px] font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Sun {state.sunEl >= 0 ? "+" : ""}
              {state.sunEl.toFixed(1)}°{state.sunVisible ? "" : " (hidden)"}
            </text>
          </g>

          {/* Earth marker: Sky Blue Diamond */}
          <g transform={`translate(${earthX}, ${earthY})`}>
            {!earthInBounds && (
              <text
                y={state.earthEl > yMax ? 14 : -10}
                textAnchor="middle"
                className="fill-[#56B4E9] text-[9px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {state.earthEl > yMax ? "▲" : "▼"} {state.earthEl.toFixed(1)}°
              </text>
            )}
            <polygon
              points={
                compact ? "0,-8 8,0 0,8 -8,0" : "0,-10 10,0 0,10 -10,0"
              }
              fill={state.earthVisible ? "#56B4E9" : "#090b10"}
              fillOpacity={state.earthVisible ? 0.95 : 0.9}
              stroke="#56B4E9"
              strokeWidth={2}
              strokeDasharray={state.earthVisible ? undefined : "3 2"}
            />
            <text
              x={earthX > pad.left + plotW - 90 ? -15 : 15}
              y={earthY < pad.top + 18 ? 14 : -10}
              textAnchor={earthX > pad.left + plotW - 90 ? "end" : "start"}
              className="fill-[#bae6fd] text-[11px] font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Earth {state.earthEl >= 0 ? "+" : ""}
              {state.earthEl.toFixed(1)}°{state.earthVisible ? "" : " (hidden)"}
            </text>
          </g>
        </svg>

        {hoverPos && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-[4px] border border-[#2d3544] bg-[#0f1218]/95 px-2.5 py-1 font-mono text-[11px] text-[#edf0f5] tabular-nums">
            Az {hoverPos.az.toFixed(1)}° · El {hoverPos.el.toFixed(1)}° ·
            Terrain {hoverPos.terrain.toFixed(2)}°
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#9aa3b2]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full bg-[#eab354]"
          />
          <span>Sun above horizon (solid circle)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rotate-45 bg-[#56B4E9]"
          />
          <span>Earth above horizon (solid diamond)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-[#9aa3b2]"
          />
          <span>Hollow dashed = below local terrain</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-4 border-t-2 border-[#9aa3b2] bg-[#151922]"
          />
          <span>Local terrain horizon (deg)</span>
        </span>
      </div>
    </section>
  );
}
