// Mouse and keyboard, in field coordinates. The game loop reads actions once
// a frame (takeActions) and clicks once a frame (takeClicks); the state machine
// decides what each one means on the current screen.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_NOVA = 16;
export const ACTION_NEXT = 32;
export const ACTION_BACK = 64;

export function createInput(canvas, toField) {
  let actions = 0;
  let clicks = [];
  let presses = [];
  let releases = [];
  let digits = [];
  let pointer = { x: 0, y: 0 };
  let down = false;
  let dragging = false;
  let dragStart = null;
  let dragMoved = 0;

  function fieldOf(event) {
    const rect = canvas.getBoundingClientRect();
    return toField(event.clientX - rect.left, event.clientY - rect.top);
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const point = fieldOf(event);
    pointer = point;
    down = true;
    dragging = true;
    dragStart = point;
    dragMoved = 0;
    presses.push(point);
    if (event.button === 2) actions |= ACTION_NOVA;
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = fieldOf(event);
    if (dragging) dragMoved += Math.hypot(point.x - pointer.x, point.y - pointer.y);
    pointer = point;
  });

  function endPointer(event) {
    const point = fieldOf(event);
    pointer = point;
    down = false;
    const wasDragging = dragging;
    dragging = false;
    if (wasDragging && dragMoved < 8) clicks.push(point);
    if (wasDragging && dragMoved >= 20) releases.push(point);
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'KeyN') {
      actions |= ACTION_NEXT;
    } else if (event.code === 'Backspace') {
      actions |= ACTION_BACK;
    } else if (event.code === 'KeyX') {
      actions |= ACTION_NOVA;
    } else if (/^Digit[0-9]$/.test(event.code)) {
      digits.push(Number(event.code.slice(5)));
    }
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    takePresses() {
      const taken = presses;
      presses = [];
      return taken;
    },
    takeReleases() {
      const taken = releases;
      releases = [];
      return taken;
    },
    takeDigits() {
      const taken = digits;
      digits = [];
      return taken;
    },
    pointer() {
      return pointer;
    },
    isDown() {
      return down;
    },
    isDragging() {
      return dragging;
    },
    dragAnchor() {
      return dragStart;
    },
  };
}
