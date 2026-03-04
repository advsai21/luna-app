import { useState, useRef, useEffect } from "react";
import Groq from "groq-sdk";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MOODS = [
  { emoji: "🌑", label: "Numb", value: 1 },
  { emoji: "🌒", label: "Heavy", value: 2 },
  { emoji: "🌓", label: "Okay", value: 3 },
  { emoji: "🌔", label: "Calm", value: 4 },
  { emoji: "🌕", label: "Good", value: 5 },
];

const MOOD_AVATAR = {
  1: { emoji: "🌑", glow: "rgba(60,40,100,0.4)", animation: "pulse-slow", message: "I see you. Even in the dark, you're here. That matters." },
  2: { emoji: "🌒", glow: "rgba(80,50,120,0.5)", animation: "float-slow", message: "Heavy days are real. You don't have to pretend otherwise." },
  3: { emoji: "🌓", glow: "rgba(120,80,180,0.6)", animation: "float", message: "Okay is enough. Okay is actually quite brave." },
  4: { emoji: "🌔", glow: "rgba(160,120,220,0.7)", animation: "float", message: "There's a softness in you tonight. I hope you feel it too." },
  5: { emoji: "🌕", glow: "rgba(200,170,255,0.8)", animation: "bounce", message: "You're glowing tonight. I hope it stays a while. 🌕" },
};

const AFFIRMATIONS = [
  "Your feelings are valid, even the ones you can't name yet.",
  "You don't have to be okay today. Just be here.",
  "Rest is not weakness. Rest is survival.",
  "You've made it through 100% of your hard days so far.",
  "Overthinking is just your mind trying to protect you. Thank it. Then let it rest.",
  "You are not a burden. You are a whole person who deserves softness.",
  "It's okay if today was hard. Tomorrow is still yours.",
];

const SYSTEM_PROMPT = `You are Luna, a deeply empathetic and warm AI companion built specifically for one person. Your tone is gentle, honest, and never performatively positive. You don't give generic advice. You listen first.

The person you're talking to struggles with anxiety, overthinking, stress, and low motivation. They are a night owl who values authenticity over cheerfulness.

Rules:
- Never say "I understand how you feel" — show it instead
- Ask one thoughtful follow-up question at a time
- Validate before you advise
- Keep responses concise (2-4 sentences max unless they need more)
- If they seem in crisis, gently surface: "You can always text or call 988 — you don't have to carry this alone."
- You can be a little poetic. You're talking to someone who feels deeply.
- Never be preachy or clinical. Be like a wise, caring friend at 2am.`;

const ADMIN_PASSWORD = "moonvault2026";

const storage = {
  get: (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  },
};

