// Diagnoses which petals of which levels are hard to reach, using the
// game's own physics. For every petal it tries launches from the start pad
// and from points sampled around every planet's surface, on a fine grid
// (1 degree x 0.05 power), and reports the best (closest) approach per petal.
// Run: node test/diagnose.mjs [level numbers...]
import { LEVELS } from '../game/src/levels.js';
import { STEP, PETAL_RADIUS, SEED } from '../game/src/config.js';
import { makeBody, stepFlight } from '../game/src/physics.js';

const targets = process.argv.slice(2).map((n) => Number(n) - 1).filter((n) => n >= 0 && n < LEVELS.length);
const levels = targets.length > 0 ? targets : LEVELS.map((_, i) => i);

function anchorsFor(level) {
  const anchors = [{ x: level.start.x, y: level.start.y, label: 'start' }];
  for (const planet of level.planets) {
    for (let deg = 0; deg < 360; deg += 15) {
      const angle = (deg * Math.PI) / 180;
      anchors.push({
        x: planet.x + Math.cos(angle) * (planet.r + SEED.radius + 1),
        y: planet.y + Math.sin(angle) * (planet.r + SEED.radius + 1),
        label: `planet(${planet.x},${planet.y})@${deg}°`,
      });
    }
  }
  return anchors;
}

for (const levelIndex of levels) {
  const level = LEVELS[levelIndex];
  const anchors = anchorsFor(level);
  const best = level.petals.map(() => ({ distance: Infinity, from: '', launch: '' }));
  for (const anchor of anchors) {
    for (let deg = 0; deg < 360; deg += 1) {
      for (let power = 0.25; power <= 1.001; power += 0.05) {
        const body = makeBody(anchor.x, anchor.y, Math.cos((deg * Math.PI) / 180) * 1000 * power, Math.sin((deg * Math.PI) / 180) * 1000 * power);
        const collected = new Set();
        for (let step = 0; step < 300; step += 1) {
          const event = stepFlight(level, body, STEP, collected, () => {});
          level.petals.forEach((petal, index) => {
            const d = Math.hypot(body.x - petal.x, body.y - petal.y);
            if (d < best[index].distance) {
              best[index] = { distance: Math.round(d), from: anchor.label, launch: `${deg}°@${power.toFixed(2)}` };
            }
          });
          if (event) break;
        }
        // A collected petal is a 0-distance approach; record it explicitly.
        collected.forEach((index) => {
          if (best[index].distance > 0) best[index] = { distance: 0, from: anchor.label, launch: `${deg}°@${power.toFixed(2)}` };
        });
      }
    }
  }
  console.log(`\nLevel ${levelIndex + 1} ${level.name} (${level.petals.length} petals):`);
  level.petals.forEach((petal, index) => {
    const b = best[index];
    const verdict = b.distance <= PETAL_RADIUS + SEED.radius ? 'REACHABLE' : b.distance <= 60 ? 'CLOSE' : 'FAR';
    console.log(`  petal ${index} (${petal.x},${petal.y}): closest ${b.distance}px [${verdict}] from ${b.from} launch ${b.launch}`);
  });
}
