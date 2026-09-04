// Global input state shared between DOM (keyboard / touch) and the 3D loop.
export const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  nitro: false,
  // -1..1 analog steering from touch/tilt
  axis: 0,
};

const KEYMAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ShiftLeft: "nitro",
  ShiftRight: "nitro",
  Space: "nitro",
};

let bound = false;
export function bindKeyboard() {
  if (bound) return;
  bound = true;
  const down = (e) => {
    const k = KEYMAP[e.code];
    if (k) {
      input[k] = true;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    }
  };
  const up = (e) => {
    const k = KEYMAP[e.code];
    if (k) input[k] = false;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", () => {
    Object.keys(input).forEach((k) => (input[k] = k === "axis" ? 0 : false));
  });
}

export function setInput(key, value) {
  input[key] = value;
}
