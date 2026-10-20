/**
 * V4.0 Phase 4B — 48-bar form + motif plan → symphonic example.
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/writeV40Phase4BExamples.ts
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  FORTY_EIGHT_BAR_EXAMPLE_SEED,
  buildFortyEightBarPianoSourceMusicXml,
  planFortyEightBarForm,
  planFortyEightBarMotifDevelopment,
  symphonicPhrasesFromFortyEightBarPlan,
} from '../core/form/macroFormPlanner';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { SymphonicOrchestrationSettings } from '../core/orchestrate/types';
import { SYMPHONIC_EXTENDED_SCORE_END_BAR } from '../core/orchestrate/symphonicWriting';

const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.env.V40_PHASE4B_OUT ? path.resolve(process.env.V40_PHASE4B_OUT) : path.join(ROOT, 'docs/v4.0-phase4b');

const SETTINGS: SymphonicOrchestrationSettings = {
  allocation: 'phase-2',
  expression: 'expressive',
  activity: 'moderate',
  foreground: 'source-register',
  counterline: 'when-source-allows',
  families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' },
};

function sha(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}

export function writeFortyEightBarSymphonicExample(): {
  sourceXml: string;
  symphonyXml: string;
  midiSetBase64: string;
  manifest: unknown;
  verification: Record<string, boolean | number | string>;
} {
  const seed = FORTY_EIGHT_BAR_EXAMPLE_SEED;
  const sourceXml = buildFortyEightBarPianoSourceMusicXml(seed);
  const form = planFortyEightBarForm(null);
  const motifs = planFortyEightBarMotifDevelopment(seed);
  const phrases = symphonicPhrasesFromFortyEightBarPlan(form);

  const result = orchestrate({
    enabled: true,
    sourceMusicXml: sourceXml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: sourceXml,
      correction: {
        mode: 'developing',
        reviewConfirmed: true,
        ensemble: 'symphonic',
        symphonic: SETTINGS,
      },
    },
  });
  if (!result.ok || !('musicXml' in result) || !result.midiSetBase64) {
    throw new Error(result.ok ? '48-bar symphonic realisation missing outputs' : result.error);
  }

  const measureCount = (result.musicXml.match(/<measure number="/g) ?? []).length;
  const maxMeasure = Math.max(
    ...[...result.musicXml.matchAll(/<measure number="(\d+)"/g)].map((m) => Number(m[1])),
    0,
  );
  const fidelity = result.fidelity;
  const phraseRoles = fidelity?.phrases.map((p) => `${p.id}:${p.role}`).join(',') ?? '';
  const expectedRoles = phrases.map((p) => `${p.id}:${p.phraseRole}`).join(',');
  const lockedRetained = (fidelity?.protectedEventIds ?? []).every((id) => {
    const row = fidelity?.classifications.find((c) => c.eventId === id);
    return row && row.disposition !== 'omitted';
  });
  const codaPhrase = fidelity?.phrases.find((p) => p.ending);
  const endingOk = codaPhrase?.endBar === SYMPHONIC_EXTENDED_SCORE_END_BAR && codaPhrase.ending === true;

  const verification = {
    bars48: measureCount >= SYMPHONIC_EXTENDED_SCORE_END_BAR && maxMeasure === SYMPHONIC_EXTENDED_SCORE_END_BAR,
    phraseRolesMatch: phraseRoles === expectedRoles,
    motifBDiffersFromA: motifs.similarityToA.b < motifs.similarityToA.a,
    motifAPrimeReturn: motifs.similarityToA.aPrime > motifs.similarityToA.b,
    lockedSourceRetained: lockedRetained,
    codaEnding: endingOk,
    seed,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'source.musicxml'), sourceXml);
  writeFileSync(path.join(OUT, 'forty-eight-bar-symphony.musicxml'), result.musicXml);
  writeFileSync(path.join(OUT, 'symphony-midi-set.zip'), Buffer.from(result.midiSetBase64, 'base64'));
  writeFileSync(
    path.join(OUT, 'verification.json'),
    JSON.stringify(
      {
        ...verification,
        sourceSha256: sha(sourceXml),
        symphonySha256: sha(result.musicXml),
        motifSimilarity: motifs.similarityToA,
        formId: form.id,
        thematic: form.thematic,
        protectedEventCount: fidelity?.protectedEventIds.length ?? 0,
      },
      null,
      2,
    ),
  );

  return {
    sourceXml,
    symphonyXml: result.musicXml,
    midiSetBase64: result.midiSetBase64,
    manifest: result.midiManifest,
    verification,
  };
}

if (require.main === module) {
  const out = writeFortyEightBarSymphonicExample();
  const failed = Object.entries(out.verification).filter(([, ok]) => ok !== true);
  if (failed.length) {
    console.error('verification failed', failed);
    process.exit(1);
  }
  console.log('wrote docs/v4.0-phase4b', out.verification);
}
