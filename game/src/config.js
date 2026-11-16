// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. All physics live here so levels and the solver agree.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Universal gravity constant: a planet's pull is GRAV * mass / distance^2. */
export const GRAV = 2600000;

/** The seed of light the player launches. */
export const SEED = {
  radius: 10,
  /** Fastest launch speed, pixels a second. */
  maxSpeed: 1000,
  /** Longest slingshot pull, pixels. */
  maxPull: 260,
  /** Speed is capped here so a close slingshot never explodes. */
  speedCap: 1500,
};

/** One drag-and-release per level is one launch; three launches a level. */
export const LAUNCHES_PER_LEVEL = 3;

/** A petal is collected inside this distance of the seed's centre. */
export const PETAL_RADIUS = 24;

/** Mid-flight Nova burst: one per launch, Space or right-click. */
export const NOVA = {
  impulse: 280,
  usesPerLaunch: 1,
};

/** A bounce pad reflects the seed and never lets it leave slower than this. */
export const PAD = { boost: 1.15, minSpeed: 480 };

/** Points: each petal is worth 100 times its combo position in the flight. */
export const SCORE = {
  petal: 100,
  clearBonus: 500,
  unusedLaunchBonus: 250,
  maxTimeBonus: 300,
};

/** Star rating: clear on the 1st launch for 3 stars, 2nd for 2, 3rd for 1. */
export function starsForLaunches(used) {
  if (used <= 1) return 3;
  if (used === 2) return 2;
  return 1;
}

/** The three worlds and their palettes, one per four levels. */
export const WORLDS = [
  {
    name: 'Meadow Bloom',
    sky: ['#0b1030', '#123524'],
    planet: '#7fe0a8',
    planetDark: '#2f7d5b',
    petal: '#ff9ecf',
    accent: '#a7f3d0',
  },
  {
    name: 'Ember Bloom',
    sky: ['#1c0a24', '#3d1408'],
    planet: '#ffb347',
    planetDark: '#8a4b12',
    petal: '#ffd166',
    accent: '#ffb347',
  },
  {
    name: 'Frost Bloom',
    sky: ['#070b26', '#0e2a4a'],
    planet: '#8fd3ff',
    planetDark: '#2b5f8a',
    petal: '#9ff5e4',
    accent: '#8fd3ff',
  },
];

/** localStorage keys for progress. */
export const SAVE = {
  starsPrefix: 'orbitbloom.stars.',
  totalKey: 'orbitbloom.totalStars',
  mutedKey: 'orbitbloom.muted',
};
