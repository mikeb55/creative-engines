/**
 * Vault triad-pair monophonic solo line — upward arpeggio, top note = phrase peak.
 */

import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import type { SoloExportNote } from '../solo/soloMusicContextExport';
import { clampSoloMelodicMidi } from '../solo/soloMusicality';

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function relToAbs(rootPc: number, rel: number): number {
  return normalizePc(rootPc + rel);
}

function pcToMidiInRange(pc: number, preferLow = 62): number {
  let midi = preferLow + normalizePc(pc - (preferLow % 12));
  if (midi < 62) midi += 12;
  if (midi > 86) midi -= 12;
  return clampSoloMelodicMidi(midi);
}

/** One bar — monophonic upward arpeggio through triad pair; peak on top tone. */
export function generateVaultTriadPairMonophonicBar(options: {
  chordTypeId: string;
  rootPc: number;
  barIndex: number;
  beatsPerBar?: number;
}): SoloExportNote[] {
  const { chordTypeId, rootPc, barIndex } = options;
  const beatsPerBar = options.beatsPerBar ?? 4;
  const spec = selectQuadratonicMelodySpec(chordTypeId);
  if (!spec) return [];

  const root = normalizePc(rootPc);
  const triadPcs = spec.melodicTriad.map((t) => relToAbs(root, t.pitchClassFromRoot));
  const tensionPc = relToAbs(root, spec.primaryTension.pitchClassFromRoot);
  const quad = [...new Set([...triadPcs.map(normalizePc), normalizePc(tensionPc)])].sort((a, b) => a - b);
  const pair = quad.length >= 2 ? [quad[0]!, quad[quad.length - 1]!] : [triadPcs[0]!, tensionPc];

  const arpPcs = [pair[0]!, pair[0]!, pair[1]!, pair[1]!, Math.max(pair[0]!, pair[1]!)];
  const midis = arpPcs.map((pc, i) => {
    const base = pcToMidiInRange(pc, 62 + (i % 2) * 7);
    return clampSoloMelodicMidi(base + (i >= 3 ? 7 : 0));
  });
  midis.sort((a, b) => a - b);
  const uniqueAsc = [...new Set(midis)].sort((a, b) => a - b);
  while (uniqueAsc.length < 4) {
    const last = uniqueAsc[uniqueAsc.length - 1] ?? 74;
    const next = clampSoloMelodicMidi(last + 3);
    if (next <= last) break;
    uniqueAsc.push(next);
  }
  const peak = uniqueAsc[uniqueAsc.length - 1]!;

  const templates: Array<Array<{ startBeat: number; durationBeats: number }>> = [
    [
      { startBeat: 0, durationBeats: 1 },
      { startBeat: 1, durationBeats: 0.5 },
      { startBeat: 1.5, durationBeats: 0.5 },
      { startBeat: 2, durationBeats: 1.5 },
    ],
    [
      { startBeat: 0.5, durationBeats: 0.5 },
      { startBeat: 1, durationBeats: 1 },
      { startBeat: 2, durationBeats: 1.5 },
    ],
    [
      { startBeat: 0, durationBeats: 1.5 },
      { startBeat: 1.5, durationBeats: 0.5 },
      { startBeat: 2, durationBeats: 0.5 },
      { startBeat: 2.5, durationBeats: 1.5 },
    ],
  ];

  const slots = templates[barIndex % templates.length]!;
  const noteCount = Math.min(slots.length, uniqueAsc.length);
  const out: SoloExportNote[] = [];

  for (let i = 0; i < noteCount; i++) {
    const slot = slots[i]!;
    const pitch = i === noteCount - 1 ? peak : uniqueAsc[i]!;
    out.push({
      barIndex,
      startBeat: slot.startBeat,
      durationBeats: slot.durationBeats,
      pitch: clampSoloMelodicMidi(pitch),
    });
  }

  const used = out.reduce((s, n) => s + n.durationBeats, out[out.length - 1]?.startBeat ?? 0);
  if (used < beatsPerBar - 1 && out.length > 0) {
    const last = out[out.length - 1]!;
    if (last.startBeat + last.durationBeats < beatsPerBar - 1) {
      // implicit breath gap — no rest note in solo export (exporter handles sparse bars)
    }
  }

  return out;
}
