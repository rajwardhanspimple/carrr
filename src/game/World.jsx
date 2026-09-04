import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { game, ROAD_WIDTH, ROAD_HALF } from "./store.js";

export const THEMES = {
  day: {
    label: "Day",
    sky: "#7dd3fc",
    fog: "#b7dcf5",
    sun: [40, 60, -80],
    sunColor: "#fff5d6",
    sunIntensity: 2.6,
    ambient: 0.55,
    hemi: ["#bfe3ff", "#3b4a2a", 0.7],
    ground: "#4b6b3a",
    lightsOn: false,
    windows: 0.15,
    stars: false,
    turbidity: 6,
    rayleigh: 1.2,
  },
  sunset: {
    label: "Sunset",
    sky: "#f97316",
    fog: "#f3b48c",
    sun: [-60, 8, -120],
    sunColor: "#ffb36b",
    sunIntensity: 2.2,
    ambient: 0.35,
    hemi: ["#ffb088", "#3a2a2a", 0.6],
    ground: "#5a4a35",
    lightsOn: true,
    windows: 0.8,
    stars: false,
    turbidity: 12,
    rayleigh: 3,
  },
  night: {
    label: "Night",
    sky: "#05070f",
    fog: "#0a0f1e",
    sun: [-30, 40, -60],
    sunColor: "#8fb3ff",
    sunIntensity: 0.6,
    ambient: 0.12,
    hemi: ["#1e293b", "#050505", 0.4],
    ground: "#101a12",
    lightsOn: true,
    windows: 2.2,
    stars: true,
    turbidity: 0,
    rayleigh: 0,
  },
};

