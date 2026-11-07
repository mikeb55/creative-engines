/**
 * Focused — SY polychord MusicXML is ordinary five-line treble notation.
 * No six-line TAB staff-details / staff-tuning (breaks Sibelius on pitched staves).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { midiToPitch } from '../core/export/musicXmlNoteFragment';
import {
  buildSonicYouthOneBarPolychordScore,
  buildSonicYouthPolychordProgressionScore,
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

/** Ordinary five-line treble: G clef, no TAB / six-line staff-tuning metadata. */
function assertFiveLineTrebleNoTab(xml: string, partId: string): { ok: boolean; detail: string } {
  const body = partXml(xml, partId);
  const attrs = measure1Attributes(body);
  if (clefSign(attrs) !== 'G') {
    return { ok: false, detail: `${partId}: expected G clef, got ${clefSign(attrs)}` };
  }
  if (attrs.includes('<sign>TAB</sign>')) {
    return { ok: false, detail: `${partId}: unexpected TAB clef` };
  }
  if (attrs.includes('<staff-lines>6</staff-lines>')) {
    return { ok: false, detail: `${partId}: unexpected six-line staff` };
  }
  if (attrs.includes('<staff-tuning') || attrs.includes('<staff-details>')) {
    return { ok: false, detail: `${partId}: unexpected TAB staff-details/staff-tuning` };
  }
  if (hasTranspose(attrs)) {
    return { ok: false, detail: `${partId}: unexpected transpose` };
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

  // 1. Default tunings — one-bar + progression: five-line treble, no TAB metadata
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
        for (const id of ['guitar', 'guitar_2'] as const) {
          const r = assertFiveLineTrebleNoTab(xml, id);
          if (!r.ok) {
            ok = false;
            detail = `${label}: ${r.detail}`;
          }
        }
        if (xml.includes('<staff-lines>6</staff-lines>') || xml.includes('<staff-tuning')) {
          ok = false;
          detail = `${label}: document still has TAB staff-tuning metadata`;
        }
      }
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `default polychord export: five-line treble, no six-line TAB metadata${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 2. Custom tunings — same notation contract (tuning affects grips, not TAB staff)
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
        for (const id of ['guitar', 'guitar_2'] as const) {
          const r = assertFiveLineTrebleNoTab(xml, id);
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
      name: `custom-tuning polychord export: five-line treble, no TAB metadata${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 3. Notes + G clef preserved; no staff-tuning / transpose
  {
    let ok = true;
    let detail = '';
    try {
      const withMeta = buildSonicYouthOneBarPolychordScore(REF_PAIR.guitar1, REF_PAIR.guitar2);
      const notesBefore = {
        g1: withMeta.score.parts
          .find((p) => p.id === 'guitar')!
          .measures[0]!.events.filter((e) => e.kind === 'chord')
          .flatMap((e) => ('pitches' in e ? [...e.pitches] : [])),
        g2: withMeta.score.parts
          .find((p) => p.id === 'guitar_2')!
          .measures[0]!.events.filter((e) => e.kind === 'chord')
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
        !g1Attrs.includes('<staff-tuning') &&
        !g2Attrs.includes('<staff-tuning') &&
        !g1Attrs.includes('<staff-details>') &&
        !g2Attrs.includes('<staff-details>') &&
        g1Notes.length === notesBefore.g1.length &&
        g2Notes.length === notesBefore.g2.length;

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

      ok = ok && g1Attrs.includes('<clef>') && g2Attrs.includes('<clef>');
      if (!ok) detail = 'clef/notes/TAB-metadata regression';
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    out.push({
      name: `notes + G clef preserved; no staff-tuning on notation staff${detail ? ` (${detail})` : ''}`,
      ok,
    });
  }

  // 4. Exports without tuning metadata remain unchanged (no staff-tuning)
  {
    let ok = true;
    let detail = '';
    try {
      const fixture = buildIndieDualGuitarTuningFixtureScore();
      const xml = exportXml(fixture);
      ok = !xml.includes('<staff-tuning>') && !xml.includes('<staff-details>');
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
