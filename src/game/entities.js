import { game, LANES, ROAD_HALF, STAGE_LEN, pushEvent, endGame } from "./store.js";
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
    // lane-change behaviour
    laneTarget: null,
    changeTimer: rand(3, 8),
    blinker: 0,
    blinkT: 0,
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
  { id: 3, kind: "shield", x: 0, z: -1000, taken: true },
];

/* Road hazards: cones (knockable) and barriers (serious damage) */
export const OBSTACLE_COUNT = 14;
export const CONE_COUNT = 9;
export const obstacles = Array.from({ length: OBSTACLE_COUNT }, (_, i) => ({
  id: i,
  kind: i < CONE_COUNT ? "cone" : "barrier",
  lane: 0,
  x: 0,
  z: -1000,
  hit: false,
  active: false,
}));

export const RAMP_COUNT = 3;
export const ramps = Array.from({ length: RAMP_COUNT }, (_, i) => ({
  id: i,
  lane: 0,
  x: 0,
  z: -1000,
  active: false,
}));

export const BOOST_COUNT = 3;
export const boostPads = Array.from({ length: BOOST_COUNT }, (_, i) => ({
  id: i,
  lane: 0,
  x: 0,
  z: -1000,
  active: false,
  used: false,
}));

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
  airborne: false,
  vy: 0,
  airTime: 0,
};

/* ------------------------------------------------------------------ */
/*  Spawning helpers                                                   */
/* ------------------------------------------------------------------ */
function laneFree(lane, z, minGap, exclude) {
  for (const t of traffic) {
    if (!t.active || t === exclude) continue;
    if (t.lane === lane && Math.abs(t.z - z) < minGap) return false;
  }
  for (const o of obstacles) {
    if (!o.active || o === exclude) continue;
    if (o.lane === lane && Math.abs(o.z - z) < minGap) return false;
  }
  for (const r of ramps) {
    if (!r.active || r === exclude) continue;
    if (r.lane === lane && Math.abs(r.z - z) < minGap) return false;
  }
  for (const b of boostPads) {
    if (!b.active || b === exclude) continue;
    if (b.lane === lane && Math.abs(b.z - z) < minGap) return false;
  }
  return true;
}

function lanesOccupiedNear(z, window, exclude) {
  const set = new Set();
  const add = (lane, isActive, it) => {
    if (isActive && it !== exclude && Math.abs(it.z - z) < window) set.add(lane);
  };
  traffic.forEach((t) => add(t.lane, t.active, t));
  obstacles.forEach((o) => add(o.lane, o.active, o));
  ramps.forEach((r) => add(r.lane, r.active, r));
  boostPads.forEach((b) => add(b.lane, b.active, b));
  return set.size;
}

function spawnTraffic(t, minAhead = 120, maxAhead = 280) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const lane = Math.floor(Math.random() * LANES.length);
    const z = game.playerZ - rand(minAhead, maxAhead + attempt * 20);
    if (laneFree(lane, z, 22 + t.l, t) && lanesOccupiedNear(z, 28, t) < 3) {
      t.lane = lane;
      t.laneTarget = null;
      t.changeTimer = rand(3, 8);
      t.blinker = 0;
      t.x = LANES[lane] + rand(-0.3, 0.3);
      t.z = z;
      t.speed = rand(13, 26) + Math.min(14, game.distance / 900) + (game.difficulty - 1) * 6;
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

function spawnObstacle(o, minAhead = 130, maxAhead = 330) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const lane = Math.floor(Math.random() * LANES.length);
    const z = game.playerZ - rand(minAhead, maxAhead + attempt * 20);
    const gap = o.kind === "barrier" ? 30 : 24;
    if (laneFree(lane, z, gap, o) && lanesOccupiedNear(z, 26, o) < 3) {
      o.lane = lane;
      o.x = LANES[lane] + rand(-0.2, 0.2);
      o.z = z;
      o.hit = false;
      o.active = true;
      // cones often come in a pair so you weave through a chicane
      if (o.kind === "cone" && Math.random() < 0.55) {
        const other = obstacles.find((c) => c !== o && !c.active && c.kind === "cone");
        if (other) {
          const adj = lane + (Math.random() < 0.5 ? -1 : 1);
          if (adj >= 0 && adj < LANES.length && laneFree(adj, z, 20, o)) {
            other.lane = adj;
            other.x = LANES[adj] + rand(-0.2, 0.2);
            other.z = z;
            other.hit = false;
            other.active = true;
          }
        }
      }
      return true;
    }
  }
  o.active = false;
  o.z = game.playerZ - 900;
  return false;
}

