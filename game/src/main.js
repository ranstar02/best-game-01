// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The seed's trail, the aim preview and the
// slow-motion on a clear are kept here, beside the loop.
//
// ?seed=N fixes the starfield. ?shot=title|play|clear|over (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SAVE } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  createGame,
  SCREEN_TITLE,
  SCREEN_LEVELS,
  SCREEN_PLAY,
  SCREEN_PAUSED,
  SCREEN_CLEAR,
  SCREEN_OVER,
  SCREEN_WIN,
} from './state.js';
import { createRenderer } from './render.js';
import {
  createInput,
  ACTION_CONFIRM,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_MUTE,
  ACTION_NOVA,
  ACTION_NEXT,
  ACTION_BACK,
} from './input.js';
import { launchVelocity, predictFlight } from './physics.js';
import { stageShot } from './shots.js';
import { LEVELS } from './levels.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const audio = createAudio();
const particles = createParticles(random);
const game = createGame(audio, particles);
const renderer = createRenderer(canvas);
renderer.makeStarfield(createRandom(seed ^ 0x9e3779b9));
particles.seedMotes(26, 1280, 720);
const input = createInput(canvas, (x, y) => renderer.toField(x, y));

let trail = [];
let aim = null;
let time = 0;
let screenSince = performance.now();
let lastScreen = game.state.screen;

function startFirstUncleared() {
  const first = LEVELS.findIndex((_, index) => !(game.state.stars[index] > 0));
  freshLevel(() => game.startLevel(first === -1 ? 0 : first));
}

// Starting (or restarting) a level always begins with a clean trail, so the
// previous attempt's flight path never lingers over the fresh garden.
function freshLevel(run) {
  trail = [];
  run();
}

function hitButton(point) {
  return renderer.buttons().find(
    (button) => point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h,
  );
}

function handleButton(button) {
  const state = game.state;
  audio.click();
  if (button.id === 'play') startFirstUncleared();
  else if (button.id === 'levels') game.toLevels();
  else if (button.id === 'back') game.toTitle();
  else if (button.id === 'resume') game.resume();
  else if (button.id === 'restart' || button.id === 'retry' || button.id === 'replay') freshLevel(() => game.restartLevel());
  else if (button.id === 'next') {
    if (state.levelIndex < LEVELS.length - 1) freshLevel(() => game.nextLevel());
    else game.toLevels();
  } else if (button.id === 'again') freshLevel(() => game.startLevel(0));
  else if (button.id === 'pause') game.pause();
  else if (button.id === 'mute') {
    game.toggleMute();
    try {
      window.localStorage.setItem(SAVE.mutedKey, game.state.muted ? '1' : '0');
    } catch {
      // Storage off.
    }
  } else if (button.id.startsWith('level:')) {
    const index = Number(button.id.slice(6));
    if (game.isUnlocked(index)) freshLevel(() => game.startLevel(index));
  }
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const shotAim = stageShot(name, game);
  const shotTrail = shotAim && shotAim.trail ? shotAim.trail : [];
  let painted = 0;
  function paint() {
    const view = {
      game,
      aim: shotAim,
      trail: shotTrail,
      particles,
      time: 3.2,
      clearAge: 99,
    };
    renderer.draw(view);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  let pressOnButton = false;

  announce('Orbit Bloom. Press Space or click Play to start.');

  function handleActions() {
    const actions = input.takeActions();
    const state = game.state;
    if (actions & ACTION_MUTE) {
      game.toggleMute();
      try {
        window.localStorage.setItem(SAVE.mutedKey, state.muted ? '1' : '0');
      } catch {
        // Storage off.
      }
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (state.screen === SCREEN_TITLE) startFirstUncleared();
      else if (state.screen === SCREEN_CLEAR) freshLevel(() => game.nextLevel());
      else if (state.screen === SCREEN_OVER) freshLevel(() => game.restartLevel());
      else if (state.screen === SCREEN_WIN) freshLevel(() => game.startLevel(0));
      else if (state.screen === SCREEN_PAUSED) game.resume();
      else if (state.screen === SCREEN_PLAY && state.phase === 'fly') game.nova();
    }
    if (actions & ACTION_PAUSE) {
      if (state.screen === SCREEN_PLAY) game.pause();
      else if (state.screen === SCREEN_PAUSED) game.resume();
    }
    if (actions & ACTION_RESTART) {
      if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) freshLevel(() => game.restartLevel());
    }
    if (actions & ACTION_NOVA) game.nova();
    if (actions & ACTION_NEXT) {
      if (state.screen === SCREEN_CLEAR) game.nextLevel();
    }
    if (actions & ACTION_BACK) {
      if (state.screen === SCREEN_LEVELS) game.toTitle();
      else if (state.screen === SCREEN_PAUSED) game.resume();
      else if (state.screen === SCREEN_CLEAR || state.screen === SCREEN_OVER) game.toLevels();
    }
    for (const digit of input.takeDigits()) {
      if (state.screen !== SCREEN_LEVELS) continue;
      const index = digit === 0 ? 9 : digit - 1;
      if (index >= 0 && index < LEVELS.length && game.isUnlocked(index)) game.startLevel(index);
    }
  }

  function handlePointer() {
    const state = game.state;
    for (const press of input.takePresses()) {
      audio.unlock();
      pressOnButton = Boolean(hitButton(press));
    }
    for (const click of input.takeClicks()) {
      const button = hitButton(click);
      if (button) handleButton(button);
    }
    for (const release of input.takeReleases()) {
      if (pressOnButton) {
        pressOnButton = false;
        continue;
      }
      if (state.screen === SCREEN_PLAY && state.phase === 'aim') {
        const velocity = launchVelocity(state.anchor, release);
        if (velocity) {
          game.launch(velocity);
          trail = [];
        }
      }
      pressOnButton = false;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const rawDt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    time += rawDt;
    const state = game.state;
    if (state.screen !== lastScreen) {
      lastScreen = state.screen;
      screenSince = now;
      if (state.screen === SCREEN_TITLE) announce('Orbit Bloom. Press Space or click Play to start.');
      else if (state.screen === SCREEN_CLEAR) announce(`Level clear. ${state.clearStars} stars. Score ${state.clearScore}.`);
      else if (state.screen === SCREEN_OVER) announce('Out of launches. Press R or click Retry.');
      else if (state.screen === SCREEN_WIN) announce('Every garden blooms. You cleared all twelve levels.');
    }

    handleActions();
    handlePointer();

    // The aim preview while the player drags the slingshot.
    aim = null;
    if (state.screen === SCREEN_PLAY && state.phase === 'aim' && input.isDragging()) {
      const pointer = input.pointer();
      const velocity = launchVelocity(state.anchor, pointer);
      aim = {
        dragging: true,
        pointer,
        preview: velocity ? predictFlight(game.level(), state.anchor, velocity, state.collected) : null,
      };
    }

    const dt = rawDt * (state.slowmo > 0 ? 0.35 : 1);
    if (state.screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        game.step(STEP);
        accumulator -= STEP;
      }
      if (state.phase === 'fly') {
        trail.push({ x: state.body.x, y: state.body.y });
        if (trail.length > 48) trail.shift();
      }
    } else {
      accumulator = 0;
    }
    particles.update(rawDt);

    const view = {
      game,
      aim,
      trail,
      particles,
      time,
      clearAge: state.screen === SCREEN_CLEAR ? (now - screenSince) / 1000 : 99,
    };
    renderer.draw(view);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state.screen === SCREEN_PLAY) game.pause();
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
