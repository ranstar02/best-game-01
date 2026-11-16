// The flight model, pure and deterministic: the game, the aim preview, the
// screenshot autopilot and the Node solvability test all run this same code.
// A flight body is { x, y, vx, vy, time, padCooldown, restPlanet }.
// stepFlight advances it one fixed step and reports what happened:
//   null   - still flying
//   'rest' - landed on a planet (the seed may launch again from there)
//   'crash'- hit a planet too hard, a thorn or a black hole
//   'lost' - flew off the field

import { FIELD, GRAV, SEED, PETAL_RADIUS, PAD, STEP } from './config.js';

/** Gravity (planets, black holes) plus wind at a point, in pixels per second squared. */
export function gravityAt(level, x, y) {
  let ax = 0;
  let ay = 0;
  for (const planet of level.planets) {
    const dx = planet.x - x;
    const dy = planet.y - y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 0.001;
    const a = Math.min((GRAV * planet.mass) / d2, 1600);
    ax += (a * dx) / d;
    ay += (a * dy) / d;
  }
  for (const hole of level.holes) {
    const dx = hole.x - x;
    const dy = hole.y - y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 0.001;
    const a = Math.min(hole.pull / d2, 2400);
    ax += (a * dx) / d;
    ay += (a * dy) / d;
  }
  if (level.wind) {
    ax += level.wind.x;
    ay += level.wind.y;
  }
  return { ax, ay };
}

/**
 * Advance one fixed step. `collected` is a Set of petal indexes already taken;
 * `onEvent` hears ('petal', index) and ('pad', pad). Mutates and returns the body.
 */
export function stepFlight(level, body, dt, collected, onEvent) {
  const { ax, ay } = gravityAt(level, body.x, body.y);
  body.vx += ax * dt;
  body.vy += ay * dt;
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > SEED.speedCap) {
    body.vx *= SEED.speedCap / speed;
    body.vy *= SEED.speedCap / speed;
  }
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.time += dt;

  for (let index = 0; index < level.petals.length; index += 1) {
    if (collected.has(index)) continue;
    const petal = level.petals[index];
    if (Math.hypot(petal.x - body.x, petal.y - body.y) < PETAL_RADIUS + SEED.radius) {
      collected.add(index);
      if (onEvent) onEvent('petal', index);
    }
  }

  if (body.padCooldown > 0) {
    body.padCooldown -= dt;
  } else {
    for (const pad of level.pads) {
      const dx = body.x - pad.x;
      const dy = body.y - pad.y;
      const d = Math.hypot(dx, dy);
      if (d < pad.r + SEED.radius && d > 0.001) {
        const nx = dx / d;
        const ny = dy / d;
        const dot = body.vx * nx + body.vy * ny;
        if (dot < 0) {
          body.vx = (body.vx - 2 * dot * nx) * PAD.boost;
          body.vy = (body.vy - 2 * dot * ny) * PAD.boost;
          const after = Math.hypot(body.vx, body.vy);
          if (after < PAD.minSpeed) {
            body.vx *= PAD.minSpeed / after;
            body.vy *= PAD.minSpeed / after;
          }
          body.padCooldown = 0.3;
          if (onEvent) onEvent('pad', pad);
          break;
        }
      }
    }
  }

  // Planets are safe gardens: any touch rests the seed on the surface, and
  // the next launch starts from there. Only thorns and black holes kill.
  for (const planet of level.planets) {
    const dx = body.x - planet.x;
    const dy = body.y - planet.y;
    const d = Math.hypot(dx, dy);
    if (d < planet.r + SEED.radius) {
      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      body.x = planet.x + nx * (planet.r + SEED.radius);
      body.y = planet.y + ny * (planet.r + SEED.radius);
      body.vx = 0;
      body.vy = 0;
      body.restPlanet = planet;
      return 'rest';
    }
  }

  for (const thorn of level.thorns) {
    if (Math.hypot(thorn.x - body.x, thorn.y - body.y) < thorn.r + SEED.radius) return 'crash';
  }

  for (const hole of level.holes) {
    if (Math.hypot(hole.x - body.x, hole.y - body.y) < hole.r + SEED.radius) return 'crash';
  }

  if (body.x < -90 || body.x > FIELD.width + 90 || body.y < -90 || body.y > FIELD.height + 90) {
    return 'lost';
  }
  return null;
}

/** A fresh flight body at a position with a velocity. */
export function makeBody(x, y, vx, vy) {
  return { x, y, vx, vy, time: 0, padCooldown: 0, restPlanet: null };
}

/**
 * The slingshot: pull back from the anchor toward the pointer, release to fly
 * the other way. Returns null for a pull too short to bother with.
 */
export function launchVelocity(anchor, pointer) {
  const dx = pointer.x - anchor.x;
  const dy = pointer.y - anchor.y;
  const len = Math.hypot(dx, dy);
  if (len < 20) return null;
  const clamped = Math.min(len, SEED.maxPull);
  const scale = (SEED.maxSpeed / SEED.maxPull) * (clamped / len);
  return { x: -dx * scale, y: -dy * scale };
}

/**
 * Simulate a flight and return where it goes: the dotted path, how it ends
 * ('fly', 'rest', 'crash' or 'lost') and which petals it would collect.
 * Never touches the game's own collected set.
 */
export function predictFlight(level, from, velocity, alreadyCollected) {
  const body = makeBody(from.x, from.y, velocity.x, velocity.y);
  const collected = new Set(alreadyCollected);
  const points = [];
  let outcome = 'fly';
  for (let step = 0; step < 300; step += 1) {
    const event = stepFlight(level, body, STEP, collected, null);
    points.push({ x: body.x, y: body.y });
    if (event === 'rest' || event === 'crash' || event === 'lost') {
      outcome = event;
      break;
    }
  }
  return { points, outcome, collected };
}
