// The particle system: bursts on collect, shards on crash, puffs on launch,
// and a slow drift of dust motes over the whole garden. One list, one update,
// one draw; particles never touch the rules, only the look.

import { createRandom } from './random.js';

export function createParticles(random) {
  const list = [];

  function add(x, y, vx, vy, life, size, color, gravity) {
    list.push({ x, y, vx, vy, life, maxLife: life, size, color, gravity: gravity ?? 0 });
  }

  /** A ring of sparks when a petal is picked. */
  function burst(x, y, color) {
    for (let index = 0; index < 22; index += 1) {
      const angle = (index / 22) * Math.PI * 2 + random() * 0.4;
      const speed = 60 + random() * 220;
      add(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5 + random() * 0.5, 2 + random() * 3, color, 60);
    }
  }

  /** Shards when the seed crashes. */
  function crash(x, y) {
    for (let index = 0; index < 30; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 80 + random() * 320;
      add(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.4 + random() * 0.6, 2 + random() * 4, index % 2 ? '#ffd166' : '#ff5d5d', 140);
    }
  }

  /** A soft puff when a launch leaves the pad. */
  function puff(x, y) {
    for (let index = 0; index < 10; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 30 + random() * 90;
      add(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.4 + random() * 0.3, 2 + random() * 3, '#ffffff', -20);
    }
  }

  /** A few drifting motes, seeded across the field for ambience. */
  function seedMotes(count, width, height) {
    for (let index = 0; index < count; index += 1) {
      add(random() * width, random() * height, (random() - 0.5) * 8, -6 - random() * 10, 6 + random() * 6, 1 + random() * 2, '#ffffff', 0);
    }
  }

  function update(dt) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const particle = list[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        list.splice(index, 1);
        continue;
      }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
  }

  function draw(ctx) {
    for (const particle of list) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { burst, crash, puff, seedMotes, update, draw, list };
}
