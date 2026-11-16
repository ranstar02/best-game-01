// The twelve levels, in three worlds of four. Every level is static geometry
// only: no moving parts, so the flight is deterministic and a solver can prove
// each level clearable. Coordinates are in the 1280x720 field.
//   start  - where the seed rests before a launch
//   planets - gravity wells; land on one to aim the next launch from it
//   petals - collect them all to bloom the level
//   thorns - spiky asteroids; one touch ends the flight
//   holes  - black holes: strong pull, fatal inside their kill radius
//   pads   - bounce pads: reflect the seed with a boost
//   wind   - constant acceleration, shown by drifting streaks

export const LEVELS = [
  {
    name: 'First Light',
    world: 0,
    start: { x: 140, y: 600 },
    planets: [{ x: 640, y: 380, r: 64, mass: 1.0 }],
    petals: [{ x: 640, y: 240 }, { x: 820, y: 300 }, { x: 460, y: 300 }],
    thorns: [],
    holes: [],
    pads: [],
    wind: null,
  },
  {
    name: 'Two-Step',
    world: 0,
    start: { x: 140, y: 600 },
    planets: [
      { x: 420, y: 480, r: 56, mass: 0.9 },
      { x: 880, y: 300, r: 60, mass: 1.0 },
    ],
    petals: [
      { x: 420, y: 380 },
      { x: 660, y: 200 },
      { x: 880, y: 180 },
      { x: 1060, y: 380 },
    ],
    thorns: [],
    holes: [],
    pads: [],
    wind: null,
  },
  {
    name: 'Thorn Gate',
    world: 0,
    start: { x: 120, y: 360 },
    planets: [{ x: 640, y: 360, r: 70, mass: 1.1 }],
    petals: [
      { x: 500, y: 520 },
      { x: 640, y: 560 },
      { x: 780, y: 520 },
      { x: 900, y: 360 },
    ],
    thorns: [{ x: 640, y: 180, r: 26 }],
    holes: [],
    pads: [],
    wind: null,
  },
  {
    name: 'The Long Arc',
    world: 0,
    start: { x: 110, y: 620 },
    planets: [{ x: 560, y: 420, r: 90, mass: 1.6 }],
    petals: [
      { x: 420, y: 200 },
      { x: 560, y: 150 },
      { x: 700, y: 200 },
      { x: 980, y: 320 },
    ],
    thorns: [],
    holes: [],
    pads: [],
    wind: null,
  },
  {
    name: 'Ember Ring',
    world: 1,
    start: { x: 140, y: 600 },
    planets: [],
    petals: [
      { x: 640, y: 180 },
      { x: 820, y: 360 },
      { x: 640, y: 540 },
      { x: 460, y: 360 },
    ],
    thorns: [],
    holes: [{ x: 640, y: 360, r: 26, pull: 6000000 }],
    pads: [],
    wind: null,
  },
  {
    name: 'Pad Bounce',
    world: 1,
    start: { x: 140, y: 600 },
    planets: [{ x: 380, y: 500, r: 54, mass: 0.9 }],
    petals: [
      { x: 700, y: 420 },
      { x: 880, y: 240 },
      { x: 1060, y: 300 },
      { x: 980, y: 520 },
    ],
    thorns: [],
    holes: [],
    pads: [{ x: 700, y: 620, r: 30 }],
    wind: null,
  },
  {
    name: 'Crosswind',
    world: 1,
    start: { x: 120, y: 600 },
    planets: [{ x: 640, y: 400, r: 60, mass: 1.0 }],
    petals: [
      { x: 420, y: 220 },
      { x: 560, y: 160 },
      { x: 760, y: 180 },
      { x: 900, y: 300 },
    ],
    thorns: [],
    holes: [],
    pads: [],
    wind: { x: 140, y: 0 },
  },
  {
    name: 'The Gauntlet',
    world: 1,
    start: { x: 110, y: 360 },
    planets: [{ x: 640, y: 360, r: 64, mass: 1.0 }],
    petals: [
      { x: 440, y: 210 },
      { x: 640, y: 180 },
      { x: 840, y: 210 },
      { x: 380, y: 560 },
      { x: 900, y: 560 },
    ],
    thorns: [
      { x: 380, y: 360, r: 24 },
      { x: 900, y: 360, r: 24 },
    ],
    holes: [{ x: 1080, y: 360, r: 22, pull: 5000000 }],
    pads: [],
    wind: null,
  },
  {
    name: 'Frost Bridge',
    world: 2,
    start: { x: 120, y: 600 },
    planets: [
      { x: 380, y: 460, r: 46, mass: 0.8 },
      { x: 640, y: 300, r: 46, mass: 0.8 },
      { x: 900, y: 460, r: 46, mass: 0.8 },
    ],
    petals: [
      { x: 510, y: 360 },
      { x: 640, y: 180 },
      { x: 770, y: 360 },
      { x: 1020, y: 300 },
      { x: 1020, y: 560 },
    ],
    thorns: [],
    holes: [],
    pads: [],
    wind: null,
  },
  {
    name: 'Double Well',
    world: 2,
    start: { x: 120, y: 360 },
    planets: [],
    petals: [
      { x: 480, y: 160 },
      { x: 800, y: 160 },
      { x: 480, y: 560 },
      { x: 800, y: 560 },
      { x: 640, y: 360 },
    ],
    thorns: [],
    holes: [
      { x: 480, y: 360, r: 24, pull: 5000000 },
      { x: 800, y: 360, r: 24, pull: 5000000 },
    ],
    pads: [],
    wind: null,
  },
  {
    name: 'Windmill',
    world: 2,
    start: { x: 120, y: 600 },
    planets: [{ x: 640, y: 420, r: 60, mass: 1.0 }],
    petals: [
      { x: 420, y: 300 },
      { x: 640, y: 190 },
      { x: 860, y: 300 },
      { x: 640, y: 560 },
    ],
    thorns: [{ x: 640, y: 280, r: 26 }],
    holes: [],
    pads: [
      { x: 420, y: 620, r: 30 },
      { x: 900, y: 620, r: 30 },
    ],
    wind: { x: 0, y: -60 },
  },
  {
    name: 'Grand Bloom',
    world: 2,
    start: { x: 110, y: 620 },
    planets: [
      { x: 420, y: 380, r: 60, mass: 1.0 },
      { x: 880, y: 280, r: 64, mass: 1.1 },
    ],
    petals: [
      { x: 300, y: 200 },
      { x: 560, y: 180 },
      { x: 880, y: 140 },
      { x: 1080, y: 360 },
      { x: 760, y: 420 },
      { x: 420, y: 540 },
    ],
    thorns: [{ x: 660, y: 160, r: 24 }],
    holes: [{ x: 660, y: 560, r: 24, pull: 5000000 }],
    pads: [{ x: 1080, y: 600, r: 30 }],
    wind: { x: 60, y: 0 },
  },
];

/** A level's world palette index. */
export function worldOf(levelIndex) {
  return LEVELS[levelIndex].world;
}
