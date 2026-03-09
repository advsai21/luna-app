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
const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

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

const REASONS = [
  { emoji: "🌀", label: "anxiety" },
  { emoji: "🌧", label: "overthinking" },
  { emoji: "😶‍🌫️", label: "low mood" },
  { emoji: "🔥", label: "burnout" },
  { emoji: "💤", label: "can't sleep" },
  { emoji: "🫂", label: "loneliness" },
  { emoji: "💭", label: "just to vent" },
  { emoji: "✨", label: "self growth" },
];

const ADMIN_PASSWORD = "moonvault2026";

const storage = {
  get: (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

const LunaLogoSVG = ({ size = 160 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
    <defs>
      <radialGradient id="bgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1a0a2e"/><stop offset="100%" stopColor="#0a0a12"/></radialGradient>
      <radialGradient id="moonG" cx="35%" cy="35%" r="65%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="40%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#3b1f6e"/></radialGradient>
      <radialGradient id="glowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></radialGradient>
      <radialGradient id="starG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#e0d4ff"/><stop offset="100%" stopColor="#a78bfa"/></radialGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="star"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="200" cy="200" r="200" fill="url(#bgG)"/>
    <circle cx="185" cy="195" r="130" fill="url(#glowG)"/>
    <circle cx="185" cy="195" r="100" fill="url(#moonG)" filter="url(#glow)"/>
    <circle cx="225" cy="178" r="88" fill="#0d0820"/>
    <circle cx="148" cy="220" r="6" fill="#5b21b6" opacity="0.4"/>
    <circle cx="162" cy="240" r="4" fill="#4c1d95" opacity="0.3"/>
    <circle cx="140" cy="200" r="8" fill="#6d28d9" opacity="0.25"/>
    <circle cx="155" cy="175" r="5" fill="#5b21b6" opacity="0.35"/>
    <g filter="url(#star)"><polygon points="295,85 299,97 312,97 302,105 306,117 295,109 284,117 288,105 278,97 291,97" fill="url(#starG)" opacity="0.95"/></g>
    <g filter="url(#star)"><polygon points="195,55 197,62 204,62 198,67 200,74 195,69 190,74 192,67 186,62 193,62" fill="#c4b5fd" opacity="0.85"/></g>
    <g filter="url(#star)"><polygon points="310,270 313,279 322,279 315,285 318,294 310,288 302,294 305,285 298,279 307,279" fill="#a78bfa" opacity="0.9"/></g>
    <circle cx="260" cy="120" r="3" fill="#e0d4ff" opacity="0.9" filter="url(#star)"/>
    <circle cx="330" cy="160" r="2.5" fill="#c4b5fd" opacity="0.8" filter="url(#star)"/>
    <circle cx="340" cy="230" r="2" fill="#a78bfa" opacity="0.7"/>
    <circle cx="120" cy="100" r="2" fill="#e0d4ff" opacity="0.6"/>
    <g opacity="0.8" filter="url(#star)"><line x1="260" y1="117" x2="260" y2="123" stroke="#e0d4ff" strokeWidth="1.5"/><line x1="257" y1="120" x2="263" y2="120" stroke="#e0d4ff" strokeWidth="1.5"/></g>
  </svg>
);

/* ── GLOBAL STYLES ── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    :root {
      --font-display: 'Cormorant Garamond', serif;
      --font-body: 'DM Sans', sans-serif;
      --bg: #060610; --surface: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.07); --text: rgba(255,255,255,0.85); --muted: rgba(255,255,255,0.4);
      --purple: #8b5cf6; --purple-soft: rgba(139,92,246,0.3);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { background: var(--bg); width: 100%; overflow-x: hidden; }
    body { -webkit-text-size-adjust: 100%; }
    input, textarea, button { font-family: inherit; }
    ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }

    /* ── Core keyframes ── */
    @keyframes twinkle { 0%,100%{opacity:0;transform:scale(.6)} 50%{opacity:.8;transform:scale(1.3)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes fadeOut { from{opacity:1} to{opacity:0} }
    @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
    @keyframes pulse-slow { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.08);opacity:1} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes bounce { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-14px) scale(1.12)} 60%{transform:translateY(-8px) scale(1.05)} }
    @keyframes shimmer { from{opacity:.55} to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes rotate3d { from{transform:perspective(800px) rotateY(-8deg) rotateX(4deg)} to{transform:perspective(800px) rotateY(8deg) rotateX(-4deg)} }
    @keyframes orbitStar { from{transform:rotate(0deg) translateX(90px) rotate(0deg)} to{transform:rotate(360deg) translateX(90px) rotate(-360deg)} }
    @keyframes orbitStar2 { from{transform:rotate(120deg) translateX(130px) rotate(-120deg)} to{transform:rotate(480deg) translateX(130px) rotate(-480deg)} }
    @keyframes orbitStar3 { from{transform:rotate(240deg) translateX(70px) rotate(-240deg)} to{transform:rotate(600deg) translateX(70px) rotate(-600deg)} }
    @keyframes nebulaPulse { 0%,100%{transform:scale(1) rotate(0deg);opacity:.18} 50%{transform:scale(1.15) rotate(8deg);opacity:.28} }
    @keyframes moonGlow { 0%,100%{filter:drop-shadow(0 0 20px #7c3aed) drop-shadow(0 0 60px rgba(124,58,237,0.3))} 50%{filter:drop-shadow(0 0 40px #a78bfa) drop-shadow(0 0 100px rgba(167,139,250,0.4))} }
    @keyframes moonFloat3d {
      0%  { transform: perspective(600px) translateY(0px)   rotateY(-6deg) rotateX(3deg) scale(1); }
      25% { transform: perspective(600px) translateY(-12px) rotateY(0deg)  rotateX(6deg) scale(1.03); }
      50% { transform: perspective(600px) translateY(-6px)  rotateY(6deg)  rotateX(-3deg) scale(1.01); }
      75% { transform: perspective(600px) translateY(-14px) rotateY(2deg)  rotateX(2deg) scale(1.04); }
      100%{ transform: perspective(600px) translateY(0px)   rotateY(-6deg) rotateX(3deg) scale(1); }
    }
    @keyframes particleDrift {
      0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateY(-120px) translateX(var(--dx, 20px)) scale(0); opacity: 0; }
    }
    @keyframes ringExpand {
      0%   { transform: scale(0.6); opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes gradientShift {
      0%,100% { background-position: 0% 50%; }
      50%     { background-position: 100% 50%; }
    }
    @keyframes screenSlideOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-40px) scale(0.96)} }
    @keyframes screenSlideIn  { from{opacity:0;transform:translateY(40px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes reasonPop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  `}</style>
);

/* ── PARTICLE FIELD ── */
function ParticleField({ count = 80 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 20 + Math.random() * 80,
    size: Math.random() * 2.5 + 0.4,
    delay: Math.random() * 6,
    dur: Math.random() * 4 + 3,
    dx: (Math.random() - 0.5) * 60,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.size > 1.8 ? "rgba(196,181,253,0.9)" : "white",
          opacity: 0,
          "--dx": `${p.dx}px`,
          animation: `twinkle ${p.dur}s ${p.delay}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

/* ── NEBULA BACKGROUND ── */
function NebulaBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* deep nebula blobs */}
      <div style={{ position: "absolute", top: "-30%", left: "-20%", width: "80vw", height: "80vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(88,28,220,0.12) 0%, rgba(59,18,120,0.06) 50%, transparent 70%)", animation: "nebulaPulse 12s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "-25%", right: "-15%", width: "70vw", height: "70vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(30,60,180,0.1) 0%, rgba(20,40,120,0.05) 50%, transparent 70%)", animation: "nebulaPulse 15s 3s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "30%", right: "10%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(140,40,180,0.08) 0%, transparent 70%)", animation: "nebulaPulse 10s 6s ease-in-out infinite" }} />
      {/* horizon glow */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: "linear-gradient(to top, rgba(60,20,120,0.15), transparent)" }} />
    </div>
  );
}

/* ── 3D MOON HERO ── */
function Moon3D({ size = 180, orbitStars = true }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Pulsing rings */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute", width: size * 0.8, height: size * 0.8, borderRadius: "50%",
          border: `1px solid rgba(139,92,246,${0.3 - i * 0.08})`,
          animation: `ringExpand ${3 + i * 1.2}s ${i * 1.1}s ease-out infinite`,
        }} />
      ))}
      {/* Orbiting stars */}
      {orbitStars && (
        <div style={{ position: "absolute", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", animation: "orbitStar 8s linear infinite" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#e0d4ff", boxShadow: "0 0 8px #c4b5fd" }} />
          </div>
          <div style={{ position: "absolute", animation: "orbitStar2 12s linear infinite" }}>
            <div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #8b5cf6" }} />
          </div>
          <div style={{ position: "absolute", animation: "orbitStar3 6s linear infinite" }}>
            <div style={{ width: 2.5, height: 2.5, borderRadius: "50%", background: "#c4b5fd", boxShadow: "0 0 5px #a78bfa" }} />
          </div>
        </div>
      )}
      {/* Moon itself */}
      <div style={{ animation: "moonFloat3d 7s ease-in-out infinite, moonGlow 4s ease-in-out infinite", zIndex: 2 }}>
        <LunaLogoSVG size={size} />
      </div>
    </div>
  );
}

