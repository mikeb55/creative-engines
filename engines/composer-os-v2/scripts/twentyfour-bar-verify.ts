/**
 * Automated verification: 24-bar Guitar–Bass Duo forms → MusicXML checks.
 * Run from repo root:
 *   npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/twentyfour-bar-verify.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';

const OUT = path.join(__dirname, '_twentyfour_bar_verify_out');

const BASE = {
  presetId: 'guitar_bass_duo' as const,
  styleStack: {
    primary: 'barry_harris' as const,
    styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
  },
  seed: 120240001,
  harmonyMode: 'builtin' as const,
  creativeControlLevel: 'stable' as const,
  longFormEnabled: true as const,
  totalBars: 24,
};

type FormCase = {
  formId: 'through3' | 'aba' | 'aab' | 'blues24';
  label: string;
  expectedMarks: string[];
};

const CASES: FormCase[] = [
  { formId: 'through3', label: 'through3 (Through-composed 3 — A B C)', expectedMarks: ['A', 'B', 'C'] },
  { formId: 'aba', label: 'aba (ABA — A B A\')', expectedMarks: ['A', 'B', "A'"] },
  { formId: 'aab', label: 'aab (AAB — A A\' B)', expectedMarks: ['A', "A'", 'B'] },
  { formId: 'blues24', label: 'blues24 (Blues 24 bars — A A\')', expectedMarks: ['A', "A'"] },
];

function extractBassPartXml(xml: string): string {
  const open = '<part id="bass">';
  const i0 = xml.indexOf(open);
  if (i0 < 0) return '';
  const from = xml.slice(i0);
  const nextPart = from.search(/\n  <part id="/);
  if (nextPart > 0) return from.slice(0, nextPart);
  return from;
}

function measureCountInBassPart(xml: string): number {
  const bass = extractBassPartXml(xml);
  if (!bass) return 0;
  const m = bass.match(/<measure number="\d+"/g);
  return m?.length ?? 0;
}

function rehearsalMarksFromXml(xml: string): string[] {
  const matches = [...xml.matchAll(/<rehearsal[^>]*>([^<]*)<\/rehearsal>/g)];
  const seen = new Set<string>();
  return matches
    .map((x) => x[1].replace(/&apos;/g, "'"))
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

const STEP_SEMI: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchBlockToMidi(pitchBlock: string): number | null {
  const stepM = pitchBlock.match(/<step>([A-G])<\/step>/);
  if (!stepM) return null;
  const octM = pitchBlock.match(/<octave>(\d+)<\/octave>/);
  const octave = octM ? parseInt(octM[1], 10) : 4;
  const altM = pitchBlock.match(/<alter>(-?\d+)<\/alter>/);
  const alter = altM ? parseInt(altM[1], 10) : 0;
  const base = STEP_SEMI[stepM[1]] ?? 0;
  return (octave + 1) * 12 + base + alter;
}

function bassNoteMidisFromXml(xml: string): number[] {
  const bass = extractBassPartXml(xml);
  if (!bass) return [];
  const out: number[] = [];
  const noteRe = /<note\b[\s\S]*?<\/note>/g;
  let m: RegExpExecArray | null;
  while ((m = noteRe.exec(bass)) !== null) {
    const block = m[0];
    if (/<rest\b/.test(block)) continue;
    const pitchOpen = block.indexOf('<pitch>');
    if (pitchOpen < 0) continue;
    const pitchClose = block.indexOf('</pitch>', pitchOpen);
    if (pitchClose < 0) continue;
    const pb = block.slice(pitchOpen, pitchClose + '</pitch>'.length);
    const midi = pitchBlockToMidi(pb);
    if (midi != null && Number.isFinite(midi)) out.push(midi);
  }
  return out;
}

function marksMatch(got: string[], expected: string[]): boolean {
  if (got.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (got[i] !== expected[i]) return false;
  }
  return true;
}

function main(): void {
  fs.mkdirSync(OUT, { recursive: true });
  let passed = 0;

  for (const c of CASES) {
    const reasons: string[] = [];
    const r = generateComposition({ ...BASE, formId: c.formId } as Parameters<typeof generateComposition>[0], OUT);

    if (!r.success) {
      reasons.push(`success was false: ${r.error ?? 'unknown error'}`);
    }

    let xml = '';
    if (r.filepath && fs.existsSync(r.filepath)) {
      xml = fs.readFileSync(r.filepath, 'utf8');
    } else if (r.xml) {
      xml = r.xml;
    } else {
      reasons.push('no MusicXML filepath or xml string');
    }

    const barCount = xml ? measureCountInBassPart(xml) : 0;
    if (barCount !== 24) {
      reasons.push(`bass part measure count ${barCount} !== 24`);
    }

    const marks = xml ? rehearsalMarksFromXml(xml) : [];
    if (!marksMatch(marks, c.expectedMarks)) {
      reasons.push(`rehearsal marks got ${JSON.stringify(marks)}, expected prefix ${JSON.stringify(c.expectedMarks)}`);
    }

    const midis = xml ? bassNoteMidisFromXml(xml) : [];
    const outOfRange = midis.filter((p) => p < 40 || p > 88);
    if (midis.length === 0) {
      reasons.push('no bass note pitches found in MusicXML');
    } else if (outOfRange.length > 0) {
      reasons.push(
        `bass MIDI out of [40,88]: ${outOfRange.slice(0, 6).join(', ')}${outOfRange.length > 6 ? '…' : ''}`
      );
    }

    const ok = reasons.length === 0;
    if (ok) {
      passed++;
      console.log(`PASS  ${c.label}`);
    } else {
      console.log(`FAIL  ${c.label}`);
      for (const line of reasons) console.log(`      ${line}`);
    }
  }

  console.log(`\nOverall: ${passed} / ${CASES.length} forms passed.`);
  if (passed < CASES.length) process.exit(1);
}

main();
