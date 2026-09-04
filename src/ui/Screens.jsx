import { CARS } from "../game/cars.js";

export function MainMenu({ onGarage, onQuickPlay, best }) {
  return (
    <div className="absolute inset-0 overflow-hidden text-white flex items-center justify-center">
      {/* background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(0,229,255,0.25), transparent 60%), radial-gradient(ellipse at 20% 0%, rgba(124,58,237,0.35), transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(244,63,94,0.25), transparent 50%), #05060a",
        }}
      />
      {/* perspective grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.35) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(500px) rotateX(65deg) translateY(-40px) scale(2)",
          transformOrigin: "50% 0%",
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black)",
        }}
      />
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent scanline" />

      <div className="relative z-10 text-center px-6 slide-up">
        <div className="text-xs md:text-sm tracking-[0.6em] text-cyan-300/80 uppercase mb-3">3D Highway Racer</div>
        <h1 className="font-display text-5xl md:text-8xl font-black leading-none">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-violet-300 drop-shadow-[0_0_30px_rgba(0,229,255,0.5)]">
            VELOCITY
          </span>
          <br />
          <span className="text-white/90 tracking-[0.3em]">RUSH</span>
        </h1>
        <p className="mt-5 text-white/60 max-w-md mx-auto text-sm md:text-base">
          {CARS.length} vehicles. Hypercars, muscle, F1, monster trucks, buses and more. Weave through traffic, chain near-misses,
          and burn nitro.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onGarage} className="neon-btn px-10 py-4 rounded-lg text-sm md:text-base font-bold">
            Enter Garage
          </button>
          <button onClick={onQuickPlay} className="ghost-btn px-10 py-4 rounded-lg text-sm md:text-base">
            Quick Race
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto text-[11px] text-white/50 uppercase tracking-widest">
          <div className="panel rounded-lg p-3">
            <div className="text-white font-display text-base">← →</div>Steer
          </div>
          <div className="panel rounded-lg p-3">
            <div className="text-white font-display text-base">SHIFT</div>Nitro
          </div>
          <div className="panel rounded-lg p-3">
            <div className="text-white font-display text-base">C</div>Camera
          </div>
        </div>

        {best > 0 && (
          <div className="mt-6 text-xs tracking-[0.3em] text-yellow-300/80 uppercase">
            Best Score · <span className="font-display text-yellow-300">{best.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function GameOver({ g, car, onRetry, onGarage, onMenu }) {
  const isBest = Math.floor(g.score) >= g.best && g.best > 0;
  const rows = [
    ["Distance", `${(g.distance / 1000).toFixed(2)} km`],
    ["Coins", g.coins],
    ["Near Misses", g.nearMisses],
    ["Top Speed", `${Math.round(g.maxSpeed * 1.45 * 3.2)} km/h`],
    ["Vehicle", car.name],
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white p-4">
      <div className="panel rounded-2xl p-6 md:p-10 w-full max-w-lg text-center slide-up">
        <div className="text-xs tracking-[0.5em] text-red-400 uppercase">Race Over</div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/50">Final Score</div>
        <div className="font-display text-5xl md:text-6xl font-black text-white mt-1 tabular-nums">
          {Math.floor(g.score).toLocaleString()}
        </div>
        {isBest && (
          <div className="mt-2 font-display text-sm text-yellow-300 tracking-[0.3em] drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
            ★ NEW BEST ★
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-left text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/10 pb-1">
              <span className="text-white/50 uppercase tracking-wider text-xs">{k}</span>
              <span className="font-display">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onRetry} className="neon-btn px-8 py-3 rounded-lg text-sm font-bold">
            Retry
          </button>
          <button onClick={onGarage} className="ghost-btn px-8 py-3 rounded-lg text-sm">
            Garage
          </button>
          <button onClick={onMenu} className="ghost-btn px-8 py-3 rounded-lg text-sm">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay({ onResume, onGarage, onMenu }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white p-4">
      <div className="panel rounded-2xl p-8 w-full max-w-sm text-center slide-up">
        <div className="font-display text-3xl font-bold tracking-[0.3em]">PAUSED</div>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onResume} className="neon-btn px-8 py-3 rounded-lg text-sm font-bold">
            Resume
          </button>
          <button onClick={onGarage} className="ghost-btn px-8 py-3 rounded-lg text-sm">
            Change Car
          </button>
          <button onClick={onMenu} className="ghost-btn px-8 py-3 rounded-lg text-sm">
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function Countdown({ n }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        key={n}
        className="font-display text-8xl md:text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(0,229,255,0.9)] slide-up"
      >
        {n > 0 ? n : "GO!"}
      </div>
    </div>
  );
}