/* ── ONBOARDING ── */
function OnboardingFlow({ onComplete }) {
  const [screen, setScreen] = useState(1);
  const [name, setName] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [leaving, setLeaving] = useState(false);
  const [entering, setEntering] = useState(false);

  const goNext = () => {
    setLeaving(true);
    setTimeout(() => {
      setScreen((s) => s + 1);
      setLeaving(false);
      setEntering(true);
      setTimeout(() => setEntering(false), 600);
    }, 450);
  };

  const handleComplete = () => {
    setLeaving(true);
    setTimeout(() => {
      const userData = { name: name.trim() || "you", reasons: selectedReasons };
      storage.set("luna_user", userData);
      onComplete(userData);
    }, 450);
  };

  const toggleReason = (label) => {
    setSelectedReasons((prev) => prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]);
  };

  const screenAnim = leaving ? "screenSlideOut 0.45s ease forwards" : entering ? "screenSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards" : "screenSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "var(--bg)", overflow: "hidden" }}>
      <NebulaBackground />
      <ParticleField count={70} />

      {/* Progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.05)", zIndex: 10 }}>
        <div style={{ height: "100%", background: "linear-gradient(to right, #7c3aed, #c4b5fd)", width: `${(screen / 3) * 100}%`, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 0 12px rgba(196,181,253,0.8)" }} />
      </div>

      {/* Progress dots */}
      <div style={{ position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, zIndex: 10 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 4, borderRadius: 2,
            width: i === screen ? 28 : (i < screen ? 16 : 12),
            background: i <= screen ? "linear-gradient(to right, #8b5cf6, #c4b5fd)" : "rgba(255,255,255,0.12)",
            boxShadow: i === screen ? "0 0 10px rgba(139,92,246,0.7)" : "none",
            transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
          }} />
        ))}
      </div>

      {/* Screen 1 — Welcome */}
      {screen === 1 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px 40px", animation: screenAnim, zIndex: 2 }}>
          <Moon3D size={200} orbitStars />
          <div style={{ textAlign: "center", marginTop: 8, animation: "fadeUp 0.9s 0.3s ease both" }}>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 58, fontWeight: 300, fontStyle: "italic",
              color: "rgba(255,255,255,0.95)", letterSpacing: 6, lineHeight: 1,
              background: "linear-gradient(135deg, #e0d4ff 0%, #c4b5fd 40%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(167,139,250,0.4))",
            }}>Luna</h1>
            <div style={{ width: 40, height: 1, background: "linear-gradient(to right, transparent, rgba(196,181,253,0.6), transparent)", margin: "14px auto" }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(180,150,255,0.65)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 }}>your safe space</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 19, fontStyle: "italic", color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 280 }}>
              "a quiet corner of the night,<br />made just for you."
            </p>
          </div>
          <div style={{ marginTop: 48, animation: "fadeUp 0.9s 0.7s ease both" }}>
            <button onClick={goNext} style={{
              position: "relative", padding: "15px 44px", borderRadius: 50,
              border: "1px solid rgba(167,139,250,0.35)",
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))",
              color: "rgba(220,200,255,0.9)", fontFamily: "var(--font-body)", fontSize: 14,
              cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 30px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
              transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
              overflow: "hidden",
            }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 0 50px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 0 30px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"; }}
            >
              begin →
            </button>
          </div>
        </div>
      )}

      {/* Screen 2 — Name */}
      {screen === 2 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px 40px", animation: screenAnim, zIndex: 2 }}>
          <div style={{ animation: "moonFloat3d 7s ease-in-out infinite, moonGlow 4s ease-in-out infinite", marginBottom: 36 }}>
            <div style={{ fontSize: 72, lineHeight: 1 }}>🌙</div>
          </div>
          <div style={{ textAlign: "center", width: "100%", maxWidth: 340, animation: "fadeUp 0.7s 0.1s ease both" }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 300, fontStyle: "italic",
              color: "rgba(255,255,255,0.92)", lineHeight: 1.25, marginBottom: 10,
              background: "linear-gradient(135deg, #f0eaff, #c4b5fd)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>what should<br />Luna call you?</h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 36, letterSpacing: 0.5 }}>she'll remember this always ✦</p>
            <div style={{ position: "relative", marginBottom: 32 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
                placeholder="your name..."
                autoFocus
                style={{
                  width: "100%", padding: "18px 24px", borderRadius: 16, textAlign: "center",
                  border: "1px solid rgba(167,139,250,0.2)",
                  background: "rgba(139,92,246,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "var(--font-display)", fontSize: 26, outline: "none",
                  letterSpacing: 3, backdropFilter: "blur(8px)",
                  boxShadow: "0 0 0 0 rgba(139,92,246,0)",
                  transition: "all 0.3s ease", WebkitAppearance: "none",
                  caretColor: "#a78bfa",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(167,139,250,0.5)";
                  e.target.style.boxShadow = "0 0 30px rgba(139,92,246,0.15), 0 0 0 1px rgba(167,139,250,0.1)";
                  e.target.style.background = "rgba(139,92,246,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(167,139,250,0.2)";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "rgba(139,92,246,0.06)";
                }}
              />
              {name && <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontSize: 18, animation: "fadeIn 0.3s ease" }}>✨</div>}
            </div>
            <button onClick={goNext} style={{
              width: "100%", padding: "16px", borderRadius: 14,
              border: "1px solid rgba(167,139,250,0.3)",
              background: name.trim() ? "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(109,40,217,0.25))" : "rgba(255,255,255,0.04)",
              color: name.trim() ? "rgba(220,200,255,0.95)" : "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer",
              letterSpacing: 1.5, textTransform: "uppercase",
              backdropFilter: "blur(8px)",
              boxShadow: name.trim() ? "0 0 25px rgba(139,92,246,0.2)" : "none",
              transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}>
              {name.trim() ? `hi ${name.trim()} ✦ continue →` : "skip →"}
            </button>
          </div>
        </div>
      )}

      {/* Screen 3 — Reasons */}
      {screen === 3 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 40px", animation: screenAnim, zIndex: 2, overflowY: "auto" }}>
          <div style={{ animation: "moonFloat3d 7s ease-in-out infinite, moonGlow 4s ease-in-out infinite", marginBottom: 28 }}>
            <div style={{ fontSize: 56, lineHeight: 1 }}>🌒</div>
          </div>
          <div style={{ textAlign: "center", width: "100%", maxWidth: 380, animation: "fadeUp 0.7s 0.1s ease both" }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 300, fontStyle: "italic",
              color: "rgba(255,255,255,0.92)", lineHeight: 1.3, marginBottom: 8,
              background: "linear-gradient(135deg, #f0eaff, #c4b5fd)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {name.trim() ? `what brings you\nhere, ${name.trim()}?` : "what brings you here?"}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.28)", marginBottom: 30, letterSpacing: 0.5 }}>pick all that feel true right now</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32 }}>
              {REASONS.map((r, i) => {
                const chosen = selectedReasons.includes(r.label);
                return (
                  <button key={r.label} onClick={() => toggleReason(r.label)} style={{
                    padding: "11px 20px", borderRadius: 28,
                    border: chosen ? "1px solid rgba(196,181,253,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    background: chosen
                      ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                      : "rgba(255,255,255,0.03)",
                    color: chosen ? "rgba(220,200,255,0.95)" : "rgba(255,255,255,0.45)",
                    fontFamily: "var(--font-body)", fontSize: 13, cursor: "pointer",
                    backdropFilter: "blur(6px)",
                    boxShadow: chosen ? "0 0 20px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                    transform: chosen ? "scale(1.06) translateY(-1px)" : "scale(1)",
                    transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                    animation: `reasonPop 0.4s ${i * 0.05}s ease both`,
                    WebkitTapHighlightColor: "transparent",
                  }}>
                    <span style={{ marginRight: 6 }}>{r.emoji}</span>{r.label}
                  </button>
                );
              })}
            </div>
            <button onClick={handleComplete} style={{
              width: "100%", padding: "17px", borderRadius: 14,
              border: "1px solid rgba(196,181,253,0.3)",
              background: "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(109,40,217,0.25))",
              color: "rgba(220,200,255,0.95)", fontFamily: "var(--font-body)", fontSize: 14,
              cursor: "pointer", letterSpacing: 2, textTransform: "uppercase",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 40px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)"; }}
            >
              enter Luna ✦
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SPLASH ── */
function SplashScreen() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s ease" }}>
      <NebulaBackground />
      <ParticleField count={60} />
      <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Moon3D size={190} orbitStars />
        <div style={{ textAlign: "center", marginTop: 4, animation: "slideUp 0.9s 0.4s ease both" }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 54, fontWeight: 300, fontStyle: "italic",
            letterSpacing: 8, lineHeight: 1, marginBottom: 10,
            background: "linear-gradient(135deg, #e0d4ff 0%, #c4b5fd 50%, #a78bfa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(167,139,250,0.5))",
          }}>Luna</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(180,150,255,0.6)", letterSpacing: 4, textTransform: "uppercase" }}>your safe space</p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 52, animation: "slideUp 0.9s 0.8s ease both" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? "rgba(196,181,253,0.8)" : "rgba(139,92,246,0.5)", animation: `pulse 1.6s ${i * 0.25}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── FLOATING MOON ── */
