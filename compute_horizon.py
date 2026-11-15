import os
import json
import argparse
import numpy as np
import rasterio
from rasterio.windows import from_bounds
import pyproj
from scipy.ndimage import map_coordinates
import matplotlib.pyplot as plt
from PIL import Image

MOON_RADIUS = 1737400.0  # meters
DEM_40M_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_40MPP_ADJ.TIF"
DEM_80M_LOCAL = "raw/LDEM_80S_80MPP_ADJ.TIF"
DEM_40M_LOCAL = "raw/LDEM_80S_40MPP_ADJ.TIF"

# Configure GDAL for fast HTTP streaming of tiled Cloud-Optimized GeoTIFFs
os.environ['GDAL_DISABLE_READDIR_ON_OPEN'] = 'EMPTY_DIR'
os.environ['CPL_VSIL_CURL_ALLOWED_EXTENSIONS'] = '.TIF'
os.environ['GDAL_HTTP_MERGE_CONSECUTIVE_RANGES'] = 'YES'
os.environ['VSI_CACHE'] = 'TRUE'
os.environ['VSI_CACHE_SIZE'] = '100000000'

def compute_hillshade(dem_array, res=80.0, alt_deg=25.0, az_deg=315.0):
    valid = np.nan_to_num(dem_array, nan=np.nanmedian(dem_array) if not np.isnan(np.nanmedian(dem_array)) else 0.0)
    dy, dx = np.gradient(valid, res, res)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dy, dx)

    alt_rad = np.radians(alt_deg)
    az_rad = np.radians(360.0 - az_deg + 90.0)

    shaded = np.sin(alt_rad) * np.cos(slope) + np.cos(alt_rad) * np.sin(slope) * np.cos(az_rad - aspect)
    shaded = np.clip(255.0 * (shaded + 1.0) / 2.0, 0, 255).astype(np.uint8)
    return shaded

def get_local_north_and_east(lat, lon, transformer):
    x0, y0 = transformer.transform(lon, lat)
    d_lat = 0.01
    xn, yn = transformer.transform(lon, lat + d_lat)
    vn = np.array([xn - x0, yn - y0], dtype=np.float64)
    vn_norm = np.linalg.norm(vn)
    u_north = vn / vn_norm
    u_east = np.array([u_north[1], -u_north[0]], dtype=np.float64)
    grid_north_angle_deg = np.degrees(np.arctan2(u_north[1], u_north[0]))
    return u_north, u_east, grid_north_angle_deg

def compute_horizon_site(src, site, transformer, max_dist_m=60000.0, step_m=80.0, mast_height_m=0.0):
    lat, lon = site["lat"], site["lon"]
    x_site, y_site = transformer.transform(lon, lat)

    u_north, u_east, grid_north_deg = get_local_north_and_east(lat, lon, transformer)

    margin = step_m * 25.0
    radius = max_dist_m + margin
    left = max(src.bounds.left, x_site - radius)
    right = min(src.bounds.right, x_site + radius)
    bottom = max(src.bounds.bottom, y_site - radius)
    top = min(src.bounds.top, y_site + radius)

    win = from_bounds(left, bottom, right, top, transform=src.transform)
    win = win.round_offsets().round_lengths()
    win_transform = rasterio.windows.transform(win, src.transform)

    dem_win = src.read(1, window=win)

    sub_c_site = (x_site - win_transform.c) / win_transform.a - 0.5
    sub_r_site = (y_site - win_transform.f) / win_transform.e - 0.5
    z_site = float(map_coordinates(dem_win, [[sub_r_site], [sub_c_site]], order=1, mode='nearest')[0])

    az_deg = np.arange(360, dtype=np.float64)
    az_rad = np.radians(az_deg)

    ux = np.cos(az_rad) * u_north[0] + np.sin(az_rad) * u_east[0]
    uy = np.cos(az_rad) * u_north[1] + np.sin(az_rad) * u_east[1]

    d = np.arange(step_m, max_dist_m + 0.1, step_m, dtype=np.float64)
    X = x_site + ux[:, None] * d[None, :]
    Y = y_site + uy[:, None] * d[None, :]

    cols = (X - win_transform.c) / win_transform.a - 0.5
    rows = (Y - win_transform.f) / win_transform.e - 0.5

    coords = np.vstack([rows.ravel(), cols.ravel()])
    z_samples = map_coordinates(dem_win, coords, order=1, mode='nearest').reshape(360, len(d))

    drop = MOON_RADIUS - np.sqrt(MOON_RADIUS**2 - d**2)
    delta_z = z_samples - (z_site + mast_height_m) - drop[None, :]
    angles_deg = np.degrees(np.arctan2(delta_z, d[None, :]))

    horizon_deg = np.max(angles_deg, axis=1)

    return {
        "site_id": site["id"],
        "name": site["name"],
        "lat": lat,
        "lon": lon,
        "x": x_site,
        "y": y_site,
        "z_site": z_site,
        "u_north": u_north,
        "u_east": u_east,
        "grid_north_deg": grid_north_deg,
        "horizon_deg": horizon_deg,
        "dem_win": dem_win,
        "win_transform": win_transform,
        "sub_r_site": sub_r_site,
        "sub_c_site": sub_c_site
    }

