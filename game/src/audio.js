// Every sound is synthesized with WebAudio: no audio files, no network.
// A soft pad hums underneath, and each action gets its own little voice:
// a whoosh for the launch, a rising chime for each petal in a combo, a low
// thud for a crash, a bright fanfare for a cleared level. Audio starts on
// the first user gesture, as browsers require, and a mute toggle silences it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** Filtered noise, for the launch whoosh and the crash thud. */
  function noise(duration, volume, fromFreq, toFreq) {
    if (!ctx || muted) return;
    const start = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(fromFreq, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  /** A slow two-oscillator pad that starts with the first gesture. */
  function startMusic() {
    if (!ensure() || musicNodes || muted) return;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const gain = ctx.createGain();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.value = 110;
    oscB.frequency.value = 164.81;
    gain.gain.value = 0.045;
    const slow = ctx.createOscillator();
    const slowGain = ctx.createGain();
    slow.frequency.value = 0.07;
    slowGain.gain.value = 0.02;
    slow.connect(slowGain);
    slowGain.connect(gain.gain);
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(master);
    oscA.start();
    oscB.start();
    slow.start();
    musicNodes = { oscA, oscB, slow, gain };
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = value ? 0 : 0.5;
  }

  return {
    unlock() {
      if (ensure()) startMusic();
    },
    launch() {
      if (!ensure()) return;
      noise(0.35, 0.35, 300, 2400);
      tone(180, 0.3, 'sine', 0.2, 0, 420);
    },
    collect(combo) {
      if (!ensure()) return;
      const base = 523.25 * Math.pow(1.122, Math.min(combo, 8));
      tone(base, 0.28, 'sine', 0.3);
      tone(base * 1.5, 0.32, 'sine', 0.22, 0.05);
    },
    pad() {
      if (!ensure()) return;
      tone(300, 0.18, 'triangle', 0.3, 0, 720);
    },
    nova() {
      if (!ensure()) return;
      noise(0.2, 0.25, 900, 3200);
      tone(660, 0.2, 'sawtooth', 0.12, 0, 1320);
    },
    crash() {
      if (!ensure()) return;
      noise(0.3, 0.4, 500, 90);
      tone(120, 0.35, 'sine', 0.35, 0, 55);
    },
    clear() {
      if (!ensure()) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => tone(freq, 0.4, 'triangle', 0.28, index * 0.09));
    },
    win() {
      if (!ensure()) return;
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, index) => tone(freq, 0.45, 'triangle', 0.26, index * 0.11));
    },
    click() {
      if (!ensure()) return;
      tone(880, 0.07, 'sine', 0.18);
    },
    setMuted,
    isMuted() {
      return muted;
    },
  };
}
