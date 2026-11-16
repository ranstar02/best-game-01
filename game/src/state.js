// The rules and the state machine: screens, launches, scoring, stars and
// saved progress. No drawing and no input here; the loop feeds it events and
// it answers with notifications the loop turns into sound and particles.
//
// Screens: title, levels, play, paused, clear, over, win.
// In play the seed is aiming, flying, or resting on a planet (aim again).
// A launch costs one of three launches; landing on a planet is free — the
// and lets the next launch start from there. Collect every petal to clear.

import { LAUNCHES_PER_LEVEL, SCORE, SAVE, starsForLaunches } from './config.js';
import { LEVELS } from './levels.js';
import { makeBody, stepFlight } from './physics.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_LEVELS = 'levels';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createGame(audio, particles) {
  const state = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    phase: 'aim',
    body: null,
    anchor: { x: 0, y: 0 },
    collected: new Set(),
    launchesUsed: 0,
    novaUses: 0,
    score: 0,
    levelScore: 0,
    combo: 0,
    time: 0,
    levelTime: 0,
    shake: 0,
    slowmo: 0,
    clearStars: 0,
    clearScore: 0,
    /** Best clear score per level; the campaign total is the sum of these. */
    bestScores: {},
    campaignComplete: false,
    muted: false,
    stars: {},
    totalStars: 0,
  };

  function readStars() {
    try {
      const total = Number.parseInt(window.localStorage.getItem(SAVE.totalKey) ?? '0', 10) || 0;
      state.totalStars = total;
      for (let index = 0; index < LEVELS.length; index += 1) {
        const value = Number.parseInt(window.localStorage.getItem(SAVE.starsPrefix + index) ?? '0', 10) || 0;
        if (value > 0) state.stars[index] = value;
      }
    } catch {
      // Storage off: progress lasts this visit only.
    }
  }

  function saveStars() {
    try {
      window.localStorage.setItem(SAVE.totalKey, String(state.totalStars));
      for (const [index, value] of Object.entries(state.stars)) {
        window.localStorage.setItem(SAVE.starsPrefix + index, String(value));
      }
    } catch {
      // Storage off: nothing to do.
    }
  }

  function level() {
    return LEVELS[state.levelIndex];
  }

  function isUnlocked(index) {
    if (index === 0) return true;
    return (state.stars[index - 1] ?? 0) > 0;
  }

  function startLevel(index) {
    state.levelIndex = index;
    state.screen = SCREEN_PLAY;
    state.phase = 'aim';
    state.collected = new Set();
    state.launchesUsed = 0;
    state.novaUses = 0;
    state.levelScore = 0;
    state.combo = 0;
    state.levelTime = 0;
    state.shake = 0;
    state.slowmo = 0;
    state.clearStars = 0;
    state.clearScore = 0;
    state.campaignComplete = false;
    const start = level().start;
    state.anchor = { x: start.x, y: start.y };
    state.body = makeBody(start.x, start.y, 0, 0);
  }

  function launch(velocity) {
    if (state.screen !== SCREEN_PLAY || state.phase !== 'aim') return null;
    if (state.launchesUsed >= LAUNCHES_PER_LEVEL) return null;
    state.launchesUsed += 1;
    state.novaUses = 1;
    state.combo = 0;
    state.body.vx = velocity.x;
    state.body.vy = velocity.y;
    state.phase = 'fly';
    particles.puff(state.body.x, state.body.y);
    audio.launch();
    return { type: 'launch' };
  }

  function nova() {
    if (state.screen !== SCREEN_PLAY || state.phase !== 'fly') return null;
    if (state.novaUses <= 0) return null;
    const speed = Math.hypot(state.body.vx, state.body.vy);
    if (speed < 40) return null;
    state.novaUses -= 1;
    state.body.vx += (state.body.vx / speed) * 280;
    state.body.vy += (state.body.vy / speed) * 280;
    audio.nova();
    return { type: 'nova' };
  }

  function finishClear() {
    const stars = starsForLaunches(state.launchesUsed);
    const timeBonus = Math.max(0, SCORE.maxTimeBonus - Math.floor(state.levelTime) * 5);
    const launchBonus = (LAUNCHES_PER_LEVEL - state.launchesUsed) * SCORE.unusedLaunchBonus;
    const gained = SCORE.clearBonus + timeBonus + launchBonus;
    state.clearStars = stars;
    state.clearScore = state.levelScore + gained;
    // The campaign total is the sum of each level's best clear, so replaying
    // a level - or restarting an attempt - can never inflate it.
    state.bestScores[state.levelIndex] = Math.max(state.bestScores[state.levelIndex] ?? 0, state.clearScore);
    state.score = Object.values(state.bestScores).reduce((sum, value) => sum + value, 0);
    if (stars > (state.stars[state.levelIndex] ?? 0)) {
      state.stars[state.levelIndex] = stars;
      state.totalStars = Object.values(state.stars).reduce((sum, value) => sum + value, 0);
      saveStars();
    }
    state.phase = 'done';
    state.slowmo = 0.8;
    state.campaignComplete = state.levelIndex === LEVELS.length - 1;
    state.screen = state.campaignComplete ? SCREEN_WIN : SCREEN_CLEAR;
    if (state.campaignComplete) audio.win();
    else audio.clear();
    return {
      type: 'clear',
      stars,
      score: state.clearScore,
      campaignComplete: state.campaignComplete,
    };
  }

  function finishOver() {
    state.phase = 'done';
    state.screen = SCREEN_OVER;
    audio.crash();
    return { type: 'over' };
  }

  /** Advance the flight one fixed step; returns notifications for the loop. */
  function step(dt) {
    const notes = [];
    state.time += dt;
    if (state.screen === SCREEN_PLAY) state.levelTime += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (state.slowmo > 0) state.slowmo = Math.max(0, state.slowmo - dt);
    if (state.screen !== SCREEN_PLAY || state.phase !== 'fly') return notes;

    const event = stepFlight(level(), state.body, dt, state.collected, (kind, index) => {
      if (kind === 'petal') {
        state.combo += 1;
        const points = SCORE.petal * state.combo;
        state.levelScore += points;
        particles.burst(level().petals[index].x, level().petals[index].y, '#ff9ecf');
        audio.collect(state.combo);
        notes.push({ type: 'petal', index, combo: state.combo, points });
      } else if (kind === 'pad') {
        audio.pad();
        notes.push({ type: 'pad' });
      }
    });

    if (event === 'rest') {
      state.anchor = { x: state.body.x, y: state.body.y };
      state.phase = 'aim';
      notes.push({ type: 'rest' });
    } else if (event === 'crash' || event === 'lost') {
      if (state.collected.size >= level().petals.length) {
        // The last petal was picked up on the way down: the level is won,
        // the crash never happened.
        notes.push(finishClear());
      } else {
        state.shake = 0.7;
        particles.crash(state.body.x, state.body.y);
        audio.crash();
        notes.push({ type: event === 'crash' ? 'crash' : 'lost' });
        if (state.launchesUsed >= LAUNCHES_PER_LEVEL) {
          notes.push(finishOver());
        } else {
          state.body = makeBody(state.anchor.x, state.anchor.y, 0, 0);
          state.phase = 'aim';
        }
      }
    }

    if (state.collected.size >= level().petals.length && state.screen === SCREEN_PLAY) {
      notes.push(finishClear());
    }
    return notes;
  }

  function restartLevel() {
    startLevel(state.levelIndex);
  }

  function nextLevel() {
    const next = Math.min(state.levelIndex + 1, LEVELS.length - 1);
    startLevel(next);
  }

  function pause() {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
  }

  function resume() {
    if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
  }

  function toTitle() {
    state.screen = SCREEN_TITLE;
  }

  function toLevels() {
    state.screen = SCREEN_LEVELS;
  }

  function toggleMute() {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    return state.muted;
  }

  readStars();
  try {
    state.muted = window.localStorage.getItem(SAVE.mutedKey) === '1';
    audio.setMuted(state.muted);
  } catch {
    // Storage off.
  }

  return {
    state,
    level,
    isUnlocked,
    startLevel,
    launch,
    nova,
    step,
    restartLevel,
    nextLevel,
    pause,
    resume,
    toTitle,
    toLevels,
    toggleMute,
    levelCount: LEVELS.length,
  };
}
