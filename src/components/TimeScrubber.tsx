import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  Sunrise,
  Sunset,
} from "lucide-react";
import { timeUntil } from "../lib/events";

export type PlaySpeedHoursPerSec = 1 | 6 | 24;

interface TimeScrubberProps {
  startMs: number;
  endMs: number;
  valueMs: number;
  onChange: (epochMs: number) => void;
  outOfRange: "before" | "after" | null;
  nextSunriseMs?: number | null;
  nextSunsetMs?: number | null;
  nextEarthriseMs?: number | null;
  nextEarthsetMs?: number | null;
  showEventJumps?: boolean;
  variant?: "standard" | "floating" | "minimal";
}

export function TimeScrubber({
  startMs,
  endMs,
  valueMs,
  onChange,
  outOfRange,
  nextSunriseMs = null,
  nextSunsetMs = null,
  nextEarthriseMs = null,
  nextEarthsetMs = null,
  showEventJumps = true,
  variant = "standard",
}: TimeScrubberProps) {
  const [playing, setPlaying] = useState(false);
  const [speedHours, setSpeedHours] = useState<PlaySpeedHoursPerSec>(6);
  const [requestedOutside, setRequestedOutside] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(
    () => variant === "standard"
  );

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      onChange(valueMs + speedHours * 360_000);
    }, 100);
    return () => window.clearInterval(interval);
  }, [playing, speedHours, valueMs, onChange]);

  useEffect(() => {
    if (playing && valueMs >= endMs) {
      setPlaying(false);
    }
  }, [playing, valueMs, endMs]);

  const clampedMs = Math.max(startMs, Math.min(endMs, valueMs));
  const iso = new Date(clampedMs).toISOString();
  const datePart = iso.slice(0, 10);
  const timePart = iso.slice(11, 16);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    const candidate = Date.parse(`${newDate}T${timePart}:00Z`);
    if (Number.isNaN(candidate)) return;
    if (candidate < startMs || candidate > endMs) {
      setRequestedOutside(`${newDate} ${timePart} UTC`);
    } else {
      setRequestedOutside(null);
    }
    setPlaying(false);
    onChange(Math.max(startMs, Math.min(endMs, candidate)));
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    const candidate = Date.parse(`${datePart}T${newTime}:00Z`);
    if (Number.isNaN(candidate)) return;
    if (candidate < startMs || candidate > endMs) {
      setRequestedOutside(`${datePart} ${newTime} UTC`);
    } else {
      setRequestedOutside(null);
    }
    setPlaying(false);
    onChange(Math.max(startMs, Math.min(endMs, candidate)));
  };

  const shiftHours = (hours: number) => {
    setPlaying(false);
    const target = clampedMs + hours * 3_600_000;
    if (target < startMs || target > endMs) {
      setRequestedOutside(
        new Date(target).toISOString().slice(0, 16).replace("T", " ") + " UTC"
      );
    } else {
      setRequestedOutside(null);
    }
    onChange(Math.max(startMs, Math.min(endMs, target)));
  };

  const totalHours = Math.max(1, Math.round((endMs - startMs) / 3_600_000));
  const currentHourOffset = Math.round((clampedMs - startMs) / 3_600_000);

  const sunriseIn = timeUntil(nextSunriseMs, clampedMs);
  const sunsetIn = timeUntil(nextSunsetMs, clampedMs);
  const earthriseIn = timeUntil(nextEarthriseMs, clampedMs);
  const earthsetIn = timeUntil(nextEarthsetMs, clampedMs);

  const isMinimal = variant === "minimal";
  const isFloating = variant === "floating" || isMinimal;

  return (
    <section
      aria-label="UTC time scrubber and event navigation"
      className={
        isMinimal
          ? "relative rounded-[6px] border border-[#1f2530] bg-[#0f1218]/[0.90] px-2.5 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)]"
          : variant === "floating"
            ? "relative rounded-[7px] border border-[#1f2530] bg-[#0f1218]/[0.94] px-3.5 py-2.5 shadow-[0_16px_42px_rgba(0,0,0,0.7)] space-y-2"
            : "relative rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-4 space-y-3"
      }
    >
      {/* 1-Click Collapsible Date/Time Pickers, Fine Steppers & Event Jumps */}
      {showAdvanced && (
        <div
          className={
            isFloating
              ? "absolute bottom-full left-0 right-0 mb-2 z-30 flex flex-col gap-2.5 rounded-[7px] border border-[#2d3544] bg-[#0f1218]/[0.97] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.82)] lg:flex-row lg:items-center lg:justify-between"
              : "flex flex-col gap-3 rounded-[5px] border border-[#1f2530] bg-[#0b0e14] p-3 lg:flex-row lg:items-center lg:justify-between"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[#9aa3b2]">
              <span>Date</span>
              <input
                type="date"
                value={datePart}
                onChange={(e) => handleDateChange(e.target.value)}
                className="min-h-[34px] rounded-[4px] border border-[#2d3544] bg-[#090b10] px-2.5 py-1 font-mono text-xs text-[#edf0f5]"
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-[#9aa3b2]">
              <span>Time</span>
              <input
                type="time"
                value={timePart}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="min-h-[34px] rounded-[4px] border border-[#2d3544] bg-[#090b10] px-2.5 py-1 font-mono text-xs text-[#edf0f5]"
              />
            </label>

            <div
              role="group"
              aria-label="Step mission time"
              className="inline-flex items-center rounded-[4px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs font-mono"
            >
              <button
                type="button"
                onClick={() => shiftHours(-24)}
                className="rounded-[3px] px-2 py-1 text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
              >
                −1d
              </button>
              <button
                type="button"
                onClick={() => shiftHours(-1)}
                aria-label="Back 1 hour"
                className="inline-flex items-center rounded-[3px] px-1.5 py-1 text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
              >
                <ChevronLeft size={13} />
                <span>1h</span>
              </button>
              <button
                type="button"
                onClick={() => shiftHours(1)}
                aria-label="Forward 1 hour"
                className="inline-flex items-center rounded-[3px] px-1.5 py-1 text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
              >
                <span>1h</span>
                <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => shiftHours(24)}
                className="rounded-[3px] px-2 py-1 text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
              >
                +1d
              </button>
            </div>
          </div>

          {showEventJumps && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  {
                    label: "Next Sunrise",
                    aria: "Jump to next lunar sunrise",
                    ms: nextSunriseMs,
                    countdown: sunriseIn,
                    accent: "hover:border-[#eab354]",
                  },
                  {
                    label: "Next Sunset",
                    aria: "Jump to next lunar sunset",
                    ms: nextSunsetMs,
                    countdown: sunsetIn,
                    accent: "hover:border-[#eab354]",
                  },
                  {
                    label: "Next Earthrise",
                    aria: "Jump to next Earthrise",
                    ms: nextEarthriseMs,
                    countdown: earthriseIn,
                    accent: "hover:border-[#56B4E9]",
                  },
                  {
                    label: "Next Earthset",
                    aria: "Jump to next Earthset",
                    ms: nextEarthsetMs,
                    countdown: earthsetIn,
                    accent: "hover:border-[#56B4E9]",
                  },
                ] as const
              ).map((ev) => (
                <button
                  key={ev.label}
                  type="button"
                  disabled={ev.ms === null}
                  aria-label={ev.aria}
                  title={
                    ev.ms === null
                      ? `No ${ev.label.toLowerCase()} crossing exists after current time in loaded data`
                      : `Jump to ${new Date(ev.ms).toISOString()}`
                  }
                  onClick={() => {
                    if (ev.ms !== null) {
                      setPlaying(false);
                      setRequestedOutside(null);
                      onChange(ev.ms);
                    }
                  }}
                  className={`min-h-[34px] rounded-[4px] border border-[#1f2530] bg-[#151922] px-2.5 py-1 text-xs font-medium text-[#edf0f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${ev.accent}`}
                >
                  <span>{ev.label}</span>
                  {ev.countdown && (
                    <span className="ml-1.5 font-mono text-[11px] text-[#9aa3b2]">
                      · {ev.countdown}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isMinimal ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause timeline" : "Play timeline"}
            className={`inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
              playing
                ? "bg-[#eab354] text-[#090b10] hover:bg-[#f5cd79]"
                : "bg-[#edf0f5] text-[#090b10] hover:bg-white"
            }`}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            <span className="hidden sm:inline">{playing ? "Pause" : "Play"}</span>
          </button>

          <span className="font-mono text-[11px] font-medium text-[#edf0f5] tabular-nums whitespace-nowrap shrink-0">
            {datePart} {timePart} <span className="text-[#9aa3b2]">UTC</span>
          </span>

          <div className="flex-1 min-w-[70px] flex items-center">
            <label htmlFor="utc-time-slider" className="sr-only">
              Scrub mission time in UTC hours
            </label>
            <input
              id="utc-time-slider"
              type="range"
              min={0}
              max={totalHours}
              step={1}
              value={currentHourOffset}
              onChange={(e) => {
                setPlaying(false);
                setRequestedOutside(null);
                onChange(startMs + Number(e.target.value) * 3_600_000);
              }}
              className="telemetry-slider w-full"
            />
          </div>

          {showEventJumps && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={nextSunriseMs === null}
                onClick={() => {
                  if (nextSunriseMs !== null) {
                    setPlaying(false);
                    setRequestedOutside(null);
                    onChange(nextSunriseMs);
                  }
                }}
                aria-label="Jump to next lunar sunrise"
                title={
                  nextSunriseMs === null
                    ? "No lunar sunrise crossing after current time"
                    : `Jump to next lunar sunrise (${new Date(nextSunriseMs).toISOString()})`
                }
                className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[#1f2530] bg-[#151922] px-2 text-[11px] font-medium text-[#eab354] hover:border-[#eab354] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <Sunrise size={12} aria-hidden="true" />
                <span className="hidden md:inline">Next Sunrise</span>
                <span className="md:hidden">Rise</span>
              </button>
              <button
                type="button"
                disabled={nextSunsetMs === null}
                onClick={() => {
                  if (nextSunsetMs !== null) {
                    setPlaying(false);
                    setRequestedOutside(null);
                    onChange(nextSunsetMs);
                  }
                }}
                aria-label="Jump to next lunar sunset"
                title={
                  nextSunsetMs === null
                    ? "No lunar sunset crossing after current time"
                    : `Jump to next lunar sunset (${new Date(nextSunsetMs).toISOString()})`
                }
                className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[#1f2530] bg-[#151922] px-2 text-[11px] font-medium text-[#eab354] hover:border-[#eab354] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <Sunset size={12} aria-hidden="true" />
                <span className="hidden md:inline">Next Sunset</span>
                <span className="md:hidden">Set</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => shiftHours(14 * 24)}
            className="hidden sm:inline-flex h-7 items-center rounded-[4px] border border-[#eab354]/50 bg-[#eab354]/12 px-2 text-[11px] font-semibold text-[#eab354] hover:bg-[#eab354]/20 transition-colors whitespace-nowrap shrink-0"
          >
            +14d
          </button>

          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setRequestedOutside(null);
              onChange(startMs);
            }}
            aria-label="Reset mission clock to start"
            title="Reset to start"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] border border-[#1f2530] bg-[#151922] text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#edf0f5] transition-colors shrink-0"
          >
            <RotateCcw size={12} />
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[#1f2530] bg-[#090b10] px-2 text-[11px] font-medium text-[#9aa3b2] hover:border-[#2d3544] hover:text-[#edf0f5] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Date/Time</span>
            {showAdvanced ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      ) : (
        <>
          {/* Primary Calm Row: UTC Clock + Play + +14d Slip + 1-click Date/Jump drawer */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-baseline gap-2.5">
              <span className="hidden sm:inline text-[11px] font-medium text-[#9aa3b2]">
                Mission Clock
              </span>
              <div
                className={`font-mono font-semibold text-[#edf0f5] tabular-nums ${
                  isFloating ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                }`}
              >
                {datePart} {timePart}{" "}
                <span className="text-xs font-normal text-[#9aa3b2]">UTC</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isFloating ? "min-h-[32px]" : "min-h-[38px] px-4"
                } ${
                  playing
                    ? "bg-[#eab354] text-[#090b10] hover:bg-[#f5cd79]"
                    : "bg-[#edf0f5] text-[#090b10] hover:bg-white"
                }`}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                <span>{playing ? "Pause" : "Play"}</span>
              </button>

              <div
                role="group"
                aria-label="Playback speed"
                className="inline-flex rounded-[5px] border border-[#1f2530] bg-[#090b10] p-0.5 text-xs"
              >
                {(
                  [
                    [1, "1h/s"],
                    [6, "6h/s"],
                    [24, "1d/s"],
                  ] as const
                ).map(([spd, lbl]) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeedHours(spd)}
                    className={`rounded-[4px] px-2 py-1 font-mono whitespace-nowrap transition-colors ${
                      speedHours === spd
                        ? "bg-[#1c212c] text-[#edf0f5] font-semibold"
                        : "text-[#687283] hover:text-[#edf0f5]"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => shiftHours(14 * 24)}
                className={`rounded-[5px] border border-[#eab354]/50 bg-[#eab354]/12 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#eab354] hover:bg-[#eab354]/20 transition-colors whitespace-nowrap ${
                  isFloating ? "min-h-[32px]" : "min-h-[38px]"
                }`}
              >
                +14d Slip
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setRequestedOutside(null);
                  onChange(startMs);
                }}
                aria-label="Reset mission clock to start"
                className={`inline-flex items-center gap-1 rounded-[5px] border border-[#1f2530] bg-[#151922] px-2.5 py-1.5 text-xs text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#edf0f5] transition-colors whitespace-nowrap ${
                  isFloating ? "min-h-[32px]" : "min-h-[38px]"
                }`}
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className={`inline-flex items-center gap-1 rounded-[5px] border border-[#1f2530] bg-[#090b10] px-2.5 py-1.5 text-xs font-medium text-[#9aa3b2] hover:border-[#2d3544] hover:text-[#edf0f5] transition-colors whitespace-nowrap ${
                  isFloating ? "min-h-[32px]" : "min-h-[38px]"
                }`}
              >
                <span>Date &amp; Jumps</span>
                {showAdvanced ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              </button>
            </div>
          </div>

          {/* Smooth Range Slider */}
          <div className="space-y-1">
            <label htmlFor="utc-time-slider" className="sr-only">
              Scrub mission time in UTC hours
            </label>
            <input
              id="utc-time-slider"
              type="range"
              min={0}
              max={totalHours}
              step={1}
              value={currentHourOffset}
              onChange={(e) => {
                setPlaying(false);
                setRequestedOutside(null);
                onChange(startMs + Number(e.target.value) * 3_600_000);
              }}
              className="telemetry-slider w-full"
            />
            <div className="flex justify-between font-mono text-[10px] sm:text-[11px] text-[#687283] tabular-nums">
              <span>{new Date(startMs).toISOString().slice(0, 10)} UTC</span>
              <span>
                Hour {currentHourOffset} / {totalHours}
              </span>
              <span>{new Date(endMs).toISOString().slice(0, 10)} UTC</span>
            </div>
          </div>
        </>
      )}

      {(outOfRange || requestedOutside) && (
        <div
          role="status"
          className="rounded-[5px] border border-[#eab354]/50 bg-[#151922] px-3 py-1.5 text-xs text-[#eab354]"
        >
          {requestedOutside
            ? `Requested time (${requestedOutside}) is outside the loaded ephemeris window (${new Date(
                startMs
              )
                .toISOString()
                .slice(0, 10)} to ${new Date(endMs)
                .toISOString()
                .slice(0, 10)} UTC) and was clamped.`
            : "Selected time is outside the loaded ephemeris range and was clamped."}
        </div>
      )}
    </section>
  );
}