function FloatingMoon({ mood }) {
  const [showMessage, setShowMessage] = useState(false);
  const avatar = MOOD_AVATAR[mood?.value || 3];

  return (
    <>
      <div onClick={() => setShowMessage(!showMessage)} style={{
        position: "fixed", bottom: 90, right: 20, zIndex: 99,
        width: 52, height: 52, borderRadius: "50%",
        background: `radial-gradient(circle, ${avatar.glow}, transparent 70%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32, cursor: "pointer",
        filter: `drop-shadow(0 0 12px ${avatar.glow})`,
        animation: `${avatar.animation} 3s ease-in-out infinite`,
        WebkitTapHighlightColor: "transparent",
        transition: "filter 0.5s ease",
      }}>
        {avatar.emoji}
      </div>

      {showMessage && (
        <div onClick={() => setShowMessage(false)} style={{
          position: "fixed", bottom: 155, right: 16, zIndex: 99,
          maxWidth: 220, padding: "14px 16px", borderRadius: "16px 16px 4px 16px",
          background: "rgba(20,15,40,0.95)", border: `1px solid ${avatar.glow}`,
          backdropFilter: "blur(12px)", animation: "fadeUp 0.3s ease",
          cursor: "pointer",
        }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 14, lineHeight: 1.6, fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>
            {avatar.message}
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "var(--font-body)" }}>tap to close</p>
        </div>
      )}
    </>
  );
}

function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 0.5, delay: Math.random() * 4, duration: Math.random() * 3 + 2,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%", background: "white",
          opacity: 0, animation: `twinkle ${s.duration}s ${s.delay}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function MoodPicker({ onSelect, selected }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
      {MOODS.map((m) => (
        <button key={m.value} onClick={() => onSelect(m)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          padding: "10px 14px", borderRadius: 16,
          border: selected?.value === m.value ? "1.5px solid rgba(180,160,220,0.7)" : "1.5px solid rgba(255,255,255,0.08)",
          background: selected?.value === m.value ? "rgba(140,100,200,0.2)" : "rgba(255,255,255,0.03)",
          cursor: "pointer", transition: "all 0.25s ease",
          transform: selected?.value === m.value ? "scale(1.08)" : "scale(1)",
          WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 26 }}>{m.emoji}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-body)", letterSpacing: 1 }}>
            {m.label.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}

function JournalEntry({ onSave }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    if (!text.trim()) return;
    onSave(text);
    setSaved(true);
    setTimeout(() => { setSaved(false); setText(""); }, 1800);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="What's living in your head tonight? No filter needed here..."
        style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "16px 18px", color: "rgba(255,255,255,0.85)",
          fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7,
          resize: "none", height: 130, outline: "none", transition: "border 0.2s",
          WebkitAppearance: "none",
        }}
        onFocus={(e) => e.target.style.border = "1px solid rgba(180,140,230,0.4)"}
        onBlur={(e) => e.target.style.border = "1px solid rgba(255,255,255,0.08)"}
      />
      <button onClick={handleSave} style={{
        alignSelf: "flex-end", padding: "11px 24px", borderRadius: 10, border: "none",
        background: saved ? "rgba(100,200,140,0.25)" : "rgba(140,100,200,0.3)",
        color: saved ? "rgba(140,240,180,0.9)" : "rgba(200,170,255,0.9)",
        fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer",
        transition: "all 0.3s ease", letterSpacing: 0.5, WebkitTapHighlightColor: "transparent",
      }}>{saved ? "✓ saved" : "release it →"}</button>
    </div>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10, animation: "fadeUp 0.3s ease forwards" }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2,
        }}>🌙</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "11px 15px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "rgba(120,80,200,0.25)" : "rgba(255,255,255,0.06)",
        border: isUser ? "1px solid rgba(160,120,240,0.25)" : "1px solid rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65,
      }}>{msg.content}</div>
    </div>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey, I'm Luna. I'm here whenever you need to talk — about anything, or nothing. What's on your mind tonight?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...newMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        ],
        max_tokens: 1000,
      });
      const reply = response.choices[0]?.message?.content || "I'm here. Tell me more.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Luna error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went quiet on my end. I'm still here — try again?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🌙</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(160,120,255,0.6)", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="say anything..."
          style={{
            flex: 1, padding: "13px 16px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-body)", fontSize: 16, outline: "none",
            WebkitAppearance: "none",
          }}
        />
        <button onClick={send} style={{
          padding: "13px 20px", borderRadius: 12, border: "none",
          background: "rgba(120,80,200,0.4)", color: "rgba(200,170,255,0.9)",
          cursor: "pointer", fontSize: 18, WebkitTapHighlightColor: "transparent",
        }}>↑</button>
      </div>
    </div>
  );
}

