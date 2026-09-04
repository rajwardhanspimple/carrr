import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SMAA, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import CarModel from "./CarModel.jsx";
import { Atmosphere, Road, Buildings, Trees, Lamps, Gantries, THEMES } from "./World.jsx";
import { game, emit } from "./store.js";
import { traffic, coins, pickups, obstacles, ramps, boostPads, player, updateGame } from "./entities.js";
import { audio } from "./audio.js";

/* ------------------------------------------------------------------ */
/*  Game loop – single source of truth for updates                     */
/* ------------------------------------------------------------------ */
function GameLoop() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    updateGame(dt);
    // publish a UI snapshot ~15 times per second
    acc.current += dt;
    if (acc.current > 0.066) {
      acc.current = 0;
      emit();
    }
    const s01 = Math.min(1, game.speed / (game.maxSpeed * 1.45));
    audio.updateEngine(s01, game.nitroActive, game.status === "playing" || game.status === "crashed");
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Player                                                             */
/* ------------------------------------------------------------------ */
function Player({ car, color, lightsOn }) {
  const ref = useRef();
  const bodyRef = useRef();
  const shieldRef = useRef();
  const lightL = useRef();
  const lightR = useRef();
  const targetL = useMemo(() => new THREE.Object3D(), []);
  const targetR = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (lightL.current) lightL.current.target = targetL;
    if (lightR.current) lightR.current.target = targetR;
  }, [targetL, targetR]);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.position.set(game.playerX, game.playerY, game.playerZ);
    const b = bodyRef.current;
    if (b) {
      if (game.status === "crashed") {
        b.rotation.y = player.crashSpin;
        b.rotation.z = Math.sin(player.crashSpin) * 0.15;
      } else {
        b.rotation.y = player.yaw;
        b.rotation.z = player.roll;
        // nose up/down while airborne
        b.rotation.x = player.airborne ? clamp(-player.vy * 0.03, -0.35, 0.35) : 0;
        // subtle engine vibration
        b.position.y = Math.sin(state.clock.elapsedTime * 40) * 0.008 * (game.speed / 60);
      }
      // blink when invulnerable
      b.visible = player.invuln > 0 ? Math.floor(state.clock.elapsedTime * 14) % 2 === 0 : true;
    }
    if (shieldRef.current) {
      const t = state.clock.elapsedTime;
      shieldRef.current.visible = game.shields > 0;
      const pulse = 1 + Math.sin(t * 5) * 0.04;
      const sh = Math.max(car.size[0], car.size[1]) * 0.9;
      shieldRef.current.scale.setScalar(pulse * sh);
      shieldRef.current.position.y = car.shape === "monster" ? 2.1 : car.shape === "bus" ? 1.9 : 1.1;
    }
  });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const headY = car.shape === "monster" ? 2.1 : car.shape === "bus" ? 1.1 : 0.7;
  const headZ = -car.size[1] / 2;

  return (
    <group ref={ref}>
      <group ref={bodyRef}>
        <CarModel
          shape={car.shape}
          color={color}
          spin={player.spin}
          steer={player.steer}
          nitro={player.nitroRef}
          lightsOn={lightsOn}
        />
        {lightsOn && (
          <>
            <primitive object={targetL} position={[-0.6, 0, headZ - 30]} />
            <primitive object={targetR} position={[0.6, 0, headZ - 30]} />
            <spotLight
              ref={lightL}
              position={[-0.6, headY, headZ]}
              angle={0.45}
              penumbra={0.6}
              intensity={120}
              distance={70}
              color="#fff4d6"
              decay={1.6}
            />
            <spotLight
              ref={lightR}
              position={[0.6, headY, headZ]}
              angle={0.45}
              penumbra={0.6}
              intensity={120}
              distance={70}
              color="#fff4d6"
              decay={1.6}
            />
          </>
        )}
      </group>
      {/* shield bubble */}
      <mesh ref={shieldRef} visible={false}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.24}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Traffic                                                            */
