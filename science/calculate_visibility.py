"""
NASA Space Apps Challenge 2026 - Lunar Landing Site Navigator
Scientific Processing Layer: Topocentric Visibility and Event Crossing Analyzer.
"""

import math
from typing import List, Dict, Any, Optional

SUN_ANGULAR_RADIUS_DEG = 0.266


def interpolate_horizon(horizon_360: List[float], azimuth_deg: float) -> float:
    """Circular interpolation across the 359°/0° seam."""
    az = azimuth_deg % 360.0
    idx_low = int(math.floor(az))
    idx_high = (idx_low + 1) % 360
    fraction = az - idx_low
    return horizon_360[idx_low] + (horizon_360[idx_high] - horizon_360[idx_low]) * fraction


def evaluate_solar_visibility(
    sun_elevation_deg: float,
    horizon_elevation_deg: float,
    angular_radius_deg: float = SUN_ANGULAR_RADIUS_DEG,
) -> Dict[str, Any]:
    """
    Distinguishes full disk, partial disk, and occulted solar states.
    """
    clearance = sun_elevation_deg - horizon_elevation_deg
    any_visible = clearance + angular_radius_deg > 0
    full_visible = clearance - angular_radius_deg >= 0

    if not any_visible:
        state = "blocked"
    elif full_visible:
        state = "full"
    else:
        state = "partial"

    return {
        "clearance_deg": clearance,
        "any_visible": any_visible,
        "full_visible": full_visible,
        "state": state,
    }


def find_zero_crossings(clearances: List[float], sample_interval_seconds: float = 1800.0) -> List[float]:
    """
    Finds exact transition times using linear interpolation between discrete samples.
    """
    crossings = []
    for i in range(len(clearances) - 1):
        c1, c2 = clearances[i], clearances[i + 1]
        if (c1 < 0 and c2 >= 0) or (c1 >= 0 and c2 < 0):
            fraction = -c1 / (c2 - c1) if (c2 - c1) != 0 else 0.5
            crossing_offset_sec = (i + fraction) * sample_interval_seconds
            crossings.append(crossing_offset_sec)
    return crossings
