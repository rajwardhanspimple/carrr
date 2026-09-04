import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Materials                                                          */
/* ------------------------------------------------------------------ */
export function useCarMaterials(color, opts = {}) {
  return useMemo(() => {
    const paint = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.65,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
    });
    const paint2 = new THREE.MeshPhysicalMaterial({
      color: opts.accent || "#0f172a",
      metalness: 0.6,
      roughness: 0.3,
      clearcoat: 0.8,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#0f172a",
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 2,
    });
    const dark = new THREE.MeshStandardMaterial({ color: "#0b0f19", metalness: 0.4, roughness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: "#e5e7eb", metalness: 1, roughness: 0.15 });
    const tire = new THREE.MeshStandardMaterial({ color: "#0a0a0a", roughness: 0.95 });
    const rim = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.9, roughness: 0.25 });
    const headlight = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#fff7d6",
      emissiveIntensity: opts.lightsOn ? 4 : 1.2,
    });
    const taillight = new THREE.MeshStandardMaterial({
      color: "#7f1d1d",
      emissive: "#ff1a1a",
      emissiveIntensity: opts.lightsOn ? 3.5 : 1.5,
    });
    const flame = new THREE.MeshBasicMaterial({ color: "#60a5fa", transparent: true, opacity: 0.9 });
    const flameCore = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 });
    const yellow = new THREE.MeshStandardMaterial({ color: "#facc15", emissive: "#facc15", emissiveIntensity: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 2 });
    const blue = new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 2 });
    return { paint, paint2, glass, dark, chrome, tire, rim, headlight, taillight, flame, flameCore, yellow, red, blue };
  }, [color, opts.accent, opts.lightsOn]);
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

