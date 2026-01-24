# agents/policy_guardian.py
import aiohttp
import asyncio
import os

RAG_ENDPOINT = os.getenv("RAG_ENDPOINT", "http://127.0.0.1:8000/api/rag/query")

async def check_policy(request_data: dict) -> dict:
    # Build a focused query for the RAG engine
    bands = request_data.get("bands") or [request_data.get("band")] if request_data.get("band") else []
    regions = request_data.get("regions") or [request_data.get("region")] if request_data.get("region") else []
    use_case = request_data.get("use_case", "general use")

    band_summary = ", ".join([str(b) for b in bands]) if bands else "unspecified band"
    region_summary = ", ".join(regions) if regions else "unspecified region"

    query = (
        f"Please check TRAI/3GPP/ITU policies: Can bands {band_summary} be allocated in "
        f"{region_summary} for use case: {use_case}? Mention any restrictions and cite sources."
    )

    async with aiohttp.ClientSession() as session:
        async with session.post(RAG_ENDPOINT, json={"query": query, "top_k": 5, "generate": True}, timeout=60) as resp:
            data = await resp.json()

    answer = data.get("answer", "") or ""
    retrieved = data.get("retrieved", [])
    # extract source URLs from retrieved docs
    sources = [d.get("source") for d in retrieved if d.get("source")]

    # Simple heuristic for compliance
    lowered = answer.lower()
    not_allowed_keywords = ["not allowed", "prohibited", "no permission", "restriction", "not permitted"]
    compliant = not any(k in lowered for k in not_allowed_keywords)

    return {"compliant": compliant, "reason": answer, "sources": sources}