function spawnRamp(r, minAhead = 480, maxAhead = 900) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const lane = Math.floor(Math.random() * LANES.length);
    const z = game.playerZ - rand(minAhead, maxAhead + attempt * 30);
    if (laneFree(lane, z, 60, r) && lanesOccupiedNear(z, 50, r) < 2) {
      r.lane = lane;
      r.x = LANES[lane];
      r.z = z;
      r.active = true;
      return true;
    }
  }
  r.active = false;
  r.z = game.playerZ - 1000;
  return false;
}

function spawnBoostPad(b, minAhead = 380, maxAhead = 760) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const lane = Math.floor(Math.random() * LANES.length);
    const z = game.playerZ - rand(minAhead, maxAhead + attempt * 30);
    if (laneFree(lane, z, 50, b) && lanesOccupiedNear(z, 40, b) < 2) {
      b.lane = lane;
      b.x = LANES[lane];
      b.z = z;
      b.used = false;
      b.active = true;
      return true;
    }
  }
  b.active = false;
  b.z = game.playerZ - 1000;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */
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
  player.airborne = false;
  player.vy = 0;
  player.airTime = 0;

  traffic.forEach((t) => {
    t.active = false;
    t.z = -1000;
  });
  obstacles.forEach((o) => {
    o.active = false;
    o.hit = false;
    o.z = -1000;
  });
  ramps.forEach((r) => (r.active = false));
  boostPads.forEach((b) => (b.active = false, b.used = false));

  traffic.slice(0, 6).forEach((t) => spawnTraffic(t, 70, 240));
  const startObstacles = Math.min(4 + Math.round(game.difficulty * 3), OBSTACLE_COUNT);
  obstacles.slice(0, startObstacles).forEach((o) => spawnObstacle(o, 180, 420));
  ramps.forEach((r) => spawnRamp(r, 500, 900));
  boostPads.forEach((b) => spawnBoostPad(b, 380, 700));
  for (let g = 0; g < COIN_GROUPS; g++) spawnCoinGroup(g);
  pickups.forEach((p) => spawnPickup(p));
}

