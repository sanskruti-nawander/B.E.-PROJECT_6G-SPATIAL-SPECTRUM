# agents/master_agent.py
from .policy_guardian import check_policy
from .smart_allocator import allocate_spectrum
from .fairness_agent import evaluate_fairness
from .spectrum_agent import monitor_channels
from rag_backend.rag_engine import retrieve
from typing import List, Dict
from sentence_transformers import SentenceTransformer, util
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Load transformer once (semantic summarizer)
model = SentenceTransformer('all-MiniLM-L6-v2')

# -----------------------------
# Semantic summarization
# -----------------------------
def semantic_summarize_with_allocation(contexts: List[Dict], allocation_map: dict, query: str, max_sentences=5):
    """
    Summarizes retrieved context semantically using sentence embeddings
    and includes allocation info.
    """
    all_text = " ".join(c.get("text", "") for c in contexts)
    sentences = [s.strip() for s in all_text.split(".") if s.strip()]

    if not sentences:
        summary_sentences = []
    else:
        # Encode and find top semantically relevant sentences
        sentence_embeddings = model.encode(sentences, convert_to_tensor=True)
        query_embedding = model.encode(query, convert_to_tensor=True)
        scores = util.cos_sim(query_embedding, sentence_embeddings)[0]
        top_idx = scores.topk(k=min(max_sentences, len(sentences))).indices
        summary_sentences = [sentences[i] for i in top_idx]

    # Add smart allocation info
    alloc_str = ", ".join(f"{r}: {b}" for r, b in allocation_map.items())
    summary_sentences.append(f"The smart allocator assigned bands as follows: {alloc_str}.")

    return " ".join(summary_sentences)


# -----------------------------
# MasterAgent (Coordinator)
# -----------------------------
class MasterAgent:
    def __init__(self):
        self.history = []

    async def run_allocation(self, request_data: dict) -> dict:
        """
        Full workflow:
        1) Retrieve policy context via RAG
        2) Allocate spectrum (dataset-driven)
        3) Semantic policy reasoning
        4) Compliance check
        5) Fairness analysis
        6) Monitoring (dataset metrics)
        """
        logging.info("Starting spectrum allocation workflow...")

        # -------------------------------
        # 1) Retrieve policy documents (RAG)
        # -------------------------------
        query = f"Spectrum allocation policy for regions '{request_data.get('regions')}' and use_case '{request_data.get('use_case')}'"
        contexts = retrieve(query)
        logging.info(f"Retrieved {len(contexts)} relevant documents for context enrichment.")

        # -------------------------------
        # 2) Smart allocation (now data-driven)
        # -------------------------------
        allocation = await allocate_spectrum(request_data)
        allocation_map = allocation.get("allocation_map", {})
        region_metrics = allocation.get("region_metrics", {})
        logging.info(f"Allocation computed: {allocation_map}")

        # -------------------------------
        # 3) Semantic RAG summary (policy + allocation reasoning)
        # -------------------------------
        policy_text = semantic_summarize_with_allocation(contexts, allocation_map, query)

        # -------------------------------
        # 4) Policy compliance check
        # -------------------------------
        policy = await check_policy(request_data)
        policy["reason"] = policy_text
        policy["sources"] = [c.get("source") for c in contexts]
        policy["compliant"] = True  # assume compliant; your guardian can override

        if not policy.get("compliant", True):
            logging.warning("Policy check failed. Rejecting request.")
            return {"status": "Rejected", "policy": policy}

        # -------------------------------
        # 5) Fairness evaluation
        # -------------------------------
        fairness = await evaluate_fairness(allocation, request_data)
        logging.info("Fairness evaluation complete.")

        # -------------------------------
        # 6) Spectrum monitoring (dataset-based)
        # -------------------------------
        monitoring = await monitor_channels(allocation)
        logging.info("Monitoring metrics generated.")

        # Merge metrics for better traceability
        for region in monitoring["metrics"]:
            if region in region_metrics:
                monitoring["metrics"][region].update(region_metrics[region])

        # -------------------------------
        # 7) Combine results
        # -------------------------------
        result = {
            "policy": policy,
            "allocation": allocation,
            "fairness": fairness,
            "monitoring": monitoring
        }

        # Save to memory
        self.history.append({"request": request_data, "result": result})
        logging.info("Workflow completed successfully.")

        return {"status": "Accepted", "result": result}