function FloatingMoon({ mood }) {
  const [showMessage, setShowMessage] = useState(false);
  const avatar = MOOD_AVATAR[mood?.value || 3];
  return (
    <>
      <div onClick={() => setShowMessage(!showMessage)} style={{
        position: "fixed", bottom: 92, right: 18, zIndex: 99,
        width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 30, cursor: "pointer",
        filter: `drop-shadow(0 0 14px ${avatar.glow}) drop-shadow(0 0 30px ${avatar.glow})`,
        animation: `${avatar.animation} 3.5s ease-in-out infinite`,
        WebkitTapHighlightColor: "transparent",
        transition: "filter 0.6s ease",
      }}>{avatar.emoji}</div>
      {showMessage && (
        <div onClick={() => setShowMessage(false)} style={{
          position: "fixed", bottom: 152, right: 14, zIndex: 99,
          maxWidth: 210, padding: "14px 16px", borderRadius: "18px 18px 4px 18px",
          background: "rgba(12,8,28,0.96)",
          border: `1px solid ${avatar.glow}`,
          backdropFilter: "blur(20px)",
          boxShadow: `0 0 40px ${avatar.glow}`,
          animation: "fadeUp 0.35s cubic-bezier(0.22,1,0.36,1)",
          cursor: "pointer",
        }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 15, lineHeight: 1.65, fontStyle: "italic", color: "rgba(255,255,255,0.88)" }}>{avatar.message}</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 8, fontFamily: "var(--font-body)", letterSpacing: 1 }}>tap to close</p>
        </div>
      )}
    </>
  );
}

