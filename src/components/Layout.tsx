import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export type AppRoute = "/" | "/compare" | "/about";

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: ReactNode;
}

const NAV_ITEMS: Array<{ route: AppRoute; label: string }> = [
  { route: "/", label: "Planner" },
  { route: "/compare", label: "Compare" },
  { route: "/about", label: "About / Method" },
];

export function Layout({ currentRoute, onNavigate, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: AppRoute) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  const primaryCtaRoute: AppRoute = currentRoute === "/compare" ? "/" : "/compare";
  const primaryCtaLabel =
    currentRoute === "/compare" ? "Open Planner" : "Compare Sites";

  const isFullScreen = currentRoute === "/";

  return (
    <div
      className={
        isFullScreen
          ? "h-screen overflow-hidden flex flex-col text-[#edf0f5]"
          : "min-h-screen flex flex-col text-[#edf0f5]"
      }
    >
      <header
        className={`sticky top-0 z-40 border-b border-[#1f2530] ${
          isFullScreen ? "bg-[#090b10]" : "bg-[#090b10]/92 backdrop-blur-md"
        }`}
      >
        <div
          className={`mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 ${
            isFullScreen ? "py-2" : "py-3"
          }`}
        >
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNav("/")}
            className="font-display text-base sm:text-lg font-semibold tracking-tight text-[#edf0f5] whitespace-nowrap shrink-0 text-left hover:text-[#eab354] transition-colors"
          >
            Cratera
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  aria-current={active ? "page" : undefined}
                  className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b transition-colors ${
                    active
                      ? "border-[#eab354] text-[#edf0f5]"
                      : "border-transparent text-[#9aa3b2] hover:text-[#edf0f5] hover:border-[#2d3544]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary crisp CTA + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav(primaryCtaRoute)}
              className="hidden sm:inline-flex items-center justify-center rounded-[5px] bg-[#edf0f5] px-3.5 py-1.5 text-xs font-semibold text-[#090b10] hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              {primaryCtaLabel}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#1f2530] bg-[#0f1218] text-[#edf0f5] hover:bg-[#151922] transition-colors"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#1f2530] bg-[#0f1218] px-4 py-3 flex flex-col gap-1.5"
          >
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNav(item.route)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full text-left px-3 py-3 rounded-[5px] text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[#151922] text-[#eab354] border border-[#2d3544]"
                      : "text-[#9aa3b2] hover:bg-[#151922] hover:text-[#edf0f5]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleNav(primaryCtaRoute)}
              className="mt-1 w-full rounded-[5px] bg-[#edf0f5] px-4 py-2.5 text-center text-xs font-semibold text-[#090b10] hover:bg-white transition-colors"
            >
              {primaryCtaLabel}
            </button>
          </nav>
        )}
      </header>

      <main
        className={
          isFullScreen
            ? "relative flex-1 w-full overflow-hidden min-h-0"
            : "mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:py-7"
        }
      >
        {children}
      </main>

      {!isFullScreen && (
        <footer className="border-t border-[#1f2530] bg-[#090b10]/80 py-5">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 text-xs text-[#687283] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              NASA Space Apps Challenge 2026 · All times UTC · Angles in degrees
              (N=0°, E=90°, S=180°, W=270°)
            </p>
            <p>
              Data &amp; terrain references: NASA JPL Horizons, LRO LOLA PDS
              Geosciences Node, NASA Moon Trek, LROC Quickmap
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
