/**
 * Drum pattern analysis — 16-step lanes (kicks / snares / hats / ride).
 */

const VOICES = ['kicks', 'snares', 'hats', 'ride'];
const DOWNBEATS = new Set([0, 4, 8, 12]);

/** @param {number} x */
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/** @param {number[]} arr */
function normalizeLane(arr) {
  return [...new Set((arr ?? []).map((n) => ((Number(n) % 16) + 16) % 16))].sort((a, b) => a - b);
}

/** @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} pattern */
export function patternLanes(pattern) {
  return {
    kicks: normalizeLane(pattern.kicks),
    snares: normalizeLane(pattern.snares),
    hats: normalizeLane(pattern.hats),
    ride: normalizeLane(pattern.ride),
  };
}

/** @param {number[]} lane */
function laneToBool16(lane) {
  const b = Array(16).fill(0);
  for (const i of lane) b[i] = 1;
  return b;
}

/** @param {ReturnType<typeof patternLanes>} lanes */
function countHits(lanes) {
  return VOICES.reduce((s, v) => s + lanes[v].length, 0);
}

/** @param {ReturnType<typeof patternLanes>} lanes */
function isAllEmpty(lanes) {
  return countHits(lanes) === 0;
}

/**
 * @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} pattern
 */
export function analysePattern(pattern) {
  const lanes = patternLanes(pattern);
  const hitCount = countHits(lanes);
  const voidCount = 64 - hitCount;

  let syncHits = 0;
  for (const v of VOICES) {
    for (const i of lanes[v]) {
      if (!DOWNBEATS.has(i)) syncHits += 1;
    }
  }
  const syncopationScore = hitCount === 0 ? 0 : clamp01(syncHits / hitCount);

  const densityScore = clamp01(hitCount / 64);

  const perVoice = VOICES.map((v) => lanes[v].length);
  const mean = hitCount / 4;
  const variance = perVoice.reduce((s, c) => s + (c - mean) ** 2, 0) / 4;
  const balanceScore =
    hitCount === 0 ? 0 : clamp01(1 - Math.sqrt(variance) / Math.max(mean, 1));

  const grooveVector = Array.from({ length: 16 }, (_, step) => {
    let w = 0;
    for (let vi = 0; vi < VOICES.length; vi += 1) {
      if (lanes[VOICES[vi]].includes(step)) w += (vi + 1) / 4;
    }
    return clamp01(w / 4);
  });

  const periods = VOICES.map((v) => {
    const hits = lanes[v];
    if (hits.length < 2) return 16;
    const iois = [];
    for (let i = 1; i < hits.length; i += 1) iois.push(hits[i] - hits[i - 1]);
    const meanIoi = iois.reduce((a, b) => a + b, 0) / iois.length;
    return Math.max(1, Math.round(meanIoi));
  });
  let polySum = 0;
  let polyPairs = 0;
  for (let i = 0; i < periods.length; i += 1) {
    for (let j = i + 1; j < periods.length; j += 1) {
      const a = periods[i];
      const b = periods[j];
      const ratio = a > b ? a / b : b / a;
      polySum += clamp01((ratio - 1) / 3);
      polyPairs += 1;
    }
  }
  const polyrhythmIndex = polyPairs === 0 ? 0 : clamp01(polySum / polyPairs);

  const allSteps = [];
  for (const v of VOICES) {
    for (const i of lanes[v]) allSteps.push(i);
  }
  allSteps.sort((a, b) => a - b);
  let evenness = 0.5;
  if (allSteps.length >= 2) {
    const iois = [];
    for (let i = 1; i < allSteps.length; i += 1) iois.push(allSteps[i] - allSteps[i - 1]);
    const meanIoi = iois.reduce((a, b) => a + b, 0) / iois.length;
    const dev =
      iois.reduce((s, x) => s + Math.abs(x - meanIoi), 0) / Math.max(iois.length, 1);
    evenness = meanIoi === 0 ? 0 : clamp01(1 - dev / meanIoi);
  } else if (allSteps.length === 1) {
    evenness = 1;
  }

  let gravSum = 0;
  for (const v of VOICES) {
    for (const i of lanes[v]) gravSum += i;
  }
  const centreOfGravity = hitCount === 0 ? 0.5 : clamp01(gravSum / hitCount / 15);

  return {
    syncopationScore,
    densityScore,
    balanceScore,
    grooveVector,
    hitCount,
    voidCount,
    polyrhythmIndex,
    evenness,
    centreOfGravity,
  };
}

