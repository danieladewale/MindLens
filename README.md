# MindLens

**NLP-powered depression indicator detection from social media text**

A machine learning pipeline that analyzes social media posts for linguistic markers associated with self-reported depression. Built for our NLP course at Howard University.

> ⚠️ **Disclaimer:** This tool detects linguistic patterns — it is not a clinical diagnostic tool.

---

## Features

- **Analyze** posts via pasted text, social media URL, or account username
- **Model comparison** — fine-tuned RoBERTa-base vs TF-IDF + Logistic Regression baseline
- **Attention highlights** — flagged tokens with mock attention weights
- **Account-level scan** — aggregate risk assessment across recent posts
- **How It Works** — full interactive explainer of tokenization, self-attention, and the classification head
- **Demo mode** — fully functional with mock predictions (no trained model required)

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Data | Reddit (PRAW / Kaggle), pandas |
| Preprocessing | NLTK, spaCy |
| Modeling | scikit-learn, PyTorch, HuggingFace Transformers |
| Backend API | Flask |
| Frontend | React (Vite) |

---

## Project Structure

```
NLProject/
├── frontend/               # React app (Vite)
│   ├── src/
│   │   ├── App.jsx         # Main application
│   │   ├── api.js          # API service (mock ↔ real toggle)
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── app.py                  # Flask REST API
├── predict.py              # Model inference logic
├── .gitignore
└── README.md
```

---

## Getting Started

### Frontend (demo mode — no backend needed)

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

### Backend (when model is ready)

```bash
pip install flask flask-cors
python app.py
```

Then set `API_BASE` in `frontend/src/api.js` to `http://localhost:5000`.

---

## UI Overview

| Tab | Description |
|-----|-------------|
| **Analyze** | Paste text, a post URL, or a username. Results shown in a dashboard grid with confidence score, model comparison bars, preprocessing stats, and flagged tokens with attention weights. |
| **Pipeline** | Step-by-step breakdown of the NLP pipeline from data collection to deployment. |
| **Model Metrics** | Expected performance benchmarks for both models with animated bar charts. |
| **How It Works** | Technical explainer covering BPE tokenization, multi-head self-attention, the classification head, and a comparison of TF-IDF vs RoBERTa. |

---

## Models

- **Baseline:** TF-IDF + Logistic Regression — fast, interpretable, keyword-based
- **Primary:** Fine-tuned RoBERTa-base — contextual, handles negation and subword morphology

Expected accuracy gap: 8–10 percentage points in favor of RoBERTa.

---

## Team

| Member | Role |
|--------|------|
| Daniel | ML pipeline, model training, frontend |
| Partner | Research, writing, presentation |

---

## References

- Dataset: [Reddit Depression Dataset (Kaggle)](https://www.kaggle.com/datasets)
- Model: [RoBERTa (HuggingFace)](https://huggingface.co/roberta-base)
- Inspiration: CLPsych Shared Tasks on mental health NLP (2015–2022)
