import { useState, useEffect, useRef } from "react";
import { analyzePost, isLiveMode } from "./api";

// ============================================================
// CONSTANTS
// ============================================================
const SAMPLE_POSTS = [
  { label: "Depressive indicators", text: "I feel so empty and alone lately. Nothing seems to matter anymore. I can't even get out of bed most days. Everything feels hopeless and I don't know how to keep going." },
  { label: "Non-depressive", text: "Had an amazing weekend hiking with friends! The weather was perfect and we found this incredible waterfall. Already planning our next adventure. Life is good!" },
  { label: "Subtle / ambiguous", text: "Another day, another dollar I guess. Been staying up way too late again, can't seem to turn my brain off. Might just skip the gym tomorrow, don't really see the point." },
];

const METRICS_DATA = [
  { model: "TF-IDF + Logistic Regression", tag: "Baseline", isPrimary: false, metrics: [{ label: "Accuracy", range: "78–82%", mid: 0.80 }, { label: "F1 Score", range: "0.76–0.80", mid: 0.78 }, { label: "Recall", range: "0.72–0.78", mid: 0.75 }] },
  { model: "Fine-tuned RoBERTa", tag: "Primary", isPrimary: true, metrics: [{ label: "Accuracy", range: "86–91%", mid: 0.885 }, { label: "F1 Score", range: "0.85–0.90", mid: 0.875 }, { label: "Recall", range: "0.83–0.88", mid: 0.855 }] },
];

const MOCK_PLATFORM_POSTS = {
  "Twitter/X":  "i haven't slept properly in weeks. everything just feels like too much lately. even getting up to eat feels impossible. idk how much longer i can do this",
  "Reddit":     "posting here because i don't know where else to go. been feeling completely disconnected from everything and everyone. the emptiness is overwhelming. nothing matters anymore",
  "Instagram":  "just going through the motions every day. the smiles are getting harder to fake. tired of pretending everything's okay when it's not",
  "Facebook":   "don't know why i'm sharing this. feeling really lost and alone lately. like no one would notice if i just disappeared",
  "TikTok":     "everyone on here seems so happy and i'm just sitting here wondering what's wrong with me. exhausted all the time for no reason",
  "Unknown":    "feeling really down lately and don't know why. everything seems pointless and exhausting.",
};

const MOCK_ACCOUNT_POSTS = [
  { text: "another sleepless night. can't turn my brain off no matter what i try", timestamp: "2h ago" },
  { text: "skipped work again today. just couldn't bring myself to get out of bed. feel like such a failure", timestamp: "1d ago" },
  { text: "had a good moment today when my dog came to cuddle. small things I guess", timestamp: "2d ago" },
  { text: "nothing feels real anymore. going through motions but completely checked out", timestamp: "3d ago" },
  { text: "therapy appointment tomorrow. dreading it but trying to keep the commitment", timestamp: "4d ago" },
];

// ============================================================
// HELPERS
// ============================================================
function detectPlatform(url) {
  if (/twitter\.com|x\.com/i.test(url)) return "Twitter/X";
  if (/reddit\.com/i.test(url)) return "Reddit";
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/facebook\.com/i.test(url)) return "Facebook";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  return "Unknown";
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function NeuralSVG() {
  const nodes = [
    { cx: 110, cy: 30, r: 7, primary: true }, { cx: 40, cy: 70, r: 4, primary: false },
    { cx: 180, cy: 60, r: 7, primary: true }, { cx: 65, cy: 120, r: 4, primary: false },
    { cx: 155, cy: 130, r: 4, primary: false }, { cx: 25, cy: 140, r: 3, primary: false },
    { cx: 195, cy: 100, r: 4, primary: false }, { cx: 110, cy: 90, r: 7, primary: true },
    { cx: 75, cy: 45, r: 4, primary: false }, { cx: 145, cy: 75, r: 4, primary: false },
  ];
  const lines = [[0,1],[0,2],[0,7],[1,3],[1,7],[2,4],[2,6],[7,3],[7,4],[7,8],[8,9],[9,6]];
  return (
    <svg width={220} height={160} viewBox="0 0 220 160" style={{ overflow: "visible" }}>
      {lines.map(([a, b], i) => <line key={i} x1={nodes[a].cx} y1={nodes[a].cy} x2={nodes[b].cx} y2={nodes[b].cy} stroke="rgba(79,70,229,0.20)" strokeWidth={1.5} />)}
      {nodes.filter(n => n.primary).map((n, i) => <circle key={i} cx={n.cx} cy={n.cy} r={14} fill="rgba(79,70,229,0.08)" />)}
      {nodes.map((n, i) => <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.primary ? "#4f46e5" : "#a5b4fc"} />)}
    </svg>
  );
}

