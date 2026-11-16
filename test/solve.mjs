// Proves every level of Orbit Bloom is clearable within 3 launches, using
// the game's own physics. A breadth-first search over rest states: from a
// rest position (the start pad or a planet's surface) try every launch
// direction and power; a flight may collect petals, land softly on a planet
// (a new rest position, same launch count spent) or crash (back to the old
// rest position). Petals stay collected across launches, as in the game.
// Run: node test/solve.mjs
import { LEVELS } from '../game/src/levels.js';
import { STEP } from '../game/src/config.js';
import { makeBody, stepFlight } from '../game/src/physics.js';

const ANGLES = [];
for (let deg = 0; deg < 360; deg += 2) ANGLES.push((deg * Math.PI) / 180);
const POWERS = [];
for (let power = 0.2; power <= 1.001; power += 0.05) POWERS.push(power);

/** Simulate one flight; returns the petals it collected and where it ended. */
function fly(level, anchor, velocity, collectedMask) {
  const body = makeBody(anchor.x, anchor.y, velocity.x, velocity.y);
  let mask = collectedMask;
  let outcome = 'fly';
  for (let step = 0; step < 400; step += 1) {
    const collected = new Set();
    for (let index = 0; index < level.petals.length; index += 1) {
      if (mask & (1 << index)) collected.add(index);
    }
    const event = stepFlight(level, body, STEP, collected, (kind, index) => {
      if (kind === 'petal') mask |= 1 << index;
    });
    if (event === 'rest' || event === 'crash' || event === 'lost') {
      outcome = event;
      break;
    }
  }
  return { mask, outcome, anchor: { x: body.x, y: body.y } };
}

function solveLevel(levelIndex) {
  const level = LEVELS[levelIndex];
  const full = (1 << level.petals.length) - 1;
  const start = { x: level.start.x, y: level.start.y };
  // A rest state is an anchor cell (16 px grid) plus the petals taken so far.
  const key = (anchor, mask) => `${Math.round(anchor.x / 16)},${Math.round(anchor.y / 16)}|${mask}`;
  const queue = [{ anchor: start, mask: 0, launches: 0, path: [] }];
  const seen = new Set([key(start, 0)]);
  let examined = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.mask === full) {
      return { solved: true, launches: current.launches, path: current.path, examined };
    }
    if (current.launches >= 3) continue;
    for (const angle of ANGLES) {
      for (const power of POWERS) {
        const velocity = { x: Math.cos(angle) * 1000 * power, y: Math.sin(angle) * 1000 * power };
        examined += 1;
        const result = fly(level, current.anchor, velocity, current.mask);
        if (result.mask === current.mask && result.outcome !== 'rest') continue;
        const nextAnchor = result.outcome === 'rest' ? result.anchor : current.anchor;
        const nextKey = key(nextAnchor, result.mask);
        if (seen.has(nextKey)) continue;
        seen.add(nextKey);
        queue.push({
          anchor: nextAnchor,
          mask: result.mask,
          launches: current.launches + 1,
          path: [...current.path, { angle: Math.round((angle * 180) / Math.PI), power: Math.round(power * 100) / 100, outcome: result.outcome, petals: result.mask }],
        });
      }
    }
  }
  return { solved: false, examined };
}

let allSolved = true;
const wanted = process.argv.slice(2).map((n) => Number(n) - 1).filter((n) => n >= 0 && n < LEVELS.length);
const targets = wanted.length > 0 ? wanted : LEVELS.map((_, i) => i);
for (const index of targets) {
  const started = Date.now();
  const result = solveLevel(index);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.solved) {
    const launches = result.path.map((step) => `${step.angle}°@${step.power}→${step.outcome}`).join(' | ');
    console.log(`Level ${index + 1} ${LEVELS[index].name}: SOLVED in ${result.launches} launch(es) (${seconds}s, ${result.examined} sims)\n  ${launches}`);
  } else {
    allSolved = false;
    console.log(`Level ${index + 1} ${LEVELS[index].name}: NOT SOLVED (${seconds}s, ${result.examined} sims)`);
  }
}
console.log(allSolved ? 'ALL LEVELS SOLVABLE' : 'SOME LEVELS UNSOLVABLE');
process.exit(allSolved ? 0 : 1);
