"""
NASA Space Apps Challenge 2026 - Lunar Landing Site Navigator
Scientific Processing Layer: Terrain Horizon Generator with Lunar Spherical Curvature.
"""

import math
from typing import List

MOON_MEAN_RADIUS_M = 1737400.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi


def calculate_terrain_obstruction_angle(
    distance_m: float,
    terrain_height_m: float,
    observer_height_m: float,
    mast_height_m: float = 0.0,
    moon_radius_m: float = MOON_MEAN_RADIUS_M,
) -> float:
    """
    Computes the elevation angle of a terrain point relative to the local horizontal plane,
    correcting for spherical curvature:
    delta_h = distance^2 / (2 * R_moon)
    elevation_angle = atan2(terrain_height - observer_height - mast_height - delta_h, distance)
    """
    if distance_m <= 0:
        return 0.0

    curvature_drop_m = (distance_m ** 2) / (2.0 * moon_radius_m)
    net_elevation_m = terrain_height_m - (observer_height_m + mast_height_m) - curvature_drop_m
    return math.atan2(net_elevation_m, distance_m) * RAD_TO_DEG
