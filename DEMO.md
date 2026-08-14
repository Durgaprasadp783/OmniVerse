# 🎬 OmniVerse — Live Demo & Feature Walkthrough Guide

> **Step-by-step interactive demonstration script, UI feature walkthrough, and test scenario guide for presenting OmniVerse.**

---

## 🌟 Demo Overview

OmniVerse is a state-of-the-art **Multi-Document RAG & AI Knowledge Assistant**. This guide outlines a structured 5-minute live demonstration flow suitable for technical interviews, product demos, and executive reviews.

---

## 🚀 5-Minute Live Demo Script

### Scene 1: Authentication & Glassmorphism Dashboard (0:00 - 0:45)
1. Open the application at `http://localhost:3000`.
2. Click **Register** or **Sign In** using test credentials (`demo@omniverse.com` / `Password123!`).
3. Point out the responsive dark-mode Glassmorphism UI, real-time status indicators, and summary metrics.

### Scene 2: Multi-Document Ingestion & Automated Chunking (0:45 - 1:45)
1. Navigate to **Document Management** (`/documents` or `/upload`).
2. Upload multiple sample documents (e.g., `Architecture_Overview.pdf` and `API_Specification.pdf`).
3. Click **Process Document** to extract raw text and page structures.
4. Click **Generate Chunking & Embeddings** to observe the real-time background token chunking and vector indexing.

### Scene 3: Multi-Document Hybrid RAG Chat with Citation Grounding (1:45 - 3:15)
1. Navigate to **AI Chat Interface** (`/chat`).
2. Select multiple uploaded documents in the sidebar.
3. Ask a comparative question across both documents (e.g., *"Compare the database schema in Architecture Overview with the API endpoints in API Specification"*).
4. Demonstrate:
   - **Sub-second response streaming** powered by Gemini 2.5.
   - **Interactive Citation Badges**: Click on `[Source 1: Architecture_Overview.pdf (Page 3)]` to highlight the exact retrieved chunk.
   - **Voice Input / Output**: Click the microphone icon to speak a query and hear the AI response synthesized in real-time.

### Scene 4: Interactive AI Study Modes (3:15 - 4:15)
1. Navigate to **Study Modes** (`/study`).
2. Select an uploaded document and click **Generate Quiz**.
3. Answer Multiple Choice, True/False, and Short Answer questions with instant automated scoring and explanations.
4. Switch to **Flashcard Mode** to flip through key study concepts generated directly from document context.

### Scene 5: Real-Time Usage Analytics & Observability (4:15 - 5:00)
1. Navigate to **Analytics Dashboard** (`/analytics`).
2. Review the live metrics: Total Queries, Total Documents Ingested, Token Consumption, and Latency Metrics.
3. Open Browser Developer Tools (F12) Network tab to highlight the `X-Request-ID` header on API calls demonstrating end-to-end observability.

---

## 📸 Key UI Screen Summary

| Screen | Description | Path |
| :--- | :--- | :--- |
| **Dashboard** | Overview of recent documents, quick query bar, and system stats | `/dashboard` |
| **Document Manager** | Drag-and-drop upload, text extraction, and chunk viewer | `/documents` |
| **Multi-Doc Chat** | Hybrid RAG chat with source citations & voice controls | `/chat` |
| **Study Engine** | Quiz generator & interactive flashcard carousel | `/study` |
| **Analytics** | Usage stats, query counts, and token tracking dashboards | `/analytics` |
```
