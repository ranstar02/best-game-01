// For one level, lists flights from the start pad that BOTH collect a petal
// AND end resting on a planet - the flights a rest chain is built from.
// Also lists, for each rest anchor reached, which petals a launch from
// there can still collect. Run: node test/restchain.mjs <level number>
import { LEVELS } from '../game/src/levels.js';
import { STEP, SEED } from '../game/src/config.js';
import { makeBody, stepFlight } from '../game/src/physics.js';

const levelIndex = (Number(process.argv[2]) || 1) - 1;
const level = LEVELS[levelIndex];
const found = [];
for (let deg = 0; deg < 360; deg += 1) {
  for (let power = 0.2; power <= 1.001; power += 0.05) {
    const body = makeBody(level.start.x, level.start.y, Math.cos((deg * Math.PI) / 180) * 1000 * power, Math.sin((deg * Math.PI) / 180) * 1000 * power);
    const collected = new Set();
    let outcome = 'fly';
    for (let step = 0; step < 400; step += 1) {
      const event = stepFlight(level, body, STEP, collected, () => {});
      if (event) {
        outcome = event;
        break;
      }
    }
    if (outcome === 'rest' && collected.size > 0) {
      found.push({ launch: `${deg}°@${power.toFixed(2)}`, petals: [...collected].sort((a, b) => a - b).join(','), rest: `(${Math.round(body.x)},${Math.round(body.y)})` });
    }
  }
}
console.log(`Level ${levelIndex + 1} ${level.name}: ${found.length} start flights that collect a petal and rest on a planet`);
const byPetals = new Map();
for (const f of found) {
  if (!byPetals.has(f.petals)) byPetals.set(f.petals, []);
  byPetals.get(f.petals).push(f);
}
for (const [petals, list] of [...byPetals.entries()].sort()) {
  console.log(`  collects [${petals}]: ${list.length} launches, e.g. ${list[0].launch} rests at ${list[0].rest}`);
}
if (found.length === 0) {
  // Fall back: does ANY flight from the start rest on a planet at all?
  let rests = 0;
  for (let deg = 0; deg < 360; deg += 1) {
    for (let power = 0.2; power <= 1.001; power += 0.05) {
      const body = makeBody(level.start.x, level.start.y, Math.cos((deg * Math.PI) / 180) * 1000 * power, Math.sin((deg * Math.PI) / 180) * 1000 * power);
      const collected = new Set();
      for (let step = 0; step < 400; step += 1) {
        const event = stepFlight(level, body, STEP, collected, () => {});
        if (event === 'rest') {
          rests += 1;
          break;
        }
        if (event) break;
      }
    }
  }
  console.log(`  (no collecting rest flight; ${rests} flights from the start rest on a planet at all)`);
}
