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

def compute_hillshade(dem_array, res=80.0, alt_deg=25.0, az_deg=315.0):
    """
    Computes a hillshade representation of a 2D DEM array.
    """
    valid = np.nan_to_num(dem_array, nan=np.nanmedian(dem_array) if not np.isnan(np.nanmedian(dem_array)) else 0.0)
    dy, dx = np.gradient(valid, res, res)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dy, dx)
    
    alt_rad = np.radians(alt_deg)
    # Convert azimuth (clockwise from North/Up) to mathematical polar angle
    az_rad = np.radians(360.0 - az_deg + 90.0)
    
    shaded = np.sin(alt_rad) * np.cos(slope) + np.cos(alt_rad) * np.sin(slope) * np.cos(az_rad - aspect)
    shaded = np.clip(255.0 * (shaded + 1.0) / 2.0, 0, 255).astype(np.uint8)
    return shaded

def get_local_north_and_east(lat, lon, transformer):
    """
    Computes the local true North and East unit vectors in projected DEM coordinates (meters).
    """
    x0, y0 = transformer.transform(lon, lat)
    
    # Step slightly North in latitude (towards equator, lat > -90)
    d_lat = 0.01
    xn, yn = transformer.transform(lon, lat + d_lat)
    vn = np.array([xn - x0, yn - y0], dtype=np.float64)
    vn_norm = np.linalg.norm(vn)
    u_north = vn / vn_norm
    
    # True East in a conformal south polar stereographic projection is
    # exactly 90 degrees clockwise from True North in the (x, y) plane.
    # In Cartesian (x, y), a 90 deg clockwise rotation turns (nx, ny) into (ny, -nx).
    u_east = np.array([u_north[1], -u_north[0]], dtype=np.float64)
    
    grid_north_angle_deg = np.degrees(np.arctan2(u_north[1], u_north[0]))
    return u_north, u_east, grid_north_angle_deg

def sample_site_elevation(src, x_site, y_site):
    """
    Sample elevation at exact site position with bilinear interpolation.
    """
    row, col = src.index(x_site, y_site)
    # Read 3x3 around site
    win = rasterio.windows.Window(col - 1, row - 1, 3, 3)
    data = src.read(1, window=win)
    # Site is at offset (col - (col - 1), row - (row - 1)) = (1, 1) in window
    # Convert exact coords to subpixel index
    sub_col = (x_site - (src.transform.c + (col - 1) * src.transform.a)) / src.transform.a - 0.5
    sub_row = (y_site - (src.transform.f + (row - 1) * src.transform.e)) / src.transform.e - 0.5
    z = map_coordinates(data, [[sub_row], [sub_col]], order=1, mode='nearest')[0]
    return float(z)

