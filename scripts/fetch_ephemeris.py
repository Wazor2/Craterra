import json, sys, time
from pathlib import Path
from datetime import datetime
import requests

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
OUT = Path("public/data/ephemeris")
OUT.mkdir(parents=True, exist_ok=True)

START = "2026-12-01 00:00"
STOP  = "2027-03-01 00:00"
STEP  = 60

def fetch_body(body, lat, lon, alt_km, start, stop, step_min):
    params = {
        "format": "json",
        "COMMAND": f"'{body}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{alt_km}'",
        "START_TIME": f"'{start}'",
        "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": f"'{step_min}m'",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
        "TIME_DIGITS": "'MINUTES'",
    }
    for attempt in range(3):
        try:
            r = requests.get(API, params=params, timeout=120)
            r.raise_for_status()
            result = r.json()["result"]
            break
        except Exception as e:
            print("  retry", attempt + 1, e)
            time.sleep(5)
    else:
        raise RuntimeError("Horizons API failed; use the web form fallback")
    if "$$SOE" not in result:
        raise RuntimeError(result[:1500])
    block = result.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    first_time = block[0].split(",")[0].strip()
    az, el = [], []
    for line in block:
        c = [x.strip() for x in line.split(",")]
        az.append(round(float(c[-3]), 3))
        el.append(round(float(c[-2]), 3))
    return first_time, az, el

def fetch_site(site):
    alt = site.get("alt_km", 0)
    t0, saz, sel = fetch_body(10,  site["lat"], site["lon"], alt, START, STOP, STEP)
    _,  eaz, eel = fetch_body(399, site["lat"], site["lon"], alt, START, STOP, STEP)
    assert len(saz) == len(sel) == len(eaz) == len(eel), "array lengths differ"
    print("  Horizons first row time:", t0)
    return {
        "site_id": site["id"],
        "start_utc": datetime.strptime(START, "%Y-%m-%d %H:%M").strftime("%Y-%m-%dT%H:%M:%SZ"),
        "step_minutes": STEP,
        "sun_az": saz, "sun_el": sel,
        "earth_az": eaz, "earth_el": eel,
    }

if __name__ == "__main__":
    sites = json.load(open("sites.json"))
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for s in sites:
        if only and s["id"] != only:
            continue
        print("Fetching", s["id"])
        data = fetch_site(s)
        (OUT / f"{s['id']}.json").write_text(json.dumps(data))
        print("  steps:", len(data["sun_az"]))
        time.sleep(1)