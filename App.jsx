import { useState, useRef } from "react";
import { analyzePost, isLiveMode } from "./api";

// ============================================================
// SAMPLE POSTS for quick demo
// ============================================================
const SAMPLE_POSTS = [
  {
    label: "Depressive indicators",
    text: "I feel so empty and alone lately. Nothing seems to matter anymore. I can't even get out of bed most days. Everything feels hopeless and I don't know how to keep going.",
  },
  {
    label: "Non-depressive",
    text: "Had an amazing weekend hiking with friends! The weather was perfect and we found this incredible waterfall. Already planning our next adventure. Life is good!",
  },
  {
    label: "Subtle / ambiguous",
    text: "Another day, another dollar I guess. Been staying up way too late again, can't seem to turn my brain off. Might just skip the gym tomorrow, don't really see the point.",
  },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function GaugeChart({ value, size = 180 }) {
  const radius = 70;
  const stroke = 12;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - value * circumference;
  const isHigh = value > 0.5;
  const color = isHigh
    ? `hsl(${Math.round(10 + (1 - value) * 30)}, 80%, 55%)`
    : `hsl(${Math.round(120 + (0.5 - value) * 40)}, 65%, 45%)`;

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path
        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
        fill="none" stroke="var(--surface-2)" strokeWidth={stroke} strokeLinecap="round"
      />
      <path
        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
      />
      <text x={center} y={center - 15} textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="700" fontFamily="'DM Mono', monospace">
        {(value * 100).toFixed(1)}%
      </text>
      <text x={center} y={center + 5} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontFamily="'DM Sans', sans-serif" letterSpacing="1">
        confidence
      </text>
    </svg>
  );
}