/* ------------------------------------------------------------------ */
function TrafficCar({ t, lightsOn }) {
  const ref = useRef();
  const blinkerRef = useRef();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.visible = t.active;
    g.position.set(t.x, 0, t.z);
    if (blinkerRef.current) {
      const on = t.active && t.blinker !== 0 && Math.floor(state.clock.elapsedTime * 6) % 2 === 0;
      blinkerRef.current.visible = on;
      blinkerRef.current.position.x = (t.blinker || 0) > 0 ? t.w / 2 + 0.06 : -(t.w / 2 + 0.06);
    }
  });
  return (
    <group ref={ref}>
      <CarModel shape={t.shape} color={t.color} spin={t.spin} lightsOn={lightsOn} />
      <mesh ref={blinkerRef} position={[t.w / 2 + 0.06, 0.8, -t.l / 2 + 1.2]}>
        <boxGeometry args={[0.18, 0.14, 0.4]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Traffic({ lightsOn }) {
  return (
    <>
      {traffic.map((t) => (
        <TrafficCar key={t.id} t={t} lightsOn={lightsOn} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Obstacles: cones & barriers                                        */
/* ------------------------------------------------------------------ */
function Obstacles() {
  const refs = useRef([]);
  useFrame(() => {
    obstacles.forEach((o, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = o.active && !o.hit;
      if (g.visible) g.position.set(o.x, 0, o.z);
    });
  });
  return (
    <>
      {obstacles.map((o, i) => (
        <group key={o.id} ref={(el) => (refs.current[i] = el)}>
          {o.kind === "cone" ? (
            <>
              <mesh position={[0, 0.35, 0]} castShadow>
                <coneGeometry args={[0.3, 0.7, 10]} />
                <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[0.55, 0.08, 0.55]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[2.2, 1.0, 0.35]} />
                <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.25} />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.5, 1.0, 0.06]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[1.4, 0.18, 0.06]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
            </>
          )}
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Ramps                                                              */
/* ------------------------------------------------------------------ */
function Ramps() {
  const refs = useRef([]);
  useFrame(() => {
    ramps.forEach((r, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = r.active;
      g.position.set(r.x, 0, r.z);
    });
  });
  return (
    <>
      {ramps.map((r, i) => (
        <group key={r.id} ref={(el) => (refs.current[i] = el)}>
          <mesh rotation-x={0.32} position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[2.8, 0.15, 4.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh rotation-x={0.32} position={[0, 0.55, 0]}>
            <boxGeometry args={[2.6, 0.06, 4.0]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} rotation-x={0.32} position={[x, 0.62, 0]}>
              <coneGeometry args={[0.25, 0.6, 4]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Boost pads                                                         */
/* ------------------------------------------------------------------ */
function BoostPads() {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    boostPads.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = b.active;
      g.position.set(b.x, 0.02, b.z);
      if (g.children[0]) {
        g.children[0].material.opacity = b.used ? 0.12 : 0.45 + Math.sin(t * 8) * 0.2;
      }
    });
  });
  return (
    <>
      {boostPads.map((b, i) => (
        <group key={b.id} ref={(el) => (refs.current[i] = el)}>
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[2.2, 3.4]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={1.8}
              transparent
              opacity={0.6}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
            <ringGeometry args={[0.7, 0.95, 32]} />
            <meshBasicMaterial color="#bfdbfe" transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Coins                                                              */
/* ------------------------------------------------------------------ */
function Coins() {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    coins.forEach((c, i) => {
      if (c.taken) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.001);
      } else {
        dummy.position.set(c.x, 1.1 + Math.sin(t * 4 + i) * 0.15, c.z);
        dummy.rotation.set(0, t * 3 + i, 0);
        dummy.scale.setScalar(1);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, coins.length]} castShadow>
      <cylinderGeometry args={[0.55, 0.55, 0.12, 20]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.6} metalness={0.9} roughness={0.2} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Pickups                                                            */
/* ------------------------------------------------------------------ */
function Pickup({ p }) {
  const ref = useRef();
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.visible = !p.taken;
    const t = state.clock.elapsedTime;
    g.position.set(p.x, 1.2 + Math.sin(t * 3) * 0.2, p.z);
    g.rotation.y = t * 2;
  });
  const isNitro = p.kind === "nitro";
  const isRepair = p.kind === "repair";
  const isShield = p.kind === "shield";
  const color = isNitro ? "#3b82f6" : isShield ? "#38bdf8" : "#22c55e";
  return (
    <group ref={ref}>
      <mesh castShadow>
        {isNitro ? (
          <cylinderGeometry args={[0.35, 0.35, 1.2, 12]} />
        ) : isShield ? (
          <octahedronGeometry args={[0.72, 0]} />
        ) : (
          <boxGeometry args={[0.9, 0.9, 0.9]} />
        )}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} metalness={0.6} roughness={0.3} transparent opacity={isShield ? 0.75 : 1} />
      </mesh>
      {isNitro ? (
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.25, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.2} />
        </mesh>
      ) : isShield ? (
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[0.45, 0.6, 6]} />
          <meshBasicMaterial color="#bfdbfe" toneMapped={false} />
        </mesh>
      ) : (
        <>
          <mesh>
            <boxGeometry args={[0.6, 0.2, 0.95]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.2, 0.6, 0.95]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1.5} />
          </mesh>
        </>
      )}
      <pointLight color={color} intensity={4} distance={6} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Speed lines                                                        */
/* ------------------------------------------------------------------ */
const LINE_COUNT = 70;
function SpeedLines() {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: LINE_COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        r: 3 + Math.random() * 12,
        z: Math.random() * 80,
      })),
    []
  );
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const s01 = Math.min(1, game.speed / (game.maxSpeed * 1.45));
    const show = game.nitroActive || game.boostActive ? 1 : Math.max(0, (s01 - 0.75) * 3);
    m.material.opacity = show * 0.6;
    m.material.color.set(game.boostActive && !game.nitroActive ? "#7dd3fc" : "#bfefff");
    data.forEach((d, i) => {
      d.z += game.speed * dt * 1.5;
      if (d.z > 90) {
        d.z = 0;
        d.a = Math.random() * Math.PI * 2;
        d.r = 3 + Math.random() * 12;
      }
      dummy.position.set(game.playerX + Math.cos(d.a) * d.r, 3 + Math.sin(d.a) * d.r * 0.6, game.playerZ - 80 + d.z);
      dummy.scale.set(1, 1, 1 + s01 * 4);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, LINE_COUNT]}>
      <boxGeometry args={[0.05, 0.05, 3]} />
      <meshBasicMaterial color="#bfefff" transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera rig                                                         */
/* ------------------------------------------------------------------ */
function CameraRig() {
  const { camera } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, 5, 12), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camera.position.set(0, 5, 12);
  }, [camera]);

  useFrame((state, dt) => {
    const s01 = Math.min(1, game.speed / (game.maxSpeed * 1.45));
    const mode = game.cameraMode;
    const px = game.playerX;
    const pz = game.playerZ;
    const lag = Math.min(1, dt * 6);

    if (mode === 0) {
      tmp.set(px * 0.6, 4.6 + s01 * 0.6, pz + 10.5 + s01 * 2.5);
      look.set(px * 0.8, 1.2, pz - 12);
    } else if (mode === 1) {
      tmp.set(px, 1.6, pz - 0.5);
      look.set(px + player.vx * 0.15, 1.2, pz - 30);
      pos.copy(tmp);
    } else {
      tmp.set(px * 0.3, 16 + s01 * 3, pz + 9);
      look.set(px * 0.5, 0, pz - 12);
    }
    if (mode !== 1) pos.lerp(tmp, lag);

    const shake = game.shake;
    const t = state.clock.elapsedTime;
    camera.position.set(
      pos.x + Math.sin(t * 50) * shake * 0.35,
      pos.y + Math.cos(t * 43) * shake * 0.3,
      pos.z
    );
    camera.lookAt(look);
    const targetFov = (mode === 1 ? 75 : 62) + s01 * 14 + (game.nitroActive ? 8 : 0);
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Post FX                                                            */
/* ------------------------------------------------------------------ */
function Effects() {
  const caRef = useRef();
  const offset = useMemo(() => new THREE.Vector2(0, 0), []);
  useFrame(() => {
    const amt = game.nitroActive ? 0.003 : 0.0006 + game.shake * 0.004;
    offset.set(amt, amt * 0.6);
    if (caRef.current) caRef.current.offset = offset;
  });
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={1.0} mipmapBlur intensity={0.9} radius={0.65} />
      <ChromaticAberration ref={caRef} offset={offset} radialModulation modulationOffset={0.4} />
      <Vignette eskil={false} offset={0.22} darkness={0.7} />
      <Noise opacity={0.035} />
      <SMAA />
    </EffectComposer>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export default function GameScene({ car, color, theme, quality = "high" }) {
  const t = THEMES[theme];
  const lightsOn = t.lightsOn;
  return (
    <Canvas
      shadows={quality !== "low"}
      dpr={quality === "high" ? [1, 1.9] : [1, 1.25]}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      camera={{ fov: 62, near: 0.1, far: 600, position: [0, 5, 12] }}
    >
      <Suspense fallback={null}>
        <Atmosphere theme={theme} />
        <Road theme={theme} />
        <Buildings theme={theme} />
        <Trees />
        <Lamps theme={theme} />
        <Gantries theme={theme} />
        <Player car={car} color={color} lightsOn={lightsOn} />
        <Traffic lightsOn={lightsOn} />
        <Obstacles />
        <Ramps />
        <BoostPads />
        <Coins />
        {pickups.map((p) => (
          <Pickup key={p.id} p={p} />
        ))}
        <SpeedLines />
        <CameraRig />
        <GameLoop />
        {quality !== "low" && <Effects />}
      </Suspense>
    </Canvas>
  );
}
