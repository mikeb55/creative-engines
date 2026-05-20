/**
 * Riff Generator — internal composite gate, export sanity, honest app naming.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import { normalizeChordLoop } from '../core/riff-generator/riffChordLoop';
import { parseChordsFromPipeDelimited } from '../core/harmony/chordProgressionParser';
import { runRiffGeneratorApp } from '../app-api/riffGeneratorApp';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { manifestPathForMusicXml } from '../app-api/composerOsOutputPaths';
import { runRiffQualityRulesSuite } from './riffQualityRules.test';
import { rhythmFingerprint } from '../core/riff-generator/riffRhythm';

function countMelodicNotes(score: ScoreModel): number {
  let n = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') n++;
      }
    }
  }
  return n;
}

function barsWithNotes(score: ScoreModel): number {
  let b = 0;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  for (const m of g.measures) {
    if (m.events.some((e) => e.kind === 'note')) b++;
  }
  return b;
}

function firstAndLastGuitarPitchClass(score: ScoreModel): { firstPc: number; lastPc: number } | null {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return null;
  const notes: number[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const voice = (e as { voice?: number }).voice ?? 1;
      if (voice !== 1) continue;
      notes.push((e as { pitch: number }).pitch);
    }
  }
  if (notes.length < 2) return null;
  return {
    firstPc: ((notes[0] % 12) + 12) % 12,
    lastPc: ((notes[notes.length - 1] % 12) + 12) % 12,
  };
}

function offbeatAttackCount(perBarRhythm: { startBeat: number; rest: boolean }[][]): number {
  let n = 0;
  for (const bar of perBarRhythm) {
    for (const s of bar) {
      if (s.rest) continue;
      if (Math.abs(s.startBeat - Math.round(s.startBeat)) > 0.11) n++;
    }
  }
  return n;
}

export function runRiffGeneratorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const prog =
      'Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9';
    const parsed = parseChordsFromPipeDelimited(prog);
    const loop = normalizeChordLoop(prog, 8);
    const okParse = parsed.length === 8 && parsed.every((e) => e != null);
    const okLoop =
      loop.length === 8 &&
      loop[4]!.replace(/\s+/g, '').toLowerCase().startsWith('f#m') &&
      loop[5]!.replace(/\s+/g, '').toLowerCase().startsWith('bmaj');
    out.push({
      ok: okParse && okLoop,
      name: 'normalizeChordLoop: 8-chord external progression preserves bars 5–8 (no 4-chord cap)',
    });
  }

  {
    const prog =
      'Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9';
    const r = runRiffGenerator(4242, {
      bars: 8,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'ChordProg',
      chordProgressionText: prog,
    });
    const g = r.success ? r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar') : undefined;
    const harmonies = g?.measures.map((m) => (m.chord ?? '').replace(/\s+/g, '')) ?? [];
    const ok =
      r.success === true &&
      harmonies.length === 8 &&
      harmonies[4]!.toLowerCase().includes('f#m') &&
      harmonies[5]!.toLowerCase().includes('bmaj');
    out.push({
      ok,
      name: 'runRiffGenerator: external 8-bar chord progression on score measures (not Am7 vamp)',
    });
  }

  {
    const seed = 1701;
    const neutral = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Neutral',
    });
    const scofield = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'scofield',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Sco',
    });
    const funk = runRiffGenerator(seed, {
      bars: 2,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style2Funk',
    });
    const nNeutral = neutral.success ? offbeatAttackCount(neutral.perBarRhythm) : -1;
    const nSco = scofield.success ? offbeatAttackCount(scofield.perBarRhythm) : -1;
    const nFunk = funk.success ? offbeatAttackCount(funk.perBarRhythm) : -1;
    const ok = neutral.success && scofield.success && funk.success && nSco >= nNeutral && nFunk >= nSco;
    out.push({
      ok,
      name: 'runRiffGenerator: 2-bar style profile yields neutral<=scofield<=funk offbeat attack count',
    });
  }

  {
    const seed = 1701;
    const neutral = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Neutral',
    });
    const scofield = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'scofield',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Sco',
    });
    const funk = runRiffGenerator(seed, {
      bars: 4,
      density: 'medium',
      style: 'funk',
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 102,
      title: 'Style4Funk',
    });
    const nNeutral = neutral.success ? offbeatAttackCount(neutral.perBarRhythm) : -1;
    const nSco = scofield.success ? offbeatAttackCount(scofield.perBarRhythm) : -1;
    const nFunk = funk.success ? offbeatAttackCount(funk.perBarRhythm) : -1;
    const ok = neutral.success && scofield.success && funk.success && nSco >= nNeutral && nFunk >= nSco;
    out.push({
      ok,
      name: 'runRiffGenerator: 4-bar style profile yields neutral<=scofield<=funk offbeat attack count',
    });
  }

  {
    const r = runRiffGenerator(811, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 104,
      title: 'CallResponse',
    });
    const fps = r.success ? r.perBarRhythm.map((bar) => rhythmFingerprint(bar)) : [];
    const distinct = new Set(fps).size;
    const ok =
      r.success === true &&
      fps.length === 4 &&
      distinct >= 2 &&
      fps[0] !== fps[1] &&
      fps[0] === fps[2];
    out.push({
      ok,
      name: 'runRiffGenerator: 4-bar rhythm uses A/B call-response contrast with A recall',
    });
  }

  {
    const r = runRiffGenerator(1307, {
      bars: 4,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 104,
      title: 'ClosureCadence',
    });
    const pcs = r.success ? firstAndLastGuitarPitchClass(r.score) : null;
    const ok = r.success === true && pcs != null && pcs.firstPc === pcs.lastPc;
    out.push({
      ok,
      name: 'runRiffGenerator: final melodic pitch class cadences to opening pitch class in 4-bar loop',
    });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Smoke',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const barsOk = r.success ? barsWithNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 4 &&
      barsOk >= 2 &&
      r.xml.includes('<score-partwise') &&
      r.xml.includes('Riff') &&
      r.score.title === 'Smoke' &&
      r.xml.includes('<work-title>Smoke</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator seed 0 passes internal riff composite gate and exports XML',
    });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'guitar_bass',
      bassEnabled: true,
      bpm: 100,
      title: 'Bass',
    });
    const notes = r.success ? countMelodicNotes(r.score) : 0;
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      notes >= 6 &&
      r.xml.includes('Upright Bass') &&
      r.xml.includes('midi-program') &&
      r.score.title === 'Bass' &&
      r.xml.includes('<work-title>Bass</work-title>');
    out.push({
      ok,
      name: 'runRiffGenerator guitar+bass mode exports with bass part',
    });
  }

  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-riff-app-'));
    try {
      const baseStyle = {
        primary: 'barry_harris' as const,
        styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
      };
      const r = runRiffGeneratorApp(
        {
          presetId: 'riff_generator',
          styleStack: baseStyle,
          seed: 101,
          title: 'ManifestTrust',
          totalBars: 2,
          riffStyle: 'neutral',
          riffDensity: 'medium',
          riffGrid: 'eighth',
          riffLineMode: 'single_line',
          riffBass: false,
          bpm: 100,
        },
        tmp
      );
      let ok =
        r.success &&
        !!r.filename &&
        !r.filename.includes('GCE') &&
        r.filename.includes('seed101') &&
        r.filename.includes('neutral') &&
        r.filename.endsWith('-2b.musicxml');
      ok = ok && r.validation?.behaviourGatesPassed === false && r.validation?.readiness?.shareable === false;
      if (ok && r.filepath && fs.existsSync(r.filepath)) {
        const mp = manifestPathForMusicXml(r.filepath);
        const raw = fs.readFileSync(mp, 'utf-8');
        const mj = JSON.parse(raw) as {
          validation?: { behaviourGates?: boolean; shareable?: boolean };
          riffCompositeScore?: number;
          riffInternalGatePassed?: boolean;
          riffQualityRules?: { aggregatePass?: boolean; rules?: unknown[] };
          seed?: number;
          gceScore?: number;
        };
        ok =
          mj.validation?.behaviourGates === false &&
          mj.validation?.shareable === false &&
          typeof mj.riffCompositeScore === 'number' &&
          mj.riffCompositeScore !== undefined &&
          mj.riffInternalGatePassed === true &&
          mj.seed === 101 &&
          mj.gceScore === undefined &&
          typeof mj.riffQualityRules?.aggregatePass === 'boolean' &&
          (mj.riffQualityRules?.rules?.length ?? 0) >= 8;
      } else {
        ok = false;
      }
      out.push({ ok, name: 'runRiffGeneratorApp: filenames neutral; manifest honest (no duo GCE mimicry)' });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  return [...out, ...runRiffQualityRulesSuite()];
}