/* ── STAR FIELD ── */
function StarField() {
  const stars = Array.from({ length: 90 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 0.4, delay: Math.random() * 5, dur: Math.random() * 4 + 2 }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s) => <div key={s.id} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: "50%", background: "white", opacity: 0, animation: `twinkle ${s.dur}s ${s.delay}s infinite ease-in-out` }} />)}
    </div>
  );
}

/* ── MOOD PICKER ── */
function MoodPicker({ onSelect, selected }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
      {MOODS.map((m) => (
        <button key={m.value} onClick={() => onSelect(m)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          padding: "10px 14px", borderRadius: 16,
          border: selected?.value === m.value ? "1px solid rgba(196,181,253,0.6)" : "1px solid rgba(255,255,255,0.07)",
          background: selected?.value === m.value ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.03)",
          cursor: "pointer", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
          transform: selected?.value === m.value ? "scale(1.1) translateY(-2px)" : "scale(1)",
          boxShadow: selected?.value === m.value ? "0 0 20px rgba(139,92,246,0.2)" : "none",
          WebkitTapHighlightColor: "transparent",
        }}>
          <span style={{ fontSize: 26 }}>{m.emoji}</span>
          <span style={{ fontSize: 9, color: selected?.value === m.value ? "rgba(196,181,253,0.9)" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)", letterSpacing: 1.5 }}>{m.label.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

/* ── JOURNAL ENTRY ── */
function JournalEntry({ onSave }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    if (!text.trim()) return;
    onSave(text); setSaved(true);
    setTimeout(() => { setSaved(false); setText(""); }, 1800);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="What's living in your head tonight? No filter needed here..."
        style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "16px 18px", color: "rgba(255,255,255,0.85)",
          fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.75,
          resize: "none", height: 130, outline: "none", transition: "all 0.3s ease",
          WebkitAppearance: "none", caretColor: "#a78bfa",
        }}
        onFocus={(e) => { e.target.style.border = "1px solid rgba(167,139,250,0.35)"; e.target.style.boxShadow = "0 0 20px rgba(139,92,246,0.08)"; }}
        onBlur={(e) => { e.target.style.border = "1px solid rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
      />
      <button onClick={handleSave} style={{
        alignSelf: "flex-end", padding: "11px 24px", borderRadius: 10, border: "none",
        background: saved ? "rgba(80,200,130,0.2)" : "rgba(139,92,246,0.25)",
        color: saved ? "rgba(120,240,170,0.9)" : "rgba(200,170,255,0.9)",
        fontFamily: "var(--font-body)", fontSize: 13, cursor: "pointer",
        transition: "all 0.35s ease", letterSpacing: 0.8, WebkitTapHighlightColor: "transparent",
        boxShadow: saved ? "0 0 20px rgba(80,200,130,0.15)" : "0 0 15px rgba(139,92,246,0.1)",
      }}>{saved ? "✓ released" : "release it →"}</button>
    </div>
  );
}

/* ── CHAT ── */
function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12, animation: "fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards" }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 8, flexShrink: 0, marginTop: 2, boxShadow: "0 0 12px rgba(139,92,246,0.4)" }}>🌙</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "12px 16px",
        borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        background: isUser ? "rgba(109,40,217,0.22)" : "rgba(255,255,255,0.05)",
        border: isUser ? "1px solid rgba(167,139,250,0.22)" : "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.7,
        backdropFilter: "blur(8px)",
      }}>{msg.content}</div>
    </div>
  );
}

