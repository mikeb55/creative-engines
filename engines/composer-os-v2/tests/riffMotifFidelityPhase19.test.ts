/**
 * Phase 1.9 — phrase-seeded motif realization fidelity (prep before Phase 2).
 * Soft snap + global step cursor + motifW=1 for phrase:* only; procedural unchanged.
 */

import * as crypto from 'crypto';
import { generateRiffCoreMotif } from '../core/motif/songModeMotifEngine';
import type { CoreMotif } from '../core/motif/motifEngineTypes';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_MOTIF_BLEND_DEFAULT,
  RIFF_MOTIF_BLEND_PHRASE_SEED,
  assignMelodyToBar,
  isPhraseSeededCoreMotif,
  motifBlendWeightForPitchField,
} from '../core/riff-generator/riffMelody';
import { riffPitchFieldForBar } from '../core/riff-generator/riffPitchField';
import {
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  RIFF_SAX_MOTIF_SEED_POC_VRB,
  pickSaxInspiredPhraseForSeed,
  resetRiffSaxMotifSeedPocCacheForTests,
  resolveRiffCoreMotif,
  setRiffSaxMotifSeedPocPoolForTests,
} from '../core/riff-generator/riffSaxMotifSeedPoc';
import { loadSyntheticPhraseFixtures } from '../core/riff-generator/riffPhraseLibraryFixtures';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { mulberry32 } from '../core/riff-generator/riffRandom';
import type { RiffRhythmSegment } from '../core/riff-generator/riffTypes';

function sha(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function xmlOf(score: Parameters<typeof exportScoreModelToMusicXml>[0]): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) throw new Error(exp.errors.join('; ') || 'MusicXML export failed');
  return exp.xml;
}

function setFlag(on: boolean): void {
  if (on) process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
  else delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
  resetRiffSaxMotifSeedPocCacheForTests();
}

function buildWr(seed: number) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return buildRiffScoreModel({
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'WR Phase1.9 seed ' + seed,
    riffProfile: profile,
  });
}

function realizedIntervals(score: Parameters<typeof scoreModelToMelodicLine>[0]): number[] {
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const pitches = melody.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

function exactRate(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) hit++;
  return hit / n;
}

function fixedBar(nNotes: number): RiffRhythmSegment[] {
  const dur = 4 / nNotes;
  return Array.from({ length: nNotes }, (_, i) => ({
    startBeat: i * dur,
    duration: dur,
    rest: false,
  }));
}

