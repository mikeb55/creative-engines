/**
 * SD (score/drum) parser — MusicXML unpitched percussion notes.
 */

const STEP_TO_16TH = { C: 0, D: 2, E: 4, F: 5, G: 8, A: 10, B: 12 };

/** @param {string | null | undefined} instrumentId @param {string} [partName] */
export function isPercussionInstrument(instrumentId, partName = '') {
  const s = `${instrumentId ?? ''} ${partName ?? ''}`.toLowerCase();
  return s.includes('drum') || s.includes('perc') || s.includes('kit');
}

/** Default kick grid position when step/octave missing. */
export function defaultKickStep() {
  return 0;
}

/**
 * @param {string | null | undefined} displayStep
 * @param {string} [instrumentId]
 */
export function displayStepToBeat(displayStep, instrumentId = '') {
  if (displayStep == null || displayStep === '') {
    return defaultKickStep();
  }
  const letter = String(displayStep).trim().toUpperCase()[0];
  if (!letter || !(letter in STEP_TO_16TH)) {
    return isPercussionInstrument(instrumentId) ? defaultKickStep() : defaultKickStep();
  }
  return STEP_TO_16TH[letter];
}

/**
 * @param {object} note
 * @param {{ instrumentId?: string, partName?: string }} [ctx]
 */
export function parsePercussionNote(note, ctx = {}) {
  if (!note || note.rest === true || note.isRest === true) return null;

  const instrumentId =
    note.instrumentId ?? note.instrument ?? ctx.instrumentId ?? '';
  const partName = ctx.partName ?? '';
  const unpitched = note.unpitched ?? (note.displayStep != null ? note : null);
  const pitched = note.pitch ?? note.step;

  const isUnpitched =
    Boolean(unpitched) ||
    isPercussionInstrument(instrumentId, partName) ||
    (pitched == null && note.step == null);

  if (!isUnpitched && pitched != null) return null;

  let displayStep = null;
  if (unpitched && typeof unpitched === 'object') {
    displayStep = unpitched.displayStep ?? unpitched.step ?? null;
  } else {
    displayStep = note.displayStep ?? note.step ?? null;
  }

  const beatPosition =
    typeof note.beatPosition === 'number' && Number.isFinite(note.beatPosition)
      ? ((note.beatPosition % 16) + 16) % 16
      : displayStepToBeat(displayStep, instrumentId);

  const voice = Number(note.voice) === 2 ? 2 : 1;

  return {
    beatPosition,
    voice,
    displayStep: displayStep ?? 'C',
    instrumentId: String(instrumentId),
  };
}

/** @param {object[]} hits */
export function mergePercussionVoices(hits) {
  const byBeat = new Map();
  for (const h of hits) {
    if (!h) continue;
    const key = h.beatPosition;
    const prev = byBeat.get(key);
    if (!prev || h.voice > prev.voice) {
      byBeat.set(key, { ...h, voices: prev ? [prev.voice, h.voice] : [h.voice] });
    } else if (prev) {
      prev.voices = [...new Set([...(prev.voices ?? [prev.voice]), h.voice])];
    }
  }
  return [...byBeat.values()].sort((a, b) => a.beatPosition - b.beatPosition);
}

/**
 * @param {object[]} notes
 * @param {{ instrumentId?: string, partName?: string }} [ctx]
 */
export function parsePercussionMeasure(notes, ctx = {}) {
  const hits = [];
  for (const note of notes ?? []) {
    try {
      const hit = parsePercussionNote(note, ctx);
      if (hit) hits.push(hit);
    } catch {
      hits.push({
        beatPosition: defaultKickStep(),
        voice: 1,
        displayStep: 'C',
        instrumentId: ctx.instrumentId ?? 'drum',
      });
    }
  }
  return mergePercussionVoices(hits);
}
