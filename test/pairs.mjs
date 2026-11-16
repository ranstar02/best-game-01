// For one level, finds which PAIRS of petals a single flight can collect,
// from the start pad and from points around every planet's surface, on a
// fine grid. A level with 4-6 petals and 3 launches needs flights that
// collect 2+ petals (or rest chains); this shows where those flights are.
// Run: node test/pairs.mjs <level number>
import { LEVELS } from '../game/src/levels.js';
import { STEP, SEED } from '../game/src/config.js';
import { makeBody, stepFlight } from '../game/src/physics.js';

const levelIndex = (Number(process.argv[2]) || 1) - 1;
const level = LEVELS[levelIndex];
const anchors = [{ x: level.start.x, y: level.start.y, label: 'start' }];
for (const planet of level.planets) {
  for (let deg = 0; deg < 360; deg += 30) {
    const angle = (deg * Math.PI) / 180;
    anchors.push({
      x: planet.x + Math.cos(angle) * (planet.r + SEED.radius + 1),
      y: planet.y + Math.sin(angle) * (planet.r + SEED.radius + 1),
      label: `planet(${planet.x},${planet.y})@${deg}°`,
    });
  }
}
const pairs = new Map(); // "i,j" -> Map<anchorLabel, {count, example}>
for (const anchor of anchors) {
  for (let deg = 0; deg < 360; deg += 1) {
    for (let power = 0.2; power <= 1.001; power += 0.05) {
      const body = makeBody(anchor.x, anchor.y, Math.cos((deg * Math.PI) / 180) * 1000 * power, Math.sin((deg * Math.PI) / 180) * 1000 * power);
      const collected = new Set();
      for (let step = 0; step < 400; step += 1) {
        const event = stepFlight(level, body, STEP, collected, () => {});
        if (collected.size >= 2) {
          const key = [...collected].sort((a, b) => a - b).join(',');
          if (!pairs.has(key)) pairs.set(key, new Map());
          const byAnchor = pairs.get(key);
          if (!byAnchor.has(anchor.label)) byAnchor.set(anchor.label, { count: 0, example: `${deg}°@${power.toFixed(2)}` });
          byAnchor.get(anchor.label).count += 1;
        }
        if (event) break;
      }
    }
  }
}
console.log(`Level ${levelIndex + 1} ${level.name}: ${level.petals.length} petals`);
if (pairs.size === 0) console.log('  NO multi-petal single flight exists from start or planet rests.');
for (const [key, byAnchor] of [...pairs.entries()].sort()) {
  const best = [...byAnchor.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3);
  const summary = best.map(([label, info]) => `${label} x${info.count} (eg ${info.example})`).join(' | ');
  console.log(`  petals [${key}] together: ${summary}`);
}
