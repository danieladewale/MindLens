# 🧠 MindLens

**NLP-powered depression indicator detection from social media text**

A machine learning pipeline that analyzes social media posts for linguistic markers associated with self-reported depression. Built for our NLP course at Howard University.

> ⚠️ **Disclaimer:** This tool detects linguistic patterns — it is not a clinical diagnostic tool.

---

## Project Overview

MindLens uses both traditional ML and transformer-based approaches to classify social media posts as showing depressive indicators or not.

### Models
- **Baseline:** TF-IDF + Logistic Regression (scikit-learn)
- **Primary:** Fine-tuned RoBERTa-base (HuggingFace Transformers + PyTorch)

### Tech Stack
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
mindlens/
├── frontend/          # React app (Vite)
│   ├── src/
│   │   ├── App.jsx    # Main application
│   │   ├── api.js     # API service (mock ↔ real toggle)
│   │   └── main.jsx   # Entry point
│   └── package.json
├── backend/           # Flask REST API
│   ├── app.py         # API server
│   ├── predict.py     # Model inference logic
│   └── requirements.txt
├── notebooks/         # Jupyter notebooks for EDA & training
│   └── 01_eda.ipynb   # Exploratory data analysis (placeholder)
├── models/            # Saved model files (gitignored)
├── data/              # Dataset files (gitignored)
└── README.md
```

---

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend (when model is ready)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Then set `API_BASE` in `frontend/src/api.js` to `http://localhost:5000`.

---

## Team

| Member | Role |
|--------|------|
| Daniel | ML pipeline, model training, frontend demo |
| Partner | Research, writing, presentation |

---

## References

- Dataset: [Reddit Depression Dataset (Kaggle)](https://www.kaggle.com/datasets)
- Model: [RoBERTa (HuggingFace)](https://huggingface.co/roberta-base)
- Inspiration: CLPsych Shared Tasks on mental health NLP
