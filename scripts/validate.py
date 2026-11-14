import json, sys
from datetime import datetime

def load(site):
    return json.load(open(f"public/data/ephemeris/{site}.json"))

def lookup(site, when):
    d = load(site)
    start = datetime.strptime(d["start_utc"], "%Y-%m-%dT%H:%M:%SZ")
    target = datetime.strptime(when, "%Y-%m-%d %H:%M")
    mins = (target - start).total_seconds() / 60
    if mins < 0 or mins % d["step_minutes"] != 0:
        print("Time is outside the range or not on a step"); return
    i = int(mins // d["step_minutes"])
    if i >= len(d["sun_az"]):
        print("Time is after the end of the data"); return
    print(f"{site} @ {when} UT")
    print(f"  Sun   az={d['sun_az'][i]:.3f}  el={d['sun_el'][i]:.3f}")
    print(f"  Earth az={d['earth_az'][i]:.3f}  el={d['earth_el'][i]:.3f}")

def sun_range(site):
    el = load(site)["sun_el"]
    print(f"{site}: Sun elevation min={min(el):.3f}  max={max(el):.3f}")

if __name__ == "__main__":
    if sys.argv[1] == "range":
        sun_range(sys.argv[2])
    else:
        lookup(sys.argv[1], sys.argv[2] + " " + sys.argv[3])