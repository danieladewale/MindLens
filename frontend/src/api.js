// ============================================================
// API SERVICE — swap mock for real Flask endpoint when ready
// Change API_BASE to your Flask server URL when model is deployed
// ============================================================

const API_BASE = null; // Set to "http://localhost:5000" when Flask API is running

export function isLiveMode() {
  return API_BASE !== null;
}

export async function analyzePost(text) {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // ---- MOCK PREDICTIONS (remove when backend is live) ----
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

  const depressiveKeywords = [
    "hopeless", "worthless", "alone", "empty", "tired", "exhausted",
    "can't", "never", "nothing", "hate", "sad", "crying", "depressed",
    "anxious", "sleep", "numb", "pain", "lost", "dark", "give up",
    "no point", "don't care", "miserable", "struggle", "broken",
  ];

  const words = text.toLowerCase().split(/\s+/);
  const matchCount = words.filter((w) =>
    depressiveKeywords.some((k) => w.includes(k))
  ).length;
  const ratio = matchCount / Math.max(words.length, 1);

  const baseScore = Math.min(0.95, ratio * 4 + Math.random() * 0.15);
  const score = words.length < 4 ? Math.random() * 0.35 : baseScore;
  const isDepressive = score > 0.5;

  const highlightedWords = words.filter((w) =>
    depressiveKeywords.some((k) => w.includes(k))
  );

  return {
    prediction: isDepressive ? "depressive" : "non-depressive",
    confidence: parseFloat(score.toFixed(3)),
    model: "roberta-base (mock)",
    baseline_prediction: isDepressive ? "depressive" : "non-depressive",
    baseline_confidence: parseFloat((score * 0.85 + Math.random() * 0.1).toFixed(3)),
    highlighted_words: [...new Set(highlightedWords)],
    preprocessing: {
      original_length: text.length,
      token_count: words.length,
      cleaned_length: text.replace(/[^\w\s]/g, "").length,
    },
  };
}
