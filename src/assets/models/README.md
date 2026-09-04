# Real car models (GLB / glTF)

Drop real car models here and the game will automatically use them instead of
the built-in procedural cars. No code changes are needed for a same-named file.

## How it works

`src/game/realModels.js` maps each game car to a file name and auto-detects
which files actually exist in this folder (via Vite `import.meta.glob`). If the
file exists, `CarModel` renders the real `<RealModel>`; otherwise it keeps using
the procedural car. So you can add models one at a time without breaking anything.

## File names (put them in this folder)

| Car | File |
| --- | --- |
| Viper GT (sport) | `viper_gt.glb` |
| Phantom X (hyper) | `phantom_x.glb` |
| Thunder V8 (muscle) | `thunder_v8.glb` |
| Apex F1 | `apex_f1.glb` |
| Dust Devil (rally) | `dust_devil.glb` |
| Ridgeback (SUV) | `ridgeback.glb` |
| Hauler 4x4 (pickup) | `hauler.glb` |
| Interceptor (police) | `interceptor.glb` |
| City Cab (taxi) | `city_cab.glb` |
| Volt S (electric) | `volt_s.glb` |
| Retro 67 (classic) | `retro_67.glb` |
| Crusher XL (monster) | `crusher.glb` |
| Royal Stretch (limo) | `royal_stretch.glb` |
| Cargo Max (van) | `cargo_max.glb` |
| Metro Liner (bus) | `metro_liner.glb` |
| Zippy Kart (go-kart) | `zippy_kart.glb` |

## Model tips

- Use **GLB (binary glTF)** — prefer one file, no external textures. If you
  have `.gltf` + `.bin` + textures, pack them into a single `.glb` (e.g. with
  Blender "Export as glTF (.glb)").
- **Facing +Z or -Z** doesn't matter much: it's often easier to fix with the
  `rotY` value in `src/game/realModels.js`.
- **Scale and ground height** may need tuning: use `scale` and `yOffset` in
  `src/game/realModels.js` so the car sits on the road.
- **Wheel spin**: meshes named like `wheel`, `tyre`, `tire`, `rim` get spun
  automatically.
- **Paint**: meshes/materials named `paint`, `body`, `car_body`, `shell`,
  `bodywork`, `chassis` are auto-tinted to the selected Garage color.
- **Licensing**: only add models you have rights to ship (CC0 / CC-BY /
  purchased asset packs). Do not commit unlicensed ripped game/car models.

## Adding a custom name / config

Edit `MODEL_CONFIG` in `src/game/realModels.js`:

```js
sport: { file: "mustang_gt.glb", scale: 1.0, rotY: 0, yOffset: 0 },
```

## Build note

Vite will bundle the `.glb` as a separate asset in `dist/`. For the dev preview
(and normal deploys) this is fine. Because the project is configured as a single
HTML file, very large models may need the singlefile inline limit raised or be
served from a real URL if you want one-file distribution.
