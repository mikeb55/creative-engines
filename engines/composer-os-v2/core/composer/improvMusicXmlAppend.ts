/**
 * Phase 8 — Append improv part to MusicXML partwise score (transcribed line + harmony-aware durations).
 */

import type { ImprovMutationResult, ImprovSkeleton } from './improvAgent';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import type { RhythmCell } from '../generation/generationModeProfile';
import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';

export interface ImprovAppendPayload {
  skeleton: ImprovSkeleton;
  mutation: ImprovMutationResult;
  bundle: VoiceRuleBundle;
  totalBars: number;
  seed: number;
}

function seeded01(seed: number, i: number, salt: number): number {
  const x = Math.sin(seed * 0.00012 + i * 2.17 + salt * 3.11) * 10000;
  return x - Math.floor(x);
}

function midiToStepAlterOctave(midi: number): { step: string; alter?: number; octave: number } {
  const table: { step: string; alter?: number }[] = [
    { step: 'C' },
    { step: 'C', alter: 1 },
    { step: 'D' },
    { step: 'D', alter: 1 },
    { step: 'E' },
    { step: 'F' },
    { step: 'F', alter: 1 },
    { step: 'G' },
    { step: 'G', alter: 1 },
    { step: 'A' },
    { step: 'A', alter: 1 },
    { step: 'B' },
  ];
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  const oct = Math.floor(Math.round(midi) / 12) - 1;
  const dispOct = Math.min(5, Math.max(2, oct));
  const t = table[pc]!;
  return t.alter !== undefined ? { step: t.step, alter: t.alter, octave: dispOct } : { step: t.step, octave: dispOct };
}

function tokenToQuarters(t: string): number {
  if (t === '16') return 0.25;
  if (t === '8') return 0.5;
  if (t === 'q') return 1;
  if (t === 'h') return 2;
  return 0.5;
}

function rhythmCellToDurationPattern(cell: RhythmCell, barQuarters: number, divisions: number): number[] {
  const parts = (cell as string[]).map(tokenToQuarters);
  const sum = parts.reduce((a, b) => a + b, 0) || 1;
  const scale = barQuarters / sum;
  return parts.map((p) => Math.max(1, Math.round(p * scale * divisions)));
}

function clampLeap(prev: number, next: number, maxLeap: number): number {
  const d = next - prev;
  if (Math.abs(d) <= maxLeap) return next;
  return prev + Math.sign(d) * maxLeap;
}

function buildBarNotes(
  barIndex: number,
  sk: ImprovSkeleton,
  mut: ImprovMutationResult,
  bundle: VoiceRuleBundle,
  seed: number,
  divisions: number,
  barQuarters: number
): { duration: number; midi: number }[] {
  const cell = (sk.rhythmicSkeleton[barIndex] ?? ['8', '8', 'q']) as RhythmCell;
  const raw = mut.midiLineByBar[barIndex] ?? mut.midiLineByBar[0] ?? [60, 62, 64];
  const density = cell.length;
  const nTarget = Math.min(8, Math.max(3, density + Math.floor(seeded01(seed, barIndex, 441) * 4)));
  const [lo, hi] = sk.primaryMotif.registerBand;
  const low = typeof lo === 'number' ? lo : 55;
  const high = typeof hi === 'number' ? hi : 79;
  const maxLeap = bundle.melodicPolicy.maxLeapSemitones ?? 7;

  const pitches: number[] = [];
  for (let i = 0; i < nTarget; i++) {
    const src = raw[i % raw.length] ?? raw[0] ?? 60;
    let p = Math.min(high, Math.max(low, src));
    if (pitches.length > 0) {
      p = clampLeap(pitches[pitches.length - 1]!, p, maxLeap);
      p = Math.min(high, Math.max(low, p));
    }
    pitches.push(p);
  }

  const durs = rhythmCellToDurationPattern(cell, barQuarters, divisions);
  while (durs.length < pitches.length) {
    durs.push(Math.max(1, Math.floor(divisions / 4)));
  }
  while (durs.length > pitches.length) durs.pop();

  let sumD = durs.reduce((a, b) => a + b, 0);
  const targetTicks = barQuarters * divisions;
  if (sumD !== targetTicks && durs.length > 0) {
    const delta = targetTicks - sumD;
    durs[durs.length - 1] = Math.max(1, (durs[durs.length - 1] ?? 0) + delta);
  }

  const out: { duration: number; midi: number }[] = [];
  for (let i = 0; i < Math.min(pitches.length, durs.length); i++) {
    out.push({ midi: pitches[i]!, duration: durs[i]! });
  }
  return out;
}

