/**
 * Drum fill scheduler — phrase-aware fill placement on 16-step patterns.
 */

import { patternLanes } from './rhythmToolbox.js';

/** @typedef {{ id: string, name: string, description: string }} FillType */

/** @type {readonly FillType[]} */
export const FILL_TYPES = [
  {
    id: 'standard_4',
    name: 'Standard 4-beat',
    description: 'Snare/hat build across beats 3–4, kick on 1 of next bar',
  },
  {
    id: 'turnaround_2',
    name: '2-beat turnaround',
    description: 'Short 16th burst in beats 3–4 between main fills',
  },
  {
    id: 'splash',
    name: 'Splash',
    description: 'Crash/ride accent on beat 4 with open hat tail',
  },
  {
    id: 'press_roll',
    name: 'Press roll',
    description: 'Dense snare 16ths in last half-bar',
  },
  {
    id: 'flam_burst',
    name: 'Flam burst',
    description: 'Stacked snare flams on 3e and 4',
  },
  {
    id: 'afro_clave',
    name: 'Afro-Cuban clave fill',
    description: 'Cross-stick and kick clave overlay on phrase end',
  },
];

const PHRASE_BARS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64];
const FILL_BACK_HALF = [8, 9, 10, 11, 12, 13, 14, 15];
const TURNAROUND_BEATS = [10, 11, 12, 13, 14, 15];

/** @param {number} density */
function fillIntervalBars(density) {
  const d = Math.max(0, Math.min(1, Number(density) || 0));
  if (d <= 0) return Infinity;
  if (d >= 1) return 1;
  if (d >= 0.75) return 2;
  if (d >= 0.5) return 4;
  if (d >= 0.25) return 8;
  return 16;
}

/**
 * @param {number} sectionBars
 * @param {number} fillDensity
 * @param {number[] | null | undefined} lockedPositions
 */
export function computeFillPositions(sectionBars, fillDensity, lockedPositions) {
  if (lockedPositions?.length) {
    return lockedPositions.filter((b) => b >= 2 && b <= sectionBars).sort((a, b) => a - b);
  }
  const interval = fillIntervalBars(fillDensity);
  if (!Number.isFinite(interval)) return [];

  const bars = Math.max(1, Math.floor(sectionBars));
  const positions = new Set();

  for (const phraseBar of PHRASE_BARS) {
    if (phraseBar > bars || phraseBar < 2) continue;
    if ((phraseBar - 1) % interval === interval - 1 || interval === 1) {
      positions.add(phraseBar);
    }
  }

  for (let b = interval; b <= bars; b += interval) {
    if (b >= 2) positions.add(b);
  }

  const sorted = [...positions].sort((a, b) => a - b);
  if (fillDensity >= 0.75 && interval <= 2) {
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b - a >= 3) {
        const turn = a + 2;
        if (turn < b && turn >= 2 && turn <= bars) sorted.splice(i + 1, 0, turn);
      }
    }
  }

  return [...new Set(sorted)].sort((a, b) => a - b);
}

/** @param {ReturnType<typeof patternLanes>} lanes @param {string} fillTypeId */
function applyFillType(lanes, fillTypeId) {
  const kicks = [...lanes.kicks];
  const snares = [...lanes.snares];
  const hats = [...lanes.hats];
  const ride = [...lanes.ride];

  const add = (lane, steps) => {
    for (const s of steps) {
      if (!lane.includes(s)) lane.push(s);
    }
    lane.sort((a, b) => a - b);
  };

  switch (fillTypeId) {
    case 'turnaround_2':
      add(snares, TURNAROUND_BEATS);
      add(hats, [12, 14]);
      add(kicks, [10, 15]);
      break;
    case 'splash':
      add(ride, [12, 15]);
      add(hats, [8, 10, 12, 14, 15]);
      add(snares, [14]);
      break;
    case 'press_roll':
      add(snares, FILL_BACK_HALF);
      add(hats, [8, 9, 10, 11, 12, 13, 14, 15]);
      break;
    case 'flam_burst':
      add(snares, [10, 11, 14, 15]);
      add(hats, [8, 12, 14]);
      break;
    case 'afro_clave':
      add(kicks, [0, 3, 7, 10, 14]);
      add(snares, [2, 5, 8, 11, 14]);
      add(hats, [1, 4, 7, 10, 13]);
      break;
    case 'standard_4':
    default:
      add(snares, [8, 10, 12, 14, 15]);
      add(hats, [8, 9, 10, 11, 12, 13, 14, 15]);
      add(kicks, [12, 15]);
      add(ride, [15]);
      break;
  }

  return { kicks, snares, hats, ride };
}

/** @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} pattern */
function stripFillHits(pattern) {
  const lanes = patternLanes(pattern);
  const strip = (lane) => lane.filter((s) => !FILL_BACK_HALF.includes(s));
  return {
    kicks: strip(lanes.kicks),
    snares: strip(lanes.snares),
    hats: strip(lanes.hats),
    ride: strip(lanes.ride),
  };
}

/**
 * @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} pattern
 * @param {number} sectionBars
 * @param {number} fillDensity
 * @param {{ fillTypeId?: string, lockedFillPositions?: number[] }} [options]
 */
export function scheduleFills(pattern, sectionBars, fillDensity, options = {}) {
  const fillTypeId = options.fillTypeId ?? 'standard_4';
  const lanes = patternLanes(pattern);
  const baseLanes = stripFillHits(pattern);

  const fillPositions = computeFillPositions(
    sectionBars,
    fillDensity,
    options.lockedFillPositions
  );

  const fillPatterns = fillPositions.map((bar) => ({
    bar,
    ...applyFillType(lanes, fillTypeId),
    fillTypeId,
  }));

  return {
    fillPositions,
    fillPatterns,
    basePattern: {
      kicks: baseLanes.kicks,
      snares: baseLanes.snares,
      hats: baseLanes.hats,
      ride: baseLanes.ride,
    },
  };
}