/* ------------------------------------------------------------------ */
/*  Textures (canvas generated)                                        */
/* ------------------------------------------------------------------ */
function makeRoadTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#2a2d33";
  g.fillRect(0, 0, 512, 512);
  // asphalt grain
  for (let i = 0; i < 9000; i++) {
    const v = 30 + Math.random() * 40;
    g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // lane dashes: 3 inner lines
  g.fillStyle = "#e5e7eb";
  const laneW = 512 / 4;
  for (let i = 1; i < 4; i++) {
    const x = i * laneW;
    g.fillRect(x - 4, 40, 8, 200);
    g.fillRect(x - 4, 296, 8, 200);
  }
  // edge lines
  g.fillStyle = "#facc15";
  g.fillRect(8, 0, 8, 512);
  g.fillRect(512 - 16, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function makeWindowTexture(seed) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 128, 256);
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 8; y < 256; y += 16) {
    for (let x = 8; x < 128; x += 16) {
      const lit = rnd() > 0.45;
      const warm = rnd() > 0.5;
      g.fillStyle = lit ? (warm ? "#ffd9a0" : "#bfe9ff") : "#111";
      g.fillRect(x, y, 9, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Lighting & atmosphere                                              */
/* ------------------------------------------------------------------ */
export function Atmosphere({ theme }) {
  const t = THEMES[theme];
  const { scene } = useThree();
  const dirRef = useRef();
  const targetRef = useRef(new THREE.Object3D());

  useEffect(() => {
    scene.fog = new THREE.Fog(t.fog, 40, 260);
    scene.background = new THREE.Color(t.sky);
    return () => {
      scene.fog = null;
    };
  }, [scene, t]);

  useEffect(() => {
    if (dirRef.current) {
      scene.add(targetRef.current);
      dirRef.current.target = targetRef.current;
    }
  }, [scene]);

  useFrame(() => {
    const l = dirRef.current;
    if (!l) return;
    const z = game.playerZ;
    l.position.set(game.playerX + t.sun[0] * 0.5, t.sun[1] * 0.8, z + t.sun[2] * 0.4);
    targetRef.current.position.set(game.playerX, 0, z - 20);
    targetRef.current.updateMatrixWorld();
  });

  return (
    <>
      {!t.stars && (
        <Sky
          distance={4500}
          sunPosition={t.sun}
          turbidity={t.turbidity}
          rayleigh={t.rayleigh}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}
      {t.stars && <Stars radius={300} depth={80} count={4000} factor={5} fade speed={0.5} />}
      <ambientLight intensity={t.ambient} />
      <hemisphereLight args={t.hemi} />
      <directionalLight
        ref={dirRef}
        color={t.sunColor}
        intensity={t.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={60}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={t.stars ? 0.6 : 2.5} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[20, 20, 1]} />
        <Lightformer intensity={1} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[10, 3, 1]} color={t.sunColor} />
        <Lightformer intensity={1} rotation-y={-Math.PI / 2} position={[8, 2, 0]} scale={[10, 3, 1]} color={t.sky} />
        <Lightformer intensity={0.4} position={[0, 1, -10]} scale={[20, 2, 1]} color="#ffffff" />
      </Environment>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Road & ground                                                      */
/* ------------------------------------------------------------------ */
const ROAD_LEN = 420;
const TILE = 12;

export function Road({ theme }) {
  const t = THEMES[theme];
  const tex = useMemo(makeRoadTexture, []);
  const roadRef = useRef();
  const groundRef = useRef();
  const sideL = useRef();
  const sideR = useRef();
  const curbL = useRef();
  const curbR = useRef();

  useEffect(() => {
    tex.repeat.set(1, ROAD_LEN / TILE);
  }, [tex]);

  useFrame(() => {
    const z = game.playerZ - ROAD_LEN / 2 + 60;
    const move = (r) => r.current && (r.current.position.z = z);
    move(roadRef);
    move(groundRef);
    move(sideL);
    move(sideR);
    move(curbL);
    move(curbR);
    tex.offset.y = -(game.playerZ + 60) / TILE;
  });

  return (
    <group>
      <mesh ref={roadRef} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LEN]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* sidewalks */}
      <mesh ref={sideL} position={[-ROAD_HALF - 1.5, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[3, 0.3, ROAD_LEN]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>
      <mesh ref={sideR} position={[ROAD_HALF + 1.5, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[3, 0.3, ROAD_LEN]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>
      {/* glowing curbs */}
      <mesh ref={curbL} position={[-ROAD_HALF - 0.1, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.12, ROAD_LEN]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={t.lightsOn ? 2 : 0.4} />
      </mesh>
      <mesh ref={curbR} position={[ROAD_HALF + 0.1, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.12, ROAD_LEN]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={t.lightsOn ? 2 : 0.4} />
      </mesh>
      {/* ground */}
      <mesh ref={groundRef} rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <planeGeometry args={[600, ROAD_LEN]} />
        <meshStandardMaterial color={t.ground} roughness={1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scenery: buildings, trees, lamps                                   */
/* ------------------------------------------------------------------ */
const BUILDING_COUNT = 44;
const SPAN = 400; // total length covered by building pool per side
const BUILD_COLORS = ["#334155", "#475569", "#1e293b", "#3f3f46", "#52525b", "#374151", "#4c1d95", "#164e63", "#7c2d12"];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function Buildings({ theme }) {
  const t = THEMES[theme];
  const winTextures = useMemo(() => [makeWindowTexture(11), makeWindowTexture(42), makeWindowTexture(77)], []);
  const materials = useMemo(() => {
    const list = [];
    winTextures.forEach((wt, i) => {
      BUILD_COLORS.forEach((c) => {
        const tex = wt.clone();
        tex.needsUpdate = true;
        tex.repeat.set(1.5, 4);
        list.push(
          new THREE.MeshStandardMaterial({
            color: c,
            roughness: 0.7,
            metalness: 0.2,
            emissive: "#ffffff",
            emissiveMap: tex,
            emissiveIntensity: t.windows,
          })
        );
      });
    });
    return list;
  }, [winTextures, t.windows]);

  const items = useMemo(() => {
    const arr = [];
    const spacing = SPAN / (BUILDING_COUNT / 2);
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const idx = Math.floor(i / 2);
      arr.push({
        side,
        z: -idx * spacing + 40,
        w: rand(8, 16),
        d: rand(8, 16),
        h: rand(8, 45),
        x: rand(6, 20),
        mat: Math.floor(Math.random() * materials.length),
      });
    }
    return arr;
  }, [materials.length]);

  const refs = useRef([]);

  useFrame(() => {
    const pz = game.playerZ;
    items.forEach((b, i) => {
      if (b.z - b.d / 2 > pz + 40) {
        b.z -= SPAN;
        b.w = rand(8, 16);
        b.d = rand(8, 16);
        b.h = rand(8, 50);
        b.x = rand(6, 20);
        b.mat = Math.floor(Math.random() * materials.length);
        const m = refs.current[i];
        if (m) m.material = materials[b.mat];
      }
      const m = refs.current[i];
      if (m) {
        m.position.set(b.side * (ROAD_HALF + 3 + b.x + b.w / 2), b.h / 2, b.z);
        m.scale.set(b.w, b.h, b.d);
      }
    });
  });

  return (
    <group>
      {items.map((b, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} material={materials[b.mat]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

const TREE_COUNT = 36;
const TREE_SPAN = 360;
export function Trees() {
  const items = useMemo(
    () =>
      Array.from({ length: TREE_COUNT }, (_, i) => ({
        side: i % 2 === 0 ? -1 : 1,
        z: -(Math.floor(i / 2) * (TREE_SPAN / (TREE_COUNT / 2))) + 30 + rand(-3, 3),
        x: rand(3.5, 5.5),
        s: rand(0.8, 1.4),
      })),
    []
  );
  const refs = useRef([]);
  useFrame(() => {
    const pz = game.playerZ;
    items.forEach((tr, i) => {
      if (tr.z > pz + 30) {
        tr.z -= TREE_SPAN;
        tr.s = rand(0.8, 1.4);
      }
      const g = refs.current[i];
      if (g) {
        g.position.set(tr.side * (ROAD_HALF + tr.x), 0.3, tr.z);
        g.scale.setScalar(tr.s);
      }
    });
  });
  return (
    <group>
      {items.map((_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.25, 2, 8]} />
            <meshStandardMaterial color="#5b3a1e" roughness={1} />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[1.3, 2.6, 8]} />
            <meshStandardMaterial color="#1f6b3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.1, 0]} castShadow>
            <coneGeometry args={[0.95, 2.0, 8]} />
            <meshStandardMaterial color="#2a8a4a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const LAMP_COUNT = 16;
const LAMP_SPAN = 320;
export function Lamps({ theme }) {
  const t = THEMES[theme];
  const items = useMemo(
    () =>
      Array.from({ length: LAMP_COUNT }, (_, i) => ({
        side: i % 2 === 0 ? -1 : 1,
        z: -(i * (LAMP_SPAN / LAMP_COUNT)) + 20,
      })),
    []
  );
  const refs = useRef([]);
  useFrame(() => {
    const pz = game.playerZ;
    items.forEach((l, i) => {
      if (l.z > pz + 25) l.z -= LAMP_SPAN;
      const g = refs.current[i];
      if (g) g.position.set(l.side * (ROAD_HALF + 1.2), 0.3, l.z);
    });
  });
  return (
    <group>
      {items.map((l, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 7, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[-l.side * 1.0, 6.9, 0]} rotation-z={l.side * 0.15}>
            <boxGeometry args={[2.2, 0.1, 0.1]} />
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[-l.side * 2.0, 6.75, 0]}>
            <boxGeometry args={[0.7, 0.15, 0.3]} />
            <meshStandardMaterial
              color="#fff7d6"
              emissive="#fff1b8"
              emissiveIntensity={t.lightsOn ? 5 : 0.3}
              toneMapped={false}
            />
          </mesh>
          {t.lightsOn && i < 6 && (
            <pointLight position={[-l.side * 2.0, 6.5, 0]} intensity={30} distance={22} color="#ffe9b0" decay={2} />
          )}
        </group>
      ))}
    </group>
  );
}

/* Floating neon billboards / gantries for extra flair */
const GANTRY_COUNT = 4;
const GANTRY_SPAN = 480;
export function Gantries({ theme }) {
  const t = THEMES[theme];
  const items = useMemo(
    () => Array.from({ length: GANTRY_COUNT }, (_, i) => ({ z: -120 - i * (GANTRY_SPAN / GANTRY_COUNT), hue: i })),
    []
  );
  const refs = useRef([]);
  const colors = ["#00e5ff", "#a855f7", "#f43f5e", "#22c55e"];
  useFrame(() => {
    const pz = game.playerZ;
    items.forEach((g, i) => {
      if (g.z > pz + 20) g.z -= GANTRY_SPAN;
      const o = refs.current[i];
      if (o) o.position.z = g.z;
    });
  });
  return (
    <group>
      {items.map((g, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh position={[-ROAD_HALF - 0.6, 4, 0]} castShadow>
            <boxGeometry args={[0.5, 8, 0.5]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[ROAD_HALF + 0.6, 4, 0]} castShadow>
            <boxGeometry args={[0.5, 8, 0.5]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 8, 0]} castShadow>
            <boxGeometry args={[ROAD_WIDTH + 2, 1.2, 0.6]} />
            <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 8, 0.32]}>
            <boxGeometry args={[ROAD_WIDTH - 2, 0.5, 0.05]} />
            <meshStandardMaterial
              color={colors[i % 4]}
              emissive={colors[i % 4]}
              emissiveIntensity={t.lightsOn ? 3 : 1.2}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

