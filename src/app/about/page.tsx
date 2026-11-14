import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur md:flex-row md:items-center md:justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-400">
                NASA Space Apps Challenge 2026
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Scientific Methodology & Data Provenance
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/"
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Planner
            </Link>
            <Link
              href="/compare"
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Compare
            </Link>
            <Link
              href="/about"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-emerald-300 transition"
            >
              Methodology
            </Link>
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Scientific Principles */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-sky-400 font-mono text-sm">[01]</span>
                Celestial Ephemeris & The MOON_ME Reference Frame
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The core principle separates global celestial ephemeris from site-specific terrain.
                All calculations are executed within the standard NASA NAIF / IAU Moon body-fixed reference frame:
                <code className="text-sky-300 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded ml-1">MOON_ME</code> (Mean Earth / Polar Axis frame).
              </p>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong className="text-white">Sun Orbit:</strong> The Moon&apos;s equatorial plane is inclined only <strong>1.5424°</strong> to the ecliptic. At the lunar poles, solar elevation oscillates narrowly between -1.54° and +1.54° across the 29.53-day synodic month.
                </li>
                <li>
                  <strong className="text-white">Earth Libration:</strong> Optical and physical librations in longitude (±7.9°) and latitude (±6.7°) cause the Earth&apos;s apparent position to trace elliptical patterns in the lunar sky.
                </li>
                <li>
                  <strong className="text-white">Topocentric Parallax Correction:</strong> Earth is calculated from the true landing site position rather than Moon center:
                  <code className="block mt-1 bg-slate-950 p-2 rounded font-mono text-sky-300 text-[11px]">
                    r_Earth_topo = r_Earth_Moon - r_site_Moon
                  </code>
                  Because the Moon&apos;s radius is 1,737.4 km and distance to Earth is ~384,400 km, topocentric displacement shifts Earth&apos;s elevation by up to ~0.3°, critical for grazing horizon visibility.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-amber-400 font-mono text-sm">[02]</span>
                LOLA Terrain Horizon & Spherical Curvature Correction
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Local terrain obstruction is analyzed across 360 compass azimuths (0° North, 90° East, 180° South, 270° West) using high-resolution elevation products from the Lunar Orbiter Laser Altimeter (LOLA) aboard NASA&apos;s Lunar Reconnaissance Orbiter (LRO).
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono space-y-2 text-slate-300">
                <p className="text-amber-300 font-bold">Horizon Elevation Algorithm:</p>
                <p>1. Sample outward along 360 radial azimuth rays up to 35 km extent.</p>
                <p>2. Correct each terrain sample for lunar spherical drop: <span className="text-sky-300">Δh = d² / (2 · R_moon)</span> where R_moon = 1,737.4 km.</p>
                <p>3. Calculate elevation angle: <span className="text-sky-300">θ = arctan((h_sample - h_site - Δh) / d)</span>.</p>
                <p>4. Determine maximum obstruction angle H(α) for each degree.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400 font-mono text-sm">[03]</span>
                Solar Disk & Geometric Line-of-Sight States
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">Solar Illumination Model</span>
                  <p className="leading-relaxed">
                    Accounting for the Sun&apos;s 0.533° angular diameter (±0.266° semi-diameter):
                  </p>
                  <ul className="mt-1 space-y-1 font-mono text-[11px] text-slate-400">
                    <li>• Full Disk: β_sun - 0.266° ≥ H(α)</li>
                    <li>• Partial Disk: |β_sun - H(α)| &lt; 0.266°</li>
                    <li>• Occulted: β_sun + 0.266° &lt; H(α)</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <span className="font-bold text-sky-400 block mb-1">Earth Communication Model</span>
                  <p className="leading-relaxed">
                    Evaluated strictly as <strong>geometric line-of-sight visibility</strong>. Does not guarantee operational RF communication link closure (which requires antenna gain, transmitter power, and link budget analysis).
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Rail: Provenance, Datasets & Credits */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Authoritative NASA Sources
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li>
                  <a
                    href="https://naif.jpl.nasa.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-semibold block"
                  >
                    NASA NAIF SPICE ↗
                  </a>
                  Kernels DE440, moon_pa_de440, moon_de440, and pck00011.
                </li>
                <li>
                  <a
                    href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-semibold block"
                  >
                    NASA PDS Geosciences Node LOLA ↗
                  </a>
                  LRO LOLA Gridded Data Records (GDR) polar elevation products.
                </li>
                <li>
                  <a
                    href="https://pgda.gsfc.nasa.gov/products/78"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-semibold block"
                  >
                    NASA GSFC Planetary Geodynamics (PGDA) ↗
                  </a>
                  High-resolution 5 m/pixel polar stereographic digital elevation models.
                </li>
                <li>
                  <a
                    href="https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-semibold block"
                  >
                    NASA NSSDCA Apollo Landing Coordinates ↗
                  </a>
                  Published coordinates for Apollo missions.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Multidisciplinary Team
              </h3>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div><span className="text-sky-300 font-bold">OM:</span> Lead Architect & Integration</div>
                <div><span className="text-amber-300 font-bold">JAY:</span> Celestial Ephemeris & NAIF SPICE</div>
                <div><span className="text-emerald-300 font-bold">KALYANI:</span> LOLA Terrain & Curvature Rays</div>
                <div><span className="text-indigo-300 font-bold">SACHI:</span> UI & Scientific Visualizations</div>
                <div><span className="text-violet-300 font-bold">MANAN:</span> Data Research & JPL Horizons Verification</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl text-xs space-y-2 text-slate-400">
              <span className="font-semibold text-slate-300 block uppercase font-mono">Disclaimer</span>
              <p>
                Built for the NASA Space Apps Challenge 2026. Candidate Artemis landing regions are evaluated using publicly designated representative points and do not represent formal agency-approved landing sites.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
