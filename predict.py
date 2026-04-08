"""
MindLens Prediction Module
===========================
Replace the mock logic below with your trained model.

Expected workflow:
1. Train your model in notebooks/
2. Save the model (torch.save or joblib.dump) to models/
3. Load it here and replace get_prediction() logic

The return format must match what the frontend expects (see api.js).
"""

import re
import string

# ---- STEP 1: Load your model here ----
# from transformers import AutoTokenizer, AutoModelForSequenceClassification
# import torch
# import joblib
#
# tokenizer = AutoTokenizer.from_pretrained("../models/roberta-depression")
# model = AutoModelForSequenceClassification.from_pretrained("../models/roberta-depression")
# model.eval()
#
# baseline_model = joblib.load("../models/tfidf_logreg.joblib")
# tfidf_vectorizer = joblib.load("../models/tfidf_vectorizer.joblib")


def preprocess(text: str) -> str:
    """Basic text preprocessing. Expand as needed."""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)       # remove URLs
    text = re.sub(r"@\w+", "", text)                   # remove mentions
    text = re.sub(r"#\w+", "", text)                    # remove hashtags
    text = re.sub(r"[^\w\s]", "", text)                 # remove punctuation
    text = re.sub(r"\s+", " ", text).strip()            # normalize whitespace
    return text


def get_prediction(text: str) -> dict:
    """
    Run inference on input text and return results.

    TODO: Replace mock logic with real model inference:
      1. Preprocess text
      2. Run through TF-IDF + LogReg baseline
      3. Run through fine-tuned RoBERTa
      4. Return both results
    """
    cleaned = preprocess(text)
    words = cleaned.split()

    # ---- MOCK LOGIC (replace with real model) ----
    depressive_keywords = [
        "hopeless", "worthless", "alone", "empty", "tired", "exhausted",
        "cant", "never", "nothing", "hate", "sad", "crying", "depressed",
        "anxious", "sleep", "numb", "pain", "lost", "dark", "give",
        "miserable", "struggle", "broken",
    ]

    match_count = sum(1 for w in words if w in depressive_keywords)
    ratio = match_count / max(len(words), 1)
    score = min(0.95, ratio * 4 + 0.05)
    is_depressive = score > 0.5

    highlighted = [w for w in words if w in depressive_keywords]

    # ---- REAL MODEL TEMPLATE ----
    # inputs = tokenizer(cleaned, return_tensors="pt", truncation=True, max_length=512)
    # with torch.no_grad():
    #     logits = model(**inputs).logits
    #     probs = torch.softmax(logits, dim=-1)
    # score = probs[0][1].item()  # probability of depressive class
    # is_depressive = score > 0.5
    #
    # tfidf_vec = tfidf_vectorizer.transform([cleaned])
    # baseline_prob = baseline_model.predict_proba(tfidf_vec)[0][1]

    return {
        "prediction": "depressive" if is_depressive else "non-depressive",
        "confidence": round(score, 3),
        "model": "roberta-base (mock)",  # change to "roberta-base (fine-tuned)" when real
        "baseline_prediction": "depressive" if is_depressive else "non-depressive",
        "baseline_confidence": round(score * 0.85, 3),
        "highlighted_words": list(set(highlighted)),
        "preprocessing": {
            "original_length": len(text),
            "token_count": len(words),
            "cleaned_length": len(cleaned),
        },
    }
