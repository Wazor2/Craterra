import { ExternalLink } from "lucide-react";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-[#1f2530] pb-5">
        <p className="font-mono text-xs uppercase tracking-wider text-[#9aa3b2]">
          Documentation &amp; Physics Reference
        </p>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#edf0f5] text-balance">
          About &amp; Method
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#9aa3b2] leading-relaxed">
          Built for the NASA Space Apps Challenge 2026 to help mission planners
          evaluate solar power continuity and direct-to-Earth communications
          across lunar south pole ridges and Apollo baseline sites.
        </p>
      </header>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          1. How Visibility Is Calculated (Plain Language)
        </h2>
        <p className="text-sm text-[#9aa3b2] leading-relaxed">
          At the Moon&apos;s south pole, the Sun circles the entire 360° horizon
          once every 29.53 Earth days at elevations within a few degrees of the
          horizon. Meanwhile, Earth hovers in a limited azimuth band and nods up
          and down by roughly ±6.7° every 27.21 days due to lunar orbital
          libration. Even a small crater rim or ridge can block sunlight or break
          direct-to-Earth radio contact.
        </p>
        <p className="text-sm text-[#9aa3b2] leading-relaxed">
          For every hourly step in UTC, this tool looks up the Sun and Earth
          azimuth and elevation, linearly interpolates the local terrain height
          at that compass direction across a 360-degree horizon profile (wrapping
          smoothly between 359° and 0°), and computes{" "}
          <code className="font-mono text-[#eab354]">
            margin = body_el − horizonAt(body_az)
          </code>
          . A body is visible strictly when{" "}
          <code className="font-mono text-[#eab354]">margin &gt; 0</code>.
        </p>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          2. Physical Assumptions
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-[#9aa3b2] leading-relaxed">
          <li>
            <strong className="text-[#edf0f5]">Airless body (no atmospheric refraction):</strong>{" "}
            Unlike on Earth, lunar sunrise and sunset happen strictly when the
            body passes above or below the geometric terrain horizon.
          </li>
          <li>
            <strong className="text-[#edf0f5]">Disc centre, not limb:</strong>{" "}
            Sun and Earth azimuth and elevation represent the geometric centre of
            each disc (note that the Sun subtends ~0.53° and Earth subtends
            ~1.9° in the lunar sky, so partial illumination or partial Earth
            visibility begins slightly earlier).
          </li>
          <li>
            <strong className="text-[#edf0f5]">Smooth reference Moon + terrain file:</strong>{" "}
            The celestial ephemeris is computed on a smooth reference Moon in
            the IAU Mean Earth / Polar Axis frame; local topography enters
            strictly through each site&apos;s 360° horizon profile.
          </li>
          <li>
            <strong className="text-[#edf0f5]">Mast height:</strong> Horizon
            profiles assume a lander solar/antenna mast height of 2.0 m above
            local regolith (or 0 m when no terrain data is available and a flat
            0° horizon is assumed).
          </li>
          <li>
            <strong className="text-[#edf0f5]">Relative solar power index:</strong>{" "}
            Computed as{" "}
            <code className="font-mono text-[#eab354]">max(0, sin(sun_el))</code>{" "}
            only when the Sun is above local terrain. It is explicitly labelled{" "}
            <em>&ldquo;simple index, not mission power&rdquo;</em> because real
            arrays depend on panel tilt, tracking, and thermal derating.
          </li>
          <li>
            <strong className="text-[#edf0f5]">UTC time only:</strong> All
            timestamps, heatmaps, and crossings operate strictly in UTC.
          </li>
        </ul>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          3. Current Limitations
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-[#9aa3b2] leading-relaxed">
          <li>
            <strong className="text-[#edf0f5]">Curated site catalog:</strong>{" "}
            Currently covers 6 curated sites (4 South Pole targets and 2 Apollo
            baselines) over a 90-day window (2026-12-01 to 2027-03-01 UTC).
          </li>
          <li>
            <strong className="text-[#edf0f5]">Hourly step interpolation:</strong>{" "}
            Sunrise, sunset, Earthrise, and Earthset times are linearly
            interpolated between 60-minute ephemeris steps; very brief grazing
            passes shorter than 1 hour may be missed.
          </li>
          <li>
            <strong className="text-[#edf0f5]">DEM resolution dependence:</strong>{" "}
            Terrain horizon accuracy depends on gridded LOLA DEM resolution (20
            m/px to 60 m/px); meter-scale boulders and micro-craters at the
            exact touchdown point are not resolved.
          </li>
          <li>
            <strong className="text-[#edf0f5]">No custom coordinates in browser yet:</strong>{" "}
            Custom arbitrary lat/lon queries require generating a matching
            horizon ray-cast from gridded DEM tiles.
          </li>
        </ul>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          4. Data Sources &amp; NASA Credits
        </h2>
        <div className="space-y-2.5 text-sm text-[#9aa3b2]">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2530] pb-2">
            <span>
              <strong className="text-[#edf0f5]">JPL Horizons System</strong> —
              Selenocentric observer coordinate model (coord@301) &amp; Cassini
              libration geometry
            </span>
            <a
              href="https://ssd.jpl.nasa.gov/horizons/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#56B4E9] hover:underline shrink-0"
            >
              <span>ssd.jpl.nasa.gov</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2530] pb-2">
            <span>
              <strong className="text-[#edf0f5]">LRO LOLA Gridded Elevation Products</strong>{" "}
              — South pole polar stereographic &amp; SLDEM2015 topography (PDS
              Geosciences Node)
            </span>
            <a
              href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#56B4E9] hover:underline shrink-0"
            >
              <span>PDS LOLA</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2530] pb-2">
            <span>
              <strong className="text-[#edf0f5]">NASA Moon Trek &amp; LROC Quickmap</strong>{" "}
              — Site context, Artemis III regions, and Apollo terrain validation
            </span>
            <a
              href="https://trek.nasa.gov/moon/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#56B4E9] hover:underline shrink-0"
            >
              <span>trek.nasa.gov</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="text-[#edf0f5]">NASA Artemis III &amp; Apollo Archives</strong>{" "}
              — Candidate region descriptions and historic landing coordinates
            </span>
            <a
              href="https://www.nasa.gov/missions/artemis/artemis-iii-candidate-landing-regions/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#56B4E9] hover:underline shrink-0"
            >
              <span>nasa.gov/artemis</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          5. Lunar &amp; Deep-Space Texture Provenance (Source Resolution &amp; Coverage)
        </h2>
        <p className="text-xs text-[#9aa3b2] leading-relaxed">
          Equirectangular pixel dimensions (4096 × 2048) do not guarantee
          uniform physical detail across all lunar latitudes. Below are the
          actual NASA source resolutions, native geographic extents, and
          WebGL filtering settings used by the 3D globe and terrain viewports:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1f2530] text-[#9aa3b2] font-mono">
                <th className="py-2 pr-3 font-medium">Texture Layer</th>
                <th className="py-2 pr-3 font-medium">Source Dataset</th>
                <th className="py-2 pr-3 font-medium">Native Scale</th>
                <th className="py-2 font-medium">Coverage &amp; Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2530]/70 text-[#9aa3b2]">
              <tr>
                <td className="py-2.5 pr-3 font-mono text-[#edf0f5] whitespace-nowrap">
                  Global Albedo (4096×2048 WebP)
                </td>
                <td className="py-2.5 pr-3">
                  NASA SVS #4720 (Dec 2025): LROC WAC Hapke Normalized Mosaic (643/566/415 nm) + LOLA LDAM_10
                </td>
                <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                  ~100 m/px WAC; 10 px/deg poles
                </td>
                <td className="py-2.5">
                  Optical LROC mosaic spans <strong className="text-[#edf0f5]">70°N–70°S</strong>; polar zones (<strong className="text-[#edf0f5]">70°–90° N/S</strong>) are filled with LOLA 1064 nm active laser albedo where permanent shadows obscure passive optics. Centered on 0° longitude (IAU Mean Earth).
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-mono text-[#edf0f5] whitespace-nowrap">
                  Global Elevation &amp; Normals (4096×2048 WebP)
                </td>
                <td className="py-2.5 pr-3">
                  NASA SVS #4720 / LRO LOLA GDR (<code className="font-mono text-[#eab354]">ldem_16_uint.tif</code>)
                </td>
                <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                  16 px/deg (~1.89 km/px eq), 0.5 m vert.
                </td>
                <td className="py-2.5">
                  Full global <strong className="text-[#edf0f5]">90°S–90°N</strong> coverage (−8,981.5 m to +10,685.5 m relative to 1,737.4 km sphere) without basin clipping. Normals apply <code className="font-mono">1/cos(lat)</code> spherical metric scaling and periodic 180° seam wrapping.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-mono text-[#edf0f5] whitespace-nowrap">
                  South Pole Regional Cap &amp; Terrain Patches (2048×2048 &amp; 97×97)
                </td>
                <td className="py-2.5 pr-3">
                  NASA PDS <code className="font-mono text-[#56B4E9]">LRO-L-LOLA-4-GDR-V1.0</code> (<code className="font-mono">LDEM_80S_80M.IMG</code>)
                </td>
                <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                  80 m/px native (379 px/deg); ~297 m/px globe cap
                </td>
                <td className="py-2.5">
                  Polar stereographic projection (<strong className="text-[#edf0f5]">80°S–90°S</strong>, DE421 Mean Earth/Polar Axis). Eliminates equirectangular pole pinch on the Moon globe and supplies native 80 m/px site relief (±3.84 km) inside zoomed-in 3D Terrain views.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-mono text-[#edf0f5] whitespace-nowrap">
                  Deep-Space Starfield (4096×2048 WebP)
                </td>
                <td className="py-2.5 pr-3">
                  NASA SVS #4851 Deep Star Maps 2020 (Gaia DR2, Hipparcos-2, Tycho-2) + 3D Spherical Sky Shader
                </td>
                <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                  4096×2048 HDR <code className="font-mono">asinh</code> stretch
                </td>
                <td className="py-2.5">
                  Full-sky 4π steradian celestial backdrop combining 1.7B-star Gaia astrometry with multi-shell GLSL starfields and seamless 3D nebula, cosmic dust, and distant galaxy layers.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#687283] leading-relaxed">
          WebGL sampling uses trilinear mipmapping (<code className="font-mono text-[#9aa3b2]">LinearMipmapLinearFilter</code>), hardware maximum anisotropic filtering, periodic equatorial <code className="font-mono text-[#9aa3b2]">RepeatWrapping</code> with clamped polar edges to prevent ±180° meridian seams, and high-quality WebP compression to avoid 8×8 JPEG DCT blocking in smooth mare basins and normal maps.
        </p>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-3">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          6. Product Roadmap (Unbuilt Features)
        </h2>
        <p className="text-xs text-[#687283]">
          The capabilities below are planned for future iterations and are not
          currently active in this build:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#9aa3b2]">
          <li>
            Custom coordinate entry (arbitrary south pole lat/lon with live DEM
            horizon ray-casting)
          </li>
          <li>
            High-resolution LRO NAC elevation mesh streaming inside the 3D terrain
            observatory
          </li>
          <li>
            Expanded candidate catalog (15+ Artemis / CLPS regions and PSRs)
          </li>
          <li>Shareable mission state URLs with date and site presets</li>
        </ul>
      </section>

      <section className="rounded-[6px] border border-[#1f2530] bg-[#0f1218] p-5 space-y-2">
        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#edf0f5]">
          7. AI Tool Use Disclosure
        </h2>
        <p className="text-sm text-[#9aa3b2] leading-relaxed">
          All numerical site summaries in{" "}
          <code className="font-mono text-[#edf0f5]">summaries.json</code> and
          mission metrics displayed in the UI are generated deterministically by
          code directly from the ephemeris and terrain horizon arrays—no
          generative AI calls occur at runtime, and no numbers are fabricated.
          AI coding assistance was used during software scaffolding, UI layout
          implementation, and unit test authoring under human review.
        </p>
      </section>
    </div>
  );
}
