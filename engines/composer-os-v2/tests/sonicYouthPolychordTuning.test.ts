/**
 * Focused — optional guitar1Tuning / guitar2Tuning for SY polychord builders.
 */

import {
  buildSonicYouthOneBarPolychordScore,
  buildSonicYouthPolychordProgressionScore,
  SY_PROTO_ACCGGSHARP_C_OPEN,
  SY_PROTO_LEE_AAEEAA_OPEN,
} from '../core/song-mode/sonicYouthPolychordScore';
import { generateSonicYouthPolychordMusicXml } from '../core/song-mode/fullSongBrowserApi';
import { solveGuitarGrip } from '../core/guitar/voicingFeasibility';

const REF_PAIR = {
  guitar1: { rootPc: 2, quality: 'major' as const },
  guitar2: { rootPc: 4, quality: 'major' as const },
};

const TUNING_ERR =
  /tuning must contain six integer MIDI pitches in 0–127 \(string order 6→1\)$/;

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function midiToNoteOctave(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pc]!}${octave}`;
}

function expectedPartName(guitar: 'Guitar 1' | 'Guitar 2', opens: readonly number[]): string {
  return `${guitar} (${opens.map(midiToNoteOctave).join(' ')})`;
}

function partNameFromScore(
  score: { parts: readonly { id: string; name: string }[] },
  id: 'guitar' | 'guitar_2'
): string | undefined {
  return score.parts.find((p) => p.id === id)?.name;
}

function sameSix(a: readonly number[], b: readonly number[]): boolean {
  return a.length === 6 && b.length === 6 && a.every((n, i) => n === b[i]);
}

function sameArr(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

function catchMsg(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export function runSonicYouthPolychordTuningTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  // 1. Omitted tunings → AAEEAA / ACCGG#C
  {
    const one = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
    const prog = buildSonicYouthPolychordProgressionScore([REF_PAIR]);
    const xml = generateSonicYouthPolychordMusicXml([REF_PAIR]);
    out.push({
      name: 'omitted tunings retain AAEEAA / ACCGG#C defaults',
      ok:
        sameSix(one.guitar1OpenPitches, SY_PROTO_LEE_AAEEAA_OPEN) &&
        sameSix(one.guitar2OpenPitches, SY_PROTO_ACCGGSHARP_C_OPEN) &&
        sameSix(prog.guitar1OpenPitches, SY_PROTO_LEE_AAEEAA_OPEN) &&
        sameSix(prog.guitar2OpenPitches, SY_PROTO_ACCGGSHARP_C_OPEN) &&
        typeof xml === 'string' &&
        xml.includes('<score-partwise'),
    });
  }

  // 2. Valid six-integer MIDI (repeats + non-ascending) accepted
  {
    const repeated: number[] = [45, 45, 52, 52, 57, 57];
    const nonAsc: number[] = [60, 56, 55, 48, 48, 45];
    const bounds: number[] = [0, 0, 64, 64, 127, 127];
    let ok = true;
    try {
      const a = buildSonicYouthPolychordProgressionScore([REF_PAIR], {
        guitar1Tuning: repeated,
        guitar2Tuning: nonAsc,
      });
      ok =
        ok &&
        sameSix(a.guitar1OpenPitches, repeated) &&
        sameSix(a.guitar2OpenPitches, nonAsc);
      const g1 = solveGuitarGrip(a.bars[0]!.guitar1Pitches, { openStrings: repeated });
      const g2 = solveGuitarGrip(a.bars[0]!.guitar2Pitches, { openStrings: nonAsc });
      ok = ok && g1.feasible && g1.frets.length === 3 && g2.feasible && g2.frets.length === 3;

      const b = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2, {
        guitar1Tuning: bounds,
        guitar2Tuning: SY_PROTO_ACCGGSHARP_C_OPEN,
      });
      ok = ok && sameSix(b.guitar1OpenPitches, bounds);

      const xml = generateSonicYouthPolychordMusicXml([REF_PAIR], {
        guitar1Tuning: repeated,
        guitar2Tuning: nonAsc,
      });
      ok = ok && xml.includes('<score-partwise');
    } catch {
      ok = false;
    }
    out.push({
      name: 'valid six-integer MIDI tunings (repeats / non-ascending / 0–127) accepted',
      ok,
    });
  }

  // 3. Invalid length / fractional / negative / >127 → guitar-labelled reject
  {
    const cases: Array<{
      label: string;
      opts: { guitar1Tuning?: readonly number[]; guitar2Tuning?: readonly number[] };
      guitar: 'Guitar 1' | 'Guitar 2';
    }> = [
      { label: 'g1 short', opts: { guitar1Tuning: [45, 45, 52] }, guitar: 'Guitar 1' },
      { label: 'g1 long', opts: { guitar1Tuning: [45, 45, 52, 52, 57, 57, 60] }, guitar: 'Guitar 1' },
      {
        label: 'g1 fractional',
        opts: { guitar1Tuning: [45, 45.5, 52, 52, 57, 57] },
        guitar: 'Guitar 1',
      },
      {
        label: 'g1 negative',
        opts: { guitar1Tuning: [-1, 45, 52, 52, 57, 57] },
        guitar: 'Guitar 1',
      },
      {
        label: 'g1 >127',
        opts: { guitar1Tuning: [45, 45, 52, 52, 57, 128] },
        guitar: 'Guitar 1',
      },
      { label: 'g2 short', opts: { guitar2Tuning: [45, 48, 48] }, guitar: 'Guitar 2' },
      {
        label: 'g2 fractional',
        opts: { guitar2Tuning: [45, 48, 48, 55.2, 56, 60] },
        guitar: 'Guitar 2',
      },
      {
        label: 'g2 negative',
        opts: { guitar2Tuning: [45, 48, 48, 55, -3, 60] },
        guitar: 'Guitar 2',
      },
      {
        label: 'g2 >127',
        opts: { guitar2Tuning: [45, 48, 48, 55, 56, 200] },
        guitar: 'Guitar 2',
      },
    ];

    let ok = true;
    for (const c of cases) {
      const msg = catchMsg(() => buildSonicYouthPolychordProgressionScore([REF_PAIR], c.opts));
      if (!msg || !msg.startsWith(c.guitar) || !TUNING_ERR.test(msg) || msg.startsWith('bar ')) {
        ok = false;
        break;
      }
      const apiMsg = catchMsg(() => generateSonicYouthPolychordMusicXml([REF_PAIR], c.opts));
      if (
        !apiMsg ||
        !apiMsg.startsWith(c.guitar) ||
        !TUNING_ERR.test(apiMsg) ||
        apiMsg.startsWith('bar ')
      ) {
        ok = false;
        break;
      }
    }
    out.push({
      name: 'invalid tunings rejected with correct guitar id (len / frac / neg / >127)',
      ok,
    });
  }

  // 4. Existing solveGuitarGrip / grip-unavailable errors unchanged
  {
    const dead = [127, 127, 127, 127, 127, 127] as const;
    const oneMsg = catchMsg(() =>
      buildSonicYouthOneBarPolychordScore(
        { rootPc: 0, quality: 'major' },
        { rootPc: 4, quality: 'major' },
        { guitar1Tuning: dead }
      )
    );
    const progMsg = catchMsg(() =>
      buildSonicYouthPolychordProgressionScore(
        [{ guitar1: { rootPc: 0, quality: 'major' }, guitar2: { rootPc: 4, quality: 'major' } }],
        { guitar1Tuning: dead }
      )
    );
    const apiMsg = catchMsg(() =>
      generateSonicYouthPolychordMusicXml(
        [{ guitar1: { rootPc: 0, quality: 'major' }, guitar2: { rootPc: 4, quality: 'major' } }],
        { guitar1Tuning: dead }
      )
    );
    out.push({
      name: 'existing grip-unavailable errors unchanged (guitar + chord; bar prefix on progression)',
      ok:
        oneMsg === 'Guitar 1 grip unavailable for C major' &&
        progMsg === 'bar 1: Guitar 1 grip unavailable for C major' &&
        apiMsg === 'bar 1: Guitar 1 grip unavailable for C major',
    });
  }

  // 5. Default part labels = all six opens (6→1 note+octave); MusicXML <part-name>
  {
    const g1Label = expectedPartName('Guitar 1', SY_PROTO_LEE_AAEEAA_OPEN);
    const g2Label = expectedPartName('Guitar 2', SY_PROTO_ACCGGSHARP_C_OPEN);
    const one = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
    const prog = buildSonicYouthPolychordProgressionScore([REF_PAIR]);
    const xml = generateSonicYouthPolychordMusicXml([REF_PAIR]);
    out.push({
      name: 'default labels match six opens 6→1; both <part-name> in MusicXML',
      ok:
        g1Label === 'Guitar 1 (A2 A2 E3 E3 A3 A3)' &&
        g2Label === 'Guitar 2 (A2 C3 C3 G3 G#3 C4)' &&
        partNameFromScore(one.score, 'guitar') === g1Label &&
        partNameFromScore(one.score, 'guitar_2') === g2Label &&
        partNameFromScore(prog.score, 'guitar') === g1Label &&
        partNameFromScore(prog.score, 'guitar_2') === g2Label &&
        xml.includes(`<part-name>${g1Label}</part-name>`) &&
        xml.includes(`<part-name>${g2Label}</part-name>`),
    });
  }

  // 6. Custom tunings → correct labels; order 6→1; pitches/grip unchanged vs same opens
  {
    const customG1 = [38, 45, 53, 59, 55, 54] as const; // D2 A2 F3 B3 G3 F#3
    const customG2 = [47, 57, 48, 50, 54, 71] as const; // B2 A3 C3 D3 F#3 B4
    const g1Label = expectedPartName('Guitar 1', customG1);
    const g2Label = expectedPartName('Guitar 2', customG2);
    let ok = true;
    try {
      const baseline = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
      const oneExplicitDefault = buildSonicYouthOneBarPolychordScore(
        REF_PAIR.guitar1,
        REF_PAIR.guitar2,
        {
          guitar1Tuning: SY_PROTO_LEE_AAEEAA_OPEN,
          guitar2Tuning: SY_PROTO_ACCGGSHARP_C_OPEN,
        }
      );
      ok =
        ok &&
        sameArr(baseline.guitar1Pitches, oneExplicitDefault.guitar1Pitches) &&
        sameArr(baseline.guitar2Pitches, oneExplicitDefault.guitar2Pitches);

      const one = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2, {
        guitar1Tuning: customG1,
        guitar2Tuning: customG2,
      });
      const prog = buildSonicYouthPolychordProgressionScore([REF_PAIR], {
        guitar1Tuning: customG1,
        guitar2Tuning: customG2,
      });
      const xml = generateSonicYouthPolychordMusicXml([REF_PAIR], {
        guitar1Tuning: customG1,
        guitar2Tuning: customG2,
      });

      ok =
        ok &&
        g1Label === 'Guitar 1 (D2 A2 F3 B3 G3 F#3)' &&
        g2Label === 'Guitar 2 (B2 A3 C3 D3 F#3 B4)' &&
        partNameFromScore(one.score, 'guitar') === g1Label &&
        partNameFromScore(one.score, 'guitar_2') === g2Label &&
        partNameFromScore(prog.score, 'guitar') === g1Label &&
        partNameFromScore(prog.score, 'guitar_2') === g2Label &&
        sameSix(one.guitar1OpenPitches, customG1) &&
        sameSix(one.guitar2OpenPitches, customG2) &&
        xml.includes(`<part-name>${g1Label}</part-name>`) &&
        xml.includes(`<part-name>${g2Label}</part-name>`);

      const g1 = solveGuitarGrip(one.guitar1Pitches, { openStrings: customG1 });
      const g2 = solveGuitarGrip(one.guitar2Pitches, { openStrings: customG2 });
      ok =
        ok &&
        g1.feasible &&
        g1.frets.length === 3 &&
        g2.feasible &&
        g2.frets.length === 3 &&
        sameArr(one.guitar1Pitches, prog.bars[0]!.guitar1Pitches) &&
        sameArr(one.guitar2Pitches, prog.bars[0]!.guitar2Pitches);
    } catch {
      ok = false;
    }
    out.push({
      name: 'custom labels note+octave 6→1; MusicXML; grip/pitches stable',
      ok,
    });
  }

  return out;
}

if (require.main === module) {
  const results = runSonicYouthPolychordTuningTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  if (!results.every((r) => r.ok)) process.exit(1);
}
