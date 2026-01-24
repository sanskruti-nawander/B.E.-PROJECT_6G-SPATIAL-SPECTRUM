# main.py
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.master_agent import MasterAgent

# ==========================
# 🔹 Logging Configuration
# ==========================
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("6g-orchestrator")

# ==========================
# 🔹 FastAPI App Setup
# ==========================
app = FastAPI(title="6G Multi-Agent Orchestrator")

# Allow frontend (e.g., Streamlit or HTML+JS) to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or replace "*" with ["http://localhost:8501"] if you want to restrict to Streamlit
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# 🔹 Initialize Master Agent
# ==========================
master = MasterAgent()

# ==========================
# 🔹 Request Model
# ==========================
class AllocationRequest(BaseModel):
    request_id: str = None
    region: str = None
    use_case: str = None
    band: str = None
    regions: list = None
    bands: list = None
    demand: dict = None

# ==========================
# 🔹 Root Route
# ==========================
@app.get("/")
def root():
    return {"status": "ok", "message": "6G Multi-Agent Orchestrator running"}

# ==========================
# 🔹 Allocation Endpoint
# ==========================
@app.post("/allocate")
async def allocate(payload: AllocationRequest):
    req = payload.dict()
    try:
        res = await master.run_allocation(req)
        return {"request_id": req.get("request_id"), "result": res}
    except Exception as e:
        log.exception("Allocation error")
        raise HTTPException(status_code=500, detail=str(e))
