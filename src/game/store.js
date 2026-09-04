// Mutable, frame-rate friendly game state. React reads snapshots from it via
// a light subscription (see useGameSnapshot) so the render loop never causes
// re-renders on its own.

export const LANES = [-6, -2, 2, 6];
export const ROAD_WIDTH = 17;
export const ROAD_HALF = ROAD_WIDTH / 2;

export const game = {
  status: "idle", // idle | playing | crashed | over
  playerX: 0,
  playerZ: 0,
  speed: 0, // world units per second
  maxSpeed: 60,
  nitro: 100,
  nitroActive: false,
  health: 100,
  score: 0,
  distance: 0,
  coins: 0,
  nearMisses: 0,
  combo: 0,
  comboTimer: 0,
  time: 0,
  hitFlash: 0,
  shake: 0,
  cameraMode: 0,
  events: [], // transient popups {id, text, color, x}
  best: Number(localStorage.getItem("vr_best") || 0),
};

let listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emit() {
  listeners.forEach((fn) => fn());
}

let eventId = 0;
export function pushEvent(text, color = "#00e5ff") {
  game.events.push({ id: ++eventId, text, color, t: game.time });
  if (game.events.length > 6) game.events.shift();
}

export function resetGame(car) {
  game.status = "playing";
  game.playerX = 0;
  game.playerZ = 0;
  game.speed = 0;
  game.maxSpeed = 38 + car.speed * 4.2;
  game.nitro = 100;
  game.nitroActive = false;
  game.health = 100;
  game.score = 0;
  game.distance = 0;
  game.coins = 0;
  game.nearMisses = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.time = 0;
  game.hitFlash = 0;
  game.shake = 0;
  game.events = [];
  emit();
}

export function endGame() {
  game.status = "over";
  if (game.score > game.best) {
    game.best = Math.floor(game.score);
    localStorage.setItem("vr_best", String(game.best));
  }
  emit();
}
