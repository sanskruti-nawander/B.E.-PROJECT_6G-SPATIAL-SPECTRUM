# rag_backend/rag_engine.py
import os
import json
import hashlib
import logging
from pathlib import Path
from typing import List, Dict

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tqdm import tqdm

from pypdf import PdfReader
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

# Load env
BASE_DIR = Path(os.getcwd())
DATA_RAW = BASE_DIR / "data" / "raw"
DATA_PROC = BASE_DIR / "data" / "processed"
INDEX_FILE = BASE_DIR / "faiss_index.bin"
TEXTS_FILE = BASE_DIR / "texts_metadata.json"

EMBED_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

# Put your URLs here (same as your Colab list)
SOURCE_URLS = [
    "https://www.trai.gov.in/sites/default/files/2024-11/CP_29092023.pdf",
    "https://trai.gov.in/sites/default/files/2024-09/Consultation_Paper_27092023.pdf",
    "http://www.trai.gov.in/consultation-paper-telecommunication-infrastructure-sharing-spectrum-sharing-and-spectrum-leasing",
    "https://www.trai.gov.in/release-publication/recommendation?page=1",
    "https://www.trai.gov.in/sites/default/files/2025-02/Recommendations_04022025.pdf",
    "https://www.trai.gov.in/sites/default/files/2024-09/Letter_to_Secy_21082024.pdf",
    "http://www.trai.gov.in/sites/default/files/2024-11/Recommendation_Spectrum_28012014.pdf",
    "http://www.trai.gov.in/sites/default/files/2024-09/Response%20-%20Spectrum%20Sharing%3DFinal.pdf",
    "https://itshamradio.com/wp-content/uploads/2022/10/National-Frequency-Allocation-Plan-2022.pdf",
    "https://egazette.gov.in/WriteReadData/2023/250880.pdf",
]

DATA_RAW.mkdir(parents=True, exist_ok=True)
DATA_PROC.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("rag-engine")

# Attempt to load OpenAI key if present (optional)
load_dotenv(BASE_DIR / ".env")
OPENAI_AVAILABLE = False
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
try:
    import openai
    OPENAI_AVAILABLE = True
    if OPENAI_API_KEY:
        openai.api_key = OPENAI_API_KEY
except Exception:
    OPENAI_AVAILABLE = False

# Utility functions
def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()

def download_url(url: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    if url.lower().endswith(".pdf"):
        fname = Path(url.split("/")[-1].split("?")[0])
        save_path = out_dir / fname
    else:
        fname = sha1(url)[:12] + ".html"
        save_path = out_dir / fname
    with open(save_path, "wb") as f:
        f.write(r.content)
    log.info("Downloaded %s -> %s", url, save_path)
    return save_path

def extract_text_from_pdf(path: Path) -> str:
    text_parts = []
    try:
        reader = PdfReader(str(path))
        for page in reader.pages:
            txt = page.extract_text()
            if txt:
                text_parts.append(txt)
    except Exception as e:
        log.error("PDF extraction failed for %s: %s", path, e)
    return "\n\n".join(text_parts).strip()

def extract_text_from_html(path: Path) -> str:
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    for s in soup(["script", "style", "noscript"]):
        s.decompose()
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def chunk_text(text: str, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> List[str]:
    text = text.replace("\r", " ")
    tokens = text.split()
    if len(tokens) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk = " ".join(tokens[start:end])
        chunks.append(chunk)
        if end == len(tokens):
            break
        start = end - overlap
    return chunks

# Ingestion + Indexing
def ingest_all(urls: List[str]) -> List[Dict]:
    all_chunks = []
    for url in tqdm(urls, desc="Downloading and ingesting"):
        try:
            saved = download_url(url, DATA_RAW)
        except Exception as e:
            log.error("Failed to download %s: %s", url, e)
            continue
        if str(saved).lower().endswith(".pdf"):
            full_text = extract_text_from_pdf(saved)
        else:
            full_text = extract_text_from_html(saved)
        if not full_text:
            log.warning("No text extracted from %s", saved)
            continue
        chunks = chunk_text(full_text)
        for i, c in enumerate(chunks):
            doc_id = sha1(f"{url}::{i}")
            all_chunks.append({
                "id": doc_id,
                "text": c,
                "source": url,
                "local_path": str(saved),
                "chunk_index": i
            })
    log.info("Ingested total chunks: %d", len(all_chunks))
    return all_chunks

def build_faiss_index(docs: List[Dict], model_name=EMBED_MODEL):
    if not docs:
        raise ValueError("No docs provided to build index.")
    model = SentenceTransformer(model_name)
    texts = [d["text"] for d in docs]
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    dim = embeddings.shape[1]
    log.info("Embedding dimension: %d", dim)
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    faiss.write_index(index, str(INDEX_FILE))
    with open(TEXTS_FILE, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=2)
    log.info("Saved FAISS index -> %s and metadata -> %s", INDEX_FILE, TEXTS_FILE)

def load_index():
    if not Path(INDEX_FILE).exists() or not Path(TEXTS_FILE).exists():
        raise FileNotFoundError("Index or texts metadata not found. Build index first.")
    index = faiss.read_index(str(INDEX_FILE))
    with open(TEXTS_FILE, "r", encoding="utf-8") as f:
        docs = json.load(f)
    return index, docs

# Retrieval + generation
def retrieve(query: str, top_k=5, model_name=EMBED_MODEL):
    model = SentenceTransformer(model_name)
    qv = model.encode([query], convert_to_numpy=True)
    index, docs = load_index()
    D, I = index.search(qv, top_k)
    results = []
    for i in I[0]:
        if 0 <= i < len(docs):
            d = docs[i]
            # optionally trim text to reduce payload
            d_copy = {
                "id": d.get("id"),
                "text": d.get("text"),
                "source": d.get("source"),
                "chunk_index": d.get("chunk_index")
            }
            results.append(d_copy)
    return results

def rag_generate_answer(query: str, contexts: List[Dict]):
    # If OpenAI available, call ChatCompletion; otherwise return concatenated contexts
    if OPENAI_AVAILABLE and OPENAI_API_KEY:
        context_text = "\n\n".join(
            [f"Source: {c.get('source')}\nText: {c.get('text')[:1200]}..." for c in contexts]
        )
        prompt = f"""You are a telecom + spectrum policy expert.
Use the context below to answer the user's question and cite the relevant source URLs.

Context:
{context_text}

Question:
{query}

Answer (be precise, cite source URLs):"""
        import openai
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=600
        )
        return response["choices"][0]["message"]["content"].strip()
    else:
        # fallback: return context snippets joined
        return "\n\n".join([c.get("text", "") for c in contexts[:3]])

def ensure_index(urls: List[str] = None):
    if urls is None:
        urls = SOURCE_URLS
    if Path(INDEX_FILE).exists() and Path(TEXTS_FILE).exists():
        log.info("Index already exists — loading.")
        return
    log.info("No existing index found — building from source URLs.")
    docs = ingest_all(urls)
    if not docs:
        raise RuntimeError("No text extracted from any documents.")
    build_faiss_index(docs)
