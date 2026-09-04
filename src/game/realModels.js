/*
 * Real-car model registry.
 *
 * Drop GLB/glTF car files into src/assets/models/ named exactly like the
 * mapping below (e.g. viper_gt.glb), and the game will automatically load
 * the real model instead of the procedural one. Vite auto-detects which
 * files exist at build/dev time via import.meta.glob, so a missing file is
 * simply ignored (the game falls back to the built-in procedural car).
 *
 * To add your own: place <file> in src/assets/models/ and optionally add a
 * config here. You can also map a whole different file name by editing
 * `file`. Model licensing must permit redistribution in your game.
 */

import { useMemo } from "react";

export const MODEL_CONFIG = {
  // Hero cars (already have realistic procedural sculpt)
  sport: { file: "viper_gt.glb", scale: 1, rotY: 0, yOffset: 0 },
  hyper: { file: "phantom_x.glb", scale: 1, rotY: 0, yOffset: 0 },
  muscle: { file: "thunder_v8.glb", scale: 1, rotY: 0, yOffset: 0 },
  // Extended roster
  f1: { file: "apex_f1.glb", scale: 1, rotY: 0, yOffset: 0 },
  rally: { file: "dust_devil.glb", scale: 1, rotY: 0, yOffset: 0 },
  suv: { file: "ridgeback.glb", scale: 1, rotY: 0, yOffset: 0 },
  pickup: { file: "hauler.glb", scale: 1, rotY: 0, yOffset: 0 },
  police: { file: "interceptor.glb", scale: 1, rotY: 0, yOffset: 0 },
  taxi: { file: "city_cab.glb", scale: 1, rotY: 0, yOffset: 0 },
  electric: { file: "volt_s.glb", scale: 1, rotY: 0, yOffset: 0 },
  classic: { file: "retro_67.glb", scale: 1, rotY: 0, yOffset: 0 },
  monster: { file: "crusher.glb", scale: 1, rotY: 0, yOffset: 0 },
  limo: { file: "royal_stretch.glb", scale: 1, rotY: 0, yOffset: 0 },
  van: { file: "cargo_max.glb", scale: 1, rotY: 0, yOffset: 0 },
  bus: { file: "metro_liner.glb", scale: 1, rotY: 0, yOffset: 0 },
  gokart: { file: "zippy_kart.glb", scale: 1, rotY: 0, yOffset: 0 },
};

// Auto-discover model files that actually exist in the source tree.
const availableModels = import.meta.glob("../assets/models/*.glb", {
  eager: true,
  query: "?url",
  import: "default",
});

export function getModelConfig(shape) {
  const cfg = MODEL_CONFIG[shape];
  if (!cfg) return null;
  const url = availableModels[`../assets/models/${cfg.file}`];
  return url ? { ...cfg, url } : null;
}

/** Convenience hook if a component wants to know whether a real model exists. */
export function useHasRealModel(shape) {
  return useMemo(() => !!getModelConfig(shape), [shape]);
}
