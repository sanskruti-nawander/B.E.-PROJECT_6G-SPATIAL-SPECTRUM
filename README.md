# 6G Dynamic Spectrum Allocation using AI Agents

## 📡 Overview
This project focuses on **dynamic spectrum allocation for 6G networks** using a **multi-agent AI architecture**.  
It integrates **AI agents, optimization techniques, and a Retrieval-Augmented Generation (RAG) backend** to ensure efficient, fair, and policy-compliant spectrum allocation.

The system simulates real-world spectrum allocation challenges and demonstrates how intelligent agents collaborate to make optimized decisions in next-generation wireless networks.

---

## 🧠 System Architecture
The project is built around a **multi-agent scaffold** orchestrated using **FastAPI**.

### Agents Included
- **Master Agent (Orchestrator)** – Controls workflow and agent coordination  
- **Policy Guardian Agent** – Ensures regulatory compliance using RAG (TRAI documents)  
- **Smart Allocator Agent** – Uses Genetic Algorithm for optimal allocation  
- **Fairness Agent** – Computes Jain’s Fairness Index  
- **Spectrum Agent** – Simulates and monitors spectrum usage  

---

## 🏗️ Tech Stack
- **Backend:** FastAPI, Uvicorn  
- **AI / ML:** Python, Genetic Algorithms  
- **RAG:** FAISS, embeddings  
- **Frontend:** HTML, CSS, JavaScript  
- **API:** REST  
- **Environment:** Python Virtual Environment (`venv`)

---

## 🚀 Setup & Execution Steps

### 1️)  Clone the Repository
```bash
git clone https://github.com/sanskruti-nawander/B.E.-PROJECT_6G-SPATIAL-SPECTRUM.git
cd B.E.-PROJECT_6G-SPATIAL-SPECTRUM
```
### 2)  Activate virtual environoment
```bash
.\venv\scripts\activate 
```
### 3)  Start Backend
```bash
uvicorn main:app
```
### 4)  Open live server 
```bash
index.html
```


