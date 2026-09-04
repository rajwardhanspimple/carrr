import { useEffect, useState } from "react";
import { game, subscribe } from "../game/store.js";
import { setInput } from "../game/input.js";

export function useGameSnapshot() {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return game;
}

function Speedometer({ speed, max, nitroActive }) {
  const kmh = Math.round(speed * 3.2);
  const pct = Math.min(1, speed / (max * 1.45));
  const r = 54;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  return (
    <div className="relative w-36 h-36 md:w-44 md:h-44">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-[135deg]">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={nitroActive ? "url(#nitroGrad)" : "url(#speedGrad)"}
          strokeWidth="10"
          strokeDasharray={`${arc * pct} ${circ}`}
          strokeLinecap="round"
          className="speedometer-arc"
          style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.8))" }}
        />
        <defs>
          <linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="70%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="nitroGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`font-display text-3xl md:text-4xl font-bold ${nitroActive ? "text-blue-200" : "text-white"}`}>{kmh}</div>
        <div className="text-[10px] tracking-[0.3em] text-white/50 uppercase">km/h</div>
      </div>
    </div>
  );
}

function Bar({ label, value, color, glow }) {
  return (
    <div className="w-40 md:w-56">
      <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">
        <span>{label}</span>
        <span className="font-display">{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 12px ${glow}` }}
        />
      </div>
    </div>
  );
}

function TouchButton({ label, onDown, onUp, className = "" }) {
  const start = (e) => {
    e.preventDefault();
    onDown();
  };
  const end = (e) => {
    e.preventDefault();
    onUp();
  };
  return (
    <button
      className={`touch-btn rounded-2xl text-white font-display text-xl flex items-center justify-center select-none ${className}`}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function HUD({ onPause, muted, toggleMute }) {
  const g = useGameSnapshot();
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const hpColor = g.health > 50 ? "linear-gradient(90deg,#22c55e,#86efac)" : g.health > 25 ? "linear-gradient(90deg,#f59e0b,#fde047)" : "linear-gradient(90deg,#ef4444,#f87171)";
  const recent = g.events.filter((e) => g.time - e.t < 1.0);

  return (
    <div className="absolute inset-0 pointer-events-none text-white">
      {/* damage flash */}
      {g.hitFlash > 0 && (
        <div className="absolute inset-0 bg-red-600 damage-flash" style={{ opacity: g.hitFlash * 0.4 }} />
      )}
      {g.health <= 25 && g.status === "playing" && (
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px rgba(239,68,68,0.5)" }} />
      )}
      {/* nitro vignette */}
      {g.nitroActive && (
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 160px rgba(96,165,250,0.45)" }} />
      )}

      {/* Top-left: score */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 panel rounded-xl px-4 py-3 md:px-5 md:py-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Score</div>
        <div className="font-display text-2xl md:text-4xl font-bold tabular-nums">{Math.floor(g.score).toLocaleString()}</div>
        <div className="flex gap-4 mt-1 text-xs text-white/60">
          <span>
            <span className="text-yellow-300">◉</span> {g.coins}
          </span>
          <span>{(g.distance / 1000).toFixed(2)} km</span>
          <span className="text-white/40">BEST {Math.floor(g.best).toLocaleString()}</span>
        </div>
      </div>

      {/* Top-right: buttons */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 pointer-events-auto">
        <button onClick={toggleMute} className="ghost-btn w-10 h-10 rounded-md text-sm">
          {muted ? "🔇" : "🔊"}
        </button>
        <button onClick={onPause} className="ghost-btn w-10 h-10 rounded-md text-sm">
          ❚❚
        </button>
      </div>

      {/* Combo */}
      {g.combo > 1 && (
        <div className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 font-display text-xl md:text-3xl font-bold text-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.8)]">
          ×{g.combo} COMBO
        </div>
      )}

      {/* Popups */}
      <div className="absolute top-1/3 left-1/2 w-0">
        {recent.map((e) => (
          <div
            key={e.id}
            className="float-pop absolute whitespace-nowrap font-display font-bold text-lg md:text-2xl"
            style={{ color: e.color, textShadow: `0 0 16px ${e.color}` }}
          >
            {e.text}
          </div>
        ))}
      </div>

      {/* Bottom-left: bars */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 space-y-3">
        <Bar label="Health" value={g.health} color={hpColor} glow="rgba(34,197,94,0.6)" />
        <Bar
          label={g.nitroActive ? "Nitro ▶▶" : "Nitro (Shift)"}
          value={g.nitro}
          color="linear-gradient(90deg,#3b82f6,#93c5fd)"
          glow="rgba(59,130,246,0.7)"
        />
      </div>

      {/* Bottom-right: speedometer */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-end gap-3">
        <div className="hidden md:block text-right text-[10px] tracking-[0.25em] text-white/40 uppercase leading-relaxed mb-3">
          ← → steer
          <br />↑ boost · ↓ brake
          <br />
          shift nitro · C camera
        </div>
        <Speedometer speed={g.speed} max={g.maxSpeed} nitroActive={g.nitroActive} />
      </div>

      {/* Touch controls */}
      {touch && (
        <div className="absolute inset-x-0 bottom-28 md:bottom-32 px-4 flex justify-between pointer-events-auto">
          <div className="flex gap-3">
            <TouchButton label="◀" className="w-20 h-20" onDown={() => setInput("left", true)} onUp={() => setInput("left", false)} />
            <TouchButton label="▶" className="w-20 h-20" onDown={() => setInput("right", true)} onUp={() => setInput("right", false)} />
          </div>
          <div className="flex gap-3">
            <TouchButton label="▼" className="w-16 h-20" onDown={() => setInput("down", true)} onUp={() => setInput("down", false)} />
            <TouchButton label="N₂O" className="w-20 h-20 text-base text-blue-200" onDown={() => setInput("nitro", true)} onUp={() => setInput("nitro", false)} />
          </div>
        </div>
      )}

      {/* Crash banner */}
      {g.status === "crashed" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-display text-5xl md:text-7xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] tracking-widest slide-up">
            WRECKED
          </div>
        </div>
      )}
    </div>
  );
}