def plot_and_verify_site(res, plots_dir):
    site_id = res["site_id"]
    name = res["name"]
    horizon = res["horizon_deg"]

    fig, ax = plt.subplots(figsize=(10, 4), dpi=150)
    az = np.arange(360)
    ax.plot(az, horizon, color="#1f77b4", lw=1.8, label="Horizon Profile")
    ax.fill_between(az, horizon, -10, color="#1f77b4", alpha=0.25)
    ax.axhline(0, color="gray", linestyle="--", lw=0.8, alpha=0.7, label="Local Horizontal (0°)")

    max_idx = int(np.argmax(horizon))
    ax.scatter([max_idx], [horizon[max_idx]], color="red", s=40, zorder=5,
               label=f"Peak: {horizon[max_idx]:.2f}° @ {max_idx}° az")

    ax.set_xlim(0, 359)
    ax.set_xticks(np.arange(0, 361, 45))
    ax.set_xticklabels(["N (0°)", "NE (45°)", "E (90°)", "SE (135°)", "S (180°)", "SW (225°)", "W (270°)", "NW (315°)", "N (360°)"])
    ax.set_ylabel("Elevation Angle (degrees)")
    ax.set_title(f"Horizon Profile: {name} (Elev: {res['z_site']:.1f} m)")
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(loc="upper right", framealpha=0.9)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, f"{site_id}_horizon.png"))
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw={"projection": "polar"}, dpi=150)
    theta = np.radians(az)
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)
    ax.plot(theta, horizon, color="#0055ff", lw=1.5)
    ax.fill(theta, horizon, color="#0055ff", alpha=0.25)
    ax.set_title(f"Polar Horizon View: {name}", va="bottom", pad=15)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, f"{site_id}_polar.png"))
    plt.close(fig)

    dem_win = res["dem_win"]
    hs = compute_hillshade(dem_win, res=80.0)
    fig, ax = plt.subplots(figsize=(7, 7), dpi=150)
    ax.imshow(hs, cmap="gray", origin="upper")

    r_site, c_site = res["sub_r_site"], res["sub_c_site"]
    ax.plot(c_site, r_site, marker="*", color="red", markersize=14, markeredgecolor="yellow", markeredgewidth=1.2, label=f"Site: {name}")

    arrow_len = 0.15 * dem_win.shape[1]
    dx_col = arrow_len * res["u_north"][0]
    dy_row = -arrow_len * res["u_north"][1]

    ax.annotate("", xy=(c_site + dx_col, r_site + dy_row), xytext=(c_site, r_site),
                arrowprops=dict(facecolor="cyan", edgecolor="black", width=2.5, headwidth=9))
    ax.text(c_site + dx_col * 1.15, r_site + dy_row * 1.15, "True North", color="cyan",
            fontweight="bold", fontsize=11, ha="center", va="center",
            bbox=dict(boxstyle="round,pad=0.2", facecolor="black", alpha=0.6, edgecolor="none"))

    ax.set_title(f"Terrain & Local True North: {name}\n(Lat: {res['lat']:.2f}°, Lon: {res['lon']:.2f}°)")
    ax.axis("off")
    ax.legend(loc="lower right", facecolor="white", framealpha=0.85)
    fig.tight_layout()
    fig.savefig(os.path.join(plots_dir, f"{site_id}_terrain_north.png"))
    plt.close(fig)

def generate_south_pole_hillshade(dem_path, out_path):
    with rasterio.open(dem_path) as src:
        down_shape = (src.height // 4, src.width // 4)
        down_dem = src.read(1, out_shape=down_shape, resampling=rasterio.enums.Resampling.bilinear)
        res_m = src.res[0] * 4.0
        hs = compute_hillshade(down_dem, res=res_m, alt_deg=20.0, az_deg=315.0)
        img = Image.fromarray(hs)
        img.save(out_path, format="PNG", optimize=True)
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"\nSaved South Pole Hillshade map: {out_path} ({size_mb:.2f} MB - under 2 MB limit)")

