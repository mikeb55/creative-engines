/**
 * Focused — major/minor/diminished/augmented triad support for SY polychord builders.
 */

import {
  buildSonicYouthOneBarPolychordScore,
  buildSonicYouthPolychordProgressionScore,
  SY_PROTO_ACCGGSHARP_C_OPEN,
  SY_PROTO_LEE_AAEEAA_OPEN,
  type SyProtoTriadQuality,
} from '../core/song-mode/sonicYouthPolychordScore';
import { generateSonicYouthPolychordMusicXml } from '../core/song-mode/fullSongBrowserApi';
import { QUALITY_INTERVALS } from '../core/wwh/wwhTriadPair';
import { runSonicYouthPolychordTuningTests } from './sonicYouthPolychordTuning.test';

const QUALITIES: readonly SyProtoTriadQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
];

const EXPECTED_PCS: Record<SyProtoTriadQuality, readonly [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
};

const STEP_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function normalizePc(n: number): number {
  return ((n % 12) + 12) % 12;
}

function sortedPcs(midis: readonly number[]): number[] {
  return [...new Set(midis.map((m) => normalizePc(m)))].sort((a, b) => a - b);
}

function expectedPcs(rootPc: number, quality: SyProtoTriadQuality): number[] {
  const root = normalizePc(rootPc);
  const { third, fifth } = QUALITY_INTERVALS[quality];
  return [root, normalizePc(root + third), normalizePc(root + fifth)].sort((a, b) => a - b);
}

function sameArr(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

function midiFromXmlPitch(step: string, alter: number, octave: number): number {
  return (octave + 1) * 12 + (STEP_PC[step] ?? 0) + alter;
}

function midisFromMusicXml(xml: string): number[] {
  const out: number[] = [];
  const re =
    /<pitch>\s*<step>([A-G])<\/step>\s*(?:<alter>(-?\d+)<\/alter>\s*)?<octave>(\d+)<\/octave>\s*<\/pitch>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(midiFromXmlPitch(m[1]!, m[2] ? Number(m[2]) : 0, Number(m[3])));
  }
  return out;
}

