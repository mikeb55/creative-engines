/**
 * Focused — MusicXML <staff-tuning> export for SY polychord scores.
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { midiToPitch } from '../core/export/musicXmlNoteFragment';
import {
  buildSonicYouthOneBarPolychordScore,
  buildSonicYouthPolychordProgressionScore,
  SY_PROTO_ACCGGSHARP_C_OPEN,
  SY_PROTO_LEE_AAEEAA_OPEN,
} from '../core/song-mode/sonicYouthPolychordScore';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { buildIndieDualGuitarTuningFixtureScore } from '../core/song-mode/indieDualGuitarTuningFixture';

const REF_PAIR = {
  guitar1: { rootPc: 2, quality: 'major' as const },
  guitar2: { rootPc: 4, quality: 'major' as const },
};

const CUSTOM_G1 = [40, 45, 50, 55, 59, 64] as const; // E2 A2 D3 G3 B3 E4-ish variant
const CUSTOM_G2 = [45, 48, 48, 55, 56, 60] as const; // ACCGG#C (has alter)

function partXml(xml: string, partId: string): string {
  const m = xml.match(new RegExp(`<part id="${partId}">([\\s\\S]*?)</part>`));
  return m?.[1] ?? '';
}

function measure1Attributes(partBody: string): string {
  const m = partBody.match(/<measure number="1">([\s\S]*?)<\/measure>/);
  if (!m) return '';
  const attrs = m[1]!.match(/<attributes>([\s\S]*?)<\/attributes>/);
  return attrs?.[1] ?? '';
}

function parseStaffTunings(
  attrs: string
): Array<{ line: number; step: string; alter: number; octave: number }> {
  const out: Array<{ line: number; step: string; alter: number; octave: number }> = [];
  const re =
    /<staff-tuning line="(\d+)">\s*<tuning-step>([A-G])<\/tuning-step>(?:\s*<tuning-alter>(-?\d+)<\/tuning-alter>)?\s*<tuning-octave>(-?\d+)<\/tuning-octave>\s*<\/staff-tuning>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs)) !== null) {
    out.push({
      line: Number(m[1]),
      step: m[2]!,
      alter: m[3] !== undefined ? Number(m[3]) : 0,
      octave: Number(m[4]),
    });
  }
  return out;
}

function expectedTunings(opens6to1: readonly number[]): Array<{
  line: number;
  step: string;
  alter: number;
  octave: number;
}> {
  const out = [];
  for (let line = 1; line <= 6; line++) {
    const midi = opens6to1[6 - line]!;
    const { step, alter, octave } = midiToPitch(midi, false);
    out.push({ line, step, alter, octave });
  }
  return out;
}

function sameTuning(
  a: Array<{ line: number; step: string; alter: number; octave: number }>,
  b: Array<{ line: number; step: string; alter: number; octave: number }>
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (t, i) =>
        t.line === b[i]!.line &&
        t.step === b[i]!.step &&
        t.alter === b[i]!.alter &&
        t.octave === b[i]!.octave
    )
  );
}

function extractPitchedNotes(partBody: string): string[] {
  const notes: string[] = [];
  const re =
    /<pitch>\s*<step>([A-G])<\/step>\s*(?:<alter>(-?\d+)<\/alter>\s*)?<octave>(-?\d+)<\/octave>\s*<\/pitch>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(partBody)) !== null) {
    notes.push(`${m[1]}:${m[2] ?? '0'}:${m[3]}`);
  }
  return notes;
}

function clefSign(attrs: string): string | null {
  return attrs.match(/<clef[^>]*>\s*<sign>([^<]+)<\/sign>/)?.[1] ?? null;
}

function hasTranspose(attrs: string): boolean {
  return attrs.includes('<transpose>');
}

function assertPartStaffTuning(
  xml: string,
  partId: string,
  opens6to1: readonly number[]
): { ok: boolean; detail: string } {
  const body = partXml(xml, partId);
  const attrs = measure1Attributes(body);
  if (!attrs.includes('<staff-details>') || !attrs.includes('<staff-lines>6</staff-lines>')) {
    return { ok: false, detail: `${partId}: missing staff-details/staff-lines` };
  }
  const got = parseStaffTunings(attrs);
  if (got.length !== 6) {
    return { ok: false, detail: `${partId}: expected 6 staff-tuning, got ${got.length}` };
  }
  if (got[0]!.line !== 1 || got[5]!.line !== 6) {
    return { ok: false, detail: `${partId}: lines not 1..6` };
  }
  const exp = expectedTunings(opens6to1);
  // line 1 = high string = opens[5]; line 6 = low = opens[0]
  const highMidi = opens6to1[5]!;
  const lowMidi = opens6to1[0]!;
  const high = midiToPitch(highMidi, false);
  const low = midiToPitch(lowMidi, false);
  if (got[0]!.step !== high.step || got[0]!.octave !== high.octave || got[0]!.alter !== high.alter) {
    return { ok: false, detail: `${partId}: line 1 not high string` };
  }
  if (got[5]!.step !== low.step || got[5]!.octave !== low.octave || got[5]!.alter !== low.alter) {
    return { ok: false, detail: `${partId}: line 6 not low string` };
  }
  if (!sameTuning(got, exp)) {
    return { ok: false, detail: `${partId}: step/alter/octave mismatch` };
  }
  return { ok: true, detail: 'ok' };
}

function exportXml(score: ScoreModel): string {
  const r = exportScoreModelToMusicXml(score, { bpm: score.tempo ?? 96 });
  if (!r.success || !r.xml) throw new Error(`export failed: ${r.errors?.join('; ') ?? 'no xml'}`);
  return r.xml;
}

export function runSonicYouthPolychordStaffTuningExportTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  // 1–4. Default tunings — one-bar + progression, both guitars
  {
    const one = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
    const prog = buildSonicYouthPolychordProgressionScore([REF_PAIR, REF_PAIR]);
    let ok = true;
    let detail = '';
    try {
      const oneXml = exportXml(one.score);
      const progXml = exportXml(prog.score);
      for (const [xml, label] of [
        [oneXml, 'one-bar-default'],
        [progXml, 'prog-default'],
      ] as const) {
        for (const [id, opens] of [
          ['guitar', SY_PROTO_LEE_AAEEAA_OPEN],
          ['guitar_2', SY_PROTO_ACCGGSHARP_C_OPEN],
        ] as const) {
          const r = assertPartStaffTuning(xml, id, opens);
          if (!r.ok) {
            ok = false;
            detail = `${label}: ${r.detail}`;
          }
        }
      }
      // G# alter present on guitar 2 default (MIDI 56)
      ok =
        ok &&
        /<staff-tuning line="2">[\s\S]*?<tuning-step>G<\/tuning-step>\s*<tuning-alter>1<\/tuning-alter>\s*<tuning-octave>3<\/tuning-octave>/.test(
          partXml(oneXml, 'guitar_2')
        );
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `default tunings: six staff-tuning/guitar, line1=high line6=low, pitch match${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 1–4. Custom tunings
  {
    let ok = true;
    let detail = '';
    try {
      const one = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2, {
        guitar1Tuning: CUSTOM_G1,
        guitar2Tuning: CUSTOM_G2,
      });
      const prog = buildSonicYouthPolychordProgressionScore([REF_PAIR], {
        guitar1Tuning: CUSTOM_G1,
        guitar2Tuning: CUSTOM_G2,
      });
      const oneXml = exportXml(one.score);
      const progXml = exportXml(prog.score);
      for (const xml of [oneXml, progXml]) {
        for (const [id, opens] of [
          ['guitar', CUSTOM_G1],
          ['guitar_2', CUSTOM_G2],
        ] as const) {
          const r = assertPartStaffTuning(xml, id, opens);
          if (!r.ok) {
            ok = false;
            detail = r.detail;
          }
        }
      }
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `custom tunings match supplied MIDI in one-bar + progression${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 5. Notes, clef, transpose unchanged (staff-tuning additive)
  {
    let ok = true;
    let detail = '';
    try {
      const withMeta = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
      const notesBefore = {
        g1: withMeta.score.parts.find((p) => p.id === 'guitar')!.measures[0]!.events
          .filter((e) => e.kind === 'chord')
          .flatMap((e) => ('pitches' in e ? [...e.pitches] : [])),
        g2: withMeta.score.parts.find((p) => p.id === 'guitar_2')!.measures[0]!.events
          .filter((e) => e.kind === 'chord')
          .flatMap((e) => ('pitches' in e ? [...e.pitches] : [])),
      };
      const xml = exportXml(withMeta.score);
      const g1Attrs = measure1Attributes(partXml(xml, 'guitar'));
      const g2Attrs = measure1Attributes(partXml(xml, 'guitar_2'));
      const g1Notes = extractPitchedNotes(partXml(xml, 'guitar'));
      const g2Notes = extractPitchedNotes(partXml(xml, 'guitar_2'));

      ok =
        clefSign(g1Attrs) === 'G' &&
        clefSign(g2Attrs) === 'G' &&
        !hasTranspose(g1Attrs) &&
        !hasTranspose(g2Attrs) &&
        g1Notes.length === notesBefore.g1.length &&
        g2Notes.length === notesBefore.g2.length;

      // Exported pitches match model MIDI
      const modelToTokens = (midis: number[]) =>
        midis.map((m) => {
          const p = midiToPitch(m, false);
          return `${p.step}:${p.alter}:${p.octave}`;
        });
      const g1Exp = modelToTokens(notesBefore.g1).sort().join('|');
      const g2Exp = modelToTokens(notesBefore.g2).sort().join('|');
      ok =
        ok &&
        [...g1Notes].sort().join('|') === g1Exp &&
        [...g2Notes].sort().join('|') === g2Exp;

      // staff-tuning present alongside clef
      ok = ok && g1Attrs.includes('<staff-tuning') && g1Attrs.includes('<clef>');
      if (!ok) detail = 'clef/transpose/notes regression';
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `notes, clef, transpose preserved with staff-tuning${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 6. Exports without tuning metadata remain unchanged (no staff-tuning)
  {
    let ok = true;
    let detail = '';
    try {
      const fixture = buildIndieDualGuitarTuningFixtureScore();
      const xml = exportXml(fixture);
      ok = !xml.includes('<staff-tuning>') && !xml.includes('<staff-details>');
      // Still has clefs / notes
      ok =
        ok &&
        partXml(xml, 'guitar').includes('<clef>') &&
        extractPitchedNotes(partXml(xml, 'guitar')).length > 0;
      if (!ok) detail = 'indie fixture unexpectedly emitted staff-tuning';
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `exports without exportStaffTuningByPartId emit no staff-tuning${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  return out;
}

if (require.main === module) {
  const results = runSonicYouthPolychordStaffTuningExportTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`TOTAL ${pass}/${results.length} pass, ${fail} fail`);
  if (!results.every((r) => r.ok)) process.exit(1);
}
