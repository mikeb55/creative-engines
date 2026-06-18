/**
 * V97 — per-bar harmony override proof (MIDI advisory path).
 */

import { Midi } from '@tonejs/midi';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { apiRunLeadSheetFileInput } from '../app-api/runLeadSheetFileInputApi';
import { normalizeChordToken } from '../core/harmony/chordProgressionParser';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { runDebussyLeadSheetFileHandoffProof } from '../core/import/runDebussyLeadSheetFileHandoffProof';
import { buildLeadSheetHarmonyDisplayByBar } from '../core/import/applyLeadSheetHarmonyOverrides';

function buildEighthGridMelodyMidi(bars = 8): Uint8Array {
  const midi = new Midi();
  midi.header.tempos = [{ ticks: 0, bpm: 120 }];
  midi.header.update();
  const barSec = 2;
  const track = midi.addTrack();
  const pitch = [64, 65, 67, 69, 71, 72, 74, 76];
  for (let bar = 1; bar <= bars; bar++) {
    for (let beat = 0; beat < 4; beat += 0.5) {
      const start = (bar - 1) * barSec + beat * (barSec / 4);
      track.addNote({
        midi: pitch[(bar + Math.floor(beat)) % pitch.length]!,
        time: start,
        duration: (barSec / 4) * 0.95 * 0.5,
        velocity: 0.85,
      });
    }
  }
  return new Uint8Array(midi.toArray());
}

export function runLeadSheetHarmonyOverrideProofTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const tmpMid = path.join(os.tmpdir(), `cos-leadsheet-override-${Date.now()}.mid`);
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-leadsheet-override-out-'));
  fs.writeFileSync(tmpMid, buildEighthGridMelodyMidi(8));

  try {
    const baseline = runDebussyLeadSheetFileHandoffProof(tmpMid, 90108, 'debussy');
    const baselineImported = importTimelineToLockedHarmony(baseline.importTimeline);

    const proof = runDebussyLeadSheetFileHandoffProof(tmpMid, 90108, 'debussy', {
      harmonyOverridesByBar: { 3: 'Dm7' },
    });
    const imported = importTimelineToLockedHarmony(proof.importTimeline);
    const display = buildLeadSheetHarmonyDisplayByBar(proof.importTimeline);

    out.push({
      ok:
        proof.sourceFormat === 'midi' &&
        proof.harmonyAdvisoryOnly === true &&
        display.provenanceByBar[2] === 'user-override' &&
        display.provenanceByBar[0] === 'inferred-advisory' &&
        normalizeChordToken(imported[2] ?? '') === normalizeChordToken('Dm7') &&
        normalizeChordToken(imported[0] ?? '') === normalizeChordToken(baselineImported[0] ?? ''),
      name: 'handoff proof applies bar-3 Dm7 override with mixed provenance',
    });

    const apiRes = apiRunLeadSheetFileInput(
      { filePath: tmpMid, composerId: 'debussy', seed: 90108, harmonyOverridesByBar: { 3: 'Dm7' } },
      tmpOut
    );
    out.push({
      ok:
        apiRes.ok === true &&
        apiRes.harmonyProvenance === 'inferred-advisory' &&
        apiRes.harmonyProvenanceByBar?.[2] === 'user-override' &&
        apiRes.harmonyProvenanceByBar?.[0] === 'inferred-advisory',
      name: 'apiRunLeadSheetFileInput echoes override provenance by bar',
    });
  } catch (e) {
    out.push({
      ok: false,
      name: `leadSheetHarmonyOverrideProof: ${e instanceof Error ? e.message : String(e)}`,
    });
  } finally {
    fs.unlinkSync(tmpMid);
  }

  return out;
}

if (require.main === module) {
  const rows = runLeadSheetHarmonyOverrideProofTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
