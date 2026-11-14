export default function About() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-slate-300">
      <h1 className="text-2xl font-bold text-slate-100">About / Method</h1>
      <p>
        This tool shows, for a chosen lunar landing site and date, when the Sun and Earth are above the local terrain horizon, so
        planners can judge solar power and direct-to-Earth communication and compare alternatives when a mission slips.
        Built for the NASA Space Apps Challenge 2026 (Nagpur).
      </p>
      <h2 className="text-lg font-semibold text-slate-100">Data sources (TODO: verify and add exact product names and URLs)</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Sun and Earth azimuth/elevation as seen from each site: NASA JPL Horizons system, precomputed per site, UTC.</li>
        <li>Terrain horizon: LRO LOLA south pole elevation model (PDS Geosciences Node / Moon Trek), processed into a 360-value horizon profile per site.</li>
        <li>Site descriptions: NASA mission and Artemis pages, Moon Trek, Quickmap. Each site source is linked on the Planner page.</li>
      </ul>
      <h2 className="text-lg font-semibold text-slate-100">Method</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>A body counts as visible only if its elevation is above the terrain horizon at its azimuth (linear interpolation between 1° horizon samples).</li>
        <li>Times are UTC. Angles are degrees. Azimuth is clockwise from north.</li>
        <li>Sunrise, sunset, Earthrise and Earthset are the moments visibility changes between time steps, so resolution equals the step size of the data (default 60 min).</li>
      </ul>
      <h2 className="text-lg font-semibold text-slate-100">Assumptions and limits</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>No atmosphere, so no refraction. The Sun is treated as a point (its disk is ignored).</li>
        <li>The horizon depends on DEM resolution and the chosen mast height. Small features below the DEM resolution are not captured.</li>
        <li>Sites and dates are precomputed. Custom coordinates are on the roadmap, not available yet.</li>
        <li>This is a planning aid, not flight-certified. Verify against JPL Horizons and mission tools before real decisions.</li>
      </ul>
      <h2 className="text-lg font-semibold text-slate-100">Credits</h2>
      <p>NASA JPL Horizons, NASA LRO LOLA team, NASA Moon Trek and Quickmap, CSA Moon Exploration portal. Not endorsed by NASA.</p>
    </article>
  );
}