function PlatformBadge({ platform }) {
  const config = {
    "Twitter/X":  { bg: "rgba(29,155,240,0.1)",  color: "#1d9bf0", label: "𝕏 Twitter/X" },
    "Reddit":     { bg: "rgba(255,69,0,0.1)",     color: "#ff4500", label: "◉ Reddit" },
    "Instagram":  { bg: "rgba(225,48,108,0.1)",   color: "#e1306c", label: "◎ Instagram" },
    "Facebook":   { bg: "rgba(24,119,242,0.1)",   color: "#1877f2", label: "f Facebook" },
    "TikTok":     { bg: "rgba(0,0,0,0.07)",       color: "#000000", label: "♪ TikTok" },
    "Unknown":    { bg: "rgba(148,163,184,0.1)",  color: "#94a3b8", label: "? Unknown" },
  };
  const c = config[platform] || config["Unknown"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
      {c.label}
    </span>
  );
}

function HorizontalBarChart({ rows, animate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((row, i) => {
        const isDepressive = row.prediction === "depressive";
        const color = isDepressive ? (row.isPrimary ? "#dc2626" : "rgba(220,38,38,0.45)") : (row.isPrimary ? "#4f46e5" : "rgba(79,70,229,0.40)");
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 168, fontSize: 12, color: "var(--text-muted)", flexShrink: 0, lineHeight: 1.3 }}>{row.label}</div>
            <div style={{ flex: 1, height: 10, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: color, width: animate ? `${row.value * 100}%` : "0%", transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <div style={{ width: 52, textAlign: "right", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700, color, flexShrink: 0 }}>
              {(row.value * 100).toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineStep({ number, title, detail, active }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", opacity: active ? 1 : 0.35, transition: "opacity 0.4s ease" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: active ? "var(--accent)" : "var(--surface-3)", color: active ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: "all 0.4s ease", border: active ? "none" : "1px solid var(--border)" }}>
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
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        words.some(w => part.toLowerCase().includes(w.toLowerCase()))
          ? <mark key={i} style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626", padding: "1px 4px", borderRadius: 3, fontWeight: 600 }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// Token visualization for "How It Works" tab
function TokenViz({ text }) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).slice(0, 18);
  const hues = [220, 280, 160, 30, 340, 190, 250, 140];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {words.map((word, i) => {
        const hue = hues[i % hues.length];
        const isSubword = word.length > 6 && i % 3 === 0;
        return (
          <div key={i} style={{ display: "flex", gap: 2 }}>
            {isSubword ? (
              <>
                <span style={{ padding: "4px 8px", borderRadius: "6px 0 0 6px", background: `hsla(${hue},70%,94%,1)`, color: `hsl(${hue},50%,35%)`, fontSize: 12, fontFamily: "'DM Mono', monospace", border: `1px solid hsla(${hue},50%,80%,1)` }}>
                  {word.slice(0, Math.ceil(word.length * 0.6))}
                </span>
                <span style={{ padding: "4px 8px", borderRadius: "0 6px 6px 0", background: `hsla(${hue},60%,88%,1)`, color: `hsl(${hue},50%,30%)`, fontSize: 12, fontFamily: "'DM Mono', monospace", border: `1px solid hsla(${hue},50%,75%,1)`, borderLeft: "none" }}>
                  {word.slice(Math.ceil(word.length * 0.6))}
                </span>
              </>
            ) : (
              <span style={{ padding: "4px 8px", borderRadius: 6, background: `hsla(${hue},70%,94%,1)`, color: `hsl(${hue},50%,35%)`, fontSize: 12, fontFamily: "'DM Mono', monospace", border: `1px solid hsla(${hue},50%,80%,1)` }}>
                {word}
              </span>
            )}
          </div>
        );
      })}
      {words.length === 18 && <span style={{ padding: "4px 8px", fontSize: 12, color: "var(--text-muted)" }}>…</span>}
    </div>
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
  const [mounted, setMounted] = useState(false);
  const [metricsMounted, setMetricsMounted] = useState(false);

  // Social media modes
  const [inputMode, setInputMode] = useState("text"); // "text" | "url" | "account"
  const [socialUrl, setSocialUrl] = useState("");
  const [accountHandle, setAccountHandle] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [accountResults, setAccountResults] = useState(null);

  const textareaRef = useRef(null);

  useEffect(() => {
    if (result) {
      const id = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(id);
    } else {
      setMounted(false);
    }
  }, [result]);

  useEffect(() => {
    if (activeTab === "metrics") {
      const id = setTimeout(() => setMetricsMounted(true), 80);
      return () => clearTimeout(id);
    }
  }, [activeTab]);

  const handleAnalyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setAccountResults(null);
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 400);
    setTimeout(() => setPipelineStep(3), 800);
    try {
      const data = await analyzePost(input);
      setPipelineStep(4);
      setTimeout(() => { setResult(data); setLoading(false); }, 300);
    } catch {
      setLoading(false);
      setPipelineStep(0);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!socialUrl.trim() || loading) return;
    const platform = detectPlatform(socialUrl);
    setDetectedPlatform(platform);
    const mockText = MOCK_PLATFORM_POSTS[platform] || MOCK_PLATFORM_POSTS["Unknown"];
    setLoading(true);
    setResult(null);
    setAccountResults(null);
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 500);
    setTimeout(() => setPipelineStep(3), 900);
    try {
      const data = await analyzePost(mockText);
      setPipelineStep(4);
      setTimeout(() => {
        setInput(mockText);
        setResult(data);
        setLoading(false);
      }, 300);
    } catch {
      setLoading(false);
      setPipelineStep(0);
    }
  };

  const handleAccountAnalyze = async () => {
    if (!accountHandle.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setAccountResults(null);
    setPipelineStep(1);
    setTimeout(() => setPipelineStep(2), 400);
    setTimeout(() => setPipelineStep(3), 800);
    try {
      const results = [];
      for (const post of MOCK_ACCOUNT_POSTS) {
        const data = await analyzePost(post.text);
        results.push({ ...post, result: data });
      }
      setPipelineStep(4);
      setTimeout(() => {
        setAccountResults(results);
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
    setAccountResults(null);
    setPipelineStep(0);
    setInputMode("text");
    textareaRef.current?.focus();
  };

  const depressiveCount = accountResults ? accountResults.filter(p => p.result.prediction === "depressive").length : 0;
  const avgConfidence = accountResults ? accountResults.reduce((s, p) => s + p.result.confidence, 0) / accountResults.length : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', sans-serif", color: "var(--text-primary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        :root {
          --bg: #f4f6fb;
          --surface-1: #ffffff;
          --surface-2: #f1f5f9;
          --surface-3: #e2e8f0;
          --accent: #4f46e5;
          --accent-glow: rgba(79,70,229,0.08);
          --green: #16a34a;
          --red: #dc2626;
          --amber: #d97706;
          --text-primary: #1e293b;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --border: rgba(0,0,0,0.07);
          --shadow-card: 0 1px 3px rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.04);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-card); }
        .card-inner { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
        .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 14px; display: block; }
        .textarea-input { width: 100%; min-height: 110px; padding: 14px 16px; background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; resize: vertical; outline: none; transition: border-color 0.2s; }
        .textarea-input:focus { border-color: var(--accent); }
        .textarea-input::placeholder { color: var(--text-muted); }
        .url-input { width: 100%; padding: 12px 16px; background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 12px; color: var(--text-primary); font-family: 'DM Mono', monospace; font-size: 13px; outline: none; transition: border-color 0.2s; }
        .url-input:focus { border-color: var(--accent); }
        .url-input::placeholder { color: var(--text-muted); }
        .btn-primary { background: var(--accent); color: white; border: none; padding: 11px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-sample { background: var(--surface-2); color: var(--text-secondary); border: 1px solid var(--border); padding: 7px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        .btn-sample:hover { background: var(--surface-3); border-color: var(--accent); color: var(--accent); }
        .mode-btn { padding: 7px 16px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; background: var(--surface-1); color: var(--text-muted); }
        .mode-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
        .tab { padding: 10px 18px; border: none; background: none; color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .result-badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; font-family: 'DM Mono', monospace; }
        .tech-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; background: var(--surface-2); border: 1px solid var(--border); font-size: 11px; color: var(--text-secondary); font-family: 'DM Mono', monospace; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .stat-item { background: var(--surface-2); border-radius: 10px; padding: 14px 10px; text-align: center; }
        .stat-icon { font-size: 18px; margin-bottom: 6px; }
        .stat-value { font-size: 18px; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--text-primary); }
        .stat-label { font-size: 10px; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.8px; }
        .keyword-chip { display: inline-flex; flex-direction: column; gap: 4px; padding: 7px 10px; border-radius: 8px; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.15); }
        .chip-word { font-size: 11px; color: var(--red); font-family: 'DM Mono', monospace; font-weight: 500; }
        .chip-bar-track { height: 3px; background: rgba(220,38,38,0.15); border-radius: 2px; width: 60px; }
        .chip-bar-fill { height: 3px; background: var(--red); border-radius: 2px; transition: width 0.6s ease-out; }
        .pipeline-card { display: flex; gap: 16px; align-items: flex-start; padding: 16px; background: var(--surface-2); border-radius: 12px; border: 1px solid var(--border); }
        .pipeline-step-badge { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace; }
        .metric-bar-track { flex: 1; height: 6px; background: var(--surface-3); border-radius: 999px; overflow: hidden; }
        .metric-bar-fill { height: 100%; border-radius: 999px; transition: width 0.8s cubic-bezier(0.22,1,0.36,1); }
        .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .span-2 { grid-column: span 2; }
        .span-3 { grid-column: span 3; }
        .explainer-step { display: flex; gap: 14px; align-items: flex-start; padding: 14px; background: var(--surface-2); border-radius: 10px; }
        .explainer-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; flex-shrink: 0; }
        .post-mini { padding: 14px 16px; background: var(--surface-2); border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .loading-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { opacity: 0; animation: fadeUp 0.45s ease-out forwards; }
        @media (max-width: 700px) { .neural-svg-wrap { display: none; } .dashboard { grid-template-columns: 1fr; } .span-2, .span-3 { grid-column: span 1; } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: "28px 48px", background: "linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, overflow: "hidden" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧠</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>MindLens</h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 480, lineHeight: 1.5, marginBottom: 14 }}>
            NLP-powered depression indicator detection from social media text — fine-tuned RoBERTa vs TF-IDF baseline comparison
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLiveMode() ? "var(--green)" : "var(--amber)" }} />
              {isLiveMode() ? "Live model" : "Demo mode"}
            </div>
            {["RoBERTa", "PyTorch", "Flask", "React"].map(t => <span key={t} className="tech-pill">{t}</span>)}
          </div>
        </div>
        <div className="neural-svg-wrap" style={{ flexShrink: 0, opacity: 0.85 }}><NeuralSVG /></div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 4, padding: "0 48px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
        {[["analyze","Analyze"],["about","Pipeline"],["metrics","Model Metrics"],["howitworks","How It Works"]].map(([key, label]) => (
          <button key={key} className={`tab ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "28px 48px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ══════════════════════════════ ANALYZE TAB ══════════════════════════════ */}
        {activeTab === "analyze" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Input panel */}
            <div className="card">
              {/* Mode toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {[["text","✏️ Text"],["url","🔗 URL"],["account","👤 Account"]].map(([mode, label]) => (
                  <button key={mode} className={`mode-btn ${inputMode === mode ? "active" : ""}`}
                    onClick={() => { setInputMode(mode); setResult(null); setAccountResults(null); }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Text mode */}
              {inputMode === "text" && (
                <>
                  <span className="section-label">Post Text</span>
                  <textarea ref={textareaRef} className="textarea-input" placeholder="Paste a social media post here to analyze for depression indicators..." value={input} onChange={e => setInput(e.target.value)} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {SAMPLE_POSTS.map((s, i) => <button key={i} className="btn-sample" onClick={() => loadSample(s.text)}>{s.label}</button>)}
                    </div>
                    <button className="btn-primary" onClick={handleAnalyze} disabled={!input.trim() || loading}>
                      {loading ? <span className="loading-pulse">Analyzing…</span> : "Analyze Post →"}
                    </button>
                  </div>
                </>
              )}

              {/* URL mode */}
              {inputMode === "url" && (
                <>
                  <span className="section-label">Social Media Post URL</span>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                    Paste a link to a public post on Twitter/X, Reddit, Instagram, Facebook, or TikTok. MindLens will fetch and analyze the post text.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input className="url-input" placeholder="https://twitter.com/user/status/..." value={socialUrl} onChange={e => setSocialUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUrlAnalyze()} />
                    <button className="btn-primary" onClick={handleUrlAnalyze} disabled={!socialUrl.trim() || loading}>
                      {loading ? <span className="loading-pulse">Fetching…</span> : "Fetch & Analyze →"}
                    </button>
                  </div>
                  {socialUrl && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                      Detected: <PlatformBadge platform={detectPlatform(socialUrl)} />
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.keys(MOCK_PLATFORM_POSTS).filter(p => p !== "Unknown").map(p => (
                      <button key={p} className="btn-sample" onClick={() => setSocialUrl({ "Twitter/X": "https://x.com/user/status/123456789", "Reddit": "https://reddit.com/r/depression/comments/xyz", "Instagram": "https://instagram.com/p/xyz", "Facebook": "https://facebook.com/post/123", "TikTok": "https://tiktok.com/@user/video/123" }[p])}>
                        Try {p}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Account mode */}
              {inputMode === "account" && (
                <>
                  <span className="section-label">Social Media Account</span>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                    Enter a username to scan their recent posts and generate an aggregate risk assessment across multiple data points.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input className="url-input" placeholder="@username or username" value={accountHandle} onChange={e => setAccountHandle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAccountAnalyze()} />
                    <button className="btn-primary" onClick={handleAccountAnalyze} disabled={!accountHandle.trim() || loading}>
                      {loading ? <span className="loading-pulse">Scanning…</span> : "Scan Account →"}
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>Analyzes the {MOCK_ACCOUNT_POSTS.length} most recent posts from the account.</div>
                </>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="card" style={{ display: "flex", gap: 20, justifyContent: "space-between", flexWrap: "wrap" }}>
                <PipelineStep number={1} title="Preprocessing" detail="Tokenization, cleaning" active={pipelineStep >= 1} />
                <PipelineStep number={2} title="Feature Extraction" detail="TF-IDF + embeddings" active={pipelineStep >= 2} />
                <PipelineStep number={3} title="Model Inference" detail="RoBERTa classifier" active={pipelineStep >= 3} />
                <PipelineStep number={4} title="Results" detail="Confidence scoring" active={pipelineStep >= 4} />
              </div>
            )}

            {/* ── SINGLE POST RESULTS — DASHBOARD GRID ── */}
            {result && !accountResults && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Platform badge if from URL mode */}
                {detectedPlatform && inputMode === "url" && (
                  <div className="fade-up" style={{ animationDelay: "0ms", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                    <PlatformBadge platform={detectedPlatform} />
                    <span>Post fetched and analyzed</span>
                  </div>
                )}

                {/* Row 1: 3 stat cards */}
                <div className="dashboard" style={{ animationDelay: "0ms" }}>
                  {/* Confidence score */}
                  <div className="card fade-up" style={{ animationDelay: "0ms" }}>
                    <span className="section-label">Confidence Score</span>
                    <div style={{ fontSize: 58, fontWeight: 800, fontFamily: "'DM Mono', monospace", lineHeight: 1, color: result.prediction === "depressive" ? "var(--red)" : "var(--accent)" }}>
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
                      {result.prediction === "depressive" ? "depressive" : "non-depressive"} class
                    </div>
                  </div>

                  {/* Prediction */}
                  <div className="card fade-up" style={{ animationDelay: "80ms" }}>
                    <span className="section-label">Classification</span>
                    <div style={{ marginBottom: 16 }}>
                      <span className="result-badge" style={{
                        background: result.prediction === "depressive" ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
                        color: result.prediction === "depressive" ? "var(--red)" : "var(--green)",
                        border: `1px solid ${result.prediction === "depressive" ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />
                        {result.prediction === "depressive" ? "Depression Indicators Detected" : "No Depression Indicators"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {result.prediction === "depressive"
                        ? "Linguistic patterns associated with self-reported depression were found in this post."
                        : "No significant linguistic markers of depression were detected in this post."}
                    </div>
                  </div>

                  {/* Model info */}
                  <div className="card fade-up" style={{ animationDelay: "160ms" }}>
                    <span className="section-label">Model</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>{result.model}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>Primary classifier — fine-tuned on Reddit depression corpus</div>
                    <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                      <span>Baseline (TF-IDF)</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: result.baseline_prediction === "depressive" ? "var(--red)" : "var(--accent)" }}>
                        {(result.baseline_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Bar chart (2/3) + Preprocessing (1/3) */}
                <div className="dashboard">
                  <div className="card fade-up span-2" style={{ animationDelay: "200ms" }}>
                    <span className="section-label">Model Comparison</span>
                    <HorizontalBarChart
                      rows={[
                        { label: "RoBERTa (Transformer)", value: result.confidence, prediction: result.prediction, isPrimary: true },
                        { label: "TF-IDF Baseline", value: result.baseline_confidence, prediction: result.baseline_prediction, isPrimary: false },
                      ]}
                      animate={mounted}
                    />
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      RoBERTa captures contextual meaning — it understands that <em>"nothing matters"</em> is more alarming than individual keywords. TF-IDF relies purely on keyword frequency.
                    </div>
                  </div>
                  <div className="card fade-up" style={{ animationDelay: "250ms" }}>
                    <span className="section-label">Preprocessing</span>
                    <div className="stat-grid">
                      <div className="stat-item"><div className="stat-icon">📝</div><div className="stat-value">{result.preprocessing.original_length}</div><div className="stat-label">chars in</div></div>
                      <div className="stat-item"><div className="stat-icon">🔤</div><div className="stat-value">{result.preprocessing.token_count}</div><div className="stat-label">tokens</div></div>
                      <div className="stat-item"><div className="stat-icon">✂️</div><div className="stat-value">{result.preprocessing.cleaned_length}</div><div className="stat-label">chars out</div></div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      URLs, mentions, punctuation removed. Text lowercased and lemmatized before tokenization.
                    </div>
                  </div>
                </div>

                {/* Row 3: Flagged tokens (full width) */}
                {result.highlighted_words?.length > 0 && (
                  <div className="card fade-up span-3" style={{ animationDelay: "320ms" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span className="section-label" style={{ marginBottom: 0 }}>Flagged Tokens</span>
                      <span style={{ background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: "'DM Mono', monospace" }}>{result.highlighted_words.length}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Original text with highlights</div>
                        <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", padding: 14, background: "var(--surface-2)", borderRadius: 10 }}>
                          <HighlightedText text={input} words={result.highlighted_words} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Attention weights (mock)</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {result.highlighted_words.map((w, i) => {
                            const attention = 1 - (i / Math.max(result.highlighted_words.length - 1, 1)) * 0.5;
                            return (
                              <div key={w} className="keyword-chip">
                                <span className="chip-word">{w}</span>
                                <div className="chip-bar-track">
                                  <div className="chip-bar-fill" style={{ width: mounted ? `${attention * 100}%` : "0%" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                          Bar length represents approximate attention weight assigned by the transformer. Higher = more influential in the classification decision.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 4: Inline explainer */}
                <div className="card fade-up" style={{ animationDelay: "420ms", background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)", border: "1px solid rgba(79,70,229,0.12)" }}>
                  <span className="section-label" style={{ color: "var(--accent)" }}>How This Result Was Reached</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { step: "1", title: "Text Preprocessing", desc: `Your ${result.preprocessing.original_length}-character post was cleaned, lowercased, and stripped of URLs/mentions, leaving ${result.preprocessing.token_count} tokens for analysis.` },
                      { step: "2", title: "RoBERTa Tokenization", desc: "Tokens were encoded using Byte-Pair Encoding (BPE), allowing the model to handle rare words and subword morphology. Each token maps to a 768-dimensional embedding." },
                      { step: "3", title: "Multi-Head Self-Attention", desc: `The 12 attention heads in RoBERTa-base computed relationships between all token pairs. Words like ${result.highlighted_words?.slice(0,2).map(w => `"${w}"`).join(", ") || '"hopeless", "alone"'} received elevated attention scores.` },
                      { step: "4", title: "Classification Head", desc: `The [CLS] token embedding was passed through a linear classifier, producing logits. After softmax: ${(result.confidence * 100).toFixed(1)}% probability of depression class.` },
                    ].map(({ step, title, desc }) => (
                      <div key={step} className="explainer-step">
                        <div className="explainer-num">{step}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="fade-up" style={{ animationDelay: "500ms", padding: "12px 16px", borderRadius: 10, background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.18)", fontSize: 12, color: "var(--amber)", lineHeight: 1.5 }}>
                  ⚠️ <strong>Disclaimer:</strong> This tool detects linguistic markers associated with self-reported depression. It is not a clinical diagnostic tool. If you or someone you know is struggling, please reach out to a mental health professional or call the Crisis Text Line: text HOME to 741741.
                </div>
              </div>
            )}

            {/* ── ACCOUNT RESULTS ── */}
            {accountResults && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Aggregate card */}
                <div className="card fade-up" style={{ animationDelay: "0ms" }}>
                  <span className="section-label">Account Risk Assessment — @{accountHandle.replace("@","")}</span>
                  <div className="dashboard">
                    <div className="card-inner" style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: depressiveCount >= 3 ? "var(--red)" : depressiveCount >= 2 ? "var(--amber)" : "var(--green)", lineHeight: 1 }}>{depressiveCount}/{accountResults.length}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1px" }}>posts with indicators</div>
                    </div>
                    <div className="card-inner" style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: avgConfidence > 0.5 ? "var(--red)" : "var(--accent)", lineHeight: 1 }}>{(avgConfidence * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1px" }}>avg confidence</div>
                    </div>
                    <div className="card-inner">
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Risk level</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: depressiveCount >= 3 ? "var(--red)" : depressiveCount >= 2 ? "var(--amber)" : "var(--green)" }}>
                        {depressiveCount >= 3 ? "Elevated" : depressiveCount >= 2 ? "Moderate" : "Low"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                        {depressiveCount >= 3 ? "Multiple posts show distress patterns across recent activity." : depressiveCount >= 2 ? "Some posts show depressive markers — monitor over time." : "Most recent posts show no significant indicators."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual posts */}
                <div className="card fade-up" style={{ animationDelay: "100ms" }}>
                  <span className="section-label">Recent Post Analysis — {accountResults.length} posts scanned</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {accountResults.map((post, i) => (
                      <div key={i} className="post-mini">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>{post.text}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{post.timestamp}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <span className="result-badge" style={{
                            fontSize: 11, padding: "4px 10px",
                            background: post.result.prediction === "depressive" ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
                            color: post.result.prediction === "depressive" ? "var(--red)" : "var(--green)",
                            border: `1px solid ${post.result.prediction === "depressive" ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                            {(post.result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="fade-up" style={{ animationDelay: "200ms", padding: "12px 16px", borderRadius: 10, background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.18)", fontSize: 12, color: "var(--amber)", lineHeight: 1.5 }}>
                  ⚠️ <strong>Disclaimer:</strong> Aggregate analysis is not a clinical assessment. Patterns across multiple posts may increase signal reliability but this tool is not a substitute for professional evaluation.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════ PIPELINE TAB ══════════════════════════════ */}
        {activeTab === "about" && (
          <div className="card">
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 20, color: "var(--text-primary)" }}>NLP Pipeline Architecture</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { title: "Data Collection",    desc: "Reddit posts from r/depression and control subreddits. Binary labeled dataset (~10k posts).",                  tools: "PRAW, Kaggle Datasets" },
                { title: "Preprocessing",      desc: "Lowercasing, URL/mention removal, lemmatization, stopword filtering, tokenization.",                          tools: "NLTK, spaCy, regex" },
                { title: "Feature Extraction", desc: "TF-IDF vectors for baseline. Transformer tokenizer (BPE) for RoBERTa embeddings.",                            tools: "scikit-learn, HuggingFace Tokenizers" },
                { title: "Model Training",     desc: "Baseline: Logistic Regression on TF-IDF. Primary: Fine-tuned RoBERTa-base with classification head.",         tools: "scikit-learn, PyTorch, Transformers" },
                { title: "Evaluation",         desc: "Precision, Recall, F1-score with emphasis on recall to minimize missed cases. Confusion matrix analysis.",     tools: "scikit-learn metrics, matplotlib" },
                { title: "Deployment",         desc: "React frontend with Flask REST API. Model served via /predict endpoint with JSON I/O.",                        tools: "React, Flask, Docker (optional)" },
              ].map((step, i) => (
                <div key={i} className="pipeline-card">
                  <div className="pipeline-step-badge">{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.desc}</div>
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>Tools: {step.tools}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════ METRICS TAB ══════════════════════════════ */}
        {activeTab === "metrics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6, color: "var(--text-primary)" }}>Model Performance (Expected)</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Target metrics based on similar published studies. Update with actual results after training.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {METRICS_DATA.map((m, mi) => (
                  <div key={mi} className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.model}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: m.isPrimary ? "var(--accent-glow)" : "var(--surface-3)", color: m.isPrimary ? "var(--accent)" : "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{m.tag}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {m.metrics.map(({ label, range, mid }) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: "var(--text-primary)", fontWeight: 600 }}>{range}</span>
                          </div>
                          <div className="metric-bar-track">
                            <div className="metric-bar-fill" style={{ width: metricsMounted ? `${mid * 100}%` : "0%", background: m.isPrimary ? "var(--accent)" : "var(--text-muted)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.15)", boxShadow: "none" }}>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>💡 Note</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Replace the expected metrics above with actual results after model training. These placeholders are based on published benchmarks from similar depression detection studies (CLPsych 2015–2022).</div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ HOW IT WORKS TAB ══════════════════════════════ */}
        {activeTab === "howitworks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Intro */}
            <div className="card" style={{ background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)", border: "1px solid rgba(79,70,229,0.12)" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 10, color: "var(--text-primary)" }}>From Raw Text to Prediction</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 700 }}>
                MindLens runs two models in parallel — a traditional TF-IDF baseline and a fine-tuned RoBERTa transformer.
                Here's exactly what happens between the moment you paste text and when a confidence score appears.
              </p>
            </div>

            {/* Step 1: Tokenization */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="pipeline-step-badge">1</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Tokenization (BPE)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Text → Token IDs → Embeddings</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
                RoBERTa uses <strong>Byte-Pair Encoding (BPE)</strong> — a subword tokenization algorithm. Rather than treating each word as one unit, BPE splits rare or compound words into subword pieces. This lets the model handle words it has never seen before, by recognizing familiar morphemes.
              </p>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Example: <em>"I feel so hopeless and alone"</em> becomes →</div>
                <TokenViz text="I feel so hopeless and alone tonight nothing matters" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Vocabulary size", value: "50,265", note: "RoBERTa-base BPE vocab" },
                  { label: "Max sequence length", value: "512", note: "tokens per input" },
                  { label: "Embedding dimension", value: "768", note: "dims per token vector" },
                ].map(({ label, value, note }) => (
                  <div key={label} className="card-inner" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "var(--accent)" }}>{value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Transformer architecture */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="pipeline-step-badge">2</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Multi-Head Self-Attention</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>12 attention heads × 12 transformer layers</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
                Unlike TF-IDF which counts keyword frequencies, RoBERTa <strong>contextualizes every word against every other word</strong> in the sequence. Self-attention lets the model learn that <em>"I can't keep going"</em> is more significant in the context of prior sentences about hopelessness — not in isolation.
              </p>
              {/* Simplified attention grid */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Simplified attention pattern — darker = stronger attention weight between token pairs</div>
                {(() => {
                  const tokens = ["I", "feel", "empty", "and", "alone", "nothing"];
                  const weights = [
                    [1.0, 0.6, 0.9, 0.2, 0.8, 0.7],
                    [0.6, 1.0, 0.5, 0.3, 0.4, 0.5],
                    [0.9, 0.5, 1.0, 0.2, 0.8, 0.9],
                    [0.2, 0.3, 0.2, 1.0, 0.2, 0.1],
                    [0.8, 0.4, 0.8, 0.2, 1.0, 0.8],
                    [0.7, 0.5, 0.9, 0.1, 0.8, 1.0],
                  ];
                  return (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <td style={{ width: 40 }} />
                            {tokens.map(t => <th key={t} style={{ padding: "4px 6px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-muted)", fontWeight: 500, textAlign: "center", width: 50 }}>{t}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tokens.map((row, ri) => (
                            <tr key={row}>
                              <td style={{ padding: "4px 8px 4px 0", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--text-muted)", textAlign: "right" }}>{row}</td>
                              {weights[ri].map((w, ci) => (
                                <td key={ci} style={{ padding: 3 }}>
                                  <div style={{ width: 44, height: 24, borderRadius: 4, background: `rgba(79,70,229,${w * 0.85})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: 9, color: w > 0.5 ? "rgba(255,255,255,0.9)" : "var(--text-muted)", fontFamily: "'DM Mono', monospace" }}>{w.toFixed(1)}</span>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Attention heads", value: "12", note: "per layer — each attends to different semantic relationships" },
                  { label: "Transformer layers", value: "12", note: "stacked — deeper layers capture higher-level semantics" },
                ].map(({ label, value, note }) => (
                  <div key={label} className="card-inner" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "var(--accent)", flexShrink: 0 }}>{value}</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div><div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{note}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Classification head */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="pipeline-step-badge">3</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Classification Head + Softmax</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>CLS token → Linear layer → Probabilities</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
                After 12 layers of self-attention, the <strong>[CLS] token</strong> (a special token prepended to every input) aggregates meaning from the entire sequence. A linear classification layer maps this 768-dimensional embedding to 2 output logits — one per class. Softmax converts these into probabilities that sum to 1.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                {[
                  { label: "768-dim [CLS] embedding", sub: "from last transformer layer", icon: "◈" },
                  { label: "Linear(768 → 2)", sub: "learned during fine-tuning", icon: "→" },
                  { label: "Softmax → [p₀, p₁]", sub: "depressive probability = p₁", icon: "%" },
                ].map(({ label, sub, icon }, i) => (
                  <div key={i} className="card-inner" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, color: "var(--accent)", marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: TF-IDF baseline */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="pipeline-step-badge" style={{ background: "var(--text-muted)" }}>B</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>TF-IDF + Logistic Regression (Baseline)</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Traditional ML — no contextual understanding</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
                The baseline model represents each document as a sparse vector of term frequencies weighted by inverse document frequency. Logistic Regression then finds a decision boundary in this high-dimensional space. It's interpretable and fast, but <strong>ignores word order and context entirely</strong> — <em>"not happy"</em> and <em>"happy"</em> look similar to it.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>TF-IDF vs RoBERTa — key differences</div>
                  {[
                    ["Context-aware", "✗ No", "✓ Yes"],
                    ["Handles negation", "✗ No", "✓ Yes"],
                    ["Rare word handling", "✗ OOV = 0", "✓ Subword BPE"],
                    ["Training examples needed", "✓ Low", "✗ High"],
                    ["Inference speed", "✓ ~1ms", "✗ ~200ms"],
                  ].map(([feat, baseline, roberta]) => (
                    <div key={feat} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{feat}</span>
                      <div style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: baseline.startsWith("✗") ? "var(--red)" : "var(--green)", fontFamily: "'DM Mono', monospace", fontSize: 11, width: 80, textAlign: "right" }}>{baseline}</span>
                        <span style={{ color: roberta.startsWith("✓") ? "var(--green)" : "var(--red)", fontFamily: "'DM Mono', monospace", fontSize: 11, width: 80, textAlign: "right" }}>{roberta}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 6, paddingRight: 0 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", width: 80, textAlign: "right" }}>TF-IDF</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", width: 80, textAlign: "right" }}>RoBERTa</span>
                  </div>
                </div>
                <div className="card-inner">
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Why we run both</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Running both models lets us measure how much contextual understanding contributes to accuracy. When they disagree significantly, it's a signal that context is doing heavy lifting — the kind of nuance a keyword-based system would miss entirely.
                  </p>
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--accent-glow)", borderRadius: 8, fontSize: 12, color: "var(--accent)", lineHeight: 1.5, border: "1px solid rgba(79,70,229,0.12)" }}>
                    Expected accuracy gap: <strong>8–10 percentage points</strong> in favor of RoBERTa on the depression detection task.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Limitations */}
            <div className="card" style={{ background: "rgba(217,119,6,0.04)", border: "1px solid rgba(217,119,6,0.15)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)", marginBottom: 12 }}>⚠️ Model Limitations & Ethical Considerations</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { title: "Self-report bias", desc: "Training data from r/depression is self-labeled — not clinically verified. The model learns patterns from how people talk about depression, not clinical diagnoses." },
                  { title: "Cultural & linguistic bias", desc: "Reddit skews toward English-speaking, Western users. Performance may degrade on text from other cultural contexts or in informal dialects." },
                  { title: "Not a diagnostic tool", desc: "Even at 88% accuracy, 1 in 8 predictions is wrong. High recall prioritization means false positives are common by design." },
                  { title: "Temporal context", desc: "Single post analysis ignores longitudinal context. Account-level analysis is more reliable but still not a substitute for professional assessment." },
                ].map(({ title, desc }) => (
                  <div key={title} className="card-inner">
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--amber)", marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
