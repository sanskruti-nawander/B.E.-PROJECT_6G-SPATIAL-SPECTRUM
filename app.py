import streamlit as st
import pandas as pd
import random
import os

# ============================================
# 🔧 Spectrum Allocation Logic (Your Function)
# ============================================
def allocate_spectrum(request_data):
    BAND_LABELS = {
        "low": "Low Band (800-1000 MHz)",
        "mid": "Mid Band (2.4-2.6 GHz)",
        "high": "High Band / mmWave (24 GHz+)"
    }

    DATA_PATH = os.path.join("data", "PanIndia_energy.csv")
    if not os.path.exists(DATA_PATH):
        st.error("Dataset not found. Please ensure PanIndia_energy.csv is in ./data folder.")
        st.stop()

    df = pd.read_csv(DATA_PATH)
    df.fillna(0, inplace=True)

    regions = request_data.get("regions")
    bands = request_data.get("bands", [])
    demand = request_data.get("demand", {r: 1 for r in regions})

    # region metrics
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

    pop_size, gens = 60, 80

    def rand_ind():
        return [random.randrange(len(bands)) for _ in regions]

    def decode(ind):
        return {r: BAND_LABELS.get(bands[i], bands[i]) for r, i in zip(regions, ind)}

    def fitness(ind):
        total_score = 0.0
        for r, idx in zip(regions, ind):
            weight = demand.get(r, 1)
            metrics = region_metrics[r]
            efficiency = metrics["efficiency"]
            quality = (len(bands) - idx) + 1
            total_score += weight * quality * efficiency
        unique_bands = len(set(ind))
        diversity_bonus = 1.0 + 0.25 * (unique_bands / len(regions))
        return total_score * diversity_bonus

    population = [rand_ind() for _ in range(pop_size)]
    for _ in range(gens):
        scored = sorted([(fitness(i), i) for i in population], key=lambda x: x[0], reverse=True)
        elites = [i for _, i in scored[:max(2, pop_size // 10)]]
        newpop = elites.copy()
        while len(newpop) < pop_size:
            p1, p2 = random.sample(elites, 2)
            cut = random.randint(1, len(regions) - 1)
            child = p1[:cut] + p2[cut:]
            if random.random() < 0.2:
                mpos = random.randrange(len(regions))
                child[mpos] = random.randrange(len(bands))
            newpop.append(child)
        population = newpop

    best = max([(fitness(i), i) for i in population], key=lambda x: x[0])
    allocation_map = decode(best[1])
    return allocation_map, region_metrics


# ============================================
# 🌈 Streamlit Frontend
# ============================================
st.set_page_config(page_title="Dynamic Spectrum Allocation Dashboard", layout="wide")
st.title("📡 Dynamic Spectrum Allocation System (AI-Based)")
st.markdown("This dashboard dynamically allocates spectrum bands across Indian regions based on **demand**, **efficiency**, and **diversity**.")

# ---- Sidebar ----
st.sidebar.header("⚙️ Configuration")
regions = st.sidebar.multiselect(
    "Select Regions",
    ["Maharashtra", "Gujarat", "Punjab", "Haryana", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Rajasthan"],
    default=["Maharashtra", "Kerala", "Tamil Nadu"]
)
bands = ["low", "mid", "high"]

# Generate random demand or let user set manually
st.sidebar.subheader("📈 Region Demand")
demand = {}
for region in regions:
    demand[region] = st.sidebar.slider(f"{region} Demand", 0.1, 2.0, round(random.uniform(0.5, 1.5), 2))

# ---- Main content ----
col1, col2 = st.columns([2, 1])
with col1:
    if st.button("🚀 Allocate Spectrum"):
        request_data = {
            "regions": regions,
            "bands": bands,
            "use_case": "5G Smart Allocation",
            "demand": demand
        }
        allocation, metrics = allocate_spectrum(request_data)

        result_df = pd.DataFrame([
            {
                "Region": r,
                "Allocated Band": allocation[r],
                "Efficiency": round(metrics[r]["efficiency"], 3),
                "Avg BW (MHz)": round(metrics[r]["avg_bw"], 2),
                "Avg Power (kW)": round(metrics[r]["avg_power"], 2),
                "Avg Energy (kWh)": round(metrics[r]["avg_energy"], 2),
                "Demand": demand[r]
            }
            for r in regions
        ])

        st.success("✅ Allocation Completed Successfully!")
        st.dataframe(result_df, use_container_width=True)

        # Visualization
        st.bar_chart(result_df.set_index("Region")[["Efficiency", "Demand"]])
    else:
        st.info("Click **Allocate Spectrum** to view real-time allocation results.")

# ---- Random Request Simulation ----
with col2:
    st.subheader("🎲 Simulate Real-Time Request")
    if st.button("🔄 Generate Random Request"):
        new_demand = {r: round(random.uniform(0.2, 2.0), 2) for r in regions}
        st.write("🆕 New Random Demand:")
        st.json(new_demand)
        request_data = {"regions": regions, "bands": bands, "use_case": "Realtime Simulation", "demand": new_demand}
        allocation, _ = allocate_spectrum(request_data)
        st.write("📡 New Allocation:")
        st.json(allocation)

# ---- Footer ----
st.markdown("---")
st.caption("Developed by Aditya Hegde ⚡ | AI-based Spectrum Allocation using Genetic Algorithm")
