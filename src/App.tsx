import { useCallback, useEffect, useState } from "react";
import { Layout, type AppRoute } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { ComparePage } from "./pages/ComparePage";
import { PlannerPage } from "./pages/PlannerPage";

const BASE_PATH = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function parseRouteFromLocation(): AppRoute {
  const raw = window.location.pathname;
  const rel =
    BASE_PATH && raw.startsWith(BASE_PATH) ? raw.slice(BASE_PATH.length) : raw;
  const clean = rel.replace(/\/+$/, "") || "/";
  if (clean === "/compare") return "/compare";
  if (clean === "/about") return "/about";
  return "/";
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromLocation());
  const [selectedSiteId, setSelectedSiteId] = useState<string>("shackleton_rim");
  const [compareSiteIds, setCompareSiteIds] = useState<string[]>([
    "shackleton_rim",
    "connecting_ridge",
    "malapert_massif",
  ]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRouteFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const targetUrl = `${BASE_PATH}${nextRoute === "/" ? "/" : nextRoute}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, "", targetUrl);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCompareSite = useCallback(
    (siteId: string) => {
      setCompareSiteIds((prev) => {
        if (prev.includes(siteId)) return prev;
        return [siteId, ...prev.slice(0, 2)];
      });
      navigate("/compare");
    },
    [navigate]
  );

  const handleOpenInPlanner = useCallback(
    (siteId: string) => {
      setSelectedSiteId(siteId);
      navigate("/");
    },
    [navigate]
  );

  return (
    <Layout currentRoute={route} onNavigate={navigate}>
      {route === "/" && (
        <PlannerPage
          selectedSiteId={selectedSiteId}
          onSelectSite={setSelectedSiteId}
          onCompareSite={handleCompareSite}
        />
      )}
      {route === "/compare" && (
        <ComparePage
          selectedIds={compareSiteIds}
          onChangeSelectedIds={setCompareSiteIds}
          onInspectSiteInPlanner={handleOpenInPlanner}
        />
      )}
      {route === "/about" && <AboutPage />}
    </Layout>
  );
}
