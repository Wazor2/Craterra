import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  GripHorizontal,
  MapPin,
  Maximize2,
  Minus,
  X,
} from "lucide-react";
import type { Site, Summaries } from "../lib/types";
import { SitePicker } from "./SitePicker";

interface FloatingSitesWindowProps {
  sites: Site[];
  selectedId: string;
  onSelect: (siteId: string) => void;
  summaries?: Summaries | null;
  open: boolean;
  onClose: () => void;
  onCompareSite?: (siteId: string) => void;
}

export function FloatingSitesWindow({
  sites,
  selectedId,
  onSelect,
  summaries,
  open,
  onClose,
  onCompareSite,
}: FloatingSitesWindowProps) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 16, y: 66 };
    return {
      x: 16,
      y: 66,
    };
  });

  const windowRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const handleResize = () => {
      const el = windowRef.current;
      const w = el?.offsetWidth ?? 288;
      const h = el?.offsetHeight ?? 400;
      setPos((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - w - 12, prev.x)),
        y: Math.max(60, Math.min(window.innerHeight - Math.min(h, 140) - 12, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!open) return null;

  const activeSite = sites.find((s) => s.id === selectedId);
  const activeStats = summaries?.[selectedId]?.stats;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 640) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const el = windowRef.current;
    const w = el?.offsetWidth ?? 288;
    const h = el?.offsetHeight ?? 400;
    const nextX = drag.origX + (e.clientX - drag.startX);
    const nextY = drag.origY + (e.clientY - drag.startY);
    setPos({
      x: Math.max(12, Math.min(window.innerWidth - w - 12, nextX)),
      y: Math.max(60, Math.min(window.innerHeight - Math.min(h, 140) - 12, nextY)),
    });
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      dragRef.current = null;
    }
  };

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label="Landing sites floating window"
      style={
        typeof window !== "undefined" && window.innerWidth >= 640
          ? { left: `${pos.x}px`, top: `${pos.y}px` }
          : undefined
      }
      className="fixed left-3 right-3 top-[64px] z-30 sm:right-auto sm:w-[288px] rounded-[7px] border border-[#2d3544] bg-[#0f1218]/[0.96] shadow-[0_24px_60px_rgba(0,0,0,0.78)] overflow-hidden"
    >
      {/* Draggable Floating Window Title Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex items-center justify-between gap-2 border-b border-[#1f2530] bg-[#151922] px-3 py-2 sm:cursor-grab sm:active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal
            size={14}
            aria-hidden="true"
            className="hidden sm:block shrink-0 text-[#687283]"
          />
          <MapPin
            size={13}
            aria-hidden="true"
            className="shrink-0 text-[#eab354]"
          />
          <span className="font-display text-xs font-semibold text-[#edf0f5] truncate">
            Landing Sites
          </span>
          <span className="font-mono text-[11px] text-[#687283] tabular-nums">
            ({sites.length})
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? "Expand landing sites window" : "Minimize landing sites window"}
            title={minimized ? "Expand" : "Minimize"}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#edf0f5] transition-colors"
          >
            {minimized ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close landing sites window"
            title="Close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[#9aa3b2] hover:bg-[#1c212c] hover:text-[#d9826c] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#151922]/70 transition-colors"
        >
          <div className="min-w-0">
            <div className="font-display text-xs font-semibold text-[#edf0f5] truncate">
              {activeSite?.name ?? selectedId}
            </div>
            {activeStats && (
              <div className="mt-0.5 font-mono text-[11px] text-[#9aa3b2] tabular-nums">
                Sun {activeStats.sunlit_pct}% · DTE {activeStats.earth_visible_pct}%
              </div>
            )}
          </div>
          <span className="font-mono text-[11px] text-[#eab354] shrink-0">
            Expand
          </span>
        </button>
      ) : (
        <div className="max-h-[55vh] sm:max-h-[calc(100vh-340px)] min-h-[200px] overflow-y-auto p-3 space-y-2.5">
          <SitePicker
            sites={sites}
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect(id);
              if (typeof window !== "undefined" && window.innerWidth < 640) {
                onClose();
              }
            }}
            summaries={summaries}
            layout="floating"
          />

          {activeSite && onCompareSite && (
            <div className="flex items-center justify-between border-t border-[#1f2530] pt-2 text-[11px]">
              <span className="font-mono text-[#687283] truncate">
                {activeSite.lat.toFixed(2)}°, {activeSite.lon.toFixed(2)}°E
              </span>
              <button
                type="button"
                onClick={() => onCompareSite(activeSite.id)}
                className="font-medium text-[#56B4E9] hover:text-sky-300 transition-colors shrink-0"
              >
                Compare this site →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
