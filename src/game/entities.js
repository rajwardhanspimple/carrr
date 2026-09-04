import { game, LANES, ROAD_HALF, pushEvent, endGame } from "./store.js";
import { CARS, TRAFFIC_POOL, TRAFFIC_COLORS } from "./cars.js";
import { input } from "./input.js";
import { audio } from "./audio.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/*  Pools                                                              */
/* ------------------------------------------------------------------ */
export const TRAFFIC_COUNT = 14;
export const traffic = Array.from({ length: TRAFFIC_COUNT }, (_, i) => {
  const shape = TRAFFIC_POOL[i % TRAFFIC_POOL.length];
  const def = CARS.find((c) => c.id === shape);
  return {
    id: i,
    shape,
    color: TRAFFIC_COLORS[(i * 5) % TRAFFIC_COLORS.length],
    w: def.size[0],
    l: def.size[1],
    lane: 0,
    x: 0,
    z: -1000,
    speed: 20,
    bump: 0,
    active: false,
    passed: false,
    spin: { current: 0 },
    wheelR: shape === "monster" ? 0.85 : shape === "bus" || shape === "pickup" ? 0.5 : 0.38,
  };
});

export const COIN_GROUPS = 6;
export const COINS_PER_GROUP = 6;
export const coins = Array.from({ length: COIN_GROUPS * COINS_PER_GROUP }, (_, i) => ({
  id: i,
  group: Math.floor(i / COINS_PER_GROUP),
  x: 0,
  z: -1000,
  taken: true,
}));

export const pickups = [
  { id: 0, kind: "nitro", x: 0, z: -1000, taken: true },
  { id: 1, kind: "nitro", x: 0, z: -1000, taken: true },
  { id: 2, kind: "repair", x: 0, z: -1000, taken: true },
];

/* ------------------------------------------------------------------ */
/*  Player state (physics scratch)                                     */
/* ------------------------------------------------------------------ */
export const player = {
  car: CARS[0],
  vx: 0,
  invuln: 0,
  spin: { current: 0 },
  steer: { current: 0 },
  nitroRef: { current: 0 },
  roll: 0,
  yaw: 0,
  crashSpin: 0,
  crashTimer: 0,
};

/* ------------------------------------------------------------------ */
/*  Spawning helpers                                                   */
/* ------------------------------------------------------------------ */
function laneFree(lane, z, minGap, exclude) {
  for (const t of traffic) {
    if (!t.active || t === exclude) continue;
    if (t.lane === lane && Math.abs(t.z - z) < minGap) return false;
  }
  return true;
}

function lanesOccupiedNear(z, window, exclude) {
  const set = new Set();
  for (const t of traffic) {
    if (!t.active || t === exclude) continue;
    if (Math.abs(t.z - z) < window) set.add(t.lane);
  }
  return set.size;
}

function spawnTraffic(t, minAhead = 120, maxAhead = 280) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const lane = Math.floor(Math.random() * LANES.length);
    const z = game.playerZ - rand(minAhead, maxAhead + attempt * 20);
    if (laneFree(lane, z, 22 + t.l, t) && lanesOccupiedNear(z, 28, t) < 3) {
      t.lane = lane;
      t.x = LANES[lane] + rand(-0.3, 0.3);
      t.z = z;
      t.speed = rand(13, 26) + Math.min(14, game.distance / 900);
      t.passed = false;
      t.bump = 0;
      t.active = true;
      t.spin.current = 0;
      return true;
    }
  }
  t.active = false;
  t.z = game.playerZ - 900;
  return false;
}

function spawnCoinGroup(g) {
  const lane = Math.floor(Math.random() * LANES.length);
  const startZ = game.playerZ - rand(90, 240);
  const members = coins.filter((c) => c.group === g);
  // avoid stacking exactly on traffic in the lane
  members.forEach((c, i) => {
    c.x = LANES[lane];
    c.z = startZ - i * 3.4;
    c.taken = false;
  });
}

function spawnPickup(p) {
  const lane = Math.floor(Math.random() * LANES.length);
  p.x = LANES[lane];
  p.z = game.playerZ - rand(260, 520);
  p.taken = false;
}

