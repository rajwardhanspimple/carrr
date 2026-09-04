import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

/* Physically-based studio reflections built locally (no network needed).
   Replaces flat/neon env maps with a neutral, high-contrast room that makes
   clearcoat car paint and chrome read like a real studio shoot. */
export default function StudioEnvironment({ intensity = 1.15 }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const tex = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      tex.dispose();
      envScene.dispose?.();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
