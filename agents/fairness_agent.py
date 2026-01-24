import numpy as np
import logging

log = logging.getLogger("fairness-agent")

async def evaluate_fairness(allocation_res: dict, request: dict = None) -> dict:
    allocation_map = allocation_res.get("allocation_map", {})
    bands = request.get("bands", []) if request else list(set(list(allocation_map.values())))
    demand = request.get("demand", {}) if request else {}

    shares = []
    for region, band in allocation_map.items():
        try:
            idx = bands.index(band)
            quality = max(1, (len(bands) - idx))
        except ValueError:
            quality = 1
            log.warning("Band '%s' for region '%s' not in bands list, defaulting quality=1", band, region)
        shares.append(demand.get(region, 1) * quality)

    arr = np.array(shares, dtype=float)
    if arr.size == 0:
        return {"jain": 0.0, "shares": []}  # Always return float
    denom = (arr**2).sum()
    jain = (arr.sum()**2) / (arr.size * denom) if denom > 0 else 0.0
    return {"jain": float(jain), "shares": shares}
