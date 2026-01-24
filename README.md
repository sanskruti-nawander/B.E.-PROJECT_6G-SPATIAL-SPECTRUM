# 6G Dynamic Spectrum Allocation — Multi-Agent Scaffold


## Overview
This scaffold wires your RAG backend (TRAI docs retrieval) into a multi-agent orchestration service built with FastAPI. Agents:
- Master Agent (orchestrator)
- Policy Guardian (RAG-based compliance checks)
- Smart Allocator (Genetic Algorithm - sample)
- Fairness Agent (Jain's fairness index)
- Spectrum Agent (simulator / monitor)


## Quick start (Colab)
1. Upload this repo to Colab or clone into your workspace.
2. Install requirements: `pip install -r requirements.txt`.
3. Copy your existing RAG code into `rag_backend/rag_engine.py` (or keep it replaced by provided adapter).
4. Fill `.env` from `.env.example` with `OPENAI_API_KEY`.
5. Run `python main.py` (the script starts FastAPI + ngrok if `USE_NGROK=true`).


## Endpoints
- `GET /` - simple landing page
- `POST /api/allocate` - main orchestration endpoint; payload described below


## Example allocation request
```json
{
"request_id": "req-123",
"regions": ["Pune", "Mumbai"],
"bands": ["3.3-3.6GHz", "26GHz", "700MHz"],
"demand": {"Pune": 100, "Mumbai": 200},
"priorities": {"Pune": 1, "Mumbai": 2}
}