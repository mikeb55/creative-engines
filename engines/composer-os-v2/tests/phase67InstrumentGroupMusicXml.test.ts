/**
 * Phase 6+7 — instrumentGroup string quartet + guitar MusicXML (additive; uses generateComposition).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { generateComposition } from '../app-api/generateComposition';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';
import { STRING_INSTRUMENTS } from '../core/composer/stringEnsemble';
import { buildVoicingsForContext } from '../core/composer/guitarVoicingEngine';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { mapAppStyleStackToEngine } from '../app-api/mapStyleStack';

function extractPartXml(xml: string, partId: string): string {
  const re = new RegExp(`<part id="${partId}"[\\s\\S]*?</part>`);
  const m = re.exec(xml);
  return m?.[0] ?? '';
}

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiFromPitchXml(fragment: string): number | undefined {
  const step = /<step>([A-G])<\/step>/.exec(fragment)?.[1];
  const oct = /<octave>(\d+)<\/octave>/.exec(fragment)?.[1];
  const altRaw = /<alter>(-?\d+)<\/alter>/.exec(fragment)?.[1];
  if (!step || !oct) return undefined;
  const alter = altRaw !== undefined ? parseInt(altRaw, 10) : 0;
  const base = STEP_PC[step];
  if (base === undefined) return undefined;
  const o = parseInt(oct, 10);
  return (o + 1) * 12 + base + alter;
}

function midiValuesFromPart(partXml: string): number[] {
  const out: number[] = [];
  const noteBlocks = partXml.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
  for (const nb of noteBlocks) {
    if (/<rest\b/.test(nb)) continue;
    const innerPitch = /<pitch\b[\s\S]*?<\/pitch>/.exec(nb)?.[0];
    if (!innerPitch) continue;
    const m = midiFromPitchXml(innerPitch);
    if (m !== undefined) out.push(m);
  }
  return out;
}

function testStringQuartetFourPartsAndClefsAndRanges(): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-sq-mx-'));
  try {
    const req = {
      presetId: 'guitar_bass_duo',
      seed: 91001,
      styleStack: { primary: 'barry_harris' },
      totalBars: 8,
      title: 'phase67 sq',
      instrumentGroup: 'string_quartet',
      skipDrumGuide: true,
    } as GenerateRequest;
    const res = generateComposition(req, dir);
    if (!res.success || !res.xml?.trim()) return false;
    const xml = res.xml;
    const partTags = xml.match(/<part id="/g) ?? [];
    if (partTags.length !== 4) return false;

    const va = extractPartXml(xml, 'sq_viola');
    if (!va.includes('<sign>C</sign>') || !va.includes('<line>3</line>')) return false;

    const vc = extractPartXml(xml, 'sq_cello');
    if (!vc.includes('<sign>F</sign>')) return false;

    const v = validateMusicXml(xml);
    if (!v.valid) return false;

    const ranges: Record<string, { lo: number; hi: number }> = {
      sq_violin_1: { lo: STRING_INSTRUMENTS.violin_I.rangeMin, hi: STRING_INSTRUMENTS.violin_I.rangeMax },
      sq_violin_2: { lo: STRING_INSTRUMENTS.violin_II.rangeMin, hi: STRING_INSTRUMENTS.violin_II.rangeMax },
      sq_viola: { lo: STRING_INSTRUMENTS.viola.rangeMin, hi: STRING_INSTRUMENTS.viola.rangeMax },
      sq_cello: { lo: STRING_INSTRUMENTS.cello.rangeMin, hi: STRING_INSTRUMENTS.cello.rangeMax },
    };
    for (const pid of Object.keys(ranges)) {
      const block = extractPartXml(xml, pid);
      const mids = midiValuesFromPart(block);
      const { lo, hi } = ranges[pid]!;
      for (const mm of mids) {
        if (mm < lo || mm > hi) return false;
      }
    }
    return true;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function testGuitarTabTechnicalAndDualStaff(): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-gtr-mx-'));
  try {
    const req = {
      presetId: 'guitar_bass_duo',
      seed: 92002,
      styleStack: { primary: 'barry_harris' },
      totalBars: 8,
      title: 'phase67 gtr',
      instrumentGroup: 'guitar',
      guitarOutputMode: 'both' as const,
      skipDrumGuide: true,
    } as GenerateRequest;
    const res = generateComposition(req, dir);
    if (!res.success || !res.xml?.trim()) return false;
    const xml = res.xml;
    if (!xml.includes('<staves>2</staves>')) return false;
    if (!xml.includes('<sign>TAB</sign>')) return false;
    const gtr = extractPartXml(xml, 'guitar');
    const noteBlocks = gtr.match(/<note\b[\s\S]*?<\/note>/g) ?? [];
    const staff2Notes = noteBlocks.filter((nb) => nb.includes('<staff>2</staff>'));
    if (staff2Notes.length === 0) return false;
    for (const nb of staff2Notes) {
      if (!/<technical>\s*<string>\s*\d+\s*<\/string>\s*<fret>\s*\d+\s*<\/fret>/.test(nb)) return false;
    }
    const v = validateMusicXml(xml);
    return v.valid;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function testGuitarVoicingSpanMax4(): boolean {
  const eff = 93003;
  const ctx = runGoldenPath(eff, {
    styleStack: mapAppStyleStackToEngine({ primary: 'barry_harris' }),
    presetId: 'guitar_bass_duo',
    totalBars: 8,
  }).context;
  const voicings = buildVoicingsForContext(ctx, eff);
  return voicings.length === 8 && voicings.every((x) => x.spanFrets <= 4);
}

export function runPhase67InstrumentGroupMusicXmlTests(): { name: string; ok: boolean }[] {
  return [
    ['Phase 6+7 — SQ instrumentGroup: 4 parts, clefs, ranges + validateMusicXml', testStringQuartetFourPartsAndClefsAndRanges],
    ['Phase 6+7 — Guitar TAB: dual staff + technical per tab note + validateMusicXml', testGuitarTabTechnicalAndDualStaff],
    ['Phase 6+7 — Guitar voicing span ≤ 4 semitones', testGuitarVoicingSpanMax4],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
