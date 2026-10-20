/**
 * V4.0 Phase 4B — opt-in mosaic rhythm on 48-bar piano source (legacy default unchanged).
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/tests/fortyEightBarRhythmicSource.test.ts
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  FORTY_EIGHT_BAR_EXAMPLE_SEED,
  buildFortyEightBarPianoSourceMusicXml,
  planFortyEightBarForm,
  planFortyEightBarMotifDevelopment,
  symphonicPhrasesFromFortyEightBarPlan,
} from '../core/form/macroFormPlanner';
import { applyDerivedTransform as mosaicApplyDerivedTransform } from '../core/mosaic-mode/mosaicMotifEngine';
import { orchestrate } from '../core/orchestrate/orchestrate';
import { auditPhase2Distribution } from '../core/orchestrate/symphonicDistribution';
import type { SymphonicOrchestrationSettings } from '../core/orchestrate/types';
import { ingestCanonicalScore, type CanonicalEvent } from '../core/musical-evaluation/canonicalScore';

const ROOT = path.resolve(__dirname, '../../..');
const RESCUE_C_BASELINE_PATH = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony-rescue-c.musicxml');
const RESCUE_C_SHA256 = '27152e9f1d573a3d72095f22cb6aa670a0e45f8e8171b4be0a9e161550f53837';
const RHYTHMIC_SOURCE_EXPORT_PATH = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony-rhythmic-source.musicxml');
const RHYTHMIC_ORCHESTRATED_EXPORT_PATH = path.join(
  ROOT,
  'docs/v4.0-phase4b/forty-eight-bar-symphony-rhythmic-orchestrated.musicxml',
);

const SYMPHONIC_SETTINGS: SymphonicOrchestrationSettings = {
  allocation: 'phase-2',
  expression: 'expressive',
  activity: 'moderate',
  foreground: 'source-register',
  counterline: 'when-source-allows',
  families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' },
};

const A_PRIME_RHYTHM_TRANSFORM = {
  intervalNudge: 0,
  intervalClamp: 12,
  rhythmScale: 0.75,
  onsetDisplace: true,
  preserveContour: true,
  preserveSalientLeap: true,
};

function qNum(rational: { n: number; d: number }): number {
  return rational.n / rational.d;
}

function verifyRescueCBaselineUntouched(): void {
  const xml = readFileSync(RESCUE_C_BASELINE_PATH, 'utf8');
  const hash = createHash('sha256').update(xml).digest('hex');
  assert.equal(hash, RESCUE_C_SHA256, 'Rescue C baseline hash mismatch — locked score must not change');
}

function melodyVoiceOneEvents(xml: string, bar: number): CanonicalEvent[] {
  const score = ingestCanonicalScore(xml).score;
  assert(score, 'source MusicXML must parse');
  return score.sourceEvents.filter(
    (event) => event.bar === bar && event.staff === '1' && event.voice === '1' && !event.chord,
  );
}

function bassPedalMidi(xml: string, bar: number): number | null {
  const score = ingestCanonicalScore(xml).score;
  assert(score, 'source MusicXML must parse');
  const bass = score.sourceEvents.find(
    (event) => event.bar === bar && event.staff === '2' && !event.rest && event.soundingMidi !== null,
  );
  return bass?.soundingMidi ?? null;
}

function pitchedMelodyTailQuarters(events: readonly CanonicalEvent[]): number {
  let pitchedEnd = 0;
  for (const event of events) {
    if (event.rest) continue;
    pitchedEnd = Math.max(pitchedEnd, qNum(event.onsetInBar) + qNum(event.duration));
  }
  return Math.max(0, 4 - pitchedEnd);
}

function rhythmPatternKey(rhythm: readonly { startBeat: number; duration: number }[]): string {
  return rhythm.map((row) => `${row.startBeat}:${row.duration}`).join(',');
}

function barOf(onset: number): number {
  return Math.floor(onset / 4) + 1;
}

export function runFortyEightBarRhythmicSourceTest(): {
  ok: boolean;
  name: string;
  sourceExportPath: string;
  orchestratedExportPath: string;
} {
  verifyRescueCBaselineUntouched();

  const seed = FORTY_EIGHT_BAR_EXAMPLE_SEED;
  const legacyXml = buildFortyEightBarPianoSourceMusicXml(seed);
  const rhythmicXml = buildFortyEightBarPianoSourceMusicXml(seed, { rhythmMode: 'mosaic_rhythm' });
  assert.notEqual(legacyXml, rhythmicXml, 'mosaic_rhythm must change melody timing vs legacy default');

  const legacyBar5 = melodyVoiceOneEvents(legacyXml, 5);
  assert.ok(legacyBar5.length >= 4, 'legacy A bar should keep four melody attacks');
  assert.ok(
    legacyBar5.every((event) => !event.rest && qNum(event.duration) === 1),
    'legacy melody stays four quarters',
  );

  const rhythmicBar5 = melodyVoiceOneEvents(rhythmicXml, 5);
  const rhythmicSignature = rhythmicBar5
    .map((event) => (event.rest ? `r${qNum(event.duration)}` : `n${qNum(event.onsetInBar)}:${qNum(event.duration)}`))
    .join('|');
  assert.ok(
    rhythmicBar5.some((event) => event.rest || qNum(event.duration) !== 1 || qNum(event.onsetInBar) % 1 !== 0),
    `rhythmic A bar must not be four equal quarters: ${rhythmicSignature}`,
  );

  const form = planFortyEightBarForm(null);
  const phraseEnds = symphonicPhrasesFromFortyEightBarPlan(form)
    .map((phrase) => phrase.endBar)
    .filter((bar) => bar < 48);
  for (const endBar of phraseEnds) {
    const events = melodyVoiceOneEvents(rhythmicXml, endBar);
    const pitched = events.filter((event) => !event.rest);
    if (!pitched.length) continue;
    const tail = pitchedMelodyTailQuarters(events);
    assert.ok(tail >= 0.5 - 1e-6, `phrase end bar ${endBar} needs breath rest, tail=${tail}`);
  }

  const legacyMeasures = (legacyXml.match(/<measure number="/g) ?? []).length;
  const rhythmicMeasures = (rhythmicXml.match(/<measure number="/g) ?? []).length;
  assert.equal(legacyMeasures, 48);
  assert.equal(rhythmicMeasures, 48);

  const rhythmicIngest = ingestCanonicalScore(rhythmicXml);
  assert.equal(rhythmicIngest.parseError, null, rhythmicIngest.parseError ?? 'ingest failed');
  assert.ok(rhythmicIngest.score, 'rhythmic source must canonicalise');

  for (let bar = 1; bar <= 48; bar += 1) {
    assert.equal(bassPedalMidi(legacyXml, bar), bassPedalMidi(rhythmicXml, bar), `BHL bass pedal bar ${bar}`);
  }

  const motifs = planFortyEightBarMotifDevelopment(seed);
  assert.equal(motifs.locks.preserveBhlHarmony, true);
  assert.equal(motifs.locks.preserveSourceNoteLocks, true);
  const aPrimeRhythm = mosaicApplyDerivedTransform(motifs.aPrime, A_PRIME_RHYTHM_TRANSFORM, 0);
  assert.notEqual(
    rhythmPatternKey(motifs.a.rhythmPattern),
    rhythmPatternKey(aPrimeRhythm.rhythmPattern),
    'A′ must carry a distinct MOSAIC rhythm transform',
  );

  const legacyOrchestrated = orchestrate({
    enabled: true,
    sourceMusicXml: legacyXml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: legacyXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        symphonic: SYMPHONIC_SETTINGS,
      },
    },
  });
  assert.equal(legacyOrchestrated.ok, true, legacyOrchestrated.ok ? '' : legacyOrchestrated.error);

  const rhythmicOrchestrated = orchestrate({
    enabled: true,
    sourceMusicXml: rhythmicXml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: rhythmicXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        symphonic: SYMPHONIC_SETTINGS,
      },
    },
  });
  assert.equal(rhythmicOrchestrated.ok, true, rhythmicOrchestrated.ok ? '' : rhythmicOrchestrated.error);
  const dist = rhythmicOrchestrated.fidelity?.symphonic?.distribution?.events ?? [];
  const locked = (rhythmicOrchestrated.fidelity?.protectedEventIds ?? []).map((id) => {
    const hit = dist.find(
      (event) =>
        event.lineage === id
        && (event.transformation === 'preserved-source' || event.transformation === 'octave-transfer'),
    );
    return hit
      ? { id, midi: hit.sounding, onset: hit.onset, duration: hit.duration }
      : null;
  }).filter((row): row is { id: string; midi: number; onset: number; duration: number } => row !== null);
  const audit = auditPhase2Distribution({
    events: dist,
    silentBars: new Set(),
    barOf,
    locked,
    settings: SYMPHONIC_SETTINGS,
    mode: 'developing',
  });
  assert.equal(audit.ok, true, audit.failures.join('; '));
  assert.ok(
    dist.some((event) => event.role === 'independent-answer'),
    'mosaic_rhythm integration should still admit a source-derived answer when not an exact double',
  );

  mkdirSync(path.dirname(RHYTHMIC_SOURCE_EXPORT_PATH), { recursive: true });
  writeFileSync(RHYTHMIC_SOURCE_EXPORT_PATH, rhythmicXml);
  writeFileSync(RHYTHMIC_ORCHESTRATED_EXPORT_PATH, rhythmicOrchestrated.musicXml);

  verifyRescueCBaselineUntouched();

  return {
    ok: true,
    name: 'V4.0 Phase 4B: 48-bar rhythmic mosaic source + symphonic integration',
    sourceExportPath: RHYTHMIC_SOURCE_EXPORT_PATH,
    orchestratedExportPath: RHYTHMIC_ORCHESTRATED_EXPORT_PATH,
  };
}

try {
  const result = runFortyEightBarRhythmicSourceTest();
  if (!result.ok) {
    console.error('FAIL', result.name);
    process.exit(1);
  }
  console.log('PASS', result.name);
  console.log('source', result.sourceExportPath);
  console.log('orchestrated', result.orchestratedExportPath);
} catch (error) {
  console.error('FAIL', error instanceof Error ? error.message : error);
  process.exit(1);
}