export function initEntities(car) {
  player.car = car;
  player.vx = 0;
  player.invuln = 0;
  player.spin.current = 0;
  player.steer.current = 0;
  player.nitroRef.current = 0;
  player.roll = 0;
  player.yaw = 0;
  player.crashSpin = 0;
  player.crashTimer = 0;
  traffic.forEach((t) => {
    t.active = false;
    t.z = -1000;
  });
  traffic.slice(0, 6).forEach((t) => spawnTraffic(t, 70, 240));
  for (let g = 0; g < COIN_GROUPS; g++) spawnCoinGroup(g);
  pickups.forEach((p) => spawnPickup(p));
}

/* ------------------------------------------------------------------ */
/*  Main update                                                        */
/* ------------------------------------------------------------------ */
export function updateGame(dt) {
  if (game.status !== "playing" && game.status !== "crashed") return;
  dt = Math.min(dt, 0.05);
  game.time += dt;
  const car = player.car;
  const halfW = car.size[0] / 2;
  const halfL = car.size[1] / 2;

  /* ---------------- Player physics ---------------- */
  if (game.status === "playing") {
    const accel = 8 + car.accel * 2.6;
    const braking = 40;
    const nitroWants = input.nitro && game.nitro > 0.5;
    game.nitroActive = nitroWants;
    const targetMax = game.maxSpeed * (nitroWants ? 1.45 : 1);
    const minSpeed = game.maxSpeed * 0.25;

    if (input.down) {
      game.speed = Math.max(minSpeed, game.speed - braking * dt);
    } else if (game.speed < targetMax) {
      const boost = nitroWants ? 2.2 : input.up ? 1.35 : 1;
      game.speed = Math.min(targetMax, game.speed + accel * boost * dt);
    } else {
      game.speed = Math.max(targetMax, game.speed - 25 * dt);
    }

    if (nitroWants) {
      game.nitro = Math.max(0, game.nitro - (34 - car.nitro * 1.6) * dt);
      if (!player.nitroRef.current) audio.whoosh();
      player.nitroRef.current = 1;
    } else {
      game.nitro = Math.min(100, game.nitro + (1.5 + car.nitro * 0.25) * dt);
      player.nitroRef.current = 0;
    }

    // steering
    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    if (input.axis) steer = clamp(steer + input.axis, -1, 1);
    const grip = 9 + car.handling * 1.5;
    const speedFactor = clamp(game.speed / 25, 0.15, 1);
    const targetVx = steer * grip * speedFactor;
    player.vx += (targetVx - player.vx) * Math.min(1, dt * (5 + car.handling * 0.5));
    game.playerX += player.vx * dt;

    const limit = ROAD_HALF - halfW - 0.25;
    if (game.playerX > limit || game.playerX < -limit) {
      game.playerX = clamp(game.playerX, -limit, limit);
      player.vx *= -0.3;
      game.shake = Math.max(game.shake, 0.15);
      game.speed = Math.max(minSpeed, game.speed - 20 * dt);
    }

    player.steer.current += (-player.vx * 0.045 - player.steer.current) * Math.min(1, dt * 10);
    player.roll += (-player.vx * 0.012 - player.roll) * Math.min(1, dt * 6);
    player.yaw += (-player.vx * 0.025 - player.yaw) * Math.min(1, dt * 6);
  } else {
    // crashed: spin & slow
    game.speed = Math.max(0, game.speed - 35 * dt);
    player.crashSpin += dt * 4;
    player.vx *= 0.95;
    game.playerX = clamp(game.playerX + player.vx * dt, -ROAD_HALF + 1, ROAD_HALF - 1);
    player.crashTimer += dt;
    player.nitroRef.current = 0;
    if (player.crashTimer > 2.2) {
      endGame();
      return;
    }
  }

  game.playerZ -= game.speed * dt;
  game.distance += game.speed * dt;
  player.spin.current += (game.speed * dt) / 0.38;
  player.invuln = Math.max(0, player.invuln - dt);
  game.hitFlash = Math.max(0, game.hitFlash - dt * 2);
  game.shake = Math.max(0, game.shake - dt * 1.5);

  // combo
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  // base score
  if (game.status === "playing") {
    game.score += game.speed * dt * 0.6 * (game.nitroActive ? 2 : 1);
  }

  /* ---------------- Traffic ---------------- */
  const wantActive = Math.min(TRAFFIC_COUNT, 6 + Math.floor(game.distance / 450));
  let activeCount = 0;
  traffic.forEach((t) => t.active && activeCount++);
  if (activeCount < wantActive) {
    const idle = traffic.find((t) => !t.active);
    if (idle) spawnTraffic(idle, 160, 300);
  }

  for (const t of traffic) {
    if (!t.active) continue;
    const s = t.speed + t.bump;
    t.bump *= 1 - dt * 2;
    t.z -= s * dt;
    t.spin.current += (s * dt) / t.wheelR;

    // keep traffic from rear-ending each other
    for (const o of traffic) {
      if (o === t || !o.active || o.lane !== t.lane) continue;
      const gap = t.z - o.z; // positive: o is ahead of t
      if (gap > 0 && gap < t.l / 2 + o.l / 2 + 6 && t.speed > o.speed) {
        t.speed = o.speed;
      }
    }

    // recycle when far behind or far ahead
    if (t.z > game.playerZ + 40 || t.z < game.playerZ - 700) {
      spawnTraffic(t);
      continue;
    }

    if (game.status !== "playing") continue;

    const dx = t.x - game.playerX;
    const dz = t.z - game.playerZ;
    const overlapX = Math.abs(dx) < halfW + t.w / 2;
    const overlapZ = Math.abs(dz) < halfL + t.l / 2;

    if (overlapX && overlapZ && player.invuln <= 0) {
      const armor = car.armor || 1;
      const rel = Math.max(0, game.speed - t.speed);
      const dmg = clamp((18 + rel * 0.9) / armor, 8, 60);
      game.health -= dmg;
      game.hitFlash = 1;
      game.shake = 1;
      player.invuln = 1.4;
      game.combo = 0;
      audio.crash();
      // response
      const side = Math.abs(dx) > Math.abs(dz) * 0.5;
      if (side) {
        player.vx = -Math.sign(dx) * 9;
        game.playerX -= Math.sign(dx) * 0.4;
        game.speed *= 0.8;
      } else {
        game.speed = Math.min(game.speed, t.speed * 0.6);
        t.bump += 18;
      }
      pushEvent(`-${Math.round(dmg)} HP`, "#ef4444");
      if (game.health <= 0) {
        game.health = 0;
        game.status = "crashed";
        player.crashTimer = 0;
        break;
      }
    }

    // near miss detection: traffic just moved behind player
    if (!t.passed && dz > halfL + t.l / 2) {
      t.passed = true;
      if (Math.abs(dx) < halfW + t.w / 2 + 1.3 && player.invuln <= 0) {
        game.combo = Math.min(10, game.combo + 1);
        game.comboTimer = 3;
        game.nearMisses++;
        const bonus = 100 * game.combo;
        game.score += bonus;
        game.nitro = Math.min(100, game.nitro + 6);
        pushEvent(`NEAR MISS +${bonus}`, "#facc15");
        audio.blip(660, 0.1, "square", 0.12);
      }
    }
  }

  /* ---------------- Coins ---------------- */
  for (let g = 0; g < COIN_GROUPS; g++) {
    const members = coins.filter((c) => c.group === g);
    let allBehind = true;
    for (const c of members) {
      if (!c.taken) {
        const dx = c.x - game.playerX;
        const dz = c.z - game.playerZ;
        if (game.status === "playing" && Math.abs(dx) < halfW + 0.7 && Math.abs(dz) < halfL + 0.8) {
          c.taken = true;
          game.coins++;
          game.combo = Math.min(10, game.combo + 1);
          game.comboTimer = 3;
          game.score += 25 * Math.max(1, game.combo);
          audio.coin();
        }
      }
      if (c.z < game.playerZ + 20) allBehind = false;
    }
    if (allBehind || members.every((c) => c.taken)) spawnCoinGroup(g);
  }

  /* ---------------- Pickups ---------------- */
  for (const p of pickups) {
    if (p.taken || p.z > game.playerZ + 20) {
      spawnPickup(p);
      continue;
    }
    const dx = p.x - game.playerX;
    const dz = p.z - game.playerZ;
    if (game.status === "playing" && Math.abs(dx) < halfW + 0.9 && Math.abs(dz) < halfL + 0.9) {
      p.taken = true;
      audio.pickup();
      if (p.kind === "nitro") {
        game.nitro = 100;
        pushEvent("NITRO REFILLED", "#60a5fa");
      } else {
        game.health = Math.min(100, game.health + 40);
        pushEvent("+40 HP", "#22c55e");
      }
    }
  }
}