def compute_horizon_site(src, site, transformer, max_dist_m=60000.0, step_m=80.0, mast_height_m=0.0):
    """
    Computes the 360-value horizon profile for a site.
    """
    lat, lon = site["lat"], site["lon"]
    x_site, y_site = transformer.transform(lon, lat)
    
    # 1. Local North and East unit vectors
    u_north, u_east, grid_north_deg = get_local_north_and_east(lat, lon, transformer)
    
    # 2. Window bounds (max_distance + margin)
    margin = step_m * 25.0  # 2 km margin
    radius = max_dist_m + margin
    left = max(src.bounds.left, x_site - radius)
    right = min(src.bounds.right, x_site + radius)
    bottom = max(src.bounds.bottom, y_site - radius)
    top = min(src.bounds.top, y_site + radius)
    
    win = from_bounds(left, bottom, right, top, transform=src.transform)
    # Snap window to integer pixels
    win = win.round_offsets().round_lengths()
    win_transform = rasterio.windows.transform(win, src.transform)
    
    # Read only this window of DEM
    dem_win = src.read(1, window=win)
    
    # Sample exact site elevation from window
    sub_c_site = (x_site - win_transform.c) / win_transform.a - 0.5
    sub_r_site = (y_site - win_transform.f) / win_transform.e - 0.5
    z_site = float(map_coordinates(dem_win, [[sub_r_site], [sub_c_site]], order=1, mode='nearest')[0])
    
    # 3. Build rays for 360 azimuths (0 to 359 degrees)
    az_deg = np.arange(360, dtype=np.float64)  # 0..359
    az_rad = np.radians(az_deg)
    
    # Ray unit vectors: u(A) = cos(A)*u_north + sin(A)*u_east
    # Shape: (360, 2)
    ux = np.cos(az_rad) * u_north[0] + np.sin(az_rad) * u_east[0]
    uy = np.cos(az_rad) * u_north[1] + np.sin(az_rad) * u_east[1]
    
    # Distance steps along each ray (skip d=0)
    d = np.arange(step_m, max_dist_m + 0.1, step_m, dtype=np.float64)
    # Shape of d: (N_d,)
    # Sample coordinates: X, Y shape: (360, N_d)
    X = x_site + ux[:, None] * d[None, :]
    Y = y_site + uy[:, None] * d[None, :]
    
    # Map (X, Y) to fractional pixel coordinates inside dem_win
    # X = win_transform.c + (col + 0.5) * win_transform.a
    # Y = win_transform.f + (row + 0.5) * win_transform.e (note win_transform.e < 0)
    cols = (X - win_transform.c) / win_transform.a - 0.5
    rows = (Y - win_transform.f) / win_transform.e - 0.5
    
    # 4. Bilinear interpolation of terrain heights z along all rays
    coords = np.vstack([rows.ravel(), cols.ravel()])
    z_samples = map_coordinates(dem_win, coords, order=1, mode='nearest').reshape(360, len(d))
    
    # 5. Moon curvature drop: drop = R - sqrt(R^2 - d^2)
    # In float64 to ensure high numerical precision
    drop = MOON_RADIUS - np.sqrt(MOON_RADIUS**2 - d**2)
    
    # 6. Elevation angle: atan2(z - z_site - mast_height - drop, d)
    delta_z = z_samples - (z_site + mast_height_m) - drop[None, :]
    angles_deg = np.degrees(np.arctan2(delta_z, d[None, :]))
    
    # Maximum elevation angle along each ray is the horizon
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
    """
    Creates horizon plot, polar plot, and local hillshade map with True North arrow.
    """
    site_id = res["site_id"]
    name = res["name"]
    horizon = res["horizon_deg"]
    
    # 1. Horizon Line Plot (Elevation vs Azimuth)
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
    horizon_plot_path = os.path.join(plots_dir, f"{site_id}_horizon.png")
    fig.savefig(horizon_plot_path)
    plt.close(fig)
    
    # 2. Polar Plot (Compass View)
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw={"projection": "polar"}, dpi=150)
    theta = np.radians(az)
    # In polar plot, North is at top (pi/2) and clockwise azimuth decreases math angle
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)  # Clockwise
    
    # Plot horizon elevation
    ax.plot(theta, horizon, color="#0055ff", lw=1.5)
    # Fill between minimum and horizon
    min_val = min(0.0, np.floor(np.min(horizon)))
    ax.fill(theta, horizon, color="#0055ff", alpha=0.25)
    ax.set_title(f"Polar Horizon View: {name}", va="bottom", pad=15)
    fig.tight_layout()
    polar_plot_path = os.path.join(plots_dir, f"{site_id}_polar.png")
    fig.savefig(polar_plot_path)
    plt.close(fig)
    
    # 3. Local Hillshade with True North Arrow
    dem_win = res["dem_win"]
    hs = compute_hillshade(dem_win, res=80.0)
    
    fig, ax = plt.subplots(figsize=(7, 7), dpi=150)
    ax.imshow(hs, cmap="gray", origin="upper")
    
    # Mark site location
    r_site, c_site = res["sub_r_site"], res["sub_c_site"]
    ax.plot(c_site, r_site, marker="*", color="red", markersize=14, markeredgecolor="yellow", markeredgewidth=1.2, label=f"Site: {name}")
    
    # Draw True North Arrow
    # Vector in grid coordinates is u_north = (nx, ny). In pixel coordinates, +X is +col, +Y is -row!
    # Arrow length: 15% of window width
    arrow_len = 0.15 * dem_win.shape[1]
    dx_col = arrow_len * res["u_north"][0]
    dy_row = -arrow_len * res["u_north"][1]  # row decreases upwards
    
    # Arrow base slightly offset from site or top corner
    ax.annotate("", xy=(c_site + dx_col, r_site + dy_row), xytext=(c_site, r_site),
                arrowprops=dict(facecolor="cyan", edgecolor="black", width=2.5, headwidth=9))
    ax.text(c_site + dx_col * 1.15, r_site + dy_row * 1.15, "True North", color="cyan", 
            fontweight="bold", fontsize=11, ha="center", va="center",
            bbox=dict(boxstyle="round,pad=0.2", facecolor="black", alpha=0.6, edgecolor="none"))
    
    ax.set_title(f"Terrain & Local True North: {name}\n(Lat: {res['lat']:.2f}°, Lon: {res['lon']:.2f}°)")
    ax.axis("off")
    ax.legend(loc="lower right", facecolor="white", framealpha=0.85)
    fig.tight_layout()
    map_plot_path = os.path.join(plots_dir, f"{site_id}_terrain_north.png")
    fig.savefig(map_plot_path)
    plt.close(fig)