/* ------------------------------------------------------------------ */
/*  Collision helpers                                                  */
/* ------------------------------------------------------------------ */
function absorbWithShield(side, dx, halfW) {
  // No health loss, but the shield is spent and the player is pushed aside.
  game.shields = Math.max(0, game.shields - 1);
  player.invuln = 1.2;
  game.shake = Math.max(game.shake, 0.8);
  game.hitFlash = 0.7;
  game.combo = 0;
  audio.blip(240, 0.2, "square", 0.2);
  pushEvent("SHIELD SAVED", "#60a5fa");
  player.vx = -Math.sign(dx || 1) * 9;
  game.playerX = clamp(game.playerX - Math.sign(dx || 1) * 0.4, -ROAD_HALF + halfW + 0.2, ROAD_HALF - halfW - 0.2);
  if (side) {
    game.speed *= 0.85;
  } else {
    game.speed *= 0.9;
  }
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
  const diff = game.difficulty;
  const level = game.level;

  // boost timer always ticks down
  if (game.boostTimer > 0) {
    game.boostTimer = Math.max(0, game.boostTimer - dt);
  }
  game.boostActive = game.boostTimer > 0;

  /* ---------------- Player physics ---------------- */
  if (game.status === "playing") {
    const accel = 8 + car.accel * 2.6;
    const braking = 40;
    const nitroWants = input.nitro && game.nitro > 0.5;
    game.nitroActive = nitroWants;
    const boostFactor = game.boostActive ? 1.18 : 1;
    const targetMax = game.maxSpeed * (nitroWants ? 1.45 : 1) * boostFactor;
    const minSpeed = game.maxSpeed * 0.25;

    if (input.down) {
      game.speed = Math.max(minSpeed, game.speed - braking * dt);
    } else if (game.speed < targetMax) {
      const boost = nitroWants ? 2.2 : game.boostActive ? 1.5 : input.up ? 1.35 : 1;
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
    const targetVx = steer * grip * speedFactor * (player.airborne ? 0.25 : 1);
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
    player.airborne = false;
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

  /* ---------------- Stage progression ---------------- */
  const stage = Math.floor(game.distance / STAGE_LEN) + 1;
  if (stage > game.level) {
    const cleared = stage - game.level;
    game.level = stage;
    const bonus = 500 * cleared;
    game.score += bonus;
    pushEvent(`STAGE ${stage}  +${bonus}`, "#22d3ee");
    audio.blip(880, 0.18, "square", 0.2);
  }
  game.stageProgress = game.distance % STAGE_LEN;

  /* ---------------- Jump / ramps / boost pads ---------------- */
  if (game.status === "playing") {
    if (!player.airborne) {
      for (const r of ramps) {
        if (!r.active) continue;
        if (Math.abs(game.playerX - r.x) < halfW + 1.1 && Math.abs(game.playerZ - r.z) < halfL + 2.2) {
          player.airborne = true;
          player.vy = 11 + game.speed * 0.09 + level * 0.25;
          player.airTime = 0;
          game.shake = Math.max(game.shake, 0.25);
          pushEvent("JUMP!", "#22d3ee");
          audio.blip(760, 0.14, "square", 0.18);
        }
      }
      for (const b of boostPads) {
        if (!b.active || b.used) continue;
        if (Math.abs(game.playerX - b.x) < halfW + 1.0 && Math.abs(game.playerZ - b.z) < halfL + 1.1) {
          b.used = true;
          game.boostTimer = Math.max(game.boostTimer, 2.4);
          game.score += 50;
          pushEvent("BOOST PAD +50", "#60a5fa");
          audio.pickup();
        }
      }
    }

    if (player.airborne) {
      player.vy -= 32 * dt;
      game.playerY += player.vy * dt;
      player.airTime += dt;
      if (game.playerY <= 0) {
        const air = player.airTime;
        game.playerY = 0;
        player.airborne = false;
        player.airTime = 0;
        if (air > 0.4) {
          game.stunts++;
          const bonus = 300 + Math.round(air * 250);
          game.score += bonus;
          game.combo = Math.min(10, game.combo + 1);
          game.comboTimer = 3;
          pushEvent(`STUNT +${bonus}`, "#a855f7");
          audio.blip(980, 0.2, "square", 0.22);
          game.shake = Math.max(game.shake, 0.3);
        }
      }
    } else {
      game.playerY = 0;
    }
  }

  // combo
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  // base score
  if (game.status === "playing") {
    const mult = game.nitroActive ? 2 : game.boostActive ? 1.5 : 1;
    game.score += game.speed * dt * 0.6 * mult;
  }

  /* ---------------- Traffic ---------------- */
  const wantActive = Math.min(
    TRAFFIC_COUNT,
    Math.round((6 + game.distance / 450 + (level - 1) * 1.2) * (0.85 + diff * 0.3))
  );
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

    // lane changes make traffic more alive & more challenging
    t.changeTimer -= dt;
    if (t.changeTimer <= 0) {
      t.changeTimer = rand(5, 11) / (0.7 + diff * 0.35 + level * 0.04);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const nl = clamp(t.lane + dir, 0, LANES.length - 1);
      if (nl !== t.lane && laneFree(nl, t.z, 24 + t.l, t) && lanesOccupiedNear(t.z, 20, t) < 3) {
        t.laneTarget = nl;
        t.blinker = dir;
      }
    }
    t.blinkT -= dt;
    if (t.blinkT <= 0) t.blinkT = 0.4;
    if (t.laneTarget !== null && t.laneTarget !== t.lane) {
      const tx = LANES[t.laneTarget];
      const mx = clamp(tx - t.x, -7 * dt, 7 * dt);
      t.x += mx;
      if (Math.abs(t.x - tx) < 0.2) {
        t.lane = t.laneTarget;
        t.laneTarget = null;
        t.blinker = 0;
      }
    }

    // keep traffic from rear-ending each other
    for (const o of traffic) {
      if (o === t || !o.active) continue;
      const sameCorridor = Math.abs(t.x - o.x) < (t.w + o.w) / 2 + 0.8;
      const gap = t.z - o.z; // positive: o is ahead of t
      if (sameCorridor && gap > 0 && gap < t.l / 2 + o.l / 2 + 6 && t.speed > o.speed) {
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

    if (overlapX && overlapZ && player.invuln <= 0 && game.playerY < 1.0) {
      const side = Math.abs(dx) > Math.abs(dz) * 0.5;

      if (game.shields > 0) {
        absorbWithShield(side, dx, halfW);
      } else {
        const armor = car.armor || 1;
        const rel = Math.max(0, game.speed - t.speed);
        const dmg = clamp((18 + rel * 0.9) / armor, 8, 60) * (0.8 + diff * 0.25);
        game.health -= dmg;
        game.hitFlash = 1;
        game.shake = 1;
        player.invuln = 1.4;
        game.combo = 0;
        audio.crash();
        // response
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
    }

    // near miss detection: traffic just moved behind player
    if (!t.passed && dz > halfL + t.l / 2) {
      t.passed = true;
      if (Math.abs(dx) < halfW + t.w / 2 + 1.3 && game.playerY < 1.0 && player.invuln <= 0) {
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

  /* ---------------- Obstacles ---------------- */
  game.obstacleTimer -= dt;
  if (game.obstacleTimer <= 0) {
    const activeObs = obstacles.filter((o) => o.active).length;
    const wantObs = Math.min(OBSTACLE_COUNT, Math.round((4 + level * 1.4) * (0.5 + diff * 0.5)));
    if (activeObs < wantObs) {
      const idle = obstacles.find((o) => !o.active);
      if (idle) spawnObstacle(idle, 150, 340);
    }
    const interval = Math.max(1.0, (3.6 - level * 0.22 - diff * 0.7) / diff);
    game.obstacleTimer = interval;
  }

  for (const o of obstacles) {
    if (!o.active) continue;
    if (o.z < game.playerZ - 700) {
      spawnObstacle(o);
      continue;
    }
    if (o.hit) {
      if (o.z < game.playerZ - 30) spawnObstacle(o);
      continue;
    }
    if (o.z > game.playerZ + 40) {
      spawnObstacle(o);
      continue;
    }
    if (game.status !== "playing") continue;
    if (game.playerY >= 0.8) continue; // airborne clears cones/barriers

    const dx = o.x - game.playerX;
    const dz = o.z - game.playerZ;
    const overlapX = Math.abs(dx) < halfW + (o.kind === "barrier" ? 0.65 : 0.45);
    const overlapZ = Math.abs(dz) < halfL + (o.kind === "barrier" ? 0.5 : 0.45);
    if (!overlapX || !overlapZ || player.invuln > 0) continue;

    if (o.kind === "cone") {
      o.hit = true;
      game.cones++;
      game.score += 25 * Math.max(1, game.combo);
      game.combo = Math.min(10, game.combo + 1);
      game.comboTimer = 3;
      game.speed = Math.max(game.maxSpeed * 0.25, game.speed * 0.985);
      player.invuln = 0.35;
      game.shake = Math.max(game.shake, 0.25);
      pushEvent("CONE +25", "#facc15");
      audio.blip(340, 0.1, "triangle", 0.18);
    } else {
      // barrier: heavy hit
      if (game.shields > 0) {
        absorbWithShield(true, dx || 1, halfW);
        o.hit = false;
      } else {
        const armor = car.armor || 1;
        const rel = Math.max(0, game.speed - 15);
        const dmg = clamp((25 + rel * 1.1) / armor, 18, 80) * (0.8 + diff * 0.3);
        game.health -= dmg;
        game.hitFlash = 1;
        game.shake = 1;
        player.invuln = 1.4;
        game.combo = 0;
        game.speed *= 0.55;
        player.vx = -Math.sign(dx || 1) * 8;
        audio.crash();
        pushEvent(`-${Math.round(dmg)} HP`, "#ef4444");
        if (game.health <= 0) {
          game.health = 0;
          game.status = "crashed";
          player.crashTimer = 0;
        }
      }
      game.playerX = clamp(game.playerX, -ROAD_HALF + halfW + 0.2, ROAD_HALF - halfW - 0.2);
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
    if (p.taken || p.z > game.playerZ + 20 || p.z < game.playerZ - 800) {
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
      } else if (p.kind === "repair") {
        game.health = Math.min(100, game.health + 40);
        pushEvent("+40 HP", "#22c55e");
      } else if (p.kind === "shield") {
        game.shields = Math.min(3, game.shields + 1);
        pushEvent("+1 SHIELD", "#38bdf8");
        audio.blip(1080, 0.14, "sine", 0.2);
      }
    }
  }

  /* ---------------- Ramps & boost pad recycling ---------------- */
  for (const r of ramps) {
    if (!r.active) {
      // keep trying to fill the pool if a spawn failed
      if (Math.random() < 0.03) spawnRamp(r);
      continue;
    }
    if (r.z > game.playerZ + 40 || r.z < game.playerZ - 1100) spawnRamp(r);
  }
  for (const b of boostPads) {
    if (!b.active) {
      if (Math.random() < 0.03) spawnBoostPad(b);
      continue;
    }
    if (b.z > game.playerZ + 40 || b.z < game.playerZ - 900) spawnBoostPad(b);
  }
}