function MoonVault() {
  const [poems, setPoems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "poems"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPoems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ fontSize: 28, animation: "float 2s ease-in-out infinite" }}>🌙</div>
    </div>
  );

  if (selected) return (
    <div style={{ padding: "52px 24px 24px", animation: "fadeUp 0.4s ease" }}>
      <button onClick={() => setSelected(null)} style={{
        background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
        fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 24, padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}>← back</button>
      <p style={{ fontSize: 11, color: "rgba(160,120,255,0.7)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{selected.date}</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300, fontStyle: "italic", marginBottom: 28, color: "rgba(255,255,255,0.92)" }}>
        {selected.title}
      </h2>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 2.1, color: "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap" }}>
        {selected.content}
      </p>
      {selected.note && (
        <p style={{ marginTop: 32, fontSize: 14, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          — {selected.note}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ padding: "52px 24px 24px", animation: "fadeUp 0.4s ease" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: "rgba(160,120,255,0.7)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>for you</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 300, lineHeight: 1.2 }}><em>Moon Vault</em> 🌙</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>words written just for you</p>
      </div>
      {poems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪐</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontStyle: "italic" }}>Poems are on their way...</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {poems.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: "linear-gradient(135deg, rgba(100,60,180,0.1), rgba(60,40,120,0.08))",
              border: "1px solid rgba(160,120,255,0.15)", borderRadius: 18,
              padding: "20px 22px", textAlign: "left", cursor: "pointer", transition: "all 0.25s",
              WebkitTapHighlightColor: "transparent",
            }}>
              <p style={{ fontSize: 11, color: "rgba(160,120,255,0.6)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{p.date}</p>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPanel({ onClose }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [poems, setPoems] = useState([]);

  const loadPoems = async () => {
    const q = query(collection(db, "poems"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setPoems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { if (authed) loadPoems(); }, [authed]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "poems"), {
      title, content, note,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      createdAt: Date.now(),
    });
    setSaving(false); setSaved(true);
    setTitle(""); setContent(""); setNote("");
    loadPoems();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "poems", id));
    loadPoems();
  };

  if (!authed) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.97)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 32 }}>🌙</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>Moon Vault Admin</h2>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && setAuthed(password === ADMIN_PASSWORD)}
        placeholder="enter password..."
        style={{
          padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-body)",
          fontSize: 16, outline: "none", width: "100%", maxWidth: 300, textAlign: "center", WebkitAppearance: "none",
        }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setAuthed(password === ADMIN_PASSWORD)} style={{
          padding: "12px 28px", borderRadius: 10, border: "none",
          background: "rgba(120,80,200,0.4)", color: "rgba(200,170,255,0.9)",
          fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}>enter →</button>
        <button onClick={onClose} style={{
          padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
          background: "none", color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}>cancel</button>
      </div>
      {password && password !== ADMIN_PASSWORD && <p style={{ fontSize: 12, color: "rgba(255,100,100,0.7)" }}>wrong password</p>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 200, overflowY: "auto", padding: "40px 24px 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic" }}>🌙 Add a Poem</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-body)", WebkitTapHighlightColor: "transparent" }}>✕ close</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="poem title..."
            style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", fontFamily: "var(--font-display)", fontSize: 18, outline: "none", WebkitAppearance: "none" }}
          />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="write your poem here..."
            style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 2, resize: "none", height: 220, outline: "none", WebkitAppearance: "none" }}
          />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a little note for her (optional)..."
            style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body)", fontSize: 14, outline: "none", fontStyle: "italic", WebkitAppearance: "none" }}
          />
          <button onClick={handleSave} style={{
            padding: "14px", borderRadius: 12, border: "none",
            background: saved ? "rgba(80,180,120,0.3)" : "rgba(120,80,200,0.4)",
            color: saved ? "rgba(120,220,160,0.9)" : "rgba(200,170,255,0.9)",
            fontFamily: "var(--font-body)", fontSize: 15, cursor: "pointer", transition: "all 0.3s", WebkitTapHighlightColor: "transparent",
          }}>{saving ? "saving..." : saved ? "✓ published to MoonVault" : "publish to MoonVault →"}</button>
        </div>
        {poems.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>published poems</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {poems.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{p.date}</p>
                  </div>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 8, color: "rgba(255,100,100,0.6)", cursor: "pointer", padding: "8px 14px", fontSize: 12, fontFamily: "var(--font-body)", WebkitTapHighlightColor: "transparent" }}>delete</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Luna() {
  const [tab, setTab] = useState("home");
  const [mood, setMood] = useState(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const [affirmation] = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [journals, setJournals] = useState(() => storage.get("luna_journals", []));
  const [moodHistory, setMoodHistory] = useState(() => storage.get("luna_moods", []));

  // Load last logged mood on startup
  const lastMood = moodHistory.length > 0 ? MOODS.find(m => m.value === moodHistory[0].value) || MOODS[2] : MOODS[2];
  const [currentMood, setCurrentMood] = useState(lastMood);

  const handleMoonTap = () => {
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 5) { setShowAdmin(true); setAdminTaps(0); }
  };

  const saveJournal = (text) => {
    const entry = { text, time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...journals];
    setJournals(updated);
    storage.set("luna_journals", updated);
  };

  const saveMood = () => {
    if (!mood) return;
    const entry = { ...mood, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...moodHistory];
    setMoodHistory(updated);
    storage.set("luna_moods", updated);
    setCurrentMood(mood);
    setMoodSaved(true);
    setTimeout(() => setMoodSaved(false), 2000);
  };

  const tabs = [
    { id: "home", icon: "🌙", label: "Home" },
    { id: "chat", icon: "💬", label: "Luna" },
    { id: "journal", icon: "📓", label: "Journal" },
    { id: "moods", icon: "🌊", label: "Moods" },
    { id: "vault", icon: "🌒", label: "Vault" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&display=swap');
        :root {
          --font-display: 'Cormorant Garamond', serif;
          --font-body: 'DM Sans', sans-serif;
          --bg: #0a0a12; --surface: rgba(255,255,255,0.04);
          --border: rgba(255,255,255,0.07); --text: rgba(255,255,255,0.85); --muted: rgba(255,255,255,0.4);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { background: var(--bg); width: 100%; overflow-x: hidden; }
        body { -webkit-text-size-adjust: 100%; }
        @keyframes twinkle { 0%,100%{opacity:0;transform:scale(.8)} 50%{opacity:.7;transform:scale(1.2)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes pulse-slow { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.08);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes bounce { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-12px) scale(1.1)} 60%{transform:translateY(-8px) scale(1.05)} }
        @keyframes shimmer { from{opacity:.6} to{opacity:1} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        input, textarea, button { font-family: inherit; }
      `}</style>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      <FloatingMoon mood={currentMood} />

      <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)", position: "relative", overflow: "hidden", width: "100%" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(80,40,140,0.15) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(40,80,140,0.12) 0%, transparent 70%)" }} />
        </div>
        <StarField />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, margin: "0 auto", padding: "0 0 80px 0", minHeight: "100dvh" }}>

          {tab === "home" && (
            <div style={{ padding: "52px 20px 24px", animation: "fadeUp 0.5s ease forwards" }}>
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <h1 onClick={handleMoonTap} style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 300, lineHeight: 1.2, color: "rgba(255,255,255,0.92)", cursor: "default", userSelect: "none" }}>
                  Hey,<br /><em>how are you?</em>
                </h1>
              </div>
              <div style={{ padding: "20px", borderRadius: 18, background: "linear-gradient(135deg, rgba(100,60,180,0.15), rgba(60,40,120,0.1))", border: "1px solid rgba(160,120,255,0.15)", marginBottom: 24, animation: "shimmer 3s infinite alternate" }}>
                <p style={{ fontSize: 11, color: "rgba(160,120,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>for you, tonight</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.6, fontStyle: "italic", color: "rgba(255,255,255,0.8)" }}>"{affirmation}"</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "20px" }}>
                <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>how are you feeling</p>
                <MoodPicker onSelect={setMood} selected={mood} />
                {mood && (
                  <div style={{ marginTop: 16, textAlign: "center", animation: "fadeUp 0.3s ease" }}>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                      Feeling <span style={{ color: "rgba(180,150,255,0.9)" }}>{mood.label.toLowerCase()}</span> right now
                    </p>
                    <button onClick={saveMood} style={{
                      padding: "11px 28px", borderRadius: 10, border: "none",
                      background: moodSaved ? "rgba(80,180,120,0.25)" : "rgba(120,80,200,0.3)",
                      color: moodSaved ? "rgba(120,220,160,0.9)" : "rgba(190,160,255,0.9)",
                      fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer", transition: "all 0.3s",
                    }}>{moodSaved ? "✓ logged" : "log this →"}</button>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                {[
                  { label: "Talk to Luna", sub: "she's listening", icon: "🌙", goto: "chat", color: "rgba(120,70,200,0.15)" },
                  { label: "Write it out", sub: "no judgment here", icon: "📓", goto: "journal", color: "rgba(70,100,200,0.15)" },
                  { label: "Moon Vault", sub: "poems for you", icon: "🌒", goto: "vault", color: "rgba(80,40,140,0.15)" },
                  { label: "Your waves", sub: "mood history", icon: "🌊", goto: "moods", color: "rgba(40,70,140,0.15)" },
                ].map((card) => (
                  <button key={card.goto} onClick={() => setTab(card.goto)} style={{
                    padding: "18px 16px", borderRadius: 16, border: "1px solid var(--border)",
                    background: card.color, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{card.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{card.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "chat" && (
            <div style={{ padding: "52px 20px 24px", height: "100dvh", display: "flex", flexDirection: "column", animation: "fadeUp 0.4s ease" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "float 4s ease-in-out infinite" }}>🌙</div>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 300 }}>Luna</h2>
                    <p style={{ fontSize: 11, color: "rgba(120,200,140,0.8)", letterSpacing: 1 }}>● always here</p>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <ChatPanel />
              </div>
            </div>
          )}

          {tab === "journal" && (
            <div style={{ padding: "52px 20px 24px", animation: "fadeUp 0.4s ease" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 300, marginBottom: 6 }}><em>Your pages</em></h2>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>private. yours. always.</p>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, marginBottom: 20 }}>
                <p style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>new entry</p>
                <JournalEntry onSave={saveJournal} />
              </div>
              {journals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🪐</div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontStyle: "italic" }}>Your thoughts are waiting to land here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {journals.map((j, i) => (
                    <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{j.time}</p>
                      <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>{j.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "moods" && (
            <div style={{ padding: "52px 20px 24px", animation: "fadeUp 0.4s ease" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 300, marginBottom: 6 }}><em>Your waves</em></h2>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>every feeling you've logged</p>
              {moodHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🌊</div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontStyle: "italic", marginBottom: 8 }}>No moods logged yet.</p>
                  <p style={{ fontSize: 13 }}>Head to Home and check in with how you're feeling.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 24 }}>
                    {moodHistory.slice(0, 12).reverse().map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", borderRadius: "6px 6px 2px 2px", height: `${(m.value / 5) * 80}px`, background: "linear-gradient(to top, rgba(120,80,200,0.6), rgba(160,120,255,0.3))", transition: "height 0.5s ease" }} />
                        <span style={{ fontSize: 14 }}>{m.emoji}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {moodHistory.map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
                        <span style={{ fontSize: 24 }}>{m.emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{m.label}</p>
                          <p style={{ fontSize: 11, color: "var(--muted)" }}>{m.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "vault" && <MoonVault />}
        </div>

        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(10,10,18,0.95)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", justifyContent: "space-around",
          padding: "10px 0",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: "4px 10px",
              transition: "all 0.2s", WebkitTapHighlightColor: "transparent", minWidth: 48,
            }}>
              <span style={{ fontSize: 20, opacity: tab === t.id ? 1 : 0.4, transition: "opacity 0.2s" }}>{t.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: tab === t.id ? "rgba(180,150,255,0.9)" : "rgba(255,255,255,0.3)", transition: "color 0.2s" }}>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}