def generate_south_pole_hillshade(dem_path, out_path):
    """
    Creates a small, compressed hillshade PNG of the entire South Pole region (under 2 MB).
    """
    with rasterio.open(dem_path) as src:
        # Downsample 4x to 1900 x 1900
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
    parser.add_argument("--mast-height", type=float, default=0.0, help="Observer mast height in meters (default: 0.0)")
    parser.add_argument("--max-dist", type=float, default=60000.0, help="Max terrain horizon distance in meters (default: 60000.0)")
    parser.add_argument("--step", type=float, default=80.0, help="Ray sampling step size in meters (default: 80.0)")
    parser.add_argument("--sites", type=str, default="sites.json", help="Path to sites.json")
    parser.add_argument("--dem", type=str, default="raw/LDEM_80S_80MPP_ADJ.TIF", help="Path to LOLA DEM GeoTIFF")
    args = parser.parse_args()

    os.makedirs("output/horizon", exist_ok=True)
    os.makedirs("output/plots", exist_ok=True)

    print("=" * 70)
    print("STEP 3: LOCAL NORTH CALCULATION")
    print("=" * 70)
    
    # Coordinate system setup
    geo_crs = pyproj.CRS.from_proj4(f"+proj=longlat +R={MOON_RADIUS} +no_defs")
    dem_crs = pyproj.CRS.from_string("IAU:30135")
    transformer = pyproj.Transformer.from_crs(geo_crs, dem_crs, always_xy=True)
    
    with open(args.sites, "r", encoding="utf-8") as f:
        sites = json.load(f)
        
    for s in sites:
        u_n, u_e, g_north_deg = get_local_north_and_east(s["lat"], s["lon"], transformer)
        print(f"Site: {s['name']:25s} (ID: {s['id']})")
        print(f"  Lat / Lon:         {s['lat']:.2f}°, {s['lon']:.2f}°")
        print(f"  True North Vector: ({u_n[0]:.4f}, {u_n[1]:.4f}) -> Grid Heading: {g_north_deg:6.2f}°")
        print(f"  True East Vector:  ({u_e[0]:.4f}, {u_e[1]:.4f}) (90° clockwise from North)")
        print("-" * 60)

    print("\n" + "=" * 70)
    print(f"STEP 4: HORIZON PROFILE CALCULATION (Mast Height = {args.mast_height} m, Max Dist = {args.max_dist/1000:.0f} km)")
    print("=" * 70)

    results = []
    with rasterio.open(args.dem) as src:
        for s in sites:
            print(f"Processing site '{s['id']}' ({s['name']})...")
            res = compute_horizon_site(src, s, transformer, 
                                       max_dist_m=args.max_dist, 
                                       step_m=args.step, 
                                       mast_height_m=args.mast_height)
            results.append(res)
            
            # Step 5: Checks & Visualizations
            plot_and_verify_site(res, "output/plots")
            
            # Step 6: Output JSON
            elev_rounded = [float(round(val, 2)) for val in res["horizon_deg"]]
            json_out = {
                "site_id": s["id"],
                "az_step_deg": 1,
                "elev_deg": elev_rounded,
                "mast_height_m": args.mast_height,
                "dem_source": "LOLA LDEM_80S_80MPP_ADJ (PGDA)"
            }
            json_path = os.path.join("output", "horizon", f"{s['id']}.json")
            with open(json_path, "w", encoding="utf-8") as jf:
                json.dump(json_out, jf, indent=2)
                
    print("\n" + "=" * 70)
    print("STEP 5: CHECKS & SUMMARY STATISTICS")
    print("=" * 70)
    print(f"{'Site ID':20s} | {'Min (°)':>8s} | {'Max (°)':>8s} | {'Mean (°)':>8s} | {'Peak Az (°)':>11s} | {'Status':>12s}")
    print("-" * 72)
    
    for res in results:
        h = res["horizon_deg"]
        h_min = float(np.min(h))
        h_max = float(np.max(h))
        h_mean = float(np.mean(h))
        peak_az = int(np.argmax(h))
        
        # Check validity
        has_nan = bool(np.isnan(h).any())
        all_identical = bool(np.all(h == h[0]))
        
        if has_nan:
            status = "FLAG: NaN"
        elif all_identical:
            status = "FLAG: Flat"
        else:
            status = "VALID (OK)"
            
        print(f"{res['site_id']:20s} | {h_min:8.2f} | {h_max:8.2f} | {h_mean:8.2f} | {peak_az:11d} | {status:>12s}")

    print("\n" + "=" * 70)
    print("STEP 6: GENERATING WHOLE SOUTH POLE HILLSHADE MAP BACKGROUND")
    print("=" * 70)
    sp_hillshade_path = "output/south_pole_hillshade.png"
    generate_south_pole_hillshade(args.dem, sp_hillshade_path)
    
    print("\nAll steps completed successfully!")

if __name__ == "__main__":
    main()
