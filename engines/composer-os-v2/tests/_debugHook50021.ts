import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { extractMotifShapeFromGuitarBarContext } from '../core/motif/motifShape';
import { mergeTouchingSamePitchNotesForValidator } from '../core/motif/motifShape';
import { SONG_MODE_HOOK_RETURN_BAR } from '../core/motif/motifEngineTypes';
import { getChordForBar } from '../core/harmony/harmonyResolution';
import { chordTonesForChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { shouldUseUserChordSemanticsForTones } from '../core/harmony/harmonyChordTonePolicy';

function pitches(g: import('../core/score-model/scoreModelTypes').PartModel, bar: number): number[] {
  const m = g.measures.find((x) => x.index === bar);
  if (!m) return [];
  const raw = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  return mergeTouchingSamePitchNotesForValidator(raw).map((n) => n.pitch);
}

function pitchesRaw(g: import('../core/score-model/scoreModelTypes').PartModel, bar: number): number[] {
  const m = g.measures.find((x) => x.index === bar);
  if (!m) return [];
  return m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => n.pitch);
}

const r = runGoldenPath(50021, {
  songModeHookFirstIdentity: true,
  presetId: 'guitar_bass_duo',
  totalBars: 32,
  longFormEnabled: true,
});
const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')!;
const s1 = extractMotifShapeFromGuitarBarContext(g, 1, r.context);
const s25 = extractMotifShapeFromGuitarBarContext(g, SONG_MODE_HOOK_RETURN_BAR, r.context);
console.log('success', r.success);
console.log('errors', r.errors);
console.log('p1 raw', pitchesRaw(g, 1));
console.log('p1 merged', pitches(g, 1));
console.log('p25 raw', pitchesRaw(g, SONG_MODE_HOOK_RETURN_BAR));
console.log('p25 merged', pitches(g, SONG_MODE_HOOK_RETURN_BAR));
console.log('shape1 iv', s1?.intervalPattern, 'contour', s1?.contour);
console.log('shape25 iv', s25?.intervalPattern, 'contour', s25?.contour);
console.log('startRel', s1?.startRelativePc, s25?.startRelativePc, 'peakRel', s1?.peakRelativePc, s25?.peakRelativePc);

const opts = shouldUseUserChordSemanticsForTones(r.context) ? { lockedHarmony: true } : undefined;
const c1 = getChordForBar(1, r.context);
const c25 = getChordForBar(SONG_MODE_HOOK_RETURN_BAR, r.context);
const t1 = chordTonesForChordSymbol(c1, opts);
const t25 = chordTonesForChordSymbol(c25, opts);
console.log('chords', c1, '->', c25);
console.log('root midi symbol', Math.round(t1.root), Math.round(t25.root));
