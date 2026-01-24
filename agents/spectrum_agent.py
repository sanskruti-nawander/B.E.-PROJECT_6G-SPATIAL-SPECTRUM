# agents/spectrum_agent.py
import random
import asyncio

async def monitor_channels(allocation_res: dict) -> dict:
    """
    Monitors allocated spectrum channels and returns metrics for each region.
    Status is determined based on interference_index:
        - <= 0.6  → stable
        - 0.6–0.75 → warning
        - > 0.75  → realloc_suggested
    """
    allocation_map = allocation_res.get("allocation_map", {})
    metrics = {}

    for region, band in allocation_map.items():
        # Simulate random traffic and interference
        traffic_load = round(random.uniform(0.2, 1.0), 2)
        interference_index = round(random.uniform(0.0, 0.9), 2)

        # Determine status based on interference thresholds
        if interference_index > 0.75:
            status = "realloc_suggested"
        elif interference_index > 0.6:
            status = "warning"
        else:
            status = "stable"

        metrics[region] = {
            "band": band,
            "traffic_load": traffic_load,
            "interference_index": interference_index,
            "status": status
        }

    # Simulate a small monitoring delay
    await asyncio.sleep(0.05)
    return {"metrics": metrics}
