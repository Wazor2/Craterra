import { EyeOff } from "lucide-react";
import { simplePowerIndex, timeUntil, type BodyState } from "../lib/events";
import type { WindowStats } from "../lib/windows";

interface NumberCardsProps {
  state: BodyState;
  nowMs: number;
  nextSunriseMs: number | null;
  nextSunsetMs: number | null;
  nextEarthriseMs: number | null;
  nextEarthsetMs: number | null;
  lunarDayStats?: WindowStats | null;
  variant?: "standard" | "floating" | "deck";
  onClose?: () => void;
}

function formatUtcShort(ms: number | null): string {
  if (ms === null) return "beyond loaded data range";
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function formatDurationHours(hours: number): string {
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remHours = Math.round((hours - days * 24) * 10) / 10;
    return `${days} d ${remHours.toFixed(1)} h`;
  }
  return `${hours.toFixed(1)} h`;
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
  lunarDayStats = null,
  variant = "standard",
  onClose,
}: NumberCardsProps) {
  const powerIdx = simplePowerIndex(state.sunEl, state.sunVisible);
  const sunsetInText = timeUntil(nextSunsetMs, nowMs);
  const sunriseInText = timeUntil(nextSunriseMs, nowMs);

  const earthsetInText = timeUntil(nextEarthsetMs, nowMs);
  const earthriseInText = timeUntil(nextEarthriseMs, nowMs);

  // Map margin [-10°, +10°] -> [0%, 100%] with 50% as terrain horizon threshold
  const sunHorizonMeterPct = clampPct(((state.sunMargin + 10) / 20) * 100);
  const earthHorizonMeterPct = clampPct(((state.earthMargin + 10) / 20) * 100);

  const isFloating = variant === "floating";
  const isDeck = variant === "deck";
  const isCompact = isFloating || isDeck;

  const containerClass = isDeck
    ? "grid grid-cols-2 gap-px bg-[#1f2530]"
    : isFloating
      ? "grid grid-cols-2 gap-2 lg:grid-cols-3"
      : "grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-[#1f2530] bg-[#1f2530] sm:grid-cols-2 lg:grid-cols-3";

  const cardClass = isDeck
    ? "flex flex-col justify-between bg-[#0f1218] p-2.5"
    : isFloating
      ? "flex flex-col justify-between rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.92] px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
      : "flex flex-col justify-between bg-[#0f1218] p-4";

  const numberClass = isCompact
    ? "font-mono text-base sm:text-lg font-semibold text-[#edf0f5] tabular-nums"
    : "font-mono text-2xl sm:text-3xl font-semibold text-[#edf0f5] tabular-nums";

  const sunlitPct = lunarDayStats ? lunarDayStats.sunlitPct : null;
  const longestDarkHours = lunarDayStats ? lunarDayStats.longestDarkHours : null;

  const gridContent = (
    <div className={containerClass}>
      {/* Card 1: Current Sun Elevation */}
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

          <div
            className={
              isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"
            }
          >
            <span className={numberClass}>
              {state.sunEl >= 0 ? "+" : ""}
              {state.sunEl.toFixed(2)}
            </span>
            <span className="ml-1 font-mono text-[11px] text-[#687283]">
              deg
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
            </span>{" "}
            <span className="text-[#687283]">
              · Pwr {powerIdx.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* Card 2: Time Until Sunset */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Time Until Sunset
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              {state.sunVisible ? "Daylight" : "Shadow"}
            </span>
          </div>

          <div className={isCompact ? "mt-1" : "mt-2"}>
            {sunsetInText ? (
              <span className={numberClass}>{sunsetInText}</span>
            ) : (
              <span className="font-mono text-xs font-medium text-[#eab354]">
                No sunset in window
              </span>
            )}
          </div>
        </div>

        <p
          className={`${
            isCompact ? "mt-1.5" : "mt-3"
          } font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate`}
          title={
            !state.sunVisible && sunriseInText
              ? `Next sunrise in ${sunriseInText} (${formatUtcShort(nextSunriseMs)})`
              : `Next sunset: ${formatUtcShort(nextSunsetMs)}`
          }
        >
          {!state.sunVisible && sunriseInText
            ? `Sunrise in ${sunriseInText}`
            : nextSunsetMs !== null
              ? `Sunset: ${formatUtcShort(nextSunsetMs)}`
              : "Continuously sunlit in window"}
        </p>
      </div>

      {/* Card 3: Earth Visible Yes / No */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Earth Visible (DTE)
            </span>
            <span
              className={`font-mono text-[11px] sm:text-xs font-semibold shrink-0 tabular-nums ${
                state.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"
              }`}
            >
              {state.earthEl >= 0 ? "+" : ""}
              {state.earthEl.toFixed(1)}°
            </span>
          </div>

          <div
            className={
              isCompact
                ? "mt-1 flex items-baseline gap-1.5"
                : "mt-2 flex items-baseline gap-2"
            }
          >
            <span
              className={`${
                isCompact
                  ? "font-mono text-base sm:text-lg font-semibold"
                  : "font-mono text-2xl sm:text-3xl font-semibold"
              } ${state.earthVisible ? "text-[#56B4E9]" : "text-[#d9826c]"}`}
            >
              {state.earthVisible ? "Yes" : "No"}
            </span>
            <span className="font-mono text-[11px] text-[#9aa3b2] truncate">
              {state.earthVisible ? "◆ Line of sight" : "◇ Occulted"}
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
            Margin {state.earthMargin >= 0 ? "+" : ""}
            {state.earthMargin.toFixed(2)}° vs horizon
          </p>
        </div>
      </div>

      {/* Card 4: Time Until Earthset */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Time Until Earthset
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              DTE Link
            </span>
          </div>

          <div className={isCompact ? "mt-1" : "mt-2"}>
            {earthsetInText ? (
              <span className={numberClass}>{earthsetInText}</span>
            ) : (
              <span className="font-mono text-xs font-medium text-[#56B4E9]">
                No Earthset in window
              </span>
            )}
          </div>
        </div>

        <p
          className={`${
            isCompact ? "mt-1.5" : "mt-3"
          } font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate`}
          title={
            !state.earthVisible && earthriseInText
              ? `Next Earthrise in ${earthriseInText} (${formatUtcShort(nextEarthriseMs)})`
              : `Next Earthset: ${formatUtcShort(nextEarthsetMs)}`
          }
        >
          {!state.earthVisible && earthriseInText
            ? `Earthrise in ${earthriseInText}`
            : nextEarthsetMs !== null
              ? `Earthset: ${formatUtcShort(nextEarthsetMs)}`
              : state.earthVisible
                ? "Continuously visible in window"
                : "Continuously occulted in window"}
        </p>
      </div>

      {/* Card 5: Sunlit Percentage Over a Lunar Day */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Sunlit % (Lunar Day)
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              29.53 d
            </span>
          </div>

          <div
            className={
              isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"
            }
          >
            <span className={numberClass}>
              {sunlitPct !== null ? `${sunlitPct.toFixed(1)}%` : "—"}
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
              style={{ width: `${clampPct(sunlitPct ?? 0)}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate">
            {lunarDayStats
              ? `${lunarDayStats.sunlitHours.toFixed(0)} h / ${lunarDayStats.actualHoursEvaluated.toFixed(0)} h sunlit`
              : "Computing lunar-day window"}
          </p>
        </div>
      </div>

      {/* Card 6: Longest Dark Period Over a Lunar Day */}
      <div className={cardClass}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-medium text-[#9aa3b2] truncate">
              Longest Dark Period
            </span>
            <span className="font-mono text-[11px] text-[#687283] shrink-0">
              29.53 d
            </span>
          </div>

          <div
            className={
              isCompact ? "mt-1 flex items-baseline" : "mt-2 flex items-baseline"
            }
          >
            <span className={numberClass}>
              {longestDarkHours !== null
                ? formatDurationHours(longestDarkHours)
                : "—"}
            </span>
          </div>
        </div>

        <p
          className={`${
            isCompact ? "mt-1.5" : "mt-3"
          } font-mono text-[11px] text-[#9aa3b2] tabular-nums truncate`}
        >
          {lunarDayStats
            ? `${longestDarkHours?.toFixed(1)} h max shadow · ${lunarDayStats.longestSunlitHours.toFixed(1)} h max light`
            : "Computing lunar-day window"}
        </p>
      </div>
    </div>
  );

  if (isDeck) {
    return (
      <section
        aria-label="Current solar and Earth telemetry"
        className="rounded-[7px] border border-[#2d3544] bg-[#0f1218]/[0.95] shadow-[0_24px_60px_rgba(0,0,0,0.78)] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#1f2530] bg-[#151922] px-3 py-2">
          <span className="font-display text-xs font-semibold text-[#edf0f5]">
            Key Numbers &amp; Lunar-Day Telemetry
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide telemetry cards"
              className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#edf0f5] transition-colors"
            >
              <EyeOff size={12} />
              <span>Hide</span>
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
