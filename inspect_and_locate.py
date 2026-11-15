import json
import numpy as np
import rasterio
import pyproj

DEM_PATH = "raw/LDEM_80S_80MPP_ADJ.TIF"
SITES_PATH = "sites.json"

MOON_RADIUS = 1737400.0  # meters

def run_step_1():
    print("=" * 60)
    print("STEP 1: INSPECT DEM")
    print("=" * 60)
    
    with rasterio.open(DEM_PATH) as src:
        print(f"File: {DEM_PATH}")
        print(f"Shape (height, width): {src.shape}")
        print(f"Number of bands: {src.count}")
        print(f"Data type: {src.dtypes[0]}")
        print(f"Pixel size (x, y): {src.res} meters")
        print(f"CRS (Coordinate Reference System): {src.crs}")
        print(f"Bounds: {src.bounds}")
        print(f"Transform:\n{src.transform}")
        print(f"Nodata value: {src.nodata}")
        
        crs = src.crs
        if crs is None:
            print("\n[WARNING] CRS is missing from file metadata!")
            print(f"Using default South Polar Stereographic projection on Moon sphere (R = {MOON_RADIUS} m).")
            # South polar stereographic centered at south pole (lat_0 = -90, lon_0 = 0)
            proj4_fallback = f"+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={MOON_RADIUS} +units=m +no_defs"
            crs = pyproj.CRS.from_proj4(proj4_fallback)
            print(f"Fallback CRS PROJ: {proj4_fallback}")
        else:
            print("\nCRS successfully detected from file metadata.")

        print("\nReading elevation data to compute min/max heights (ignoring nodata)...")
        data = src.read(1)
        if src.nodata is not None:
            valid_mask = (data != src.nodata)
            valid_data = data[valid_mask]
        else:
            valid_data = data
            
        min_elev = np.min(valid_data)
        max_elev = np.max(valid_data)
        print(f"Min elevation: {min_elev:.2f} m")
        print(f"Max elevation: {max_elev:.2f} m")
        
        return src.bounds, src.transform, src.shape, crs

def run_step_2(bounds, transform, shape, dem_crs):
    print("\n" + "=" * 60)
    print("STEP 2: LOCATE SITES & SAMPLE ELEVATION")
    print("=" * 60)
    
    with open(SITES_PATH, "r", encoding="utf-8") as f:
        sites = json.load(f)
        
    # Geographic CRS on Moon sphere (lat/lon in degrees, R = 1737400 m)
    # Note: PROJ longlat uses sphere radius
    geo_crs = pyproj.CRS.from_proj4(f"+proj=longlat +R={MOON_RADIUS} +no_defs")
    
    # Transformer from lunar (lon, lat) to DEM projected coordinates (x, y)
    transformer = pyproj.Transformer.from_crs(geo_crs, dem_crs, always_xy=True)
    
    with rasterio.open(DEM_PATH) as src:
        height, width = shape
        print(f"DEM Grid: width={width}, height={height}")
        print(f"DEM Bounds (meters): X=[{bounds.left:.1f}, {bounds.right:.1f}], Y=[{bounds.bottom:.1f}, {bounds.top:.1f}]\n")
        
        for site in sites:
            s_id = site["id"]
            name = site["name"]
            lat = site["lat"]
            lon = site["lon"]
            
            # pyproj with always_xy=True expects (lon, lat)
            x, y = transformer.transform(lon, lat)
            
            # rasterio index: maps (x, y) -> (row, col)
            row, col = src.index(x, y)
            
            inside_bounds = (bounds.left <= x <= bounds.right) and (bounds.bottom <= y <= bounds.top)
            inside_pixels = (0 <= row < height) and (0 <= col < width)
            is_valid = inside_bounds and inside_pixels
            
            if is_valid:
                # Read 1x1 window at (row, col)
                elev = src.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0, 0]
                status = "INSIDE"
            else:
                elev = float("nan")
                status = "OUTSIDE"
                
            print(f"Site: {name} (ID: {s_id})")
            print(f"  Lat / Lon:    {lat:.2f} deg, {lon:.2f} deg")
            print(f"  DEM (x, y):   ({x:.1f} m, {y:.1f} m)")
            print(f"  Pixel (r, c): (row={row}, col={col})")
            print(f"  Status:       {status} DEM bounds? {is_valid}")
            print(f"  Elevation:    {elev:.1f} m")
            print("-" * 50)

if __name__ == "__main__":
    bounds, transform, shape, dem_crs = run_step_1()
    run_step_2(bounds, transform, shape, dem_crs)