function Wheel({ pos, r = 0.36, w = 0.3, mats, spin, steer, front = false }) {
  const spinRef = useRef();
  const steerRef = useRef();
  useFrame(() => {
    if (spinRef.current && spin) spinRef.current.rotation.x = spin.current;
    if (steerRef.current && steer && front) steerRef.current.rotation.y = steer.current;
  });
  return (
    <group position={pos} ref={steerRef}>
      <group ref={spinRef}>
        <mesh rotation-z={Math.PI / 2} material={mats.tire} castShadow>
          <cylinderGeometry args={[r, r, w, 24]} />
        </mesh>
        <mesh rotation-z={Math.PI / 2} material={mats.rim}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, w + 0.02, 8]} />
        </mesh>
        <mesh rotation-z={Math.PI / 2} material={mats.dark}>
          <cylinderGeometry args={[r * 0.25, r * 0.25, w + 0.04, 8]} />
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
          <cylinderGeometry args={[0.08, 0.08, 0.3, 10]} />
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
      <Box args={[0.08, tall, 0.25]} position={[-w / 2 + 0.15, y + tall / 2, z]} material={mats.dark} />
      <Box args={[0.08, tall, 0.25]} position={[w / 2 - 0.15, y + tall / 2, z]} material={mats.dark} />
      <Box args={[w, 0.06, 0.45]} position={[0, y + tall, z]} material={mats.paint} />
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
      {/* chassis */}
      <Box args={[1.9, 0.45, 4.2]} position={[0, 0.5, 0]} material={mats.paint} />
      {/* sloped hood */}
      <Box args={[1.85, 0.3, 1.6]} position={[0, 0.72, -1.25]} rotation={[0.12, 0, 0]} material={mats.paint} />
      {/* rear deck */}
      <Box args={[1.85, 0.32, 1.1]} position={[0, 0.78, 1.55]} material={mats.paint} />
      {/* cabin */}
      <Box args={[1.6, 0.48, 1.9]} position={[0, 1.0, 0.15]} material={mats.glass} />
      <Box args={[1.5, 0.06, 1.2]} position={[0, 1.26, 0.2]} material={mats.paint} />
      {/* windshield slope */}
      <Box args={[1.62, 0.5, 0.1]} position={[0, 0.98, -0.85]} rotation={[0.45, 0, 0]} material={mats.glass} />
      {/* side skirts */}
      <Box args={[0.1, 0.2, 3.2]} position={[-0.98, 0.35, 0]} material={mats.dark} />
      <Box args={[0.1, 0.2, 3.2]} position={[0.98, 0.35, 0]} material={mats.dark} />
      {/* bumpers */}
      <Box args={[1.9, 0.25, 0.25]} position={[0, 0.36, -2.15]} material={mats.dark} />
      <Box args={[1.9, 0.25, 0.25]} position={[0, 0.36, 2.15]} material={mats.dark} />
      {/* grille */}
      <Box args={[1.0, 0.18, 0.06]} position={[0, 0.55, -2.22]} material={mats.dark} />
      <Lights mats={mats} x={0.68} y={0.62} zf={-2.12} zr={2.14} size={[0.4, 0.12, 0.08]} />
      {hyper ? (
        <>
          <Spoiler mats={mats} y={0.95} z={1.95} w={1.9} tall={0.45} />
          <Box args={[0.6, 0.15, 1.0]} position={[0, 1.02, 1.1]} material={mats.dark} />
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
      <Box args={[2.0, 0.55, 4.6]} position={[0, 0.58, 0]} material={mats.paint} />
      <Box args={[1.95, 0.25, 1.8]} position={[0, 0.95, -1.3]} material={mats.paint} />
      <Box args={[0.6, 0.15, 0.9]} position={[0, 1.12, -1.4]} material={mats.dark} />
      <Box args={[1.95, 0.3, 1.2]} position={[0, 0.95, 1.6]} material={mats.paint} />
      <Box args={[1.7, 0.55, 1.9]} position={[0, 1.3, 0.2]} material={mats.glass} />
      <Box args={[1.6, 0.06, 1.3]} position={[0, 1.6, 0.25]} material={mats.paint} />
      {/* racing stripes */}
      <Box args={[0.25, 0.02, 4.6]} position={[-0.3, 1.09, -0.05]} material={mats.paint2} castShadow={false} />
      <Box args={[0.25, 0.02, 4.6]} position={[0.3, 1.09, -0.05]} material={mats.paint2} castShadow={false} />
      <Box args={[2.0, 0.28, 0.3]} position={[0, 0.4, -2.35]} material={mats.chrome} />
      <Box args={[2.0, 0.28, 0.3]} position={[0, 0.4, 2.35]} material={mats.chrome} />
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
      <Box args={[0.8, 0.4, 3.6]} position={[0, 0.45, 0.2]} material={mats.paint} />
      {/* nose */}
      <Box args={[0.45, 0.25, 1.6]} position={[0, 0.4, -2.0]} rotation={[-0.05, 0, 0]} material={mats.paint} />
      {/* sidepods */}
      <Box args={[0.6, 0.35, 1.8]} position={[-0.7, 0.42, 0.5]} material={mats.paint} />
      <Box args={[0.6, 0.35, 1.8]} position={[0.7, 0.42, 0.5]} material={mats.paint} />
      {/* cockpit + halo */}
      <Box args={[0.6, 0.3, 0.7]} position={[0, 0.75, -0.2]} material={mats.dark} />
      <mesh position={[0, 0.85, -0.1]} rotation-x={Math.PI / 2} material={mats.dark}>
        <torusGeometry args={[0.4, 0.04, 8, 16, Math.PI]} />
      </mesh>
      {/* airbox */}
      <Box args={[0.4, 0.5, 0.9]} position={[0, 0.95, 0.55]} material={mats.paint} />
      <Box args={[0.35, 0.3, 0.12]} position={[0, 1.15, 0.1]} material={mats.dark} />
      {/* engine cover */}
      <Box args={[0.5, 0.35, 1.3]} position={[0, 0.65, 1.3]} rotation={[0.15, 0, 0]} material={mats.paint} />
      {/* front wing */}
      <Box args={[2.0, 0.05, 0.6]} position={[0, 0.2, -2.6]} material={mats.paint} />
      <Box args={[0.15, 0.3, 0.6]} position={[-0.95, 0.35, -2.6]} material={mats.paint2} />
      <Box args={[0.15, 0.3, 0.6]} position={[0.95, 0.35, -2.6]} material={mats.paint2} />
      {/* rear wing */}
      <Box args={[1.9, 0.06, 0.5]} position={[0, 1.05, 2.0]} material={mats.paint} />
      <Box args={[1.9, 0.06, 0.35]} position={[0, 0.85, 2.05]} material={mats.paint2} />
      <Box args={[0.06, 0.6, 0.5]} position={[-0.92, 0.75, 2.0]} material={mats.dark} />
      <Box args={[0.06, 0.6, 0.5]} position={[0.92, 0.75, 2.0]} material={mats.dark} />
      <Box args={[0.2, 0.2, 0.1]} position={[0, 0.5, 2.3]} material={mats.taillight} />
      <Exhaust mats={mats} positions={[[0, 0.55, 2.05]]} nitro={nitro} />
      <Wheels x={0.85} zf={-1.55} zr={1.35} y={0.38} r={0.38} w={0.42} mats={mats} spin={spin} steer={steer} />
      {/* suspension arms */}
      {[-1.55, 1.35].map((z) =>
        [-1, 1].map((s) => (
          <Box key={z + "" + s} args={[0.6, 0.04, 0.12]} position={[s * 0.5, 0.45, z]} material={mats.dark} />
        ))
      )}
    </>
  );
}

function RallyShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <Box args={[1.9, 0.6, 4.1]} position={[0, 0.65, 0]} material={mats.paint} />
      <Box args={[1.85, 0.25, 1.4]} position={[0, 1.05, -1.2]} rotation={[0.08, 0, 0]} material={mats.paint} />
      <Box args={[1.7, 0.6, 2.2]} position={[0, 1.25, 0.3]} material={mats.glass} />
      <Box args={[1.65, 0.06, 1.9]} position={[0, 1.58, 0.3]} material={mats.paint} />
      {/* rally livery stripe */}
      <Box args={[1.92, 0.15, 1.5]} position={[0, 0.65, 0.4]} material={mats.paint2} castShadow={false} />
      {/* roof scoop & lights pod */}
      <Box args={[0.5, 0.12, 0.5]} position={[0, 1.66, 0.0]} material={mats.dark} />
      <Box args={[1.2, 0.18, 0.15]} position={[0, 1.05, -2.0]} material={mats.dark} />
      {[-0.4, -0.13, 0.13, 0.4].map((x) => (
        <Box key={x} args={[0.18, 0.12, 0.06]} position={[x, 1.05, -2.09]} material={mats.headlight} castShadow={false} />
      ))}
      <Box args={[1.9, 0.3, 0.3]} position={[0, 0.4, -2.1]} material={mats.dark} />
      <Box args={[1.9, 0.3, 0.3]} position={[0, 0.4, 2.1]} material={mats.dark} />
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
      <Box args={[2.1, 0.7, 4.6]} position={[0, 0.85, 0]} material={mats.paint} />
      <Box args={[2.0, 0.2, 1.3]} position={[0, 1.3, -1.6]} material={mats.paint} />
      <Box args={[1.9, 0.75, 3.0]} position={[0, 1.55, 0.3]} material={mats.glass} />
      <Box args={[1.95, 0.08, 3.1]} position={[0, 1.95, 0.3]} material={mats.paint} />
      {/* roof rails */}
      <Box args={[0.08, 0.1, 2.6]} position={[-0.8, 2.03, 0.3]} material={mats.dark} />
      <Box args={[0.08, 0.1, 2.6]} position={[0.8, 2.03, 0.3]} material={mats.dark} />
      {/* pillars */}
      <Box args={[1.92, 0.75, 0.1]} position={[0, 1.55, -0.6]} material={mats.paint} />
      <Box args={[1.92, 0.75, 0.1]} position={[0, 1.55, 0.6]} material={mats.paint} />
      {/* cladding */}
      <Box args={[2.14, 0.3, 4.62]} position={[0, 0.55, 0]} material={mats.dark} />
      <Box args={[2.1, 0.35, 0.35]} position={[0, 0.5, -2.4]} material={mats.dark} />
      <Box args={[2.1, 0.35, 0.35]} position={[0, 0.5, 2.4]} material={mats.dark} />
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
      <Box args={[2.1, 0.55, 5.2]} position={[0, 0.8, 0]} material={mats.paint} />
      {/* hood */}
      <Box args={[2.05, 0.45, 1.8]} position={[0, 1.25, -1.7]} material={mats.paint} />
      {/* cab */}
      <Box args={[1.9, 0.8, 1.6]} position={[0, 1.85, -0.3]} material={mats.glass} />
      <Box args={[1.95, 0.08, 1.7]} position={[0, 2.28, -0.3]} material={mats.paint} />
      <Box args={[1.92, 0.8, 0.1]} position={[0, 1.85, 0.5]} material={mats.paint} />
      {/* bed walls */}
      <Box args={[0.1, 0.6, 2.4]} position={[-1.0, 1.35, 1.4]} material={mats.paint} />
      <Box args={[0.1, 0.6, 2.4]} position={[1.0, 1.35, 1.4]} material={mats.paint} />
      <Box args={[2.1, 0.6, 0.1]} position={[0, 1.35, 2.55]} material={mats.paint} />
      <Box args={[1.9, 0.05, 2.3]} position={[0, 1.08, 1.4]} material={mats.dark} />
      {/* cargo */}
      <Box args={[0.8, 0.5, 0.8]} position={[-0.4, 1.35, 1.2]} material={mats.paint2} />
      <Box args={[0.6, 0.4, 0.6]} position={[0.5, 1.3, 1.9]} material={mats.paint2} />
      <Box args={[2.1, 0.4, 0.4]} position={[0, 0.55, -2.65]} material={mats.chrome} />
      <Box args={[2.1, 0.35, 0.3]} position={[0, 0.55, 2.7]} material={mats.chrome} />
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
      <Box args={[1.95, 0.5, 4.6]} position={[0, 0.6, 0]} material={mats.paint} />
      <Box args={[1.9, 0.25, 1.5]} position={[0, 0.95, -1.4]} rotation={[0.06, 0, 0]} material={mats.paint} />
      <Box args={[1.9, 0.28, 1.1]} position={[0, 0.98, 1.65]} material={mats.paint} />
      <Box args={[1.7, 0.55, 2.3]} position={[0, 1.22, 0.15]} material={mats.glass} />
      <Box args={[1.65, 0.06, 1.7]} position={[0, 1.52, 0.15]} material={isPolice ? mats.paint2 : mats.paint} />
      <Box args={[1.7, 0.5, 0.1]} position={[0, 1.2, -0.9]} rotation={[0.5, 0, 0]} material={mats.glass} />
      <Box args={[1.7, 0.5, 0.1]} position={[0, 1.2, 1.2]} rotation={[-0.5, 0, 0]} material={mats.glass} />
      {isPolice && (
        <>
          <Box args={[1.96, 0.5, 1.6]} position={[0, 0.6, 0.1]} material={mats.paint2} castShadow={false} />
          <LightBar mats={mats} y={1.63} z={0.1} />
          <Box args={[2.0, 0.35, 0.2]} position={[0, 0.5, -2.45]} material={mats.dark} />
        </>
      )}
      {isTaxi && (
        <Box args={[0.7, 0.22, 0.3]} position={[0, 1.66, 0.1]} material={mats.yellow} castShadow={false} />
      )}
      {isElectric && (
        <Box args={[1.6, 0.04, 1.6]} position={[0, 1.56, 0.1]} material={mats.glass} castShadow={false} />
      )}
      <Box args={[1.95, 0.25, 0.3]} position={[0, 0.4, -2.35]} material={mats.dark} />
      <Box args={[1.95, 0.25, 0.3]} position={[0, 0.4, 2.35]} material={mats.dark} />
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
      <Box args={[1.95, 0.55, 4.7]} position={[0, 0.62, 0]} material={mats.paint} />
      <Box args={[1.8, 0.3, 1.7]} position={[0, 1.02, -1.4]} material={mats.paint} />
      <Box args={[1.8, 0.3, 1.2]} position={[0, 1.02, 1.6]} material={mats.paint} />
      <Box args={[1.6, 0.6, 2.0]} position={[0, 1.35, 0.1]} material={mats.glass} />
      <Box args={[1.65, 0.08, 1.7]} position={[0, 1.68, 0.1]} material={mats.paint2} />
      {/* fins */}
      <Box args={[0.1, 0.35, 1.4]} position={[-0.9, 1.2, 1.7]} material={mats.paint} />
      <Box args={[0.1, 0.35, 1.4]} position={[0.9, 1.2, 1.7]} material={mats.paint} />
      {/* chrome trim */}
      <Box args={[1.97, 0.06, 4.4]} position={[0, 0.9, 0]} material={mats.chrome} castShadow={false} />
      <Box args={[2.0, 0.3, 0.35]} position={[0, 0.42, -2.45]} material={mats.chrome} />
      <Box args={[2.0, 0.3, 0.35]} position={[0, 0.42, 2.45]} material={mats.chrome} />
      <Box args={[1.3, 0.3, 0.08]} position={[0, 0.75, -2.38]} material={mats.chrome} />
      {/* round headlights */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.8, -2.38]} rotation-x={Math.PI / 2} material={mats.headlight}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 16]} />
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
      <Box args={[1.6, 0.3, 4.0]} position={[0, 1.4, 0]} material={mats.dark} />
      <Box args={[2.0, 0.6, 4.4]} position={[0, 1.85, 0]} material={mats.paint} />
      <Box args={[1.95, 0.4, 1.6]} position={[0, 2.3, -1.3]} material={mats.paint} />
      <Box args={[1.8, 0.8, 1.6]} position={[0, 2.75, 0.0]} material={mats.glass} />
      <Box args={[1.85, 0.08, 1.7]} position={[0, 3.18, 0.0]} material={mats.paint} />
      <Box args={[1.6, 0.5, 1.6]} position={[0, 2.35, 1.4]} material={mats.paint} />
      {/* roof lights */}
      <Box args={[1.4, 0.15, 0.2]} position={[0, 3.3, -0.6]} material={mats.dark} />
      {[-0.5, -0.17, 0.17, 0.5].map((x) => (
        <Box key={x} args={[0.22, 0.12, 0.06]} position={[x, 3.3, -0.72]} material={mats.headlight} castShadow={false} />
      ))}
      {/* skull-ish grille & bull bar */}
      <Box args={[1.4, 0.4, 0.08]} position={[0, 2.0, -2.24]} material={mats.dark} />
      <Box args={[2.2, 0.12, 0.12]} position={[0, 1.6, -2.4]} material={mats.chrome} />
      <Box args={[0.12, 0.7, 0.12]} position={[-0.8, 1.9, -2.4]} material={mats.chrome} />
      <Box args={[0.12, 0.7, 0.12]} position={[0.8, 1.9, -2.4]} material={mats.chrome} />
      <Lights mats={mats} x={0.7} y={2.1} zf={-2.22} zr={2.22} size={[0.4, 0.2, 0.08]} />
      {/* axles */}
      <Box args={[2.8, 0.15, 0.15]} position={[0, 0.85, -1.5]} material={mats.dark} />
      <Box args={[2.8, 0.15, 0.15]} position={[0, 0.85, 1.5]} material={mats.dark} />
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
      <Box args={[1.95, 0.55, 7.0]} position={[0, 0.62, 0]} material={mats.paint} />
      <Box args={[1.9, 0.25, 1.5]} position={[0, 1.0, -2.6]} material={mats.paint} />
      <Box args={[1.9, 0.25, 1.0]} position={[0, 1.0, 2.9]} material={mats.paint} />
      <Box args={[1.7, 0.55, 4.6]} position={[0, 1.25, 0.1]} material={mats.glass} />
      <Box args={[1.72, 0.06, 4.2]} position={[0, 1.55, 0.1]} material={mats.paint} />
      {/* pillars along the windows */}
      {[-1.6, -0.5, 0.6, 1.7].map((z) => (
        <Box key={z} args={[1.72, 0.55, 0.08]} position={[0, 1.25, z]} material={mats.paint} />
      ))}
      <Box args={[1.97, 0.05, 6.8]} position={[0, 0.9, 0]} material={mats.chrome} castShadow={false} />
      <Box args={[1.95, 0.25, 0.3]} position={[0, 0.4, -3.55]} material={mats.chrome} />
      <Box args={[1.95, 0.25, 0.3]} position={[0, 0.4, 3.55]} material={mats.chrome} />
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
      <Box args={[2.1, 1.6, 5.0]} position={[0, 1.25, 0.2]} material={mats.paint} />
      {/* sloped front */}
      <Box args={[2.05, 0.9, 0.8]} position={[0, 0.9, -2.5]} material={mats.paint} />
      <Box args={[1.9, 0.7, 0.12]} position={[0, 1.75, -2.5]} rotation={[0.35, 0, 0]} material={mats.glass} />
      {/* side windows front */}
      <Box args={[2.14, 0.55, 1.1]} position={[0, 1.6, -1.6]} material={mats.glass} />
      <Box args={[2.14, 0.1, 5.0]} position={[0, 0.55, 0.2]} material={mats.dark} />
      {/* rear doors line */}
      <Box args={[0.04, 1.4, 0.05]} position={[0, 1.25, 2.72]} material={mats.dark} />
      <Box args={[2.1, 0.3, 0.3]} position={[0, 0.45, -2.85]} material={mats.dark} />
      <Box args={[2.1, 0.3, 0.3]} position={[0, 0.45, 2.75]} material={mats.dark} />
      <Box args={[1.2, 0.25, 0.06]} position={[0, 0.9, -2.9]} material={mats.dark} />
      <Lights mats={mats} x={0.78} y={1.05} zf={-2.9} zr={2.72} size={[0.35, 0.35, 0.08]} />
      <Exhaust mats={mats} positions={[[0.7, 0.35, 2.75]]} nitro={nitro} />
      <Wheels x={1.02} zf={-1.75} zr={1.6} y={0.4} r={0.4} w={0.32} mats={mats} spin={spin} steer={steer} />
    </>
  );
}