/**
 * @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} patternA
 * @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} patternB
 */
export function comparePatterns(patternA, patternB) {
  const la = patternLanes(patternA);
  const lb = patternLanes(patternB);
  let match = 0;
  let sharedHits = 0;
  const differingPositions = [];

  for (let step = 0; step < 16; step += 1) {
    let stepDiffers = false;
    for (const v of VOICES) {
      const ha = la[v].includes(step);
      const hb = lb[v].includes(step);
      if (ha && hb) sharedHits += 1;
      if (ha === hb) match += 1;
      else stepDiffers = true;
    }
    if (stepDiffers) differingPositions.push(step);
  }

  return {
    similarityScore: clamp01(match / 64),
    differingPositions,
    sharedHits,
  };
}

/**
 * @param {{ kicks?: number[], snares?: number[], hats?: number[], ride?: number[] }} pattern
 * @param {number} intensity 0–1
 */
export function suggestVariation(pattern, intensity) {
  const base = patternLanes(pattern);
  const out = {
    kicks: [...base.kicks],
    snares: [...base.snares],
    hats: [...base.hats],
    ride: [...base.ride],
  };

  const clamped = clamp01(Number(intensity) || 0);
  const changes =
    clamped <= 0.15
      ? 1 + Math.round(clamped * 1)
      : Math.max(1, Math.min(6, Math.round(clamped * 6)));

  const cells = [];
  for (const v of VOICES) {
    for (let step = 0; step < 16; step += 1) {
      cells.push({ voice: v, step, on: out[v].includes(step) });
    }
  }

  for (let c = 0; c < changes; c += 1) {
    const idx = Math.floor(Math.random() * cells.length);
    const cell = cells[idx];
    const lane = out[cell.voice];
    if (cell.on) {
      const i = lane.indexOf(cell.step);
      if (i >= 0) lane.splice(i, 1);
    } else {
      lane.push(cell.step);
      lane.sort((a, b) => a - b);
    }
    cell.on = !cell.on;
  }

  if (isAllEmpty(out)) {
    out.kicks = [0];
  }

  return {
    kicks: out.kicks,
    snares: out.snares,
    hats: out.hats,
    ride: out.ride,
  };
}

/** Bjorklund Euclidean rhythm — `pulses` onsets in `steps` positions. */
function euclideanPulse(steps, pulses) {
  const n = Math.max(1, Math.floor(steps));
  const k = Math.max(0, Math.min(n, Math.floor(pulses)));
  if (k === 0) return Array(n).fill(0);
  if (k === n) return Array(n).fill(1);

  const counts = [];
  const remainders = [k];
  let divisor = n - k;
  remainders.push(divisor);
  let level = 0;
  while (remainders[level + 1] > 0) {
    counts.push(Math.floor(divisor / remainders[level + 1]));
    divisor = remainders[level + 1];
    remainders.push(divisor % remainders[level + 1]);
    level += 1;
  }
  counts.push(divisor);

  const build = (lvl) => {
    if (lvl === -1) return [1];
    if (lvl === -2) return [0];
    let rhythm = [];
    for (let i = 0; i < counts[lvl]; i += 1) rhythm = rhythm.concat(build(lvl - 1));
    for (let i = 0; i < remainders[lvl]; i += 1) rhythm = rhythm.concat(build(lvl - 2));
    return rhythm;
  };

  return build(level);
}

/**
 * @param {number} steps 8 | 12 | 16
 * @param {number} hits
 * @param {'kick'|'snare'|'hat'|'ride'} voice
 * @returns {number[]} 16-element 0/1 lane
 */
export function patternToEuclidean(steps, hits, voice) {
  void voice;
  const s = [8, 12, 16].includes(steps) ? steps : 16;
  const pulse = euclideanPulse(s, hits);
  const out = Array(16).fill(0);
  for (let i = 0; i < 16; i += 1) out[i] = pulse[i % s] ? 1 : 0;
  return out;
}

/** @param {number[]} lane16 */
export function bool16ToLane(lane16) {
  return lane16.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
}
