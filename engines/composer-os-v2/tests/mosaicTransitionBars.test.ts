/**
 * Mosaic Transition Bars — unit tests.
 */

import type { CoreMotif } from '../core/motif/motifEngineTypes';
import {
  buildTransitionBarNotes,
  isMosaicTransitionBar,
} from '../core/mosaic-mode/mosaicTransitionBars';

const PLAN = [
  { sectionLabel: 'intro', startBar: 1, endBar: 16, songwriterStyleId: 'fripp' as const },
  { sectionLabel: 'verse', startBar: 17, endBar: 32, songwriterStyleId: 'jack_white' as const },
  { sectionLabel: 'chorus', startBar: 33, endBar: 64, songwriterStyleId: 'wayne_shorter' as const },
];

const VARIANT: CoreMotif = {
  id: 'mosaic_variant_verse',
  intervalPattern: [2, -1],
  rhythmPattern: [
    { startBeat: 0, duration: 1 },
    { startBeat: 1, duration: 1 },
    { startBeat: 2, duration: 1 },
  ],
  contourPattern: [1, -1],
  roleTags: ['chord-tone'],
  registerTags: ['mid'],
};

export function runMosaicTransitionBarsTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const t16 = isMosaicTransitionBar(16, PLAN);
  out.push({
    ok: t16.isTransition === true && t16.incomingSection?.sectionLabel === 'verse',
    name: 'isMosaicTransitionBar: bar 16 → incoming verse',
  });

  const t32 = isMosaicTransitionBar(32, PLAN);
  out.push({
    ok: t32.isTransition === true && t32.incomingSection?.sectionLabel === 'chorus',
    name: 'isMosaicTransitionBar: bar 32 → incoming chorus',
  });

  out.push({
    ok: !isMosaicTransitionBar(17, PLAN).isTransition,
    name: 'isMosaicTransitionBar: section start bar 17 → false',
  });

  out.push({
    ok: !isMosaicTransitionBar(15, PLAN).isTransition,
    name: 'isMosaicTransitionBar: bar 15 → false',
  });

  const notes = buildTransitionBarNotes(16, PLAN[1]!, VARIANT, 4);
  out.push({
    ok: notes.length >= 1 && notes.length <= 3,
    name: 'buildTransitionBarNotes: 1–3 notes',
  });

  out.push({
    ok: notes.every((n) => n.startBeat >= 2),
    name: 'buildTransitionBarNotes: attacks on beats 3–4 only (startBeat ≥ 2)',
  });

  out.push({
    ok: notes.every((n) => n.motifRef === 'mosaic_transition_verse'),
    name: 'buildTransitionBarNotes: motifRef mosaic_transition_{sectionLabel}',
  });

  out.push({
    ok: notes.every((n) => n.startBeat < 1 === false && n.startBeat !== 0 && n.startBeat !== 1),
    name: 'buildTransitionBarNotes: no beats 1–2 (startBeat 0–1)',
  });

  const empty = buildTransitionBarNotes(16, PLAN[1]!, { ...VARIANT, intervalPattern: [] }, 4);
  out.push({
    ok: empty.length === 0,
    name: 'buildTransitionBarNotes: empty intervalPattern → empty array',
  });

  return out;
}

if (require.main === module) {
  const results = runMosaicTransitionBarsTests();
  let fail = 0;
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
    if (!r.ok) fail++;
  }
  process.exit(fail > 0 ? 1 : 0);
}
