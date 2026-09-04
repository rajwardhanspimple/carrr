import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

/*
 * Loads a real GLB/glTF car and returns it as-is, applying:
 *  - paint tint to materials whose node/material name matches paint/body
 *  - wheel spin to nodes whose name matches wheel/tyre/tire/rim
 *  - light-on emissive boost to headlight/taillight-named materials
 * Falls back to `fallback` (the procedural car) while loading or if missing.
 */
export default function RealModel({ url, config = {}, color = "#e11d48", spin, lightsOn = false, fallback = null }) {
  const { gl } = useThree();
  const [state, setState] = useState({ status: url ? "loading" : "missing", scene: null });
  const wheels = useRef([]);
  const prevSpin = useRef(0);

  const paintMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.25,
        roughness: 0.4,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.9,
      }),
    [color]
  );

  useEffect(() => {
    if (!url) {
      setState({ status: "missing", scene: null });
      return;
    }
    let cancelled = false;
    wheels.current = [];
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          const name = (o.name || "").toLowerCase();
          const matName = (o.material?.name || "").toLowerCase();
          if (/wheel|tyre|tire|rim/.test(name) || /wheel|tyre|tire|rim/.test(matName)) {
            wheels.current.push(o);
          }
          const isPaint =
            /paint|body|car_body|shell|bodywork|chassis/.test(name) ||
            /paint|body|car_body|shell|bodywork|chassis/.test(matName);
          if (isPaint && o.material) {
            o.material = paintMaterial.clone();
            if (o.material.map) {
              o.material.map = o.material.map;
              o.material.map.needsUpdate = true;
            }
          } else if (/headlight|head_light|front_light/.test(matName)) {
            const m = o.material;
            if (m.emissive) m.emissive.set("#fff7d6");
            m.emissiveIntensity = lightsOn ? 4 : 1.4;
          } else if (/tail|brake|rear_light/.test(matName)) {
            const m = o.material;
            if (m.emissive) m.emissive.set("#ff1a1a");
            m.emissiveIntensity = lightsOn ? 3.5 : 1.6;
          }
        });
        prevSpin.current = spin?.current || 0;
        setState({ status: "ready", scene });
      },
      undefined,
      () => {
        if (!cancelled) setState({ status: "error", scene: null });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url, paintMaterial, lightsOn, spin]);

  useFrame(() => {
    if (state.status !== "ready" || !wheels.current.length) return;
    const target = spin?.current || 0;
    const delta = target - prevSpin.current;
    prevSpin.current = target;
    if (delta === 0) return;
    wheels.current.forEach((o) => {
      o.rotation.x += delta;
    });
  });

  if (state.status !== "ready" || !state.scene) return <>{fallback}</>;

  const { scale = 1, rotX = 0, rotY = 0, rotZ = 0, yOffset = 0 } = config;
  return (
    <group rotation={[rotX, rotY, rotZ]} position={[0, yOffset, 0]} scale={scale}>
      <primitive object={state.scene} />
    </group>
  );
}