function catchMsg(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export function runSonicYouthPolychordTriadQualityTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  // 1. Major [0,4,7] and minor [0,3,7] unchanged (root C)
  {
    let ok = true;
    for (const q of ['major', 'minor'] as const) {
      const built = buildSonicYouthOneBarPolychordScore(
        { rootPc: 0, quality: q },
        { rootPc: 0, quality: q }
      );
      const exp = [...EXPECTED_PCS[q]];
      ok =
        ok &&
        sameArr(sortedPcs(built.guitar1Pitches), exp) &&
        sameArr(sortedPcs(built.guitar2Pitches), exp) &&
        sameArr(exp, [0, QUALITY_INTERVALS[q].third, QUALITY_INTERVALS[q].fifth]);
    }
    out.push({
      name: 'major [0,4,7] and minor [0,3,7] unchanged',
      ok,
    });
  }

  // 2. Diminished [0,3,6] and augmented [0,4,8] (root C)
  {
    let ok = true;
    for (const q of ['diminished', 'augmented'] as const) {
      const built = buildSonicYouthOneBarPolychordScore(
        { rootPc: 0, quality: q },
        { rootPc: 0, quality: q }
      );
      const exp = [...EXPECTED_PCS[q]];
      ok =
        ok &&
        sameArr(sortedPcs(built.guitar1Pitches), exp) &&
        sameArr(sortedPcs(built.guitar2Pitches), exp) &&
        sameArr(exp, [0, QUALITY_INTERVALS[q].third, QUALITY_INTERVALS[q].fifth]);
    }
    out.push({
      name: 'diminished [0,3,6] and augmented [0,4,8]',
      ok,
    });
  }

  // 3. Both guitars accept all four qualities (mixed roots / qualities)
  {
    let ok = true;
    const roots = [0, 2, 4, 5, 7, 9];
    for (const q1 of QUALITIES) {
      for (const q2 of QUALITIES) {
        const root1 = roots[QUALITIES.indexOf(q1)]!;
        const root2 = roots[(QUALITIES.indexOf(q2) + 2) % roots.length]!;
        try {
          const built = buildSonicYouthOneBarPolychordScore(
            { rootPc: root1, quality: q1 },
            { rootPc: root2, quality: q2 }
          );
          ok =
            ok &&
            built.guitar1Pitches.length === 3 &&
            built.guitar2Pitches.length === 3 &&
            sameArr(sortedPcs(built.guitar1Pitches), expectedPcs(root1, q1)) &&
            sameArr(sortedPcs(built.guitar2Pitches), expectedPcs(root2, q2));
        } catch {
          ok = false;
        }
        if (!ok) break;
      }
      if (!ok) break;
    }
    out.push({
      name: 'both guitars accept all four qualities',
      ok,
    });
  }

  // 4. MusicXML contains correct generated pitches
  {
    const pair = {
      guitar1: { rootPc: 0, quality: 'diminished' as const },
      guitar2: { rootPc: 0, quality: 'augmented' as const },
    };
    const built = buildSonicYouthOneBarPolychordScore(pair.guitar1, pair.guitar2);
    const xml = generateSonicYouthPolychordMusicXml([pair]);
    const xmlMidis = midisFromMusicXml(xml);
    const expected = [...built.guitar1Pitches, ...built.guitar2Pitches];
    out.push({
      name: 'MusicXML contains correct generated pitches',
      ok:
        xml.includes('<score-partwise') &&
        xmlMidis.length === 6 &&
        sameArr(xmlMidis, expected) &&
        sameArr(sortedPcs(built.guitar1Pitches), [...EXPECTED_PCS.diminished]) &&
        sameArr(sortedPcs(built.guitar2Pitches), [...EXPECTED_PCS.augmented]),
    });
  }

  // 5. Custom tunings + grip-error reporting remain intact
  {
    const tuningRows = runSonicYouthPolychordTuningTests();
    const dead = [127, 127, 127, 127, 127, 127] as const;
    const dimMsg = catchMsg(() =>
      buildSonicYouthOneBarPolychordScore(
        { rootPc: 0, quality: 'diminished' },
        { rootPc: 4, quality: 'augmented' },
        { guitar1Tuning: dead }
      )
    );
    const augProgMsg = catchMsg(() =>
      buildSonicYouthPolychordProgressionScore(
        [
          {
            guitar1: { rootPc: 0, quality: 'augmented' },
            guitar2: { rootPc: 4, quality: 'diminished' },
          },
        ],
        { guitar1Tuning: dead }
      )
    );
    const custom = buildSonicYouthOneBarPolychordScore(
      { rootPc: 2, quality: 'diminished' },
      { rootPc: 4, quality: 'augmented' },
      {
        guitar1Tuning: SY_PROTO_LEE_AAEEAA_OPEN,
        guitar2Tuning: SY_PROTO_ACCGGSHARP_C_OPEN,
      }
    );
    out.push({
      name: 'custom tunings and grip-error reporting remain intact',
      ok:
        tuningRows.every((r) => r.ok) &&
        dimMsg === 'Guitar 1 grip unavailable for C diminished' &&
        augProgMsg === 'bar 1: Guitar 1 grip unavailable for C augmented' &&
        sameArr(custom.guitar1OpenPitches, SY_PROTO_LEE_AAEEAA_OPEN) &&
        sameArr(custom.guitar2OpenPitches, SY_PROTO_ACCGGSHARP_C_OPEN),
    });
  }

  return out;
}

if (require.main === module) {
  const results = runSonicYouthPolychordTriadQualityTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  const pass = results.filter((r) => r.ok).length;
  console.log(`${pass}/${results.length} PASS`);
  if (!results.every((r) => r.ok)) process.exit(1);
}
