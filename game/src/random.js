// A tiny seeded random generator (mulberry32), so a level's starfield and the
// deterministic screenshot scenes play the same on every machine and every run.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max) from a generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** A random integer in [min, max] from a generator. */
export function rangeInt(random, min, max) {
  return Math.floor(range(random, min, max + 1));
}