export function runRiffMotifFidelityPhase19Tests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  out.push({
    ok:
      isPhraseSeededCoreMotif({ id: 'phrase:x' } as CoreMotif) &&
      !isPhraseSeededCoreMotif({ id: 'riff_core' } as CoreMotif) &&
      !isPhraseSeededCoreMotif(undefined) &&
      RIFF_MOTIF_BLEND_PHRASE_SEED === 1 &&
      RIFF_MOTIF_BLEND_DEFAULT === 0.55,
    name: 'Phase 1.9: phrase-seed gate + blend constants',
  });

  {
    setFlag(false);
    const seed = 424242;
    const a = xmlOf(buildWr(seed).score);
    const b = xmlOf(buildWr(seed).score);
    const motif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    out.push({
      ok: sha(a) === sha(b) && motif.id === 'riff_core',
      name: 'Phase 1.9: flag OFF procedural self-parity (weather_report)',
    });
  }

  {
    // Procedural: local step index unchanged (notes.length-1); global cursor is phrase-seed only
    setFlag(false);
    const motif = generateRiffCoreMotif(42);
    const field = riffPitchFieldForBar('Am7', 'neutral', undefined);
    const bar = fixedBar(7);
    const r1 = assignMelodyToBar(bar, 'Am7', 'neutral', mulberry32(99), 0, undefined, undefined, motif, field, 0);
    const r2a = assignMelodyToBar(
      bar,
      'Am7',
      'neutral',
      mulberry32(99),
      1,
      r1.notes[0]?.pitch,
      r1.lastPitch,
      motif,
      field,
      0
    );
    const r2b = assignMelodyToBar(
      bar,
      'Am7',
      'neutral',
      mulberry32(99),
      1,
      r1.notes[0]?.pitch,
      r1.lastPitch,
      motif,
      field,
      99
    );
    out.push({
      ok:
        r1.nextMotifStepIdx === 0 &&
        r2a.notes.map((n) => n.pitch).join(',') === r2b.notes.map((n) => n.pitch).join(','),
      name: 'Phase 1.9: procedural ignores motifStepIdx (local notes.length-1)',
    });
  }

  {
    const synthSax = loadSyntheticPhraseFixtures().find((e) => e.category === 'sax_inspired');
    setFlag(true);
    setRiffSaxMotifSeedPocPoolForTests(synthSax ? [synthSax] : null);
    const motif = resolveRiffCoreMotif(1, RIFF_SAX_MOTIF_SEED_POC_VRB);
    out.push({
      ok: !!synthSax && isPhraseSeededCoreMotif(motif) && motif.id === 'phrase:' + synthSax.id,
      name: 'Phase 1.9: seeded resolve yields phrase:* motif',
    });

    if (synthSax) {
      const field = riffPitchFieldForBar('Am7', 'metheny', undefined);
      // leap-peak field must NOT force motifW to 0 for phrase seed (separate from PR C)
      const leapField = {
        ...field,
        preferredIntervals: [
          { semitones: 7, weight: 0.9 },
          { semitones: 2, weight: 0.1 },
        ],
      };
      const bar = fixedBar(6);
      const seeded = assignMelodyToBar(
        bar,
        'Am7',
        'metheny',
        mulberry32(7),
        0,
        undefined,
        undefined,
        motif,
        leapField,
        0
      );
      // note0 = anchor; notes 1..5 should follow motif steps 0..4 exactly (motifW=1, no snap)
      const pitches = seeded.notes.map((n) => n.pitch);
      let exact = true;
      for (let i = 1; i < pitches.length; i++) {
        const expected = pitches[i - 1]! + motif.intervalPattern[(i - 1) % motif.intervalPattern.length]!;
        const clamped = Math.max(55, Math.min(76, expected));
        if (pitches[i] !== clamped) exact = false;
      }
      out.push({
        ok:
          exact &&
          motifBlendWeightForPitchField(leapField) === 0 &&
          seeded.nextMotifStepIdx === pitches.length - 1,
        name: 'Phase 1.9: seeded ignores PR C leap-skip; last+step clamp fidelity in-bar',
      });
    }
    setRiffSaxMotifSeedPocPoolForTests(null);
    setFlag(false);
  }

  {
    // Live corpus: ON fidelity must beat weak baseline (~0.1 exact / ~0 cosine)
    setFlag(true);
    resetRiffSaxMotifSeedPocCacheForTests();
    const seed = 424242;
    const phrase = pickSaxInspiredPhraseForSeed(seed);
    const built = buildWr(seed);
    const motif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    const realized = realizedIntervals(built.score);
    const ip = phrase?.intervalSequence ?? [];
    const cos = cosine(realized, ip);
    const exact = exactRate(realized, ip);
    out.push({
      ok: !!phrase && isPhraseSeededCoreMotif(motif) && cos >= 0.85 && exact >= 0.7,
      name: `Phase 1.9: seed 424242 ON fidelity cos=${cos.toFixed(3)} exact=${exact.toFixed(3)}`,
    });
    setFlag(false);
  }

  {
    // Non-seeded family smoke: flag OFF XML differs across VRBs but self-stable
    setFlag(false);
    const seeds = [42, 99];
    let ok = true;
    for (const vrbId of ['nile_rodgers', 'iommi', 'weather_report'] as const) {
      for (const seed of seeds) {
        const profile = resolveRiffGeneratorProfile({
          vrbId,
          style: 'neutral',
          grid: 'eighth',
          density: 'medium',
        });
        const a = xmlOf(
          buildRiffScoreModel({
            seed,
            bars: 4,
            density: 'medium',
            style: 'neutral',
            grid: 'eighth',
            lineMode: 'single_line',
            bassEnabled: false,
            vrbId,
            chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7'],
            bpm: 100,
            title: 'reg',
            riffProfile: profile,
          }).score
        );
        const b = xmlOf(
          buildRiffScoreModel({
            seed,
            bars: 4,
            density: 'medium',
            style: 'neutral',
            grid: 'eighth',
            lineMode: 'single_line',
            bassEnabled: false,
            vrbId,
            chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7'],
            bpm: 100,
            title: 'reg',
            riffProfile: profile,
          }).score
        );
        if (sha(a) !== sha(b)) ok = false;
      }
    }
    out.push({ ok, name: 'Phase 1.9: non-seeded nile/iommi/WR self-hash stable' });
  }

  setFlag(false);
  return out;
}

if (require.main === module) {
  for (const r of runRiffMotifFidelityPhase19Tests()) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
}
