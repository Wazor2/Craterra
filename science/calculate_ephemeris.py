"""
NASA Space Apps Challenge 2026 - Lunar Landing Site Navigator
Scientific Processing Layer: Global MOON_ME Ephemeris Generator.
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

MOON_MEAN_RADIUS_KM = 1737.4
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi


def compute_moon_vectors(dt: datetime) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
    """
    Computes body-fixed MOON_ME position vectors for Sun and Earth in kilometres.
    Follows JPL/IAU analytical lunar theory (Meeus/Brown-Chapront).
    """
    epoch_seconds = dt.replace(tzinfo=timezone.utc).timestamp()
    jd = 2440587.5 + epoch_seconds / 86400.0
    t = (jd - 2451545.0) / 36525.0

    # Fundamental Delaunay angles
    d = (297.8501921 + 445267.1114034 * t) % 360.0
    m_sun = (357.5291092 + 35999.0502909 * t) % 360.0
    m_moon = (134.9633964 + 477198.8675055 * t) % 360.0
    f = (93.2720950 + 483202.0175233 * t) % 360.0

    # Sun vector in MOON_ME
    sun_dist = 149597870.7 * (1.0 - 0.0167086 * math.cos(m_sun * DEG_TO_RAD))
    sun_lon = (180.0 - d - 1.915 * math.sin(m_sun * DEG_TO_RAD)) % 360.0
    sun_lat = -1.5424 * math.sin(f * DEG_TO_RAD)

    cos_lat = math.cos(sun_lat * DEG_TO_RAD)
    sun_x = sun_dist * cos_lat * math.cos(sun_lon * DEG_TO_RAD)
    sun_y = sun_dist * cos_lat * math.sin(sun_lon * DEG_TO_RAD)
    sun_z = sun_dist * math.sin(sun_lat * DEG_TO_RAD)

    # Earth vector in MOON_ME
    earth_dist = (
        384400.0
        - 20905.0 * math.cos(m_moon * DEG_TO_RAD)
        - 3699.0 * math.cos((2 * d - m_moon) * DEG_TO_RAD)
        - 2956.0 * math.cos(2 * d * DEG_TO_RAD)
    )

    earth_lon = -6.289 * math.sin(m_moon * DEG_TO_RAD) + 1.274 * math.sin((2 * d - m_moon) * DEG_TO_RAD)
    earth_lat = -5.128 * math.sin(f * DEG_TO_RAD) + 0.281 * math.sin((m_moon + f) * DEG_TO_RAD)

    cos_e_lat = math.cos(earth_lat * DEG_TO_RAD)
    earth_x = earth_dist * cos_e_lat * math.cos(earth_lon * DEG_TO_RAD)
    earth_y = earth_dist * cos_e_lat * math.sin(earth_lon * DEG_TO_RAD)
    earth_z = earth_dist * math.sin(earth_lat * DEG_TO_RAD)

    return (sun_x, sun_y, sun_z), (earth_x, earth_y, earth_z)
