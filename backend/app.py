"""
MindLens Flask API
==================
Serves depression detection predictions via REST endpoint.

Usage:
  pip install -r requirements.txt
  python app.py

The /predict endpoint accepts POST with JSON body: { "text": "..." }
and returns prediction results.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import get_prediction

app = Flask(__name__)
CORS(app)


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "Empty text"}), 400

    result = get_prediction(text)
    return jsonify(result)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
