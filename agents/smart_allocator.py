import random
import pandas as pd
import os
from typing import Dict, List

# Mapping for readable band names
BAND_LABELS = {
    "low": "Low Band (800-1000 MHz)",
    "mid": "Mid Band (2.4-2.6 GHz)",
    "high": "High Band / mmWave (24 GHz+)"
}

# Dataset path
DATA_PATH = os.path.join("data", "PanIndia_energy.csv")


async def allocate_spectrum(request_data: Dict) -> Dict:
    """
    Balanced spectrum allocator:
    Considers demand, efficiency, and resource usage equally,
    with diversity encouragement for better spectrum utilization.
    """

    # Load dataset
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df.fillna(0, inplace=True)

    # Input extraction
    regions: List[str] = request_data.get("regions") or [request_data.get("region")]
    bands: List[str] = [str(b).lower() for b in request_data.get("bands", [])]
    demand: Dict = request_data.get("demand", {r: 1.0 for r in regions})

    if not bands:
        raise ValueError("No bands provided.")

    # ---------------------------
    # Region Metrics Calculation
    # ---------------------------
    region_metrics = {}
    for region in regions:
        region_data = df[df["Jio_Cluster"].str.lower() == region.lower()]
        if not region_data.empty:
            avg_bw = region_data["Bandwidth_MHz"].mean()
            avg_power = region_data["Power_Usage_kW"].mean()
            avg_energy = region_data["Energy_Consumption_kWh"].mean()
            efficiency = round((avg_bw / (avg_power + 0.1)), 3)
        else:
            avg_bw, avg_power, avg_energy, efficiency = 0, 0, 0, 0

        region_metrics[region] = {
            "avg_bw": avg_bw,
            "avg_power": avg_power,
            "avg_energy": avg_energy,
            "efficiency": efficiency,
        }

    # ---------------------------
    # Normalization helpers
    # ---------------------------
    def min_max_normalize(d):
        vals = list(d.values())
        if not vals:
            return {k: 0.5 for k in d}
        vmin, vmax = min(vals), max(vals)
        if vmax == vmin:
            return {k: 0.5 for k in d}
        return {k: (v - vmin) / (vmax - vmin) for k, v in d.items()}

    # Normalized maps for balancing
    demand_map = {r: float(demand.get(r, 1.0)) for r in regions}
    eff_map = {r: float(region_metrics[r]["efficiency"]) for r in regions}
    resource_raw = {
        r: float(region_metrics[r]["avg_power"] + (region_metrics[r]["avg_energy"] / 100.0))
        for r in regions
    }

    demand_norm = min_max_normalize(demand_map)
    eff_norm = min_max_normalize(eff_map)
    resource_norm_raw = min_max_normalize(resource_raw)
    resource_norm = {r: 1.0 - resource_norm_raw[r] for r in regions}  # invert (less = better)

    # ---------------------------
    # Genetic Algorithm setup
    # ---------------------------
    pop_size = 60
    gens = 80

    def rand_ind():
        return [random.randrange(len(bands)) for _ in regions]

    def decode(ind):
        band_keys = [bands[i] for i in ind]
        return {r: BAND_LABELS.get(b, b) for r, b in zip(regions, band_keys)}

    # ---------------------------
    # Balanced fitness function
    # ---------------------------
    def fitness(ind):
        total_score = 0.0
        for r, band_idx in zip(regions, ind):
            d_s = demand_norm.get(r, 0.5)
            e_s = eff_norm.get(r, 0.5)
            res_s = resource_norm.get(r, 0.5)

            # Ideal band index from demand + efficiency
            combined = (d_s + e_s) / 2.0
            ideal_band_float = combined * (len(bands) - 1)

            # Band match score (closer to ideal = higher)
            if len(bands) == 1:
                band_match = 1.0
            else:
                band_match = max(0.0, 1.0 - (abs(band_idx - ideal_band_float) / (len(bands) - 1)))

            # Equal weighting of factors
            region_score = (1.5 * d_s + e_s + res_s + band_match) / 4.5


            # Slight demand bias
            total_score += region_score * (1.0 + d_s)

        # Encourage diversity: reward unique bands
        unique_bands = len(set(ind))
        diversity_bonus = 1.0 + 0.15 * (unique_bands / max(1, len(ind)))

        return total_score * diversity_bonus

    # ---------------------------
    # Evolutionary process
    # ---------------------------
    population = [rand_ind() for _ in range(pop_size)]

    for _ in range(gens):
        scored = sorted(
            [(fitness(ind), ind) for ind in population],
            key=lambda x: x[0],
            reverse=True,
        )
        elites = [ind for _, ind in scored[: max(2, pop_size // 10)]]
        newpop = elites.copy()

        while len(newpop) < pop_size:
            p1, p2 = random.sample(elites, 2)
            cut = random.randint(1, max(1, len(regions) - 1))
            child = p1[:cut] + p2[cut:]
            if random.random() < 0.2:  # mutation chance
                mpos = random.randrange(len(regions))
                child[mpos] = random.randrange(len(bands))
            newpop.append(child)

        population = newpop

    # ---------------------------
    # Select best individual
    # ---------------------------
    best_score, best_ind = max(
        [(fitness(ind), ind) for ind in population], key=lambda x: x[0]
    )

    allocation_map = decode(best_ind)

    return {
        "allocation_map": allocation_map,
        "score": float(round(best_score, 3)),
        "region_metrics": region_metrics,
    }
