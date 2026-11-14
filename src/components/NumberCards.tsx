import { EyeOff } from "lucide-react";
import { simplePowerIndex, timeUntil, type BodyState } from "../lib/events";

interface NumberCardsProps {
  state: BodyState;
  nowMs: number;
  nextSunriseMs: number | null;
  nextSunsetMs: number | null;
  nextEarthriseMs: number | null;
  nextEarthsetMs: number | null;
  variant?: "standard" | "floating" | "deck";
  onClose?: () => void;
}

function formatUtcShort(ms: number | null): string {
  if (ms === null) return "beyond loaded data range";
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function clampPct(val: number): number {
  return Math.max(0, Math.min(100, val));
}

export function NumberCards({
  state,
  nowMs,
  nextSunriseMs,
  nextSunsetMs,
  nextEarthriseMs,
  nextEarthsetMs,
  variant = "standard",
  onClose,
}: NumberCardsProps) {
  const powerIdx = simplePowerIndex(state.sunEl, state.sunVisible);
  const nextSolarTarget = state.sunVisible ? nextSunsetMs : nextSunriseMs;
  const nextSolarLabel = state.sunVisible ? "Until sunset" : "Until sunrise";
  const nextSolarText = timeUntil(nextSolarTarget, nowMs);

  const nextEarthTarget = state.earthVisible ? nextEarthsetMs : nextEarthriseMs;
  const nextEarthLabel = state.earthVisible
    ? "Until Earthset"
    : "Until Earthrise";
  const nextEarthText = timeUntil(nextEarthTarget, nowMs);

  // Map margin [-10°, +10°] -> [0%, 100%] with 50% as terrain horizon threshold
  const sunHorizonMeterPct = clampPct(((state.sunMargin + 10) / 20) * 100);
  const earthHorizonMeterPct = clampPct(((state.earthMargin + 10) / 20) * 100);
  const powerPct = clampPct(powerIdx * 100);

  const isFloating = variant === "floating";
  const isDeck = variant === "deck";
  const isCompact = isFloating || isDeck;

  const containerClass = isDeck
    ? "grid grid-cols-2 gap-px bg-[#1f2530]"
    : isFloating
      ? "grid grid-cols-2 gap-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-[#1f2530] bg-[#1f2530] sm:grid-cols-2 xl:grid-cols-4";

  const cardClass = isDeck
    ? "flex flex-col justify-between bg-[#0f1218] p-3"
    : isFloating
      ? "flex flex-col justify-between rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.92] px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
      : "flex flex-col justify-between bg-[#0f1218] p-4";

  const numberClass = isCompact
    ? "font-mono text-lg sm:text-xl font-semibold text-[#edf0f5] tabular-nums"
    : "font-mono text-2xl sm:text-3xl font-semibold text-[#edf0f5] tabular-nums";

  const gridContent = (
    <div className={containerClass}>
      {/* Card 1: Sun Elevation */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Sun Elevation
            </span>
            <span
              className={`text-[11px] sm:text-xs font-semibold shrink-0 ${
                state.sunVisible ? "text-[#eab354]" : "text-[#d9826c]"
              }`}
            >
              {state.sunVisible ? "● Sunlit" : "○ Dark"}
            </span>
          </div>

          <div className={isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"}>
            <span className={numberClass}>
              {state.sunEl >= 0 ? "+" : ""}
              {state.sunEl.toFixed(2)}
            </span>
            <span className="ml-1 font-mono text-[11px] text-[#687283]">deg</span>
          </div>
        </div>

        <div className={isCompact ? "mt-1.5 space-y-1" : "mt-3 space-y-1.5"}>
          <div
            aria-hidden="true"
            className="relative h-1 w-full overflow-hidden rounded-full bg-[#151922]"
          >
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#687283]" />
            <div
              className={`h-full transition-all duration-150 ${
                state.sunVisible ? "bg-[#eab354]" : "bg-[#d9826c]"
              }`}
              style={{ width: `${sunHorizonMeterPct}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate">
            {state.sunVisible ? "Clears" : "Below"}{" "}
            <span
              className={
                state.sunVisible
                  ? "font-semibold text-[#eab354]"
                  : "font-semibold text-[#d9826c]"
              }
            >
              {state.sunMargin >= 0 ? "+" : ""}
              {state.sunMargin.toFixed(2)}°
            </span>
          </p>
        </div>
      </div>

      {/* Card 2: Next Solar Crossing */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              {nextSolarLabel}
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              {state.sunVisible ? "Daylight" : "Shadow"}
            </span>
          </div>

          <div className={isCompact ? "mt-1" : "mt-2"}>
            {nextSolarText ? (
              <span className={numberClass}>{nextSolarText}</span>
            ) : (
              <span className="font-mono text-xs font-medium text-[#eab354]">
                beyond loaded data range
              </span>
            )}
          </div>
        </div>

        <p
          className={`${
            isCompact ? "mt-1.5" : "mt-3"
          } font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate`}
        >
          {nextSolarTarget !== null
            ? `${state.sunVisible ? "Sunset" : "Sunrise"}: ${formatUtcShort(
                nextSolarTarget
              )}`
            : "No crossing in window"}
        </p>
      </div>

      {/* Card 3: Earth Direct-to-Earth */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Earth Contact (DTE)
            </span>
            <span
              className={`text-[11px] sm:text-xs font-semibold shrink-0 ${
                state.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"
              }`}
            >
              {state.earthVisible ? "◆ Visible" : "◇ Occulted"}
            </span>
          </div>

          <div className={isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"}>
            <span className={numberClass}>
              {state.earthEl >= 0 ? "+" : ""}
              {state.earthEl.toFixed(2)}
            </span>
            <span className="ml-1 font-mono text-[11px] text-[#687283] truncate">
              deg ({state.earthMargin >= 0 ? "+" : ""}
              {state.earthMargin.toFixed(1)}°)
            </span>
          </div>
        </div>

        <div className={isCompact ? "mt-1.5 space-y-1" : "mt-3 space-y-1.5"}>
          <div
            aria-hidden="true"
            className="relative h-1 w-full overflow-hidden rounded-full bg-[#151922]"
          >
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#687283]" />
            <div
              className={`h-full transition-all duration-150 ${
                state.earthVisible ? "bg-[#56B4E9]" : "bg-[#d9826c]"
              }`}
              style={{ width: `${earthHorizonMeterPct}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate">
            {nextEarthLabel}:{" "}
            {nextEarthText ? (
              <span className="text-[#edf0f5] font-medium">{nextEarthText}</span>
            ) : (
              <span className="text-[#56B4E9]">beyond loaded data range</span>
            )}
          </p>
        </div>
      </div>

      {/* Card 4: Simple Relative Solar Power Index */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Relative Power Index
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              sin(el)
            </span>
          </div>

          <div className={isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"}>
            <span className={numberClass}>{powerIdx.toFixed(3)}</span>
            <span className="ml-1 font-mono text-[11px] text-[#687283]">
              rel. (0–1)
            </span>
          </div>
        </div>

        <div className={isCompact ? "mt-1.5 space-y-1" : "mt-3 space-y-1.5"}>
          <div
            aria-hidden="true"
            className="h-1 w-full overflow-hidden rounded-full bg-[#151922]"
          >
            <div
              className="h-full bg-[#eab354] transition-all duration-150"
              style={{ width: `${powerPct}%` }}
            />
          </div>
          <p className="text-[11px] text-[#687283] truncate">
            simple index, not mission power
          </p>
        </div>
      </div>
    </div>
  );

  if (isDeck) {
    return (
      <section
        aria-label="Current solar and Earth telemetry"
        className="rounded-[7px] border border-[#2d3544] bg-[#0f1218]/[0.96] shadow-[0_24px_60px_rgba(0,0,0,0.78)] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#1f2530] bg-[#151922] px-3 py-2">
          <span className="font-display text-xs font-semibold text-[#edf0f5]">
            Telemetry &amp; Power Cards
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Mask telemetry cards"
              className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#edf0f5] transition-colors"
            >
              <EyeOff size={12} />
              <span>Mask</span>
            </button>
          )}
        </div>
        {gridContent}
      </section>
    );
  }

  return (
    <section aria-label="Current solar and Earth telemetry">
      {gridContent}
    </section>
  );
}
