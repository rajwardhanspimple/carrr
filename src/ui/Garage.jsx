import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import CarModel from "../game/CarModel.jsx";
import { CARS, PAINTS } from "../game/cars.js";
import { THEMES } from "../game/World.jsx";

function Turntable({ car, color }) {
  const ref = useRef();
  const spin = useRef(0);
  const nitro = useRef(0);
  useFrame((state, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
    spin.current += dt * 3;
    nitro.current = Math.sin(state.clock.elapsedTime * 1.5) > 0.6 ? 1 : 0;
  });
  return (
    <group ref={ref}>
      <group position={[0, 0, 0]}>
        <CarModel shape={car.shape} color={color} spin={spin} nitro={nitro} lightsOn />
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[6.5, 64]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[6.4, 6.6, 64]} />
        <meshBasicMaterial color="#00e5ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Showroom({ car, color }) {
  const scale = useMemo(() => (car.shape === "bus" ? 0.55 : car.shape === "limo" ? 0.75 : car.shape === "monster" ? 0.8 : 1), [car]);
  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 14, 40]} />
      <ambientLight intensity={0.35} />
      <spotLight position={[6, 10, 6]} angle={0.5} penumbra={0.8} intensity={250} castShadow color="#ffffff" />
      <spotLight position={[-8, 6, -4]} angle={0.6} penumbra={1} intensity={120} color="#00e5ff" />
      <spotLight position={[8, 4, -6]} angle={0.6} penumbra={1} intensity={100} color="#a855f7" />
      <group scale={scale}>
        <Turntable car={car} color={color} />
      </group>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.7} scale={16} blur={2.2} far={6} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={3} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[12, 12, 1]} />
        <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-6, 2, 0]} scale={[8, 3, 1]} color="#00e5ff" />
        <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[6, 2, 0]} scale={[8, 3, 1]} color="#a855f7" />
        <Lightformer intensity={1} position={[0, 2, -8]} scale={[12, 2, 1]} color="#ffffff" />
      </Environment>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.6}
        maxPolarAngle={1.45}
        target={[0, 0.9, 0]}
      />
      <gridHelper args={[60, 60, "#0e3a45", "#0a1a24"]} position-y={0.001} />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 uppercase tracking-widest text-cyan-200/70 text-xs">{label}</span>
      <div className="stat-bar flex-1">
        <div style={{ width: `${value * 10}%` }} />
      </div>
      <span className="w-6 text-right font-display text-xs text-white/80">{value}</span>
    </div>
  );
}

export default function Garage({ carId, setCarId, paint, setPaint, theme, setTheme, quality, setQuality, onStart, onBack }) {
  const car = CARS.find((c) => c.id === carId) || CARS[0];
  const idx = CARS.indexOf(car);
  const prev = () => setCarId(CARS[(idx - 1 + CARS.length) % CARS.length].id);
  const next = () => setCarId(CARS[(idx + 1) % CARS.length].id);
  const color = paint || car.defaultPaint;

  return (
    <div className="absolute inset-0 bg-[#05060a] text-white">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [7, 3.2, 8], fov: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Suspense fallback={null}>
          <Showroom car={car} color={color} />
        </Suspense>
      </Canvas>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between pointer-events-none">
        <button onClick={onBack} className="ghost-btn pointer-events-auto px-4 py-2 rounded-md text-xs">
          ← Menu
        </button>
        <h2 className="font-display text-lg md:text-2xl tracking-[0.3em] text-cyan-300 glow-pulse">GARAGE</h2>
        <div className="text-xs text-white/50 font-display tracking-widest">
          {idx + 1} / {CARS.length}
        </div>
      </div>

      {/* Car nav arrows */}
      <button
        onClick={prev}
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full panel text-2xl hover:text-cyan-300 transition"
        aria-label="Previous car"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full panel text-2xl hover:text-cyan-300 transition"
        aria-label="Next car"
      >
        ›
      </button>

      {/* Left info panel */}
      <div className="absolute left-4 md:left-24 top-20 md:top-24 w-[calc(100%-2rem)] md:w-80 panel rounded-xl p-4 md:p-5 slide-up pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">{car.category}</div>
        <h3 className="font-display text-2xl md:text-3xl font-bold mt-1">{car.name}</h3>
        <p className="text-sm text-white/60 mt-2 leading-snug hidden md:block">{car.desc}</p>
        <div className="mt-4 space-y-2">
          <Stat label="Speed" value={car.speed} />
          <Stat label="Accel" value={car.accel} />
          <Stat label="Handling" value={car.handling} />
          <Stat label="Nitro" value={car.nitro} />
        </div>
        {car.armor && (
          <div className="mt-3 text-xs text-emerald-300/90 font-display tracking-wider">
            ARMOR ×{car.armor.toFixed(1)}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 md:items-end">
          {/* Car thumbnails */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">Select Vehicle</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CARS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCarId(c.id)}
                  className={`shrink-0 px-3 py-2 rounded-md text-xs font-display tracking-wider border transition ${
                    c.id === carId
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(0,229,255,0.35)]"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">Paint</div>
                <div className="flex gap-2 flex-wrap">
                  {PAINTS.map((p) => (
                    <button
                      key={p.hex}
                      title={p.name}
                      onClick={() => setPaint(p.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        color === p.hex ? "border-white scale-110" : "border-white/20 hover:scale-105"
                      }`}
                      style={{ background: p.hex, boxShadow: color === p.hex ? `0 0 14px ${p.hex}` : "none" }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">Time of Day</div>
                <div className="flex gap-2">
                  {Object.entries(THEMES).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setTheme(k)}
                      className={`px-3 py-1.5 rounded-md text-xs font-display border transition ${
                        theme === k
                          ? "border-violet-400 bg-violet-400/20 text-violet-200"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2">Graphics</div>
                <div className="flex gap-2">
                  {["low", "high"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-3 py-1.5 rounded-md text-xs font-display border uppercase transition ${
                        quality === q
                          ? "border-emerald-400 bg-emerald-400/20 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button onClick={onStart} className="neon-btn px-10 py-4 rounded-lg text-sm md:text-base font-bold shrink-0">
            Start Race ▶
          </button>
        </div>
      </div>
    </div>
  );
}