function PipelineStep({ number, title, detail, active }) {
  return (
    <div style={{
      display: "flex", gap: "12px", alignItems: "flex-start",
      opacity: active ? 1 : 0.4, transition: "opacity 0.4s ease",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: active ? "var(--accent)" : "var(--surface-2)",
        color: active ? "#fff" : "var(--text-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
        transition: "all 0.4s ease",
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{detail}</div>
      </div>
    </div>
  );
}

function HighlightedText({ text, words }) {
  if (!words || words.length === 0) return <span>{text}</span>;
  const regex = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        words.some((w) => part.toLowerCase().includes(w.toLowerCase())) ? (
          <mark key={i} style={{
            background: "hsla(10, 80%, 55%, 0.2)", color: "hsl(10, 80%, 45%)",
            padding: "1px 4px", borderRadius: 3, fontWeight: 600,
          }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [activeTab, setActiveTab] = useState("analyze");
  const textareaRef = useRef(null);

  const handleAnalyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 400);
    setTimeout(() => setPipelineStep(3), 800);

    try {
      const data = await analyzePost(input);
      setPipelineStep(4);
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 300);
    } catch {
      setLoading(false);
      setPipelineStep(0);
    }
  };

  const loadSample = (text) => {
    setInput(text);
    setResult(null);
    setPipelineStep(0);
    textareaRef.current?.focus();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif", color: "var(--text-primary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:wght@700;800&display=swap');
        :root {
          --bg: #0c0f14;
          --surface-1: #141820;
          --surface-2: #1e2430;
          --surface-3: #282f3c;
          --accent: #6366f1;
          --accent-glow: rgba(99, 102, 241, 0.15);
          --green: #22c55e;
          --red: #ef4444;
          --amber: #f59e0b;
          --text-primary: #e8eaf0;
          --text-secondary: #a0a8b8;
          --text-muted: #5e667a;
          --border: rgba(255,255,255,0.06);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
        .textarea-input {
          width: 100%; min-height: 120px; padding: 16px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 12px; color: var(--text-primary);
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          line-height: 1.6; resize: vertical; outline: none; transition: border-color 0.2s;
        }
        .textarea-input:focus { border-color: var(--accent); }
        .textarea-input::placeholder { color: var(--text-muted); }
        .btn-primary {
          background: var(--accent); color: white; border: none;
          padding: 12px 28px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s; display: flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-sample {
          background: var(--surface-2); color: var(--text-secondary);
          border: 1px solid var(--border); padding: 8px 14px;
          border-radius: 8px; font-size: 12px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .btn-sample:hover { background: var(--surface-3); color: var(--text-primary); }
        .tab {
          padding: 8px 16px; border: none; background: none;
          color: var(--text-muted); font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          border-bottom: 2px solid transparent; transition: all 0.2s;
        }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .result-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px; font-size: 13px;
          font-weight: 600; font-family: 'DM Mono', monospace;
        }
        .metric-box { background: var(--surface-2); border-radius: 10px; padding: 14px; text-align: center; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .loading-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: "40px 24px 24px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%)",
        borderBottom: "1px solid var(--border)", textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🧠</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
            MindLens
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
          NLP-powered depression indicator detection from social media text
        </p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
          padding: "4px 12px", borderRadius: 20, background: "var(--surface-2)",
          fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLiveMode() ? "var(--green)" : "var(--amber)" }} />
          {isLiveMode() ? "Live model connected" : "Demo mode — mock predictions"}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, padding: "0 24px", borderBottom: "1px solid var(--border)" }}>
        <button className={`tab ${activeTab === "analyze" ? "active" : ""}`} onClick={() => setActiveTab("analyze")}>Analyze</button>
        <button className={`tab ${activeTab === "about" ? "active" : ""}`} onClick={() => setActiveTab("about")}>Pipeline</button>
        <button className={`tab ${activeTab === "metrics" ? "active" : ""}`} onClick={() => setActiveTab("metrics")}>Model Metrics</button>
      </div>

      <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>

        {/* ===== ANALYZE TAB ===== */}
        {activeTab === "analyze" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>
                Input Post
              </label>
              <textarea ref={textareaRef} className="textarea-input"
                placeholder="Paste a social media post here to analyze for depression indicators..."
                value={input} onChange={(e) => setInput(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SAMPLE_POSTS.map((s, i) => (
                    <button key={i} className="btn-sample" onClick={() => loadSample(s.text)}>{s.label}</button>
                  ))}
                </div>
                <button className="btn-primary" onClick={handleAnalyze} disabled={!input.trim() || loading}>
                  {loading ? <span className="loading-pulse">Analyzing...</span> : <>Analyze Post</>}
                </button>
              </div>
            </div>

            {loading && (
              <div className="card" style={{ display: "flex", gap: 20, justifyContent: "space-between", flexWrap: "wrap" }}>
                <PipelineStep number={1} title="Preprocessing" detail="Tokenization, cleaning" active={pipelineStep >= 1} />
                <PipelineStep number={2} title="Feature Extraction" detail="TF-IDF + embeddings" active={pipelineStep >= 2} />
                <PipelineStep number={3} title="Model Inference" detail="RoBERTa classifier" active={pipelineStep >= 3} />
                <PipelineStep number={4} title="Results" detail="Confidence scoring" active={pipelineStep >= 4} />
              </div>
            )}

            {result && (
              <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Main result */}
                <div className="card" style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <GaugeChart value={result.confidence} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Transformer Model</div>
                    <span className="result-badge" style={{
                      background: result.prediction === "depressive" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                      color: result.prediction === "depressive" ? "var(--red)" : "var(--green)",
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />
                      {result.prediction === "depressive" ? "Depression Indicators Detected" : "No Depression Indicators"}
                    </span>
                    <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                      Model: <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--text-primary)" }}>{result.model}</span>
                    </div>
                  </div>
                </div>

                {/* Comparison + Preprocessing */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="card">
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Model Comparison</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="metric-box">
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>RoBERTa (Transformer)</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: result.prediction === "depressive" ? "var(--red)" : "var(--green)" }}>
                          {(result.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="metric-box">
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>TF-IDF + LogReg (Baseline)</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: result.baseline_prediction === "depressive" ? "var(--red)" : "var(--green)" }}>
                          {(result.baseline_confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Preprocessing</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        ["Original Length", `${result.preprocessing.original_length} chars`],
                        ["Token Count", `${result.preprocessing.token_count} tokens`],
                        ["Cleaned Length", `${result.preprocessing.cleaned_length} chars`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                          <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "var(--text-primary)" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Highlighted words */}
                {result.highlighted_words?.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Key Indicators (Attention Highlights)</div>
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", padding: 16, background: "var(--surface-2)", borderRadius: 10 }}>
                      <HighlightedText text={input} words={result.highlighted_words} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {result.highlighted_words.map((w) => (
                        <span key={w} style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 6,
                          background: "rgba(239,68,68,0.1)", color: "var(--red)",
                          fontFamily: "'DM Mono', monospace",
                        }}>{w}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: 12, color: "var(--amber)", lineHeight: 1.5,
                }}>
                  ⚠️ <strong>Disclaimer:</strong> This tool detects linguistic markers associated with self-reported depression. It is not a clinical diagnostic tool. If you or someone you know is struggling, please reach out to a mental health professional.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PIPELINE TAB ===== */}
        {activeTab === "about" && (
          <div className="card">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 16 }}>NLP Pipeline Architecture</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { icon: "📥", title: "Data Collection", desc: "Reddit posts from r/depression and control subreddits. Binary labeled dataset (~10k posts).", tools: "PRAW, Kaggle Datasets" },
                { icon: "🧹", title: "Preprocessing", desc: "Lowercasing, URL/mention removal, lemmatization, stopword filtering, tokenization.", tools: "NLTK, spaCy, regex" },
                { icon: "📊", title: "Feature Extraction", desc: "TF-IDF vectors for baseline. Transformer tokenizer (BPE) for RoBERTa embeddings.", tools: "scikit-learn, HuggingFace Tokenizers" },
                { icon: "🤖", title: "Model Training", desc: "Baseline: Logistic Regression on TF-IDF. Primary: Fine-tuned RoBERTa-base with classification head.", tools: "scikit-learn, PyTorch, Transformers" },
                { icon: "📈", title: "Evaluation", desc: "Precision, Recall, F1-score with emphasis on recall to minimize missed cases. Confusion matrix analysis.", tools: "scikit-learn metrics, matplotlib" },
                { icon: "🌐", title: "Deployment", desc: "React frontend with Flask REST API. Model served via /predict endpoint with JSON I/O.", tools: "React, Flask, Docker (optional)" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                  }}>{step.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{step.desc}</div>
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>Tools: {step.tools}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== METRICS TAB ===== */}
        {activeTab === "metrics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 16 }}>Model Performance (Expected)</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Target metrics based on similar studies. Update with actual results after training.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { model: "TF-IDF + Logistic Regression", accuracy: "78-82%", f1: "0.76-0.80", recall: "0.72-0.78", tag: "Baseline" },
                  { model: "Fine-tuned RoBERTa", accuracy: "86-91%", f1: "0.85-0.90", recall: "0.83-0.88", tag: "Primary" },
                ].map((m, i) => (
                  <div key={i} className="card" style={{ background: "var(--surface-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.model}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 4,
                        background: i === 1 ? "var(--accent-glow)" : "var(--surface-3)",
                        color: i === 1 ? "var(--accent)" : "var(--text-muted)",
                        fontFamily: "'DM Mono', monospace",
                      }}>{m.tag}</span>
                    </div>
                    {[["Accuracy", m.accuracy], ["F1 Score", m.f1], ["Recall", m.recall]].map(([label, val]) => (
                      <div key={label} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
                      }}>
                        <span style={{ color: "var(--text-muted)" }}>{label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--text-primary)" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>💡 Note for your partner</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Replace the "expected" metrics above with actual results after model training.
                These placeholders are based on published benchmarks from similar depression detection studies.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