def main():
    parser = argparse.ArgumentParser(description="Lunar South Pole Horizon Profile Generator")
    parser.add_argument("--res", type=int, choices=[40, 80], default=80, help="DEM resolution in meters (80 or 40, default: 80)")
    parser.add_argument("--dem", type=str, default=None, help="Custom DEM path or URL")
    parser.add_argument("--mast-height", type=float, default=0.0, help="Observer mast height in meters (default: 0.0)")
    parser.add_argument("--max-dist", type=float, default=60000.0, help="Max terrain horizon distance in meters (default: 60000.0)")
    parser.add_argument("--step", type=float, default=None, help="Ray sampling step in meters (default: matching resolution)")
    parser.add_argument("--site", type=str, default="all", help="Site ID to process or 'all' (default: all)")
    parser.add_argument("--sites", type=str, default="sites.json", help="Path to sites.json")
    parser.add_argument("--compare-with-80", action="store_true", help="Compare computed horizon against 80m baseline")
    args = parser.parse_args()

    step_m = args.step if args.step is not None else float(args.res)
    if args.dem is not None:
        dem_source_path = args.dem
    elif args.res == 40:
        if os.path.exists(DEM_40M_LOCAL):
            dem_source_path = DEM_40M_LOCAL
            print(f"Using local 40m DEM: {dem_source_path}")
        else:
            dem_source_path = DEM_40M_URL
            print(f"Local 40m file not found. Streaming windowed reads directly from NASA COG: {dem_source_path}")
    else:
        dem_source_path = DEM_80M_LOCAL
        print(f"Using 80m DEM: {dem_source_path}")

    dem_label = f"LOLA LDEM_80S_{args.res}MPP_ADJ (PGDA)"

    out_json_dir = "output/horizon" if args.res == 80 else "output/horizon_40m"
    out_plots_dir = "output/plots" if args.res == 80 else "output/plots_40m"
    os.makedirs(out_json_dir, exist_ok=True)
    os.makedirs(out_plots_dir, exist_ok=True)

    geo_crs = pyproj.CRS.from_proj4(f"+proj=longlat +R={MOON_RADIUS} +no_defs")
    dem_crs = pyproj.CRS.from_string("IAU:30135")
    transformer = pyproj.Transformer.from_crs(geo_crs, dem_crs, always_xy=True)

    with open(args.sites, "r", encoding="utf-8") as f:
        all_sites = json.load(f)

    if args.site != "all":
        sites = [s for s in all_sites if s["id"] == args.site]
        if not sites:
            print(f"Error: Site ID '{args.site}' not found in {args.sites}")
            return
    else:
        sites = all_sites

    print("=" * 70)
    print(f"HORIZON CALCULATION: Resolution={args.res}m, Step={step_m}m, Mast={args.mast_height}m")
    print(f"Sites to process: {[s['id'] for s in sites]}")
    print("=" * 70)

    results = []
    with rasterio.open(dem_source_path) as src:
        for s in sites:
            print(f"\nProcessing '{s['id']}' ({s['name']})...")
            res = compute_horizon_site(src, s, transformer,
                                       max_dist_m=args.max_dist,
                                       step_m=step_m,
                                       mast_height_m=args.mast_height)
            results.append(res)

            plot_and_verify_site(res, out_plots_dir)

            elev_rounded = [float(round(val, 2)) for val in res["horizon_deg"]]
            json_out = {
                "site_id": s["id"],
                "az_step_deg": 1,
                "elev_deg": elev_rounded,
                "mast_height_m": args.mast_height,
                "dem_source": dem_label
            }
            json_path = os.path.join(out_json_dir, f"{s['id']}.json")
            with open(json_path, "w", encoding="utf-8") as jf:
                json.dump(json_out, jf, indent=2)
            print(f"  Saved horizon JSON: {json_path}")

    print("\n" + "=" * 70)
    print(f"SUMMARY STATISTICS ({args.res}m Resolution)")
    print("=" * 70)
    print(f"{'Site ID':20s} | {'Min (°)':>8s} | {'Max (°)':>8s} | {'Mean (°)':>8s} | {'Peak Az (°)':>11s}")
    print("-" * 65)
    for res in results:
        h = res["horizon_deg"]
        print(f"{res['site_id']:20s} | {np.min(h):8.2f} | {np.max(h):8.2f} | {np.mean(h):8.2f} | {int(np.argmax(h)):11d}")

    if args.compare_with_80 or args.res == 40:
        print("\n" + "=" * 70)
        print("COMPARISON: 40m DEM vs. 80m Baseline Horizon")
        print("=" * 70)
        print(f"{'Site ID':20s} | {'Mean Diff':>10s} | {'Max Diff':>9s} | {'RMS Diff':>9s} | {'Peak Az Diff':>13s}")
        print("-" * 70)
        for res in results:
            s_id = res["site_id"]
            h_80_file = os.path.join("output/horizon", f"{s_id}.json")
            if os.path.exists(h_80_file):
                with open(h_80_file) as f:
                    h80 = np.array(json.load(f)["elev_deg"])
                h_new = np.round(res["horizon_deg"], 2)
                diff = h_new - h80
                abs_diff = np.abs(diff)
                mean_abs = float(np.mean(abs_diff))
                max_abs = float(np.max(abs_diff))
                rms = float(np.sqrt(np.mean(diff**2)))
                peak_diff = abs(int(np.argmax(h_new)) - int(np.argmax(h80)))
                print(f"{s_id:20s} | {mean_abs:9.4f}° | {max_abs:8.4f}° | {rms:8.4f}° | {peak_diff:12d}°")
            else:
                print(f"{s_id:20s} | (80m baseline file not found)")

if __name__ == "__main__":
    main()
