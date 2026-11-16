// All canvas drawing: the garden, the seed, the HUD and every screen.
// One job: turn the game state into a picture. Nothing here changes the
// rules; the renderer only reads state and draws it, and reports the buttons
// it drew so the loop can hit-test clicks against them.

import { FIELD, WORLDS, LAUNCHES_PER_LEVEL, SCORE } from './config.js';
import { LEVELS } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_LEVELS = 'levels';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT_TITLE = '800 92px "Trebuchet MS", Verdana, sans-serif';
const FONT_BIG = '800 44px "Trebuchet MS", Verdana, sans-serif';
const FONT_MED = '700 26px "Trebuchet MS", Verdana, sans-serif';
const FONT_SMALL = '600 18px "Trebuchet MS", Verdana, sans-serif';
const FONT_TINY = '600 15px "Trebuchet MS", Verdana, sans-serif';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let buttons = [];
  let starfield = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function toField(clientX, clientY) {
    return { x: (clientX * (window.devicePixelRatio || 1) - offsetX) / scale, y: (clientY * (window.devicePixelRatio || 1) - offsetY) / scale };
  }

  function makeStarfield(random) {
    starfield = [];
    for (let index = 0; index < 130; index += 1) {
      starfield.push({
        x: random() * FIELD.width,
        y: random() * FIELD.height,
        r: 0.6 + random() * 1.6,
        phase: random() * Math.PI * 2,
        speed: 0.5 + random() * 1.5,
      });
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky(world, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, world.sky[0]);
    gradient.addColorStop(1, world.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of starfield) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = twinkle * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Two soft nebula glows, fixed in the field.
    const nebula = (x, y, r, color) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    nebula(1050, 130, 260, 'rgba(255,158,207,0.10)');
    nebula(180, 620, 300, 'rgba(143,211,255,0.08)');
  }

  function drawWind(level, time) {
    if (!level.wind) return;
    const angle = Math.atan2(level.wind.y, level.wind.x);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 9; index += 1) {
      const baseX = ((index * 173 + time * 60) % 1400) - 60;
      const baseY = 90 + ((index * 97) % 540);
      const len = 26;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX + Math.cos(angle) * len, baseY + Math.sin(angle) * len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(baseX + Math.cos(angle) * len, baseY + Math.sin(angle) * len);
      ctx.lineTo(
        baseX + Math.cos(angle) * len - Math.cos(angle - 0.5) * 9,
        baseY + Math.sin(angle) * len - Math.sin(angle - 0.5) * 9,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlanet(planet, world, time) {
    // Faint gravity ring, so the player can feel the well before flying in.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r * 2.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // The sphere itself.
    const glow = ctx.createRadialGradient(planet.x, planet.y, planet.r * 0.2, planet.x, planet.y, planet.r * 1.9);
    glow.addColorStop(0, world.planet + '55');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    const body = ctx.createRadialGradient(
      planet.x - planet.r * 0.35, planet.y - planet.r * 0.4, planet.r * 0.1,
      planet.x, planet.y, planet.r,
    );
    body.addColorStop(0, world.planet);
    body.addColorStop(1, world.planetDark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
    ctx.fill();
    // Craters, fixed by position so they never jump.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    const craters = [
      [-0.3, -0.2, 0.22],
      [0.25, 0.3, 0.16],
      [0.35, -0.35, 0.12],
      [-0.05, 0.45, 0.14],
    ];
    for (const [cx, cy, cr] of craters) {
      ctx.beginPath();
      ctx.arc(planet.x + cx * planet.r, planet.y + cy * planet.r, cr * planet.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHole(hole, time) {
    ctx.save();
    const spin = time * 2.2;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.85;
    for (let ring = 0; ring < 2; ring += 1) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.25) {
        const r = hole.r + 10 + ring * 9 + Math.sin(a * 3 + spin + ring * 2) * 3;
        const x = hole.x + Math.cos(a) * r;
        const y = hole.y + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPad(pad, time) {
    ctx.save();
    const bob = Math.sin(time * 2 + pad.x) * 2;
    ctx.translate(pad.x, pad.y + bob);
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(0, -6, pad.r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(-pad.r * 0.4, -pad.r * 0.55, pad.r * 0.18, 0, Math.PI * 2);
    ctx.arc(pad.r * 0.35, -pad.r * 0.7, pad.r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(-4, -6, 8, 12);
    ctx.restore();
  }

  function drawThorn(thorn, time) {
    ctx.save();
    ctx.translate(thorn.x, thorn.y);
    ctx.rotate(Math.sin(time * 0.8 + thorn.x) * 0.08);
    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const outer = thorn.r + 9;
      const inner = thorn.r - 2;
      const a1 = angle;
      const a2 = angle + Math.PI / 12;
      ctx.lineTo(Math.cos(a1) * outer, Math.sin(a1) * outer);
      ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.arc(0, 0, thorn.r - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPetal(petal, world, time, index) {
    const bob = Math.sin(time * 2 + index * 1.3) * 4;
    const spin = time * 0.6 + index;
    ctx.save();
    ctx.translate(petal.x, petal.y + bob);
    ctx.shadowColor = world.petal;
    ctx.shadowBlur = 18;
    ctx.fillStyle = world.petal;
    for (let leaf = 0; leaf < 5; leaf += 1) {
      ctx.save();
      ctx.rotate(spin + (leaf / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -11, 6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSeed(x, y, time) {
    ctx.save();
    const pulse = 1 + Math.sin(time * 5) * 0.08;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 24;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 22 * pulse);
    glow.addColorStop(0, '#fefce8');
    glow.addColorStop(0.45, '#fde047');
    glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrail(trail) {
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 1; index < trail.length; index += 1) {
      const alpha = (index / trail.length) * 0.7;
      ctx.strokeStyle = `rgba(253,224,71,${alpha})`;
      ctx.lineWidth = 1 + (index / trail.length) * 4;
      ctx.beginPath();
      ctx.moveTo(trail[index - 1].x, trail[index - 1].y);
      ctx.lineTo(trail[index].x, trail[index].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAim(view) {
    const { game, aim } = view;
    if (!aim) return;
    const anchor = game.state.anchor;
    const pointer = aim.pointer;
    ctx.save();
    if (aim.dragging) {
      const dx = pointer.x - anchor.x;
      const dy = pointer.y - anchor.y;
      const len = Math.hypot(dx, dy);
      if (len >= 4) {
        // Slingshot band.
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
        // Power ring around the seed.
        const power = Math.min(len, 260) / 260;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 26, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
        ctx.stroke();
      }
    }
    // Predicted flight, dotted, coloured by how it ends.
    if (aim.preview) {
      const color = aim.preview.outcome === 'rest' ? '#4ade80' : aim.preview.outcome === 'fly' ? '#ffffff' : '#f87171';
      ctx.fillStyle = color;
      for (let index = 0; index < aim.preview.points.length; index += 3) {
        const point = aim.preview.points[index];
        const alpha = Math.max(0.15, 1 - index / aim.preview.points.length);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(point.x, point.y, index % 12 === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const end = aim.preview.points[aim.preview.points.length - 1];
      if (end) {
        // The outcome label sits at the bottom, clear of the HUD and of the
        // trajectory itself (the trajectory often ends off-screen, where a
        // label would collide with the score).
        ctx.font = FONT_TINY;
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        const label = aim.preview.outcome === 'rest' ? 'Lands on a planet — launch again from there' : aim.preview.outcome === 'crash' ? 'Crash!' : aim.preview.outcome === 'lost' ? 'Flies away!' : '';
        if (label) ctx.fillText(label, FIELD.width / 2, FIELD.height - 52);
      }
    }
    ctx.restore();
  }

  function drawHud(view) {
    const { game } = view;
    const state = game.state;
    const level = LEVELS[state.levelIndex];
    const world = WORLDS[level.world];
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Top-left: level name.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = FONT_MED;
    ctx.fillText(`Level ${state.levelIndex + 1} · ${level.name}`, 24, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = FONT_TINY;
    ctx.fillText(world.name, 24, 66);
    // Top-centre: petal pips.
    const total = level.petals.length;
    const pipWidth = 30;
    const startX = FIELD.width / 2 - (total * pipWidth) / 2;
    for (let index = 0; index < total; index += 1) {
      const x = startX + index * pipWidth + 15;
      const taken = state.collected.has(index);
      ctx.fillStyle = taken ? world.petal : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(x, 36, 10, 0, Math.PI * 2);
      ctx.fill();
      if (taken) {
        ctx.fillStyle = '#fff7ed';
        ctx.beginPath();
        ctx.arc(x, 36, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Top-right: score, launches, buttons.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = FONT_MED;
    ctx.fillText(`Score ${state.levelScore}`, FIELD.width - 130, 42);
    for (let index = 0; index < LAUNCHES_PER_LEVEL; index += 1) {
      const x = FIELD.width - 116 + index * 26;
      ctx.fillStyle = index < LAUNCHES_PER_LEVEL - state.launchesUsed ? '#fde047' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(x, 66, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = FONT_TINY;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(state.launchesUsed >= LAUNCHES_PER_LEVEL ? 'no launches left' : `${LAUNCHES_PER_LEVEL - state.launchesUsed} launch${LAUNCHES_PER_LEVEL - state.launchesUsed === 1 ? '' : 'es'} left`, FIELD.width - 24, 92);
    // Pause and mute buttons, only while playing.
    if (state.screen === SCREEN_PLAY) {
      buttons.push({ id: 'pause', x: FIELD.width - 108, y: 104, w: 36, h: 36, label: 'II' });
      buttons.push({ id: 'mute', x: FIELD.width - 64, y: 104, w: 36, h: 36, label: state.muted ? '✕' : '♪' });
      for (const button of buttons.slice(-2)) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        roundRect(button.x, button.y, button.w, button.h, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = FONT_SMALL;
        ctx.textAlign = 'center';
        ctx.fillText(button.label, button.x + button.w / 2, button.y + 25);
      }
    }
    // Combo flash.
    if (state.combo >= 2 && state.phase === 'fly') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.font = FONT_BIG;
      ctx.fillText(`COMBO ×${state.combo}`, FIELD.width / 2, 130);
    }
    // Aim hint.
    if (state.phase === 'aim' && state.screen === SCREEN_PLAY) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = FONT_SMALL;
      ctx.fillText('Drag to aim, release to launch · Space mid-flight = Nova burst · R = restart', FIELD.width / 2, FIELD.height - 22);
    }
    ctx.restore();
  }

  function drawButton(button, big = false) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(button.x, button.y, button.w, button.h, 12);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.font = big ? FONT_MED : FONT_SMALL;
    ctx.textAlign = 'center';
    ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + (big ? 9 : 7));
    ctx.restore();
  }

  function drawPanel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,32,0.82)';
    roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 20);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorld(view) {
    const { game, time } = view;
    const level = LEVELS[game.state.levelIndex];
    const world = WORLDS[level.world];
    drawSky(world, time);
    drawWind(level, time);
    for (const planet of level.planets) drawPlanet(planet, world, time);
    for (const hole of level.holes) drawHole(hole, time);
    for (const pad of level.pads) drawPad(pad, time);
    for (const thorn of level.thorns) drawThorn(thorn, time);
    level.petals.forEach((petal, index) => {
      if (!view.hidePetals && !game.state.collected.has(index)) drawPetal(petal, world, time, index);
    });
  }

  function drawTitle(view) {
    const { game } = view;
    // The garden behind the title, without its petals: petals sit in the
    // same band as the instructions and would fight the text.
    drawWorld({ ...view, hidePetals: true });
    // Dim the garden so the title text reads over it.
    ctx.fillStyle = 'rgba(7, 11, 38, 0.42)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff9ecf';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT_TITLE;
    ctx.fillText('ORBIT BLOOM', FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde68a';
    ctx.font = FONT_MED;
    ctx.fillText('Guide a seed of light through the gravity gardens', FIELD.width / 2, 268);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = FONT_SMALL;
    ctx.fillText('Drag to aim, release to launch · Land on planets to hop further', FIELD.width / 2, 306);
    ctx.fillText('Collect every petal to bloom the level · Mind the thorns and black holes', FIELD.width / 2, 334);
    const total = game.state.totalStars;
    ctx.fillStyle = '#fde047';
    ctx.font = FONT_MED;
    ctx.fillText(total > 0 ? `★ ${total} / ${LEVELS.length * 3} stars bloomed` : 'A new garden awaits — 12 levels, 3 worlds', FIELD.width / 2, 392);
    const play = { id: 'play', x: FIELD.width / 2 - 220, y: 440, w: 200, h: 58, label: '▶  Play' };
    const levelsBtn = { id: 'levels', x: FIELD.width / 2 + 20, y: 440, w: 200, h: 58, label: 'Levels' };
    buttons.push(play, levelsBtn);
    drawButton(play, true);
    drawButton(levelsBtn, true);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = FONT_TINY;
    ctx.fillText('Space to start · M to mute · Best played with sound on', FIELD.width / 2, 540);
    ctx.restore();
  }

  function drawLevels(view) {
    const { game } = view;
    drawSky(WORLDS[0], view.time);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT_BIG;
    ctx.fillText('Choose a garden', FIELD.width / 2, 96);
    const cols = 4;
    const cardW = 250;
    const cardH = 118;
    const gapX = 28;
    const gapY = 24;
    const originX = (FIELD.width - (cols * cardW + (cols - 1) * gapX)) / 2;
    const originY = 140;
    for (let index = 0; index < LEVELS.length; index += 1) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = originX + col * (cardW + gapX);
      const y = originY + row * (cardH + gapY);
      const unlocked = game.isUnlocked(index);
      const stars = game.state.stars[index] ?? 0;
      const button = { id: `level:${index}`, x, y, w: cardW, h: cardH, label: LEVELS[index].name };
      buttons.push(button);
      ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)';
      roundRect(x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      roundRect(x, y, cardW, cardH, 14);
      ctx.stroke();
      ctx.fillStyle = unlocked ? '#ffffff' : 'rgba(255,255,255,0.35)';
      ctx.font = FONT_MED;
      ctx.fillText(`${index + 1}. ${LEVELS[index].name}`, x + cardW / 2, y + 44);
      ctx.font = FONT_SMALL;
      ctx.fillStyle = unlocked ? '#fde047' : 'rgba(255,255,255,0.35)';
      ctx.fillText(unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒 locked', x + cardW / 2, y + 80);
    }
    const back = { id: 'back', x: FIELD.width / 2 - 100, y: 580, w: 200, h: 52, label: '← Back' };
    buttons.push(back);
    drawButton(back, true);
    ctx.restore();
  }

  function drawPaused(view) {
    drawWorld(view);
    drawHud(view);
    ctx.save();
    drawPanel(FIELD.width / 2 - 260, 220, 520, 280);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT_BIG;
    ctx.fillText('Paused', FIELD.width / 2, 300);
    const resume = { id: 'resume', x: FIELD.width / 2 - 210, y: 340, w: 200, h: 52, label: 'Resume' };
    const restart = { id: 'restart', x: FIELD.width / 2 + 10, y: 340, w: 200, h: 52, label: 'Restart' };
    const levelsBtn = { id: 'levels', x: FIELD.width / 2 - 100, y: 412, w: 200, h: 52, label: 'Levels' };
    buttons.push(resume, restart, levelsBtn);
    drawButton(resume, true);
    drawButton(restart, true);
    drawButton(levelsBtn, true);
    ctx.restore();
  }

  function drawClear(view) {
    const { game } = view;
    const state = game.state;
    drawWorld(view);
    drawHud(view);
    ctx.save();
    drawPanel(FIELD.width / 2 - 300, 130, 600, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a7f3d0';
    ctx.font = FONT_BIG;
    ctx.fillText('Level Clear!', FIELD.width / 2, 208);
    // Stars pop in one by one (clearAge is seconds since the screen opened).
    const clearAge = view.clearAge ?? 99;
    for (let index = 0; index < 3; index += 1) {
      const filled = index < state.clearStars;
      const pop = Math.max(0, Math.min(1, (clearAge - index * 0.25) * 3));
      const size = 34 + pop * 14;
      ctx.font = `${Math.round(size)}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.fillStyle = filled ? '#fde047' : 'rgba(255,255,255,0.22)';
      ctx.fillText('★', FIELD.width / 2 - 90 + index * 90, 290);
    }
    ctx.font = FONT_SMALL;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const lines = [
      `Petals  ${state.levelScore}`,
      `Clear bonus  +${SCORE.clearBonus}`,
      `Time bonus  +${Math.max(0, SCORE.maxTimeBonus - Math.floor(state.levelTime) * 5)}`,
      `Launch bonus  +${(LAUNCHES_PER_LEVEL - state.launchesUsed) * SCORE.unusedLaunchBonus}`,
      `Level score  ${state.clearScore}`,
    ];
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, 336 + index * 28);
    });
    const next = { id: 'next', x: FIELD.width / 2 - 220, y: 492, w: 200, h: 52, label: state.levelIndex < LEVELS.length - 1 ? 'Next level →' : 'Levels' };
    const replay = { id: 'replay', x: FIELD.width / 2 + 20, y: 492, w: 200, h: 52, label: 'Replay' };
    buttons.push(next, replay);
    drawButton(next, true);
    drawButton(replay, true);
    ctx.restore();
  }

  function drawOver(view) {
    const { game } = view;
    const state = game.state;
    drawWorld(view);
    drawHud(view);
    ctx.save();
    drawPanel(FIELD.width / 2 - 300, 170, 600, 380);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fca5a5';
    ctx.font = FONT_BIG;
    ctx.fillText('Out of launches', FIELD.width / 2, 248);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = FONT_MED;
    ctx.fillText(`Petals collected: ${state.collected.size} / ${LEVELS[state.levelIndex].petals.length}`, FIELD.width / 2, 306);
    ctx.font = FONT_SMALL;
    ctx.fillText('Tip: planets are safe — land on them to hop further.', FIELD.width / 2, 346);
    ctx.fillText('Short pulls hop between planets; full power is for long arcs.', FIELD.width / 2, 374);
    const retry = { id: 'retry', x: FIELD.width / 2 - 220, y: 420, w: 200, h: 52, label: '↻  Retry' };
    const levelsBtn = { id: 'levels', x: FIELD.width / 2 + 20, y: 420, w: 200, h: 52, label: 'Levels' };
    buttons.push(retry, levelsBtn);
    drawButton(retry, true);
    drawButton(levelsBtn, true);
    ctx.restore();
  }

  function drawWin(view) {
    const { game } = view;
    drawWorld(view);
    drawHud(view);
    ctx.save();
    drawPanel(FIELD.width / 2 - 320, 130, 640, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = FONT_BIG;
    ctx.fillText('Every Garden Blooms!', FIELD.width / 2, 208);
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT_MED;
    ctx.fillText(`You cleared all 12 levels of Orbit Bloom`, FIELD.width / 2, 268);
    ctx.fillStyle = '#fde047';
    ctx.font = '800 54px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(`★ ${game.state.totalStars} / ${LEVELS.length * 3}`, FIELD.width / 2, 340);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = FONT_SMALL;
    ctx.fillText(`Total score ${game.state.score} — thank you for playing!`, FIELD.width / 2, 386);
    const again = { id: 'again', x: FIELD.width / 2 - 220, y: 440, w: 200, h: 52, label: '↻  Play again' };
    const levelsBtn = { id: 'levels', x: FIELD.width / 2 + 20, y: 440, w: 200, h: 52, label: 'Levels' };
    buttons.push(again, levelsBtn);
    drawButton(again, true);
    drawButton(levelsBtn, true);
    ctx.restore();
  }

  /** Paint one frame. `view` carries the game, the aim state, the trail and time. */
  function draw(view) {
    const { game, time } = view;
    const state = game.state;
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070b26';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    // Camera shake on crashes.
    if (state.shake > 0) {
      const amount = state.shake * 7;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }
    buttons = [];
    if (state.screen === SCREEN_TITLE) {
      drawTitle(view);
    } else if (state.screen === SCREEN_LEVELS) {
      drawLevels(view);
    } else if (state.screen === SCREEN_PAUSED) {
      drawPaused(view);
    } else if (state.screen === SCREEN_CLEAR) {
      drawClear(view);
    } else if (state.screen === SCREEN_OVER) {
      drawOver(view);
    } else if (state.screen === SCREEN_WIN) {
      drawWin(view);
    } else {
      drawWorld(view);
      drawTrail(view.trail);
      if (state.phase !== 'done') drawSeed(state.body.x, state.body.y, time);
      drawAim(view);
      view.particles.draw(ctx);
      drawHud(view);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return {
    draw,
    resize,
    toField,
    makeStarfield,
    buttons() {
      return buttons;
    },
  };
}
