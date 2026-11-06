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

function sameSix(a: readonly number[], b: readonly number[]): boolean {
  return a.length === 6 && b.length === 6 && a.every((n, i) => n === b[i]);
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

  return out;
}

if (require.main === module) {
  const results = runSonicYouthPolychordTuningTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  if (!results.every((r) => r.ok)) process.exit(1);
}
