"""
NASA Space Apps Challenge 2026 - Lunar Landing Site Navigator
Scientific Processing Layer: NAIF SPICE Kernel Manifest and Loader.
"""

from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass(frozen=True)
class KernelManifestEntry:
    filename: str
    role: str
    source_url: str
    sha256: str
    description: str


OFFICIAL_KERNELS: List[KernelManifestEntry] = [
    KernelManifestEntry(
        filename="de440.bsp",
        role="spk",
        source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440.bsp",
        sha256="4d15655a90ad24e23cfb8b9d3b379301e858db1d5964861be5d7fa85b88dbb63",
        description="NASA JPL planetary and lunar ephemeris DE440 (Sun, Moon, Earth barycenters).",
    ),
    KernelManifestEntry(
        filename="moon_pa_de440_200625.bpc",
        role="pck",
        source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc",
        sha256="a7b233a5cf9571faeb6cfb1fa67ee595b1dc07788a101b0460d3d4b68bb2e805",
        description="High-precision binary lunar orientation PCK in Principal Axis frame.",
    ),
    KernelManifestEntry(
        filename="moon_de440_250416.tf",
        role="fk",
        source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf",
        sha256="8c92a953e5e4fcb4d216954fb3dfa83279bbec9044d4734898144da58a0ca97e",
        description="Matching lunar frame definition kernel establishing MOON_ME and MOON_PA aliases.",
    ),
    KernelManifestEntry(
        filename="pck00011.tpc",
        role="pck",
        source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
        sha256="bb6a6111fcbbd8a876798e1f0e4701235ee20f01a3575c0ee8bbf4004944d6da",
        description="Planetary constants text kernel defining BODY301_RADII = (1737.4, 1737.4, 1737.4) km.",
    ),
    KernelManifestEntry(
        filename="naif0012.tls",
        role="lsk",
        source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
        sha256="25a704849e8dd88846115668a04f6899a99b4455cb20b6879ab75765494c6df3",
        description="Leap-seconds kernel for accurate TDB/ET to UTC time conversions.",
    ),
]


def get_kernel_manifest() -> List[Dict[str, Any]]:
    return [
        {
            "filename": k.filename,
            "role": k.role,
            "source_url": k.source_url,
            "sha256": k.sha256,
        }
        for k in OFFICIAL_KERNELS
    ]
