// The screenshot scenes behind ?shot=title|play|clear|over. Each one stages a
// real game state, so the frame is what the game really looks like, and the
// same seed always gives the same frame. The play scene searches the same
// physics for a launch that collects petals, then freezes it just after the
// release so the predicted arc reads across the whole garden.

import { STEP, SCORE, LAUNCHES_PER_LEVEL } from './config.js';
import { LEVELS } from './levels.js';
import { makeBody, stepFlight, predictFlight } from './physics.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CLEAR, SCREEN_OVER } from './state.js';

/** Search launch directions and powers for the flight that collects most. */
export function findFlight(level, anchor, collected) {
  let best = null;
  for (let deg = 0; deg < 360; deg += 5) {
    for (let power = 0.3; power <= 1.001; power += 0.1) {
      const angle = (deg * Math.PI) / 180;
      const velocity = { x: Math.cos(angle) * 1000 * power, y: Math.sin(angle) * 1000 * power };
      const result = predictFlight(level, anchor, velocity, collected);
      const gained = result.collected.size - collected.size;
      const score = gained * 1000 + (result.outcome === 'rest' ? 300 : 0) + (result.outcome === 'fly' ? 50 : 0);
      if (!best || score > best.score) best = { score, velocity, result };
    }
  }
  return best;
}

/**
 * Stage a scene on the game and return the aim overlay to draw with it
 * (null when the scene has none).
 */
export function stageShot(name, game) {
  const state = game.state;
  if (name === 'play') {
    // The Ember Ring: a black hole ringed by petals, the most striking board.
    game.startLevel(4);
    const level = game.level();
    const found = findFlight(level, state.anchor, state.collected);
    if (!found) return null;
    // Fly the chosen launch a short way in, then freeze it mid-flight.
    const body = makeBody(state.anchor.x, state.anchor.y, found.velocity.x, found.velocity.y);
    const collected = new Set();
    const trail = [{ x: body.x, y: body.y }];
    let steps = 0;
    for (steps = 0; steps < 30; steps += 1) {
      const event = stepFlight(level, body, STEP, collected, null);
      trail.push({ x: body.x, y: body.y });
      if (event) break;
    }
    state.body = body;
    state.phase = 'fly';
    state.launchesUsed = 1;
    state.novaUses = 1;
    state.collected = collected;
    state.levelScore = 0;
    for (const index of collected) {
      state.levelScore += SCORE.petal;
    }
    const preview = predictFlight(level, { x: body.x, y: body.y }, { x: body.vx, y: body.vy }, collected);
    return { dragging: false, pointer: { x: body.x, y: body.y }, preview, trail };
  }

  if (name === 'clear') {
    game.startLevel(0);
    const level = game.level();
    state.collected = new Set(level.petals.map((_, index) => index));
    state.launchesUsed = 1;
    state.levelScore = 600;
    state.levelTime = 25;
    state.clearStars = 3;
    state.clearScore = 600 + SCORE.clearBonus + 175 + (LAUNCHES_PER_LEVEL - 1) * SCORE.unusedLaunchBonus;
    state.score = state.clearScore;
    state.phase = 'done';
    state.screen = SCREEN_CLEAR;
    return null;
  }

  if (name === 'over') {
    game.startLevel(2);
    state.collected = new Set([0, 1]);
    state.launchesUsed = LAUNCHES_PER_LEVEL;
    state.levelScore = 300;
    state.score = 300;
    state.phase = 'done';
    state.screen = SCREEN_OVER;
    return null;
  }

  // Anything else is the title.
  game.startLevel(0);
  state.screen = SCREEN_TITLE;
  state.phase = 'aim';
  return null;
}
