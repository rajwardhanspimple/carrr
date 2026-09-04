import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Procedural paint detail (subtle metallic flake roughness)          */
/* ------------------------------------------------------------------ */
function makeFlakeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#404040";
  g.fillRect(0, 0, 256, 256);
  // sparse metallic flakes
  for (let i = 0; i < 5200; i++) {
    const v = 120 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.45})`;
    const s = 1 + Math.random() * 1.8;
    g.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Materials                                                          */
/* ------------------------------------------------------------------ */
export function useCarMaterials(color, opts = {}) {
  const flake = useMemo(makeFlakeTexture, []);
  return useMemo(() => {
    const paint = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.2,
      roughness: 0.42,
      roughnessMap: flake,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      sheen: 0.35,
      sheenRoughness: 0.5,
      envMapIntensity: 1.9,
    });
    const paint2 = new THREE.MeshPhysicalMaterial({
      color: opts.accent || "#0f172a",
      metalness: 0.5,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.5,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#0d1522",
      metalness: 0,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 2.4,
      side: THREE.DoubleSide,
    });
    const dark = new THREE.MeshStandardMaterial({ color: "#0b0f19", metalness: 0.45, roughness: 0.52 });
    const carbon = new THREE.MeshStandardMaterial({
      color: "#131820",
      metalness: 0.55,
      roughness: 0.35,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: "#e5e7eb", metalness: 1, roughness: 0.12, envMapIntensity: 1.6 });
    const tire = new THREE.MeshStandardMaterial({ color: "#0a0a0a", roughness: 0.92 });
    const rim = new THREE.MeshStandardMaterial({ color: "#2b2e33", metalness: 1, roughness: 0.28, envMapIntensity: 1.3 });
    const brakeDisc = new THREE.MeshStandardMaterial({ color: "#6b7280", metalness: 0.95, roughness: 0.38 });
    const brakeCaliper = new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.7, roughness: 0.3, emissive: "#7f1d1d", emissiveIntensity: 0.35 });
    const headlight = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#fff7d6",
      emissiveIntensity: opts.lightsOn ? 4 : 1.2,
      roughness: 0.2,
      metalness: 0.2,
    });
    const taillight = new THREE.MeshStandardMaterial({
      color: "#7f1d1d",
      emissive: "#ff1a1a",
      emissiveIntensity: opts.lightsOn ? 3.5 : 1.5,
      metalness: 0.2,
      roughness: 0.3,
    });
    const flame = new THREE.MeshBasicMaterial({ color: "#60a5fa", transparent: true, opacity: 0.9 });
    const flameCore = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 });
    const yellow = new THREE.MeshStandardMaterial({ color: "#facc15", emissive: "#facc15", emissiveIntensity: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 2 });
    const blue = new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 2 });
    return { paint, paint2, glass, dark, carbon, chrome, tire, rim, brakeDisc, brakeCaliper, headlight, taillight, flame, flameCore, yellow, red, blue };
  }, [color, opts.accent, opts.lightsOn, flake]);
}

/* ------------------------------------------------------------------ */
/*  Reusable parts                                                     */
/* ------------------------------------------------------------------ */
function Box({ args, position, rotation, material, castShadow = true }) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={castShadow} receiveShadow>
      <boxGeometry args={args} />
    </mesh>
  );
}

/* Rounded body panel – gives cars a molded, AAA-style shell */
function RB({ args, position, rotation, material, radius = 0.1, smoothness = 4, castShadow = true }) {
  return (
    <RoundedBox args={args} position={position} rotation={rotation} radius={radius} smoothness={smoothness} material={material} castShadow={castShadow} receiveShadow />
  );
}

/* ------------------------------------------------------------------ */
/*  Sculpted coupe body (extruded smooth silhouette)                   */
/* ------------------------------------------------------------------ */
function makeCoupeBodyGeo(len, width, waist) {
  const h = len / 2;
  const s = new THREE.Shape();
  s.moveTo(-h, 0.32);
  s.lineTo(-h, 0.6);
  s.quadraticCurveTo(-h + 0.06, 0.84, -h + 0.42, 0.9);
  s.quadraticCurveTo(-0.65, waist, -0.3, waist);
  s.quadraticCurveTo(0.3, waist - 0.04, 1.2, waist);
  s.quadraticCurveTo(2.0, waist + 0.04, h - 0.1, waist - 0.06);
  s.lineTo(h, waist - 0.1);
  s.lineTo(h, 0.34);
  s.lineTo(h - 0.14, 0.3);
  s.lineTo(-h + 0.14, 0.3);
  s.closePath();
  const depth = width * 0.82;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 6,
    steps: 1,
    curveSegments: 12,
  });
  geo.translate(0, 0, -(depth / 2 + 0.1));
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function makeCoupeCanopyGeo(width, waist) {
  const s = new THREE.Shape();
  s.moveTo(-0.25, waist);
  s.quadraticCurveTo(-0.15, waist + 0.22, 0.35, waist + 0.42);
  s.quadraticCurveTo(0.85, waist + 0.46, 1.25, waist + 0.42);
  s.quadraticCurveTo(1.78, waist + 0.24, 2.0, waist);
  s.lineTo(1.66, waist - 0.02);
  s.quadraticCurveTo(1.15, waist + 0.18, 0.8, waist + 0.22);
  s.quadraticCurveTo(-0.1, waist + 0.2, -0.6, waist - 0.02);
  s.closePath();
  const depth = width * 0.62;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.09,
    bevelSegments: 6,
    steps: 1,
    curveSegments: 12,
  });
  geo.translate(0, 0, -(depth / 2 + 0.09));
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function RealCoupeShape({ mats, spin, steer, nitro, variant = "sport" }) {
  const p = variant === "muscle" ? { len: 4.95, width: 2.12, waist: 1.05, r: 0.4, x: 1.02, wing: "duck" }
    : variant === "hyper" ? { len: 4.75, width: 2.06, waist: 1.0, r: 0.37, x: 0.96, wing: "big" }
    : { len: 4.75, width: 2.0, waist: 1.02, r: 0.38, x: 0.95, wing: "small" };
  const bodyGeo = useMemo(() => makeCoupeBodyGeo(p.len, p.width, p.waist), [p.len, p.width, p.waist]);
  const canopyGeo = useMemo(() => makeCoupeCanopyGeo(p.width, p.waist), [p.width, p.waist]);
  const h = p.len / 2;
  const zf = -(p.len / 2 - 0.9);
  const zr = p.len / 2 - 0.9;

  return (
    <>
      {/* sculpted painted body */}
      <mesh geometry={bodyGeo} material={mats.paint} castShadow receiveShadow />
      {/* glasshouse */}
      <mesh geometry={canopyGeo} material={mats.glass} castShadow />
      {/* roof skin */}
      <RB args={[p.width * 0.42, 0.05, 1.05]} position={[0, p.waist + 0.44, 0.8]} material={mats.paint} radius={0.02} />
      {/* hood scoop / power bulge */}
      {variant === "muscle" ? (
        <RB args={[0.8, 0.14, 1.0]} position={[0, p.waist + 0.05, -1.1]} material={mats.carbon} radius={0.05} />
      ) : (
        <RB args={[0.66, 0.1, 0.9]} position={[0, p.waist + 0.02, -1.35]} material={mats.carbon} radius={0.04} />
      )}
      {/* splitter */}
      <RB args={[p.width * 0.9, 0.08, 0.36]} position={[0, 0.26, -h + 0.08]} material={mats.carbon} radius={0.03} />
      {/* front grille + mesh */}
      <RB args={[p.width * 0.66, 0.24, 0.1]} position={[0, 0.62, -h + 0.04]} material={mats.dark} radius={0.03} />
      <mesh position={[0, 0.62, -h - 0.02]}>
        <planeGeometry args={[p.width * 0.58, 0.18]} />
        <meshStandardMaterial color="#05070a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* slim LED headlights */}
      <Box args={[0.46, 0.07, 0.06]} position={[-p.width * 0.32, p.waist - 0.14, -h + 0.06]} material={mats.headlight} castShadow={false} />
      <Box args={[0.46, 0.07, 0.06]} position={[p.width * 0.32, p.waist - 0.14, -h + 0.06]} material={mats.headlight} castShadow={false} />
      {/* side intakes */}
      <Box args={[0.08, 0.22, 0.5]} position={[-p.width / 2 + 0.02, 0.55, -1.35]} material={mats.dark} />
      <Box args={[0.08, 0.22, 0.5]} position={[p.width / 2 - 0.02, 0.55, -1.35]} material={mats.dark} />
      {/* rocker panels */}
      <Box args={[0.06, 0.12, p.len * 0.62]} position={[-p.width / 2 + 0.02, 0.33, 0]} material={mats.carbon} />
      <Box args={[0.06, 0.12, p.len * 0.62]} position={[p.width / 2 - 0.02, 0.33, 0]} material={mats.carbon} />
      {/* mirrors */}
      <group position={[-p.width / 2 - 0.11, p.waist + 0.05, -0.35]}>
        <Box args={[0.05, 0.05, 0.18]} position={[0.04, 0, 0]} material={mats.carbon} />
        <RB args={[0.2, 0.08, 0.12]} position={[0, 0.03, 0]} material={mats.paint2} radius={0.03} />
      </group>
      <group position={[p.width / 2 + 0.11, p.waist + 0.05, -0.35]}>
        <Box args={[0.05, 0.05, 0.18]} position={[-0.04, 0, 0]} material={mats.carbon} />
        <RB args={[0.2, 0.08, 0.12]} position={[0, 0.03, 0]} material={mats.paint2} radius={0.03} />
      </group>
      {/* full-width LED tail bar */}
      <Box args={[p.width * 0.72, 0.08, 0.05]} position={[0, p.waist - 0.14, h - 0.02]} material={mats.taillight} castShadow={false} />
      {/* rear diffuser */}
      <RB args={[p.width * 0.82, 0.12, 0.3]} position={[0, 0.28, h - 0.05]} material={mats.carbon} radius={0.03} />
      {/* spoiler */}
      {p.wing === "big" ? (
        <>
          <RB args={[p.width * 0.92, 0.06, 0.42]} position={[0, p.waist + 0.18, h - 0.25]} material={mats.paint2} radius={0.02} />
          <RB args={[0.6, 0.06, 0.3]} position={[0, p.waist + 0.38, h - 0.25]} material={mats.paint2} radius={0.02} />
          <Box args={[0.06, 0.4, 0.2]} position={[-p.width * 0.4, p.waist + 0.16, h - 0.25]} material={mats.carbon} />
          <Box args={[0.06, 0.4, 0.2]} position={[p.width * 0.4, p.waist + 0.16, h - 0.25]} material={mats.carbon} />
        </>
      ) : p.wing === "duck" ? (
        <RB args={[p.width * 0.82, 0.14, 0.4]} position={[0, p.waist + 0.02, h - 0.15]} rotation={[0.22, 0, 0]} material={mats.paint} radius={0.04} />
      ) : (
        <RB args={[p.width * 0.7, 0.09, 0.3]} position={[0, p.waist + 0.02, h - 0.12]} rotation={[0.18, 0, 0]} material={mats.paint} radius={0.03} />
      )}
      {/* exhausts */}
      <Exhaust mats={mats} positions={[[-0.42, 0.3, h - 0.02], [0.42, 0.3, h - 0.02]]} nitro={nitro} />
      <Wheels x={p.x} zf={zf} zr={zr} y={p.r} r={p.r} w={0.32} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function Wheel({ pos, r = 0.36, w = 0.3, mats, spin, steer, front = false }) {
  const spinRef = useRef();
  const steerRef = useRef();
  useFrame(() => {
    if (spinRef.current && spin) spinRef.current.rotation.x = spin.current;
    if (steerRef.current && steer && front) steerRef.current.rotation.y = steer.current;
  });
  const spokes = [];
  const spokeN = 5;
  const spokeL = r * 0.62;
  for (let i = 0; i < spokeN; i++) {
    const a = (i / spokeN) * Math.PI * 2;
    spokes.push(
      <mesh
        key={i}
        material={mats.rim}
        position={[0, Math.cos(a) * (spokeL / 2), Math.sin(a) * (spokeL / 2)]}
        rotation={[a, 0, 0]}
      >
        <boxGeometry args={[w * 0.45, spokeL, 0.055]} />
      </mesh>
    );
  }
  return (
    <group position={pos} ref={steerRef}>
      <group ref={spinRef}>
        {/* tire */}
        <mesh rotation-z={Math.PI / 2} material={mats.tire} castShadow>
          <cylinderGeometry args={[r, r, w, 32]} />
        </mesh>
        {/* rim barrel */}
        <mesh rotation-z={Math.PI / 2} material={mats.rim}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, w * 0.5, 20]} />
        </mesh>
        {/* polished outer lip */}
        <mesh rotation-y={Math.PI / 2} material={mats.chrome}>
          <torusGeometry args={[r * 0.62, w * 0.06, 10, 28]} />
        </mesh>
        {spokes}
        {/* brake disc + caliper */}
        <mesh rotation-z={Math.PI / 2} material={mats.brakeDisc}>
          <cylinderGeometry args={[r * 0.42, r * 0.42, w * 0.42, 20]} />
        </mesh>
        <mesh position={[0, -r * 0.46, -w * 0.08]} material={mats.brakeCaliper}>
          <boxGeometry args={[0.14, r * 0.3, r * 0.2]} />
        </mesh>
        {/* hub */}
        <mesh rotation-z={Math.PI / 2} material={mats.dark}>
          <cylinderGeometry args={[r * 0.12, r * 0.12, w + 0.02, 14]} />
        </mesh>
      </group>
    </group>
  );
}

function Wheels({ x, zf, zr, y, r, w, mats, spin, steer }) {
  return (
    <>
      <Wheel pos={[-x, y, zf]} r={r} w={w} mats={mats} spin={spin} steer={steer} front />
      <Wheel pos={[x, y, zf]} r={r} w={w} mats={mats} spin={spin} steer={steer} front />
      <Wheel pos={[-x, y, zr]} r={r} w={w} mats={mats} spin={spin} />
      <Wheel pos={[x, y, zr]} r={r} w={w} mats={mats} spin={spin} />
    </>
  );
}

function Lights({ mats, x, y, zf, zr, size = [0.35, 0.15, 0.08] }) {
  return (
    <>
      <Box args={size} position={[-x, y, zf]} material={mats.headlight} castShadow={false} />
      <Box args={size} position={[x, y, zf]} material={mats.headlight} castShadow={false} />
      <Box args={size} position={[-x, y, zr]} material={mats.taillight} castShadow={false} />
      <Box args={size} position={[x, y, zr]} material={mats.taillight} castShadow={false} />
    </>
  );
}

function Exhaust({ mats, positions, nitro }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const on = nitro ? nitro.current : 0;
    const flicker = 0.8 + Math.sin(state.clock.elapsedTime * 60) * 0.25;
    ref.current.scale.set(on ? flicker : 0.001, on ? flicker : 0.001, on ? flicker * 1.6 : 0.001);
  });
  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p} rotation-x={Math.PI / 2} material={mats.chrome}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
        </mesh>
      ))}
      <group ref={ref}>
        {positions.map((p, i) => (
          <group key={i} position={[p[0], p[1], p[2] + 0.5]}>
            <mesh rotation-x={-Math.PI / 2} material={mats.flame}>
              <coneGeometry args={[0.14, 1.0, 10]} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} material={mats.flameCore}>
              <coneGeometry args={[0.07, 0.7, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

function Spoiler({ mats, y, z, w = 1.8, tall = 0.35 }) {
  return (
    <>
      <Box args={[0.08, tall, 0.25]} position={[-w / 2 + 0.15, y + tall / 2, z]} material={mats.carbon} />
      <Box args={[0.08, tall, 0.25]} position={[w / 2 - 0.15, y + tall / 2, z]} material={mats.carbon} />
      <RB args={[w, 0.07, 0.5]} position={[0, y + tall, z]} material={mats.paint} radius={0.03} />
    </>
  );
}

function LightBar({ mats, y, z }) {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    const t = Math.floor(s.clock.elapsedTime * 6) % 2;
    ref.current.children[0].material = t ? mats.red : mats.dark;
    ref.current.children[1].material = t ? mats.dark : mats.blue;
  });
  return (
    <group ref={ref} position={[0, y, z]}>
      <Box args={[0.6, 0.18, 0.3]} position={[-0.35, 0, 0]} material={mats.red} castShadow={false} />
      <Box args={[0.6, 0.18, 0.3]} position={[0.35, 0, 0]} material={mats.blue} castShadow={false} />
      <Box args={[0.12, 0.18, 0.3]} position={[0, 0, 0]} material={mats.dark} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Shapes                                                             */
/* ------------------------------------------------------------------ */
function SportShape({ mats, spin, steer, nitro, variant = "sport" }) {
  const hyper = variant === "hyper";
  return (
    <>
      {/* molded chassis */}
      <RB args={[1.9, 0.48, 4.2]} position={[0, 0.5, 0]} material={mats.paint} radius={0.14} />
      {/* sloped hood */}
      <RB args={[1.85, 0.3, 1.6]} position={[0, 0.72, -1.25]} rotation={[0.12, 0, 0]} material={mats.paint} radius={0.1} />
      {/* rear deck */}
      <RB args={[1.85, 0.32, 1.1]} position={[0, 0.78, 1.55]} material={mats.paint} radius={0.1} />
      {/* cabin */}
      <RB args={[1.6, 0.48, 1.9]} position={[0, 1.0, 0.15]} material={mats.glass} radius={0.16} />
      <RB args={[1.5, 0.06, 1.2]} position={[0, 1.26, 0.2]} material={mats.paint} radius={0.025} />
      {/* windshield slope */}
      <RB args={[1.62, 0.5, 0.1]} position={[0, 0.98, -0.85]} rotation={[0.45, 0, 0]} material={mats.glass} radius={0.03} />
      {/* side skirts */}
      <Box args={[0.12, 0.2, 3.2]} position={[-0.98, 0.35, 0]} material={mats.carbon} />
      <Box args={[0.12, 0.2, 3.2]} position={[0.98, 0.35, 0]} material={mats.carbon} />
      {/* splitter + diffuser */}
      <Box args={[1.9, 0.12, 0.3]} position={[0, 0.36, -2.15]} material={mats.carbon} />
      <Box args={[1.9, 0.12, 0.3]} position={[0, 0.36, 2.15]} material={mats.carbon} />
      {/* grille */}
      <Box args={[1.0, 0.18, 0.06]} position={[0, 0.55, -2.22]} material={mats.dark} />
      <Lights mats={mats} x={0.68} y={0.62} zf={-2.12} zr={2.14} size={[0.4, 0.12, 0.08]} />
      {hyper ? (
        <>
          <Spoiler mats={mats} y={0.95} z={1.95} w={1.9} tall={0.45} />
          <Box args={[0.6, 0.15, 1.0]} position={[0, 1.02, 1.1]} material={mats.carbon} />
        </>
      ) : (
        <Spoiler mats={mats} y={0.95} z={1.95} w={1.7} tall={0.22} />
      )}
      <Exhaust mats={mats} positions={[[-0.5, 0.3, 2.2], [0.5, 0.3, 2.2]]} nitro={nitro} />
      <Wheels x={0.95} zf={-1.4} zr={1.4} y={0.36} r={0.36} w={0.32} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function MuscleShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[2.0, 0.58, 4.6]} position={[0, 0.58, 0]} material={mats.paint} radius={0.15} />
      <RB args={[1.95, 0.25, 1.8]} position={[0, 0.95, -1.3]} material={mats.paint} radius={0.08} />
      <Box args={[0.6, 0.15, 0.9]} position={[0, 1.12, -1.4]} material={mats.carbon} />
      <RB args={[1.95, 0.3, 1.2]} position={[0, 0.95, 1.6]} material={mats.paint} radius={0.09} />
      <RB args={[1.7, 0.55, 1.9]} position={[0, 1.3, 0.2]} material={mats.glass} radius={0.16} />
      <RB args={[1.6, 0.06, 1.3]} position={[0, 1.6, 0.25]} material={mats.paint} radius={0.025} />
      {/* racing stripes */}
      <Box args={[0.25, 0.02, 4.6]} position={[-0.3, 1.09, -0.05]} material={mats.paint2} castShadow={false} />
      <Box args={[0.25, 0.02, 4.6]} position={[0.3, 1.09, -0.05]} material={mats.paint2} castShadow={false} />
      <RB args={[2.0, 0.28, 0.3]} position={[0, 0.4, -2.35]} material={mats.chrome} radius={0.05} />
      <RB args={[2.0, 0.28, 0.3]} position={[0, 0.4, 2.35]} material={mats.chrome} radius={0.05} />
      <Box args={[1.3, 0.25, 0.06]} position={[0, 0.7, -2.32]} material={mats.dark} />
      <Lights mats={mats} x={0.75} y={0.72} zf={-2.32} zr={2.32} size={[0.3, 0.2, 0.08]} />
      <Spoiler mats={mats} y={1.1} z={2.1} w={1.9} tall={0.15} />
      <Exhaust mats={mats} positions={[[-0.6, 0.3, 2.4], [0.6, 0.3, 2.4]]} nitro={nitro} />
      <Wheels x={1.0} zf={-1.5} zr={1.5} y={0.4} r={0.4} w={0.36} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function F1Shape({ mats, spin, steer, nitro }) {
  return (
    <>
      {/* monocoque */}
      <RB args={[0.8, 0.4, 3.6]} position={[0, 0.45, 0.2]} material={mats.paint} radius={0.12} />
      {/* nose */}
      <RB args={[0.45, 0.25, 1.6]} position={[0, 0.4, -2.0]} rotation={[-0.05, 0, 0]} material={mats.paint} radius={0.08} />
      {/* sidepods */}
      <RB args={[0.6, 0.35, 1.8]} position={[-0.7, 0.42, 0.5]} material={mats.paint} radius={0.12} />
      <RB args={[0.6, 0.35, 1.8]} position={[0.7, 0.42, 0.5]} material={mats.paint} radius={0.12} />
      {/* cockpit + halo */}
      <RB args={[0.6, 0.3, 0.7]} position={[0, 0.75, -0.2]} material={mats.carbon} radius={0.09} />
      <mesh position={[0, 0.85, -0.1]} rotation-x={Math.PI / 2} material={mats.carbon}>
        <torusGeometry args={[0.4, 0.04, 8, 16, Math.PI]} />
      </mesh>
      {/* airbox */}
      <RB args={[0.4, 0.5, 0.9]} position={[0, 0.95, 0.55]} material={mats.paint} radius={0.1} />
      <Box args={[0.35, 0.3, 0.12]} position={[0, 1.15, 0.1]} material={mats.carbon} />
      {/* engine cover */}
      <RB args={[0.5, 0.35, 1.3]} position={[0, 0.65, 1.3]} rotation={[0.15, 0, 0]} material={mats.paint} radius={0.12} />
      {/* front wing */}
      <RB args={[2.0, 0.05, 0.6]} position={[0, 0.2, -2.6]} material={mats.paint} radius={0.02} />
      <RB args={[0.15, 0.3, 0.6]} position={[-0.95, 0.35, -2.6]} material={mats.paint2} radius={0.04} />
      <RB args={[0.15, 0.3, 0.6]} position={[0.95, 0.35, -2.6]} material={mats.paint2} radius={0.04} />
      {/* rear wing */}
      <RB args={[1.9, 0.06, 0.5]} position={[0, 1.05, 2.0]} material={mats.paint} radius={0.02} />
      <RB args={[1.9, 0.06, 0.35]} position={[0, 0.85, 2.05]} material={mats.paint2} radius={0.02} />
      <Box args={[0.06, 0.6, 0.5]} position={[-0.92, 0.75, 2.0]} material={mats.carbon} />
      <Box args={[0.06, 0.6, 0.5]} position={[0.92, 0.75, 2.0]} material={mats.carbon} />
      <Box args={[0.2, 0.2, 0.1]} position={[0, 0.5, 2.3]} material={mats.taillight} />
      <Exhaust mats={mats} positions={[[0, 0.55, 2.05]]} nitro={nitro} />
      <Wheels x={0.85} zf={-1.55} zr={1.35} y={0.38} r={0.38} w={0.42} mats={mats} spin={spin} steer={steer} />
      {/* suspension arms */}
      {[-1.55, 1.35].map((z) =>
        [-1, 1].map((s) => (
          <Box key={z + "" + s} args={[0.6, 0.04, 0.12]} position={[s * 0.5, 0.45, z]} material={mats.carbon} />
        ))
      )}
    </>
  );
}

function RallyShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[1.9, 0.6, 4.1]} position={[0, 0.65, 0]} material={mats.paint} radius={0.16} />
      <RB args={[1.85, 0.25, 1.4]} position={[0, 1.05, -1.2]} rotation={[0.08, 0, 0]} material={mats.paint} radius={0.08} />
      <RB args={[1.7, 0.6, 2.2]} position={[0, 1.25, 0.3]} material={mats.glass} radius={0.18} />
      <RB args={[1.65, 0.06, 1.9]} position={[0, 1.58, 0.3]} material={mats.paint} radius={0.025} />
      {/* rally livery stripe */}
      <RB args={[1.92, 0.15, 1.5]} position={[0, 0.65, 0.4]} material={mats.paint2} radius={0.05} castShadow={false} />
      {/* roof scoop & lights pod */}
      <Box args={[0.5, 0.12, 0.5]} position={[0, 1.66, 0.0]} material={mats.carbon} />
      <Box args={[1.2, 0.18, 0.15]} position={[0, 1.05, -2.0]} material={mats.carbon} />
      {[-0.4, -0.13, 0.13, 0.4].map((x) => (
        <Box key={x} args={[0.18, 0.12, 0.06]} position={[x, 1.05, -2.09]} material={mats.headlight} castShadow={false} />
      ))}
      <Box args={[1.9, 0.3, 0.3]} position={[0, 0.4, -2.1]} material={mats.carbon} />
      <Box args={[1.9, 0.3, 0.3]} position={[0, 0.4, 2.1]} material={mats.carbon} />
      <Lights mats={mats} x={0.68} y={0.78} zf={-2.08} zr={2.08} size={[0.36, 0.16, 0.08]} />
      <Spoiler mats={mats} y={1.2} z={1.85} w={1.8} tall={0.4} />
      {/* mud flaps */}
      <Box args={[0.35, 0.3, 0.04]} position={[-0.9, 0.25, 1.9]} material={mats.dark} />
      <Box args={[0.35, 0.3, 0.04]} position={[0.9, 0.25, 1.9]} material={mats.dark} />
      <Exhaust mats={mats} positions={[[0.55, 0.32, 2.15]]} nitro={nitro} />
      <Wheels x={0.95} zf={-1.35} zr={1.35} y={0.4} r={0.4} w={0.32} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function SuvShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[2.1, 0.72, 4.6]} position={[0, 0.85, 0]} material={mats.paint} radius={0.18} />
      <RB args={[2.0, 0.2, 1.3]} position={[0, 1.3, -1.6]} material={mats.paint} radius={0.07} />
      <RB args={[1.9, 0.75, 3.0]} position={[0, 1.55, 0.3]} material={mats.glass} radius={0.16} />
      <RB args={[1.95, 0.08, 3.1]} position={[0, 1.95, 0.3]} material={mats.paint} radius={0.03} />
      {/* roof rails */}
      <Box args={[0.08, 0.1, 2.6]} position={[-0.8, 2.03, 0.3]} material={mats.carbon} />
      <Box args={[0.08, 0.1, 2.6]} position={[0.8, 2.03, 0.3]} material={mats.carbon} />
      {/* pillars */}
      <Box args={[1.92, 0.75, 0.1]} position={[0, 1.55, -0.6]} material={mats.paint} />
      <Box args={[1.92, 0.75, 0.1]} position={[0, 1.55, 0.6]} material={mats.paint} />
      {/* cladding */}
      <Box args={[2.14, 0.3, 4.62]} position={[0, 0.55, 0]} material={mats.carbon} />
      <RB args={[2.1, 0.35, 0.35]} position={[0, 0.5, -2.4]} material={mats.carbon} radius={0.06} />
      <RB args={[2.1, 0.35, 0.35]} position={[0, 0.5, 2.4]} material={mats.carbon} radius={0.06} />
      <Box args={[1.2, 0.3, 0.06]} position={[0, 0.95, -2.32]} material={mats.chrome} />
      <Lights mats={mats} x={0.75} y={1.0} zf={-2.32} zr={2.32} size={[0.4, 0.22, 0.08]} />
      <Exhaust mats={mats} positions={[[0.7, 0.35, 2.4]]} nitro={nitro} />
      <Wheels x={1.02} zf={-1.5} zr={1.5} y={0.45} r={0.45} w={0.36} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function PickupShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[2.1, 0.6, 5.2]} position={[0, 0.8, 0]} material={mats.paint} radius={0.16} />
      {/* hood */}
      <RB args={[2.05, 0.45, 1.8]} position={[0, 1.25, -1.7]} material={mats.paint} radius={0.13} />
      {/* cab */}
      <RB args={[1.9, 0.8, 1.6]} position={[0, 1.85, -0.3]} material={mats.glass} radius={0.16} />
      <RB args={[1.95, 0.08, 1.7]} position={[0, 2.28, -0.3]} material={mats.paint} radius={0.03} />
      <Box args={[1.92, 0.8, 0.1]} position={[0, 1.85, 0.5]} material={mats.paint} />
      {/* bed walls */}
      <RB args={[0.1, 0.6, 2.4]} position={[-1.0, 1.35, 1.4]} material={mats.paint} radius={0.04} />
      <RB args={[0.1, 0.6, 2.4]} position={[1.0, 1.35, 1.4]} material={mats.paint} radius={0.04} />
      <RB args={[2.1, 0.6, 0.1]} position={[0, 1.35, 2.55]} material={mats.paint} radius={0.04} />
      <Box args={[1.9, 0.05, 2.3]} position={[0, 1.08, 1.4]} material={mats.dark} />
      {/* cargo */}
      <RB args={[0.8, 0.5, 0.8]} position={[-0.4, 1.35, 1.2]} material={mats.paint2} radius={0.04} />
      <RB args={[0.6, 0.4, 0.6]} position={[0.5, 1.3, 1.9]} material={mats.paint2} radius={0.04} />
      <RB args={[2.1, 0.4, 0.4]} position={[0, 0.55, -2.65]} material={mats.chrome} radius={0.06} />
      <RB args={[2.1, 0.35, 0.3]} position={[0, 0.55, 2.7]} material={mats.chrome} radius={0.05} />
      <Box args={[1.4, 0.4, 0.06]} position={[0, 1.1, -2.62]} material={mats.dark} />
      <Lights mats={mats} x={0.8} y={1.15} zf={-2.62} zr={2.62} size={[0.35, 0.3, 0.08]} />
      <Exhaust mats={mats} positions={[[0.8, 0.4, 2.7]]} nitro={nitro} />
      <Wheels x={1.05} zf={-1.75} zr={1.6} y={0.5} r={0.5} w={0.4} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function SedanShape({ mats, spin, steer, nitro, variant }) {
  const isPolice = variant === "police";
  const isTaxi = variant === "taxi";
  const isElectric = variant === "electric";
  return (
    <>
      <RB args={[1.95, 0.52, 4.6]} position={[0, 0.6, 0]} material={mats.paint} radius={0.15} />
      <RB args={[1.9, 0.25, 1.5]} position={[0, 0.95, -1.4]} rotation={[0.06, 0, 0]} material={mats.paint} radius={0.07} />
      <RB args={[1.9, 0.28, 1.1]} position={[0, 0.98, 1.65]} material={mats.paint} radius={0.08} />
      <RB args={[1.7, 0.55, 2.3]} position={[0, 1.22, 0.15]} material={mats.glass} radius={0.16} />
      <RB args={[1.65, 0.06, 1.7]} position={[0, 1.52, 0.15]} material={isPolice ? mats.paint2 : mats.paint} radius={0.025} />
      <RB args={[1.7, 0.5, 0.1]} position={[0, 1.2, -0.9]} rotation={[0.5, 0, 0]} material={mats.glass} radius={0.03} />
      <RB args={[1.7, 0.5, 0.1]} position={[0, 1.2, 1.2]} rotation={[-0.5, 0, 0]} material={mats.glass} radius={0.03} />
      {isPolice && (
        <>
          <RB args={[1.96, 0.5, 1.6]} position={[0, 0.6, 0.1]} material={mats.paint2} radius={0.12} castShadow={false} />
          <LightBar mats={mats} y={1.63} z={0.1} />
          <Box args={[2.0, 0.35, 0.2]} position={[0, 0.5, -2.45]} material={mats.carbon} />
        </>
      )}
      {isTaxi && (
        <RB args={[0.7, 0.22, 0.3]} position={[0, 1.66, 0.1]} material={mats.yellow} radius={0.06} castShadow={false} />
      )}
      {isElectric && (
        <Box args={[1.6, 0.04, 1.6]} position={[0, 1.56, 0.1]} material={mats.glass} castShadow={false} />
      )}
      <RB args={[1.95, 0.25, 0.3]} position={[0, 0.4, -2.35]} material={mats.carbon} radius={0.06} />
      <RB args={[1.95, 0.25, 0.3]} position={[0, 0.4, 2.35]} material={mats.carbon} radius={0.06} />
      {!isElectric && <Box args={[1.1, 0.2, 0.06]} position={[0, 0.7, -2.32]} material={mats.dark} />}
      <Lights mats={mats} x={0.7} y={0.75} zf={-2.32} zr={2.32} size={[0.4, 0.15, 0.08]} />
      {isElectric ? (
        <Box args={[1.5, 0.05, 0.06]} position={[0, 0.75, 2.33]} material={mats.taillight} castShadow={false} />
      ) : (
        <Exhaust mats={mats} positions={[[-0.55, 0.32, 2.4], [0.55, 0.32, 2.4]]} nitro={nitro} />
      )}
      {isElectric && <Exhaust mats={mats} positions={[[0, 0.32, 2.4]]} nitro={nitro} />}
      <Wheels x={0.98} zf={-1.5} zr={1.5} y={0.37} r={0.37} w={0.3} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function ClassicShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[1.95, 0.58, 4.7]} position={[0, 0.62, 0]} material={mats.paint} radius={0.16} />
      <RB args={[1.8, 0.3, 1.7]} position={[0, 1.02, -1.4]} material={mats.paint} radius={0.09} />
      <RB args={[1.8, 0.3, 1.2]} position={[0, 1.02, 1.6]} material={mats.paint} radius={0.09} />
      <RB args={[1.6, 0.6, 2.0]} position={[0, 1.35, 0.1]} material={mats.glass} radius={0.18} />
      <RB args={[1.65, 0.08, 1.7]} position={[0, 1.68, 0.1]} material={mats.paint2} radius={0.03} />
      {/* fins */}
      <RB args={[0.1, 0.35, 1.4]} position={[-0.9, 1.2, 1.7]} material={mats.paint} radius={0.04} />
      <RB args={[0.1, 0.35, 1.4]} position={[0.9, 1.2, 1.7]} material={mats.paint} radius={0.04} />
      {/* chrome trim */}
      <Box args={[1.97, 0.06, 4.4]} position={[0, 0.9, 0]} material={mats.chrome} castShadow={false} />
      <RB args={[2.0, 0.3, 0.35]} position={[0, 0.42, -2.45]} material={mats.chrome} radius={0.06} />
      <RB args={[2.0, 0.3, 0.35]} position={[0, 0.42, 2.45]} material={mats.chrome} radius={0.06} />
      <Box args={[1.3, 0.3, 0.08]} position={[0, 0.75, -2.38]} material={mats.chrome} />
      {/* round headlights */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.8, -2.38]} rotation-x={Math.PI / 2} material={mats.headlight}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 20]} />
        </mesh>
      ))}
      <Box args={[0.3, 0.15, 0.08]} position={[-0.7, 0.85, 2.38]} material={mats.taillight} castShadow={false} />
      <Box args={[0.3, 0.15, 0.08]} position={[0.7, 0.85, 2.38]} material={mats.taillight} castShadow={false} />
      <Exhaust mats={mats} positions={[[-0.5, 0.3, 2.45], [0.5, 0.3, 2.45]]} nitro={nitro} />
      <Wheels x={0.98} zf={-1.5} zr={1.5} y={0.38} r={0.38} w={0.28} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function MonsterShape({ mats, spin, steer, nitro }) {
  return (
    <>
      {/* lifted chassis */}
      <Box args={[1.6, 0.3, 4.0]} position={[0, 1.4, 0]} material={mats.carbon} />
      <RB args={[2.0, 0.62, 4.4]} position={[0, 1.85, 0]} material={mats.paint} radius={0.18} />
      <RB args={[1.95, 0.4, 1.6]} position={[0, 2.3, -1.3]} material={mats.paint} radius={0.12} />
      <RB args={[1.8, 0.8, 1.6]} position={[0, 2.75, 0.0]} material={mats.glass} radius={0.18} />
      <RB args={[1.85, 0.08, 1.7]} position={[0, 3.18, 0.0]} material={mats.paint} radius={0.03} />
      <RB args={[1.6, 0.5, 1.6]} position={[0, 2.35, 1.4]} material={mats.paint} radius={0.14} />
      {/* roof lights */}
      <Box args={[1.4, 0.15, 0.2]} position={[0, 3.3, -0.6]} material={mats.carbon} />
      {[-0.5, -0.17, 0.17, 0.5].map((x) => (
        <Box key={x} args={[0.22, 0.12, 0.06]} position={[x, 3.3, -0.72]} material={mats.headlight} castShadow={false} />
      ))}
      {/* skull-ish grille & bull bar */}
      <Box args={[1.4, 0.4, 0.08]} position={[0, 2.0, -2.24]} material={mats.carbon} />
      <Box args={[2.2, 0.12, 0.12]} position={[0, 1.6, -2.4]} material={mats.chrome} />
      <Box args={[0.12, 0.7, 0.12]} position={[-0.8, 1.9, -2.4]} material={mats.chrome} />
      <Box args={[0.12, 0.7, 0.12]} position={[0.8, 1.9, -2.4]} material={mats.chrome} />
      <Lights mats={mats} x={0.7} y={2.1} zf={-2.22} zr={2.22} size={[0.4, 0.2, 0.08]} />
      {/* axles */}
      <Box args={[2.8, 0.15, 0.15]} position={[0, 0.85, -1.5]} material={mats.carbon} />
      <Box args={[2.8, 0.15, 0.15]} position={[0, 0.85, 1.5]} material={mats.carbon} />
      <Box args={[0.15, 0.6, 0.15]} position={[-0.7, 1.1, -1.5]} material={mats.chrome} />
      <Box args={[0.15, 0.6, 0.15]} position={[0.7, 1.1, -1.5]} material={mats.chrome} />
      <Box args={[0.15, 0.6, 0.15]} position={[-0.7, 1.1, 1.5]} material={mats.chrome} />
      <Box args={[0.15, 0.6, 0.15]} position={[0.7, 1.1, 1.5]} material={mats.chrome} />
      <Exhaust mats={mats} positions={[[-0.6, 2.4, 0.9], [0.6, 2.4, 0.9]]} nitro={nitro} />
      <Wheels x={1.35} zf={-1.5} zr={1.5} y={0.85} r={0.85} w={0.6} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function LimoShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[1.95, 0.58, 7.0]} position={[0, 0.62, 0]} material={mats.paint} radius={0.16} />
      <RB args={[1.9, 0.25, 1.5]} position={[0, 1.0, -2.6]} material={mats.paint} radius={0.07} />
      <RB args={[1.9, 0.25, 1.0]} position={[0, 1.0, 2.9]} material={mats.paint} radius={0.07} />
      <RB args={[1.7, 0.55, 4.6]} position={[0, 1.25, 0.1]} material={mats.glass} radius={0.16} />
      <RB args={[1.72, 0.06, 4.2]} position={[0, 1.55, 0.1]} material={mats.paint} radius={0.025} />
      {/* pillars along the windows */}
      {[-1.6, -0.5, 0.6, 1.7].map((z) => (
        <Box key={z} args={[1.72, 0.55, 0.08]} position={[0, 1.25, z]} material={mats.paint} />
      ))}
      <RB args={[1.97, 0.05, 6.8]} position={[0, 0.9, 0]} material={mats.chrome} radius={0.02} castShadow={false} />
      <RB args={[1.95, 0.25, 0.3]} position={[0, 0.4, -3.55]} material={mats.chrome} radius={0.05} />
      <RB args={[1.95, 0.25, 0.3]} position={[0, 0.4, 3.55]} material={mats.chrome} radius={0.05} />
      <Box args={[1.1, 0.25, 0.06]} position={[0, 0.72, -3.52]} material={mats.chrome} />
      <Lights mats={mats} x={0.7} y={0.75} zf={-3.52} zr={3.52} size={[0.4, 0.15, 0.08]} />
      <Exhaust mats={mats} positions={[[-0.55, 0.32, 3.6], [0.55, 0.32, 3.6]]} nitro={nitro} />
      <Wheels x={0.98} zf={-2.5} zr={2.5} y={0.37} r={0.37} w={0.3} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function VanShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[2.1, 1.65, 5.0]} position={[0, 1.25, 0.2]} material={mats.paint} radius={0.16} />
      {/* sloped front */}
      <RB args={[2.05, 0.9, 0.8]} position={[0, 0.9, -2.5]} material={mats.paint} radius={0.1} />
      <RB args={[1.9, 0.7, 0.12]} position={[0, 1.75, -2.5]} rotation={[0.35, 0, 0]} material={mats.glass} radius={0.03} />
      {/* side windows front */}
      <RB args={[2.14, 0.55, 1.1]} position={[0, 1.6, -1.6]} material={mats.glass} radius={0.04} />
      <Box args={[2.14, 0.1, 5.0]} position={[0, 0.55, 0.2]} material={mats.carbon} />
      {/* rear doors line */}
      <Box args={[0.04, 1.4, 0.05]} position={[0, 1.25, 2.72]} material={mats.carbon} />
      <RB args={[2.1, 0.3, 0.3]} position={[0, 0.45, -2.85]} material={mats.carbon} radius={0.05} />
      <RB args={[2.1, 0.3, 0.3]} position={[0, 0.45, 2.75]} material={mats.carbon} radius={0.05} />
      <Box args={[1.2, 0.25, 0.06]} position={[0, 0.9, -2.9]} material={mats.carbon} />
      <Lights mats={mats} x={0.78} y={1.05} zf={-2.9} zr={2.72} size={[0.35, 0.35, 0.08]} />
      <Exhaust mats={mats} positions={[[0.7, 0.35, 2.75]]} nitro={nitro} />
      <Wheels x={1.02} zf={-1.75} zr={1.6} y={0.4} r={0.4} w={0.32} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function BusShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[2.5, 2.45, 9.8]} position={[0, 1.7, 0]} material={mats.paint} radius={0.22} />
      {/* window band */}
      <RB args={[2.54, 0.9, 8.6]} position={[0, 2.3, 0.2]} material={mats.glass} radius={0.05} />
      <RB args={[2.2, 1.1, 0.1]} position={[0, 2.3, -4.9]} material={mats.glass} radius={0.04} />
      <RB args={[2.2, 0.9, 0.1]} position={[0, 2.3, 4.9]} material={mats.glass} radius={0.04} />
      {/* pillars */}
      {[-3.4, -2.2, -1.0, 0.2, 1.4, 2.6, 3.8].map((z) => (
        <Box key={z} args={[2.56, 0.9, 0.08]} position={[0, 2.3, z]} material={mats.paint} />
      ))}
      <RB args={[2.4, 0.1, 9.6]} position={[0, 2.95, 0]} material={mats.paint2} radius={0.03} />
      <Box args={[1.6, 0.3, 3.0]} position={[0, 3.1, 0.5]} material={mats.carbon} />
      {/* dark skirt & door */}
      <RB args={[2.54, 0.4, 9.8]} position={[0, 0.7, 0]} material={mats.carbon} radius={0.06} />
      <Box args={[0.05, 1.5, 1.0]} position={[1.26, 1.3, -3.6]} material={mats.carbon} />
      {/* destination sign */}
      <Box args={[1.8, 0.3, 0.06]} position={[0, 2.95, -4.92]} material={mats.yellow} castShadow={false} />
      <RB args={[2.5, 0.35, 0.2]} position={[0, 0.55, -4.95]} material={mats.carbon} radius={0.05} />
      <RB args={[2.5, 0.35, 0.2]} position={[0, 0.55, 4.95]} material={mats.carbon} radius={0.05} />
      <Lights mats={mats} x={0.9} y={1.1} zf={-4.92} zr={4.92} size={[0.45, 0.3, 0.08]} />
      <Exhaust mats={mats} positions={[[-1.0, 0.4, 4.95]]} nitro={nitro} />
      <Wheel pos={[-1.2, 0.5, -3.2]} r={0.5} w={0.36} mats={mats} spin={spin} steer={steer} front />
      <Wheel pos={[1.2, 0.5, -3.2]} r={0.5} w={0.36} mats={mats} spin={spin} steer={steer} front />
      <Wheel pos={[-1.2, 0.5, 2.6]} r={0.5} w={0.36} mats={mats} spin={spin} />
      <Wheel pos={[1.2, 0.5, 2.6]} r={0.5} w={0.36} mats={mats} spin={spin} />
      <Wheel pos={[-1.2, 0.5, 3.6]} r={0.5} w={0.36} mats={mats} spin={spin} />
      <Wheel pos={[1.2, 0.5, 3.6]} r={0.5} w={0.36} mats={mats} spin={spin} />
    </>
  );
}

function GoKartShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <RB args={[1.0, 0.12, 2.0]} position={[0, 0.25, 0]} material={mats.carbon} radius={0.04} />
      <RB args={[0.7, 0.22, 1.0]} position={[0, 0.38, -0.5]} material={mats.paint} radius={0.06} />
      {/* seat */}
      <RB args={[0.6, 0.15, 0.6]} position={[0, 0.42, 0.4]} material={mats.paint2} radius={0.05} />
      <RB args={[0.6, 0.6, 0.12]} position={[0, 0.75, 0.7]} rotation={[-0.2, 0, 0]} material={mats.paint2} radius={0.04} />
      {/* driver */}
      <mesh position={[0, 0.85, 0.35]} material={mats.paint2}>
        <sphereGeometry args={[0.2, 16, 16]} />
      </mesh>
      <RB args={[0.4, 0.4, 0.3]} position={[0, 0.55, 0.4]} material={mats.paint} radius={0.06} />
      {/* steering wheel */}
      <mesh position={[0, 0.7, -0.1]} rotation-x={-1.1} material={mats.carbon}>
        <torusGeometry args={[0.14, 0.025, 8, 16]} />
      </mesh>
      {/* bumpers */}
      <RB args={[1.2, 0.08, 0.08]} position={[0, 0.3, -1.1]} material={mats.paint} radius={0.03} />
      <RB args={[1.2, 0.08, 0.08]} position={[0, 0.3, 1.1]} material={mats.paint} radius={0.03} />
      <RB args={[0.08, 0.08, 1.2]} position={[-0.65, 0.3, 0]} material={mats.paint} radius={0.03} />
      <RB args={[0.08, 0.08, 1.2]} position={[0.65, 0.3, 0]} material={mats.paint} radius={0.03} />
      {/* engine */}
      <RB args={[0.35, 0.3, 0.35]} position={[0.4, 0.45, 0.6]} material={mats.chrome} radius={0.05} />
      <Box args={[0.2, 0.08, 0.08]} position={[0, 0.4, -1.05]} material={mats.headlight} castShadow={false} />
      <Exhaust mats={mats} positions={[[0.4, 0.4, 1.0]]} nitro={nitro} />
      <Wheels x={0.6} zf={-0.75} zr={0.75} y={0.22} r={0.22} w={0.22} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
const SHAPES = {
  sport: (p) => <RealCoupeShape {...p} variant="sport" />,
  hyper: (p) => <RealCoupeShape {...p} variant="hyper" />,
  muscle: (p) => <RealCoupeShape {...p} variant="muscle" />,
  f1: (p) => <F1Shape {...p} />,
  rally: (p) => <RallyShape {...p} />,
  suv: (p) => <SuvShape {...p} />,
  pickup: (p) => <PickupShape {...p} />,
  police: (p) => <SedanShape {...p} variant="police" />,
  taxi: (p) => <SedanShape {...p} variant="taxi" />,
  electric: (p) => <SedanShape {...p} variant="electric" />,
  classic: (p) => <ClassicShape {...p} />,
  monster: (p) => <MonsterShape {...p} />,
  limo: (p) => <LimoShape {...p} />,
  van: (p) => <VanShape {...p} />,
  bus: (p) => <BusShape {...p} />,
  gokart: (p) => <GoKartShape {...p} />,
};

export default function CarModel({ shape = "sport", color = "#e11d48", spin, steer, nitro, lightsOn = false, accent }) {
  const mats = useCarMaterials(color, { lightsOn, accent });
  const build = SHAPES[shape] || SHAPES.sport;
  return <group>{build({ mats, spin, steer, nitro })}</group>;
}