function durationToType(divisions: number, dur: number): string {
  const ratio = dur / divisions;
  if (ratio >= 3.5) return 'whole';
  if (ratio >= 1.75) return 'half';
  if (ratio >= 0.85) return 'quarter';
  if (ratio >= 0.45) return 'eighth';
  return '16th';
}

function noteXml(n: { duration: number; midi: number }, divisions: number, instrumentId: string, isChord: boolean): string {
  const disp = midiToStepAlterOctave(n.midi);
  const alter = disp.alter !== undefined ? `\n<alter>${disp.alter}</alter>` : '';
  const type = durationToType(divisions, n.duration);
  const chordTag = isChord ? '<chord/>' : '';
  return `<note>${chordTag}
<unpitched>
<display-step>${disp.step}</display-step>${alter}
<display-octave>${disp.octave}</display-octave>
</unpitched>
<duration>${n.duration}</duration>
<instrument id="${instrumentId}"/>
<voice>1</voice>
<type>${type}</type>
<stem>up</stem>
<notehead>normal</notehead>
<staff>1</staff>
</note>`;
}

/** Insert score-part + part before closing tags (Composer OS exporter-compatible partwise layout). */
export function appendImprovPartToPartwiseXml(baseXml: string, payload?: ImprovAppendPayload, divisions = 8): string {
  if (!baseXml.includes('</score-partwise>')) return baseXml;
  const partId = 'P_IMPROV_PHASE8';
  const instId = `${partId}-I1`;

  if (!payload) {
    const partListEntry = `<score-part id="${partId}"><part-name>Improv</part-name><score-instrument id="${instId}"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>`;
    let xml = baseXml;
    if (xml.includes('</part-list>')) {
      xml = xml.replace('</part-list>', `${partListEntry}\n</part-list>`);
    }
    const dur = divisions * 4;
    const partBody = `<part id="${partId}">
<measure number="1">
<attributes>
<divisions>${divisions}</divisions>
</attributes>
<note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>${dur}</duration><instrument id="${instId}"/><voice>1</voice><type>whole</type><stem>up</stem><notehead>normal</notehead><staff>1</staff></note>
</measure>
</part>`;
    xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);
    return xml;
  }

  const { skeleton, mutation, bundle, totalBars, seed } = payload;
  const tb = Math.max(1, Math.min(totalBars, skeleton.chordChanges.length || totalBars));
  const barQuarters = 4;

  const partLines: string[] = [`<part id="${partId}">`];
  for (let b = 0; b < tb; b++) {
    const barNotes = buildBarNotes(b, skeleton, mutation, bundle, seed, divisions, barQuarters);
    const attrs =
      b === 0
        ? `<attributes>
<divisions>${divisions}</divisions>
</attributes>
`
        : '';
    const noteLines = barNotes.map((n, i) => noteXml(n, divisions, instId, i > 0)).join('\n');
    partLines.push(`<measure number="${b + 1}">
${attrs}${noteLines}
</measure>`);
  }
  partLines.push('</part>');
  const partBody = partLines.join('\n');

  const merged = `<score-part id="${partId}"><part-name>Improv</part-name><score-instrument id="${instId}"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>`;
  let xml = baseXml;
  if (xml.includes('</part-list>')) {
    xml = xml.replace('</part-list>', `${merged}\n</part-list>`);
  }
  xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);

  const v = validateMusicXml(xml);
  if (!v.valid) {
    throw new Error(`improv MusicXML validation failed: ${v.errors.join('; ')}`);
  }
  return xml;
}