function BusShape({ mats, spin, steer, nitro }) {
  return (
    <>
      <Box args={[2.5, 2.4, 9.8]} position={[0, 1.7, 0]} material={mats.paint} />
      {/* window band */}
      <Box args={[2.54, 0.9, 8.6]} position={[0, 2.3, 0.2]} material={mats.glass} />
      <Box args={[2.2, 1.1, 0.1]} position={[0, 2.3, -4.9]} material={mats.glass} />
      <Box args={[2.2, 0.9, 0.1]} position={[0, 2.3, 4.9]} material={mats.glass} />
      {/* pillars */}
      {[-3.4, -2.2, -1.0, 0.2, 1.4, 2.6, 3.8].map((z) => (
        <Box key={z} args={[2.56, 0.9, 0.08]} position={[0, 2.3, z]} material={mats.paint} />
      ))}
      <Box args={[2.4, 0.1, 9.6]} position={[0, 2.95, 0]} material={mats.paint2} />
      <Box args={[1.6, 0.3, 3.0]} position={[0, 3.1, 0.5]} material={mats.dark} />
      {/* dark skirt & door */}
      <Box args={[2.54, 0.4, 9.8]} position={[0, 0.7, 0]} material={mats.dark} />
      <Box args={[0.05, 1.5, 1.0]} position={[1.26, 1.3, -3.6]} material={mats.dark} />
      {/* destination sign */}
      <Box args={[1.8, 0.3, 0.06]} position={[0, 2.95, -4.92]} material={mats.yellow} castShadow={false} />
      <Box args={[2.5, 0.35, 0.2]} position={[0, 0.55, -4.95]} material={mats.dark} />
      <Box args={[2.5, 0.35, 0.2]} position={[0, 0.55, 4.95]} material={mats.dark} />
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
      <Box args={[1.0, 0.1, 2.0]} position={[0, 0.25, 0]} material={mats.dark} />
      <Box args={[0.7, 0.2, 1.0]} position={[0, 0.38, -0.5]} material={mats.paint} />
      {/* seat */}
      <Box args={[0.6, 0.15, 0.6]} position={[0, 0.42, 0.4]} material={mats.paint2} />
      <Box args={[0.6, 0.6, 0.12]} position={[0, 0.75, 0.7]} rotation={[-0.2, 0, 0]} material={mats.paint2} />
      {/* driver */}
      <mesh position={[0, 0.85, 0.35]} material={mats.paint2}>
        <sphereGeometry args={[0.2, 12, 12]} />
      </mesh>
      <Box args={[0.4, 0.4, 0.3]} position={[0, 0.55, 0.4]} material={mats.paint} />
      {/* steering wheel */}
      <mesh position={[0, 0.7, -0.1]} rotation-x={-1.1} material={mats.dark}>
        <torusGeometry args={[0.14, 0.025, 8, 16]} />
      </mesh>
      {/* bumpers */}
      <Box args={[1.2, 0.08, 0.08]} position={[0, 0.3, -1.1]} material={mats.paint} />
      <Box args={[1.2, 0.08, 0.08]} position={[0, 0.3, 1.1]} material={mats.paint} />
      <Box args={[0.08, 0.08, 1.2]} position={[-0.65, 0.3, 0]} material={mats.paint} />
      <Box args={[0.08, 0.08, 1.2]} position={[0.65, 0.3, 0]} material={mats.paint} />
      {/* engine */}
      <Box args={[0.35, 0.3, 0.35]} position={[0.4, 0.45, 0.6]} material={mats.chrome} />
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
  sport: (p) => <SportShape {...p} variant="sport" />,
  hyper: (p) => <SportShape {...p} variant="hyper" />,
  muscle: (p) => <MuscleShape {...p} />,
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
