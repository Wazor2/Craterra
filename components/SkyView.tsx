import { horizonAt, type Ephemeris, type Horizon } from "@/lib/data";
import { SUN, EARTH, TERRAIN } from "./colors";

export default function SkyView({ eph, hz, idx }: { eph: Ephemeris; hz: Horizon; idx: number }) {
  const W = 720, H = 300, L = 44, R = 8, T = 10, B = 28;
  const pw = W - L - R, ph = H - T - B;
  const sunEl = eph.sun_el[idx], earthEl = eph.earth_el[idx];
  const sunAz = eph.sun_az[idx], earthAz = eph.earth_az[idx];
  const maxH = Math.max(...hz.elev_deg);
  const yMin = -5;
  const yMax = Math.min(90, Math.max(10, Math.ceil((Math.max(maxH, sunEl, earthEl) + 3) / 5) * 5));
  const x = (az: number) => L + (az / 360) * pw;
  const y = (el: number) => T + (1 - (el - yMin) / (yMax - yMin)) * ph;
  const pts = [`${x(0)},${y(yMin)}`];
  for (let a = 0; a <= 360; a += 2) pts.push(`${x(a)},${y(horizonAt(hz, a))}`);
  pts.push(`${x(360)},${y(yMin)}`);
  const step = yMax <= 20 ? 5 : 10;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += step) yTicks.push(v);
  const compass = [["N", 0], ["E", 90], ["S", 180], ["W", 270], ["N", 360]] as const;

  const body = (name: string, el: number, az: number, color: string) => {
    const inView = el >= yMin && el <= yMax;
    const visible = el > horizonAt(hz, az);
    if (!inView) return null;
    return (
      <g key={name}>
        <circle cx={x(az)} cy={y(el)} r={9} fill={visible ? color : "none"} stroke={visible ? "#fff" : color}
          strokeWidth={2} strokeDasharray={visible ? undefined : "3 2"} />
        <text x={x(az)} y={y(el) - 14} textAnchor="middle" fontSize={12} fill={color}>{name}</text>
      </g>
    );
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-gradient-to-b from-slate-950 to-slate-800"
        role="img" aria-label={`Sky view: Sun elevation ${sunEl.toFixed(1)} degrees, Earth elevation ${earthEl.toFixed(1)} degrees`}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#94a3b8" strokeOpacity={v === 0 ? 0.8 : 0.2}
              strokeDasharray={v === 0 ? "6 4" : undefined} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#cbd5e1">{v}°</text>
          </g>
        ))}
        {compass.map(([c, a], i) => (
          <g key={i}>
            <line x1={x(a)} x2={x(a)} y1={T} y2={H - B} stroke="#94a3b8" strokeOpacity={0.15} />
            <text x={x(a)} y={H - 10} textAnchor="middle" fontSize={12} fill="#cbd5e1">{c} ({a}°)</text>
          </g>
        ))}
        <polygon points={pts.join(" ")} fill={TERRAIN} stroke="#9ca3af" />
        {body("Sun", sunEl, sunAz, SUN)}
        {body("Earth", earthEl, earthAz, EARTH)}
        <text x={L} y={T + 12} fontSize={11} fill="#94a3b8">Elevation (°) vs azimuth (° clockwise from N)</text>
      </svg>
      <p className="mt-1 text-xs text-slate-400">
        <span style={{ color: SUN }}>● Sun</span> · <span style={{ color: EARTH }}>● Earth</span> · filled = above terrain
        horizon (visible), dashed ring = hidden · grey = terrain silhouette ({hz.dem_source}, mast {hz.mast_height_m} m)
        {sunEl < yMin || earthEl < yMin ? " · a body far below the horizon is off-chart" : ""}
      </p>
    </div>
  );
}