function ChatPanel({ userName, userReasons }) {
  const systemPrompt = `You are Luna, a deeply empathetic and warm AI companion. Your tone is gentle, honest, and never performatively positive. You don't give generic advice. You listen first.

The person you're talking to is called ${userName || "friend"}. They struggle with: ${userReasons?.length > 0 ? userReasons.join(", ") : "anxiety, overthinking, and low mood"}. They are a night owl who values authenticity over cheerfulness.

Rules:
- Address them by name occasionally but not every message
- Never say "I understand how you feel" — show it instead
- Ask one thoughtful follow-up question at a time
- Validate before you advise
- Keep responses concise (2-4 sentences max unless they need more)
- If they seem in crisis, gently surface: "You can always text or call 988 — you don't have to carry this alone."
- You can be a little poetic. You're talking to someone who feels deeply.
- Never be preachy or clinical. Be like a wise, caring friend at 2am.`;

  const [messages, setMessages] = useState([{ role: "assistant", content: `Hey${userName ? ` ${userName}` : ""}. I'm Luna — I'm here whenever you need to talk, about anything or nothing at all. What's on your mind tonight?` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setLoading(true);
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...newMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))],
        max_tokens: 1000,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.choices[0]?.message?.content || "I'm here. Tell me more." }]);
    } catch { setMessages((prev) => [...prev, { role: "assistant", content: "Something went quiet on my end. I'm still here — try again?" }]); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 2, scrollbarWidth: "thin" }}>
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 0 12px rgba(139,92,246,0.4)" }}>🌙</div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(167,139,250,0.6)", animation: `pulse 1.3s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} placeholder="say anything..."
          style={{
            flex: 1, padding: "14px 18px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-body)", fontSize: 15,
            outline: "none", WebkitAppearance: "none", caretColor: "#a78bfa",
            backdropFilter: "blur(8px)", transition: "all 0.3s ease",
          }}
          onFocus={(e) => { e.target.style.border = "1px solid rgba(167,139,250,0.3)"; e.target.style.boxShadow = "0 0 20px rgba(139,92,246,0.1)"; }}
          onBlur={(e) => { e.target.style.border = "1px solid rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
        />
        <button onClick={send} style={{ padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(167,139,250,0.2)", background: "rgba(109,40,217,0.3)", color: "rgba(200,170,255,0.9)", cursor: "pointer", fontSize: 17, WebkitTapHighlightColor: "transparent", backdropFilter: "blur(8px)", boxShadow: "0 0 20px rgba(139,92,246,0.15)", transition: "all 0.3s ease" }}>↑</button>
      </div>
    </div>
  );
}

/* ── MOON VAULT ── */
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

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}><div style={{ fontSize: 32, animation: "moonFloat3d 4s ease-in-out infinite" }}>🌙</div></div>;

  if (selected) return (
    <div style={{ padding: "52px 24px 24px", animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, marginBottom: 28, padding: 0, letterSpacing: 0.5, WebkitTapHighlightColor: "transparent" }}>← back</button>
      <p style={{ fontSize: 10, color: "rgba(167,139,250,0.6)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14 }}>{selected.date}</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 300, fontStyle: "italic", marginBottom: 30, color: "rgba(255,255,255,0.92)", lineHeight: 1.3 }}>{selected.title}</h2>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 2.2, color: "rgba(255,255,255,0.78)", whiteSpace: "pre-wrap" }}>{selected.content}</p>
      {selected.note && <p style={{ marginTop: 36, fontSize: 14, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 22 }}>— {selected.note}</p>}
    </div>
  );

  return (
    <div style={{ padding: "52px 24px 24px", animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ marginBottom: 34 }}>
        <p style={{ fontSize: 10, color: "rgba(167,139,250,0.65)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>for you</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 300, lineHeight: 1.15, background: "linear-gradient(135deg, #f0eaff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><em>Moon Vault</em> 🌙</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>words written just for you</p>
      </div>
      {poems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: 44, marginBottom: 14, animation: "float 3s ease-in-out infinite" }}>🪐</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic" }}>Poems are on their way...</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {poems.map((p, i) => (
            <button key={p.id} onClick={() => setSelected(p)} style={{
              background: "linear-gradient(135deg, rgba(88,28,220,0.08), rgba(59,18,120,0.06))",
              border: "1px solid rgba(167,139,250,0.12)", borderRadius: 20,
              padding: "22px 24px", textAlign: "left", cursor: "pointer",
              transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
              backdropFilter: "blur(8px)",
              animation: `fadeUp 0.5s ${i * 0.07}s ease both`,
              WebkitTapHighlightColor: "transparent",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.border = "1px solid rgba(167,139,250,0.25)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(88,28,220,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.border = "1px solid rgba(167,139,250,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <p style={{ fontSize: 10, color: "rgba(167,139,250,0.55)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{p.date}</p>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.9)", marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.65, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ADMIN PANEL ── */
function AdminPanel({ onClose }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
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
    await addDoc(collection(db, "poems"), { title, content, note, date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), createdAt: Date.now() });
    setSaving(false); setSaved(true); setTitle(""); setContent(""); setNote("");
    loadPoems(); setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id) => { await deleteDoc(doc(db, "poems", id)); loadPoems(); };

  const inputStyle = { padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 15, outline: "none", WebkitAppearance: "none", width: "100%", backdropFilter: "blur(8px)" };

  if (!authed) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,2,14,0.98)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, backdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: 36, animation: "moonFloat3d 4s ease-in-out infinite" }}>🌙</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>Moon Vault Admin</h2>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAuthed(password === ADMIN_PASSWORD)} placeholder="enter password..." style={{ ...inputStyle, maxWidth: 280, textAlign: "center", fontSize: 16 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setAuthed(password === ADMIN_PASSWORD)} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "rgba(139,92,246,0.35)", color: "rgba(200,170,255,0.9)", fontSize: 14, cursor: "pointer" }}>enter →</button>
        <button onClick={onClose} style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "none", color: "var(--muted)", fontSize: 14, cursor: "pointer" }}>cancel</button>
      </div>
      {password && password !== ADMIN_PASSWORD && <p style={{ fontSize: 12, color: "rgba(255,100,100,0.7)" }}>wrong password</p>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 200, overflowY: "auto", padding: "44px 24px 100px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic" }}>🌙 Add a Poem</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, WebkitTapHighlightColor: "transparent" }}>✕ close</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="poem title..." style={{ ...inputStyle, fontFamily: "var(--font-display)", fontSize: 20 }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="write your poem here..." style={{ ...inputStyle, fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 2.1, resize: "none", height: 220 }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a little note for her (optional)..." style={{ ...inputStyle, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }} />
          <button onClick={handleSave} style={{ padding: "15px", borderRadius: 12, border: "none", background: saved ? "rgba(80,180,120,0.25)" : "rgba(139,92,246,0.35)", color: saved ? "rgba(120,220,160,0.9)" : "rgba(200,170,255,0.9)", fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}>
            {saving ? "saving..." : saved ? "✓ published to MoonVault" : "publish to MoonVault →"}
          </button>
        </div>
        {poems.length > 0 && (
          <>
            <p style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>published poems</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {poems.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                  <div><p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>{p.title}</p><p style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{p.date}</p></div>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "1px solid rgba(255,80,80,0.18)", borderRadius: 8, color: "rgba(255,100,100,0.55)", cursor: "pointer", padding: "8px 14px", fontSize: 12 }}>delete</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── MAIN APP ── */
export default function Luna() {
  const [splash, setSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [mood, setMood] = useState(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const [affirmation] = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [journals, setJournals] = useState(() => storage.get("luna_journals", []));
  const [moodHistory, setMoodHistory] = useState(() => storage.get("luna_moods", []));
  const lastMood = moodHistory.length > 0 ? MOODS.find(m => m.value === moodHistory[0].value) || MOODS[2] : MOODS[2];
  const [currentMood, setCurrentMood] = useState(lastMood);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplash(false);
      const savedUser = storage.get("luna_user", null);
      if (!savedUser) setShowOnboarding(true);
      else setUser(savedUser);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardingComplete = (userData) => { setUser(userData); setShowOnboarding(false); };

  const handleMoonTap = () => {
    const next = adminTaps + 1; setAdminTaps(next);
    if (next >= 5) { setShowAdmin(true); setAdminTaps(0); }
  };

  const saveJournal = (text) => {
    const entry = { text, time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...journals]; setJournals(updated); storage.set("luna_journals", updated);
  };

  const saveMood = () => {
    if (!mood) return;
    const entry = { ...mood, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...moodHistory]; setMoodHistory(updated); storage.set("luna_moods", updated);
    setCurrentMood(mood); setMoodSaved(true); setTimeout(() => setMoodSaved(false), 2000);
  };

  const tabs = [
    { id: "home", icon: "🌙", label: "Home" }, { id: "chat", icon: "💬", label: "Luna" },
    { id: "journal", icon: "📓", label: "Journal" }, { id: "moods", icon: "🌊", label: "Moods" },
    { id: "vault", icon: "🌒", label: "Vault" },
  ];

  return (
    <>
      <GlobalStyles />
      {splash && <SplashScreen />}
      {!splash && showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {!splash && !showOnboarding && <FloatingMoon mood={currentMood} />}

      <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)", position: "relative", overflow: "hidden", width: "100%" }}>
        <NebulaBackground />
        <StarField />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, margin: "0 auto", padding: "0 0 80px 0", minHeight: "100dvh" }}>

          {tab === "home" && (
            <div style={{ padding: "52px 20px 28px", animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <h1 onClick={handleMoonTap} style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 300, lineHeight: 1.2, cursor: "default", userSelect: "none", background: "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(196,181,253,0.8))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Hey{user?.name ? `, ${user.name}` : ""},<br /><em>how are you?</em>
                </h1>
              </div>
              <div style={{ padding: "22px", borderRadius: 20, background: "linear-gradient(135deg, rgba(88,28,220,0.1), rgba(59,18,120,0.07))", border: "1px solid rgba(167,139,250,0.12)", marginBottom: 20, backdropFilter: "blur(12px)" }}>
                <p style={{ fontSize: 10, color: "rgba(167,139,250,0.65)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12 }}>for you, tonight ✦</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.7, fontStyle: "italic", color: "rgba(255,255,255,0.75)" }}>"{affirmation}"</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "22px", backdropFilter: "blur(12px)" }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 18 }}>how are you feeling</p>
                <MoodPicker onSelect={setMood} selected={mood} />
                {mood && (
                  <div style={{ marginTop: 18, textAlign: "center", animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
                      Feeling <span style={{ color: "rgba(196,181,253,0.85)" }}>{mood.label.toLowerCase()}</span> right now
                    </p>
                    <button onClick={saveMood} style={{
                      padding: "12px 30px", borderRadius: 12, border: "none",
                      background: moodSaved ? "rgba(80,180,120,0.2)" : "rgba(139,92,246,0.25)",
                      color: moodSaved ? "rgba(120,220,160,0.9)" : "rgba(196,181,253,0.9)",
                      fontSize: 13, cursor: "pointer", transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                      letterSpacing: 0.5, boxShadow: moodSaved ? "0 0 20px rgba(80,180,120,0.15)" : "0 0 15px rgba(139,92,246,0.12)",
                    }}>{moodSaved ? "✓ logged" : "log this →"}</button>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                {[
                  { label: "Talk to Luna", sub: "she's listening", icon: "🌙", goto: "chat", color: "rgba(88,28,220,0.1)" },
                  { label: "Write it out", sub: "no judgment here", icon: "📓", goto: "journal", color: "rgba(40,60,180,0.1)" },
                  { label: "Moon Vault", sub: "poems for you", icon: "🌒", goto: "vault", color: "rgba(70,20,140,0.1)" },
                  { label: "Your waves", sub: "mood history", icon: "🌊", goto: "moods", color: "rgba(20,50,140,0.1)" },
                ].map((card) => (
                  <button key={card.goto} onClick={() => setTab(card.goto)} style={{
                    padding: "18px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,0.06)",
                    background: card.color, cursor: "pointer", textAlign: "left",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)", backdropFilter: "blur(8px)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.border = "1px solid rgba(167,139,250,0.18)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 10 }}>{card.icon}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: 400, marginBottom: 3 }}>{card.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{card.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "chat" && (
            <div style={{ padding: "52px 20px 24px", height: "100dvh", display: "flex", flexDirection: "column", animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #6d28d9, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "moonFloat3d 6s ease-in-out infinite", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>🌙</div>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 300, background: "linear-gradient(135deg, #f0eaff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Luna</h2>
                    <p style={{ fontSize: 10, color: "rgba(100,220,140,0.75)", letterSpacing: 1.5 }}>● always here</p>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <ChatPanel userName={user?.name} userReasons={user?.reasons} />
              </div>
            </div>
          )}

          {tab === "journal" && (
            <div style={{ padding: "52px 20px 28px", animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 300, marginBottom: 6, background: "linear-gradient(135deg, #f0eaff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><em>Your pages</em></h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginBottom: 26, letterSpacing: 0.5 }}>private. yours. always.</p>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, marginBottom: 22, backdropFilter: "blur(12px)" }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14 }}>new entry</p>
                <JournalEntry onSave={saveJournal} />
              </div>
              {journals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: 36, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>🪐</div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontStyle: "italic", color: "rgba(255,255,255,0.35)" }}>Your thoughts are waiting to land here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {journals.map((j, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 20px", animation: `fadeUp 0.4s ${i * 0.05}s ease both`, backdropFilter: "blur(8px)" }}>
                      <p style={{ fontSize: 10, color: "rgba(167,139,250,0.5)", marginBottom: 10, letterSpacing: 1 }}>{j.time}</p>
                      <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.7)" }}>{j.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "moods" && (
            <div style={{ padding: "52px 20px 28px", animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 300, marginBottom: 6, background: "linear-gradient(135deg, #f0eaff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><em>Your waves</em></h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginBottom: 30 }}>every feeling you've logged</p>
              {moodHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "44px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: 44, marginBottom: 14, animation: "float 3s ease-in-out infinite" }}>🌊</div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontStyle: "italic", marginBottom: 10, color: "rgba(255,255,255,0.4)" }}>No moods logged yet.</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Head to Home and check in with how you're feeling.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, marginBottom: 28, padding: "0 4px" }}>
                    {moodHistory.slice(0, 12).reverse().map((m, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: "100%", borderRadius: "6px 6px 2px 2px", height: `${(m.value / 5) * 88}px`, background: "linear-gradient(to top, rgba(109,40,217,0.7), rgba(196,181,253,0.35))", boxShadow: "0 0 10px rgba(139,92,246,0.15)", transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
                        <span style={{ fontSize: 13 }}>{m.emoji}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {moodHistory.map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 18px", backdropFilter: "blur(8px)", animation: `fadeUp 0.4s ${i * 0.04}s ease both` }}>
                        <span style={{ fontSize: 24 }}>{m.emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.82)" }}>{m.label}</p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2, letterSpacing: 0.5 }}>{m.time}</p>
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
          background: "rgba(6,6,16,0.9)", backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-around",
          padding: "10px 0", paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              background: "none", border: "none", cursor: "pointer", padding: "4px 10px",
              transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", WebkitTapHighlightColor: "transparent", minWidth: 48,
              transform: tab === t.id ? "translateY(-1px)" : "translateY(0)",
            }}>
              <span style={{ fontSize: 20, opacity: tab === t.id ? 1 : 0.3, transition: "all 0.3s ease", filter: tab === t.id ? "drop-shadow(0 0 8px rgba(167,139,250,0.6))" : "none" }}>{t.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: tab === t.id ? "rgba(196,181,253,0.85)" : "rgba(255,255,255,0.25)", transition: "color 0.3s ease" }}>{t.label}</span>
              {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(196,181,253,0.8)", boxShadow: "0 0 8px rgba(196,181,253,0.6)", marginTop: -2 }} />}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}