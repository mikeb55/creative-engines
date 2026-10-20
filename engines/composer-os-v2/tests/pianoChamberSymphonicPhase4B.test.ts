/**
 * V4.0 Phase 4B — 48-bar form + motif → symphonic example (writes docs/v4.0-phase4b).
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/tests/pianoChamberSymphonicPhase4B.test.ts
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { orchestrate, soundingLine } from '../core/orchestrate/orchestrate';
import { ingestCanonicalScore, type CanonicalEvent } from '../core/musical-evaluation/canonicalScore';
import { auditPhase2Distribution, timeWeightedSimultaneousParts } from '../core/orchestrate/symphonicDistribution';
import type { SymphonicOrchestrationSettings } from '../core/orchestrate/types';
import {
  FORTY_EIGHT_BAR_EXAMPLE_SEED,
  buildFortyEightBarPianoSourceMusicXml,
  fortyEightBarOrchestralClimaxSectionId,
  planFortyEightBarForm,
  symphonicPhrasesFromFortyEightBarPlan,
} from '../core/form/macroFormPlanner';
import { writeFortyEightBarSymphonicExample } from '../scripts/writeV40Phase4BExamples';

const ROOT = path.resolve(__dirname, '../../..');
const RESCUE_C_BASELINE_PATH = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony-rescue-c.musicxml');
const RESCUE_C_SHA256 = '27152e9f1d573a3d72095f22cb6aa670a0e45f8e8171b4be0a9e161550f53837';
const EXPECTED_PITCHED_EVENTS = 435;
const EXPECTED_OBOE_EVENTS = 80;
const DECLARED_REPAIR_WINDOWS: ReadonlyArray<{ id: string; start: number; end: number }> = [
  { id: 'a', start: 16.25, end: 18.25 },
  { id: 'a_prime', start: 125.25, end: 129.25 },
];

const SETTINGS: SymphonicOrchestrationSettings = {
  allocation: 'phase-2',
  expression: 'expressive',
  activity: 'moderate',
  foreground: 'source-register',
  counterline: 'when-source-allows',
  families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' },
};

const LEGACY_PHASE2_SETTINGS: SymphonicOrchestrationSettings = {
  allocation: 'phase-2',
  activity: 'moderate',
  foreground: 'source-register',
  counterline: 'when-source-allows',
  families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' },
};

function barOf(onset: number): number {
  return Math.floor(onset / 4) + 1;
}

function barRelativeSignature(onset: number, duration: number): string {
  const b0 = (barOf(onset) - 1) * 4;
  return `${(onset - b0).toFixed(2)}:${duration.toFixed(2)}`;
}

function accompSignatures(events: Array<{ onset: number; duration: number; instrument: string; role: string }>, partId: string, role: string): Set<string> {
  const sigs = new Set<string>();
  for (const event of events) {
    if (event.instrument !== partId || event.role !== role) continue;
    sigs.add(barRelativeSignature(event.onset, event.duration));
  }
  return sigs;
}

function supportSoundingSignature(onset: number, duration: number, midi: number): string {
  return `${barRelativeSignature(onset, duration)}@${midi}`;
}

function answerWindowForPhrase(
  events: Array<{ phraseId?: string; role: string; onset: number; duration: number }>,
  phraseId: string,
): { start: number; end: number } | null {
  const answers = events.filter((event) => event.role === 'independent-answer' && event.phraseId === phraseId);
  if (!answers.length) return null;
  const starts = answers.map((event) => event.onset);
  const ends = answers.map((event) => event.onset + event.duration);
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

function obSupportSignaturesOutsideWindow(
  events: Array<{ onset: number; duration: number; instrument: string; role: string; sounding?: number }>,
  phrase: { startBar: number; endBar: number },
  window: { start: number; end: number } | null,
): Set<string> {
  const sigs = new Set<string>();
  const phraseStart = (phrase.startBar - 1) * 4;
  const phraseEnd = phrase.endBar * 4;
  for (const event of events) {
    if (event.instrument !== 'ob1' && event.instrument !== 'ob2') continue;
    if (event.role !== 'sustained-colour' && event.role !== 'rhythmic-punctuation') continue;
    if (event.onset < phraseStart - 1e-6 || event.onset >= phraseEnd - 1e-6) continue;
    if (window && event.onset >= window.start - 1e-6 && event.onset < window.end - 1e-6) continue;
    const midi = event.sounding ?? 0;
    sigs.add(supportSoundingSignature(event.onset, event.duration, midi));
  }
  return sigs;
}

function obSupportSignaturesFromMusicXml(
  xml: string,
  phrase: { startBar: number; endBar: number },
  window: { start: number; end: number } | null,
): Set<string> {
  const sigs = new Set<string>();
  const phraseStart = (phrase.startBar - 1) * 4;
  const phraseEnd = phrase.endBar * 4;
  for (const partId of ['ob1', 'ob2'] as const) {
    for (const note of soundingLine(xml, partId)) {
      if (note.onset < phraseStart - 1e-6 || note.onset >= phraseEnd - 1e-6) continue;
      if (window && note.onset >= window.start - 1e-6 && note.onset < window.end - 1e-6) continue;
      sigs.add(supportSoundingSignature(note.onset, note.duration, note.midi));
    }
  }
  return sigs;
}

function primaryMelodyCarrierByPhrase(
  phrases: Array<{ id: string; startBar: number; endBar: number }>,
  events: Array<{ onset: number; duration: number; instrument: string; role: string }>,
): Map<string, string> {
  const carriers = new Map<string, string>();
  for (const phrase of phrases) {
    const melody = events.filter(
      (event) => event.role === 'primary-melody' && event.onset >= (phrase.startBar - 1) * 4 - 1e-6 && event.onset < phrase.endBar * 4,
    );
    const weights = new Map<string, number>();
    for (const event of melody) {
      weights.set(event.instrument, (weights.get(event.instrument) ?? 0) + event.duration);
    }
    const top = [...weights.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) carriers.set(phrase.id, top[0]);
  }
  return carriers;
}

function phraseBoundaryHandovers(
  phrases: Array<{ id: string; startBar: number; endBar: number }>,
  carriers: Map<string, string>,
): Array<{ afterBar: number; from: string; to: string }> {
  const ordered = [...phrases].sort((a, b) => a.startBar - b.startBar);
  const handovers: Array<{ afterBar: number; from: string; to: string }> = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const prior = ordered[index - 1]!;
    const current = ordered[index]!;
    const from = carriers.get(prior.id);
    const to = carriers.get(current.id);
    if (from && to && from !== to) {
      handovers.push({ afterBar: prior.endBar, from, to });
    }
  }
  return handovers;
}

const WOODWIND_IDS = new Set(['fl1', 'fl2', 'ob1', 'ob2', 'cl1', 'cl2', 'ca', 'bn1', 'bcl', 'picc', 'cbn']);

function primarySupportCarriersByPhrase(
  phrases: Array<{ id: string; startBar: number; endBar: number }>,
  events: Array<{ onset: number; duration: number; instrument: string; role: string; transformation?: string }>,
): Map<string, string> {
  const carriers = new Map<string, string>();
  const supportRoles = new Set(['sustained-colour', 'countermelody', 'rhythmic-punctuation']);
  for (const phrase of phrases) {
    const support = events.filter(
      (event) =>
        supportRoles.has(event.role)
        && event.onset >= (phrase.startBar - 1) * 4 - 1e-6
        && event.onset < phrase.endBar * 4,
    );
    const weights = new Map<string, number>();
    for (const event of support) {
      weights.set(event.instrument, (weights.get(event.instrument) ?? 0) + event.duration);
    }
    const top = [...weights.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) carriers.set(phrase.id, top[0]);
  }
  return carriers;
}

function qNum(rational: { n: number; d: number }): number {
  return rational.n / rational.d;
}

function repairWindowUnion(): Array<{ start: number; end: number }> {
  return DECLARED_REPAIR_WINDOWS.map((row) => ({ start: row.start, end: row.end }));
}

function declaredRepairWindow(phraseId: string): { start: number; end: number } | null {
  const row = DECLARED_REPAIR_WINDOWS.find((item) => item.id === phraseId);
  return row ? { start: row.start, end: row.end } : null;
}

function verifyRescueCBaseline(xml: string): void {
  const hash = createHash('sha256').update(xml).digest('hex');
  assert.equal(hash, RESCUE_C_SHA256, 'Rescue C baseline hash mismatch — do not overwrite reference');
  const score = ingestCanonicalScore(xml).score;
  assert(score, 'Rescue C baseline did not parse');
  const pitched = score.soundingEvents.filter((event) => !event.rest && event.soundingMidi !== null);
  const oboe = pitched.filter((event) => event.partId === 'ob1' || event.partId === 'ob2');
  assert.equal(pitched.length, EXPECTED_PITCHED_EVENTS, 'Rescue C pitched event count');
  assert.equal(oboe.length, EXPECTED_OBOE_EVENTS, 'Rescue C oboe event count');
}

function portionsOutsideWindows(
  onset: number,
  duration: number,
  windows: Array<{ start: number; end: number }>,
): Array<{ onset: number; duration: number }> {
  let segments = [{ onset, duration }];
  for (const window of windows) {
    const next: Array<{ onset: number; duration: number }> = [];
    for (const segment of segments) {
      const end = segment.onset + segment.duration;
      if (segment.onset >= window.end - 1e-6 || end <= window.start + 1e-6) {
        next.push(segment);
        continue;
      }
      if (segment.onset < window.start - 1e-6) {
        next.push({ onset: segment.onset, duration: window.start - segment.onset });
      }
      if (end > window.end + 1e-6) {
        next.push({ onset: window.end, duration: end - window.end });
      }
    }
    segments = next;
  }
  return segments.filter((segment) => segment.duration >= 1e-6);
}

function pitchedComparisonSignatures(xml: string, windows: Array<{ start: number; end: number }>): Map<string, number> {
  const score = ingestCanonicalScore(xml).score;
  assert(score, 'MusicXML did not parse for comparison');
  const bag = new Map<string, number>();
  for (const event of score.soundingEvents) {
    if (event.rest || event.soundingMidi === null) continue;
    const onset = qNum(event.onset);
    const duration = qNum(event.duration);
    for (const portion of portionsOutsideWindows(onset, duration, windows)) {
      const reattack = event.tieStart ? '' : 'R';
      const key = `${event.partId}\t${portion.onset.toFixed(4)}\t${portion.duration.toFixed(4)}\t${event.soundingMidi}\t${reattack}`;
      bag.set(key, (bag.get(key) ?? 0) + 1);
    }
  }
  return bag;
}

function assertOutsideRepairWindowsMatchBaseline(referenceXml: string, candidateXml: string): void {
  const windows = repairWindowUnion();
  const ref = pitchedComparisonSignatures(referenceXml, windows);
  const cand = pitchedComparisonSignatures(candidateXml, windows);
  assert.ok(ref.size > 0, 'reference comparison must not be empty');
  for (const [key, count] of ref) {
    assert.equal(cand.get(key) ?? 0, count, `outside repair windows, pitch event mismatch (missing ${key})`);
  }
  for (const [key, count] of cand) {
    if ((ref.get(key) ?? 0) !== count) {
      assert.fail(`outside repair windows, pitch event mismatch (extra ${key})`);
    }
  }
}

function onsetInRepairWindows(onset: number, windows: Array<{ start: number; end: number }>): boolean {
  return windows.some((window) => onset >= window.start - 1e-6 && onset < window.end - 1e-6);
}

function canonicalEventLabel(event: CanonicalEvent): string {
  return `${event.partId} ${qNum(event.onset).toFixed(2)}:${qNum(event.duration).toFixed(2)}@${event.soundingMidi}`;
}

function buildRescueComparisonLedger(referenceXml: string, candidateXml: string): string {
  const windows = repairWindowUnion();
  const refScore = ingestCanonicalScore(referenceXml).score!;
  const candScore = ingestCanonicalScore(candidateXml).score!;
  const lines: string[] = ['bar\tstatus\tevent\treason'];
  for (let bar = 1; bar <= 48; bar += 1) {
    const refEvents = refScore.soundingEvents.filter((event) => event.bar === bar && !event.rest && event.soundingMidi !== null);
    const candEvents = candScore.soundingEvents.filter((event) => event.bar === bar && !event.rest && event.soundingMidi !== null);
    const candByLabel = new Map(candEvents.map((event) => [canonicalEventLabel(event), event]));
    const refLabels = new Set<string>();
    for (const event of refEvents) {
      const label = canonicalEventLabel(event);
      refLabels.add(label);
      const onset = qNum(event.onset);
      if (onsetInRepairWindows(onset, windows)) {
        lines.push(`${bar}\ttransformed\t${label}\tauthorised local repair window`);
        continue;
      }
      if (candByLabel.has(label)) {
        lines.push(`${bar}\tretained\t${label}\tmatches Rescue C outside repair windows`);
      } else {
        lines.push(`${bar}\tremoved\t${label}\tmissing from candidate outside repair windows`);
      }
    }
    for (const event of candEvents) {
      const label = canonicalEventLabel(event);
      const onset = qNum(event.onset);
      if (onsetInRepairWindows(onset, windows)) {
        if (!refLabels.has(label)) {
          lines.push(`${bar}\tadded\t${label}\tauthorised local repair window`);
        }
        continue;
      }
      if (!refLabels.has(label)) {
        lines.push(`${bar}\tadded\t${label}\tnew event outside repair windows`);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

function phraseEndGaps(
  events: Array<{ onset: number; duration: number; instrument: string }>,
  partId: string,
  phraseEndBars: readonly number[],
): number[] {
  const gaps: number[] = [];
  for (const endBar of phraseEndBars) {
    const barStart = (endBar - 1) * 4;
    const barEnd = endBar * 4;
    const inBar = events.filter((event) => event.instrument === partId && event.onset >= barStart - 1e-6 && event.onset < barEnd - 1e-6);
    if (!inBar.length) continue;
    const coverageEnd = Math.max(...inBar.map((event) => event.onset + event.duration));
    const gap = barEnd - coverageEnd;
    if (gap >= 1 - 1e-6) gaps.push(endBar);
  }
  return gaps;
}

export function runPianoChamberSymphonicPhase4BTest(): { ok: boolean; name: string; exportPath: string } {
  const rescueCReferenceXml = readFileSync(RESCUE_C_BASELINE_PATH, 'utf8');
  verifyRescueCBaseline(rescueCReferenceXml);

  const out = writeFortyEightBarSymphonicExample();
  const baseOk = (
    out.verification.bars48
    && out.verification.phraseRolesMatch
    && out.verification.motifBDiffersFromA
    && out.verification.motifAPrimeReturn
    && out.verification.lockedSourceRetained
    && out.verification.codaEnding
  ) === true;

  const seed = FORTY_EIGHT_BAR_EXAMPLE_SEED;
  const sourceXml = buildFortyEightBarPianoSourceMusicXml(seed);
  const score = orchestrate({
    enabled: true,
    sourceMusicXml: sourceXml,
    template: 'chamber_orchestra',
    plan: [],
    seed,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: sourceXml,
      correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: SETTINGS },
    },
  });
  assert.equal(score.ok, true);
  const dist = score.fidelity?.symphonic?.distribution?.events ?? [];
  const vaSigs = accompSignatures(dist, 'va', 'sustained-colour');
  const dbSigs = accompSignatures(dist, 'db', 'bass-foundation');
  const combined = new Set([...vaSigs, ...dbSigs]);
  assert.ok(combined.size >= 3, `expected >=3 accomp signatures, got ${combined.size} ${[...combined].join(',')}`);

  const phraseEnds = (score.fidelity?.phrases ?? []).map((phrase) => phrase.endBar);
  const vaGaps = phraseEndGaps(dist, 'va', phraseEnds);
  const dbGaps = phraseEndGaps(dist, 'db', phraseEnds);
  assert.ok(vaGaps.length + dbGaps.length >= 2, `expected >=2 phrase-end gaps on va/db, va=${vaGaps.join(',')} db=${dbGaps.join(',')}`);

  const lyricalXml = readFileSync(path.join(ROOT, 'docs/v3.5-phase1/lyrical/source.musicxml'), 'utf8');
  const legacy = orchestrate({
    enabled: true,
    sourceMusicXml: lyricalXml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: {
      action: 'realise',
      sourceMusicXml: lyricalXml,
      correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: LEGACY_PHASE2_SETTINGS },
    },
  });
  assert.equal(legacy.ok, true);
  const golden = readFileSync(path.join(ROOT, 'docs/v4.0-phase2/lyrical/lyrical.musicxml'), 'utf8');
  assert.equal(legacy.musicXml, golden, '24-bar legacy lyrical symphony bytes moved');

  const locked = (score.fidelity?.protectedEventIds ?? []).map((id) => {
    const hits = dist.filter(
      (event) => event.lineage === id && (event.transformation === 'preserved-source' || event.transformation === 'octave-transfer'),
    );
    const hit = hits[0];
    return hit ? { id, midi: hit.sounding, onset: hit.onset, duration: hit.duration } : null;
  }).filter((row): row is { id: string; midi: number; onset: number; duration: number } => row !== null);
  const audit = auditPhase2Distribution({
    events: dist,
    silentBars: new Set(),
    barOf,
    locked: locked.map((row) => ({ id: row.id, midi: row.midi!, onset: row.onset!, duration: row.duration! })),
    settings: SETTINGS,
    mode: 'developing',
  });
  assert.equal(audit.ok, true, audit.failures.join('; '));

  const phraseRows = (score.fidelity?.phrases ?? []).map((phrase) => ({
    id: phrase.id,
    startBar: phrase.startBar,
    endBar: phrase.endBar,
  }));
  const carriers = primaryMelodyCarrierByPhrase(phraseRows, dist);
  const boundaryHandovers = phraseBoundaryHandovers(phraseRows, carriers);
  assert.ok(boundaryHandovers.length >= 3, `expected >=3 phrase-boundary handovers, got ${boundaryHandovers.length} ${JSON.stringify(boundaryHandovers)}`);

  const form48 = planFortyEightBarForm(null);
  const symSections = symphonicPhrasesFromFortyEightBarPlan(form48);
  const densityBySection = symSections.map((section) => ({
    id: section.id,
    role: section.thematicRole,
    density: timeWeightedSimultaneousParts(dist, section.startBar, section.endBar),
  }));
  const densityValues = [...new Set(densityBySection.map((row) => Math.round(row.density * 10) / 10))];
  assert.ok(densityValues.length >= 3, `expected >=3 density levels, got ${densityValues.join(',')} ${JSON.stringify(densityBySection)}`);

  const climaxId = fortyEightBarOrchestralClimaxSectionId(form48);
  const climax = densityBySection.find((row) => row.id === climaxId);
  const coda = densityBySection.find((row) => row.role === 'coda');
  assert.ok(climax && coda, 'climax and coda sections missing from density map');
  assert.ok(climax.density > coda.density, `climax must exceed coda release: ${climax.density} vs ${coda.density}`);

  const supportByPhrase = primarySupportCarriersByPhrase(phraseRows, dist);
  const middlePhraseIds = ['a', 'b', 'a_prime'].filter((id) => phraseRows.some((row) => row.id === id));
  const middleSupports = middlePhraseIds.map((id) => supportByPhrase.get(id)).filter((id): id is string => Boolean(id));
  assert.ok(
    new Set(middleSupports).size >= 2,
    `middle sections need distinct support carriers, got ${middleSupports.join(',')}`,
  );
  const introCarrier = carriers.get('intro');
  assert.ok(introCarrier && WOODWIND_IDS.has(introCarrier), `intro foreground should be exposed woodwind, got ${introCarrier}`);
  const harpOnsets = dist.filter((event) => event.instrument === 'hp').map((event) => barOf(event.onset));
  const peakStart = phraseRows.find((row) => row.id === climaxId)?.startBar ?? 0;
  assert.ok(
    harpOnsets.length >= 1 && harpOnsets.every((bar) => bar >= peakStart),
    `harp withheld until arrival: onsets ${harpOnsets.join(',')} peakStart ${peakStart}`,
  );
  const derivedSupport = dist.filter(
    (event) =>
      (event.role === 'sustained-colour' || event.role === 'bass-foundation')
      && event.transformation
      && !['preserved-source', 'octave-transfer', 'unison-reinforcement', 'octave-reinforcement'].includes(event.transformation),
  );
  assert.ok(derivedSupport.length >= 3, `expected derived support gestures, got ${derivedSupport.length}`);
  const windSupport = dist.some(
    (event) => WOODWIND_IDS.has(event.instrument) && (event.role === 'sustained-colour' || event.role === 'bass-foundation'),
  );
  assert.ok(windSupport, 'expected woodwind support or bass colour beyond melody alone');

  assertOutsideRepairWindowsMatchBaseline(rescueCReferenceXml, score.musicXml);

  const dialogueAnswers = dist.filter((event) => event.role === 'independent-answer');
  const answerInA = dialogueAnswers.filter((event) => event.phraseId === 'a');
  const answerInAPrime = dialogueAnswers.filter((event) => event.phraseId === 'a_prime');
  if (!answerInA.length || !answerInAPrime.length) {
    throw new Error(`BLOCKED: rescue dialogue needs answers in a and a_prime (a=${answerInA.length} a_prime=${answerInAPrime.length})`);
  }
  const aOps = new Set(answerInA.map((event) => event.lineage.split('.').pop()));
  const aPrimeOps = new Set(answerInAPrime.map((event) => event.lineage.split('.').pop()));
  assert.ok(
    answerInA[0]!.onset !== answerInAPrime[0]!.onset || [...aOps].some((op) => !aPrimeOps.has(op)),
    'A′ dialogue must differ from A in entry or operator',
  );
  const obSupportInDialoguePhrases = dist.filter(
    (event) =>
      (event.phraseId === 'a' || event.phraseId === 'a_prime')
      && (event.instrument === 'ob1' || event.instrument === 'ob2')
      && (event.role === 'sustained-colour' || event.role === 'rhythmic-punctuation'),
  );
  const obSupportDuration = obSupportInDialoguePhrases.reduce((sum, event) => sum + event.duration, 0);
  assert.ok(
    obSupportDuration >= 40,
    `Rescue D regression: ob accompaniment must not be section-suppressed (duration=${obSupportDuration})`,
  );

  const phraseRepairLedger: string[] = [];
  for (const phraseId of ['a', 'a_prime'] as const) {
    const phrase = phraseRows.find((row) => row.id === phraseId);
    if (!phrase) continue;
    const window = declaredRepairWindow(phraseId) ?? answerWindowForPhrase(dist, phraseId);
    const refSigs = obSupportSignaturesFromMusicXml(rescueCReferenceXml, phrase, window);
    const newSigs = obSupportSignaturesOutsideWindow(dist, phrase, window);
    for (const sig of refSigs) {
      assert.ok(newSigs.has(sig), `outside dialogue window, ob support must match Rescue C (${phraseId} missing ${sig})`);
    }
    const answers = dialogueAnswers.filter((event) => event.phraseId === phraseId);
    phraseRepairLedger.push(
      `${phraseId} bars ${phrase.startBar}-${phrase.endBar}: window ${window ? `${window.start.toFixed(2)}-${window.end.toFixed(2)}` : 'none'}; `
      + `retained ob sigs ${newSigs.size}; reference ${refSigs.size}; answers ${answers.length} on ${answers.map((a) => a.instrument).join(',')}`,
    );
  }

  const localRepairExportPath = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony-c-local-repair.musicxml');
  const localRepairLedgerPath = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony-c-local-repair-ledger.txt');
  mkdirSync(path.dirname(localRepairExportPath), { recursive: true });
  writeFileSync(localRepairExportPath, score.musicXml);
  const ledgerBody = buildRescueComparisonLedger(rescueCReferenceXml, score.musicXml);
  writeFileSync(
    localRepairLedgerPath,
    `${phraseRepairLedger.join('\n')}\n---\n${ledgerBody}`,
  );
  const repairMeasures = (score.musicXml.match(/<measure number="/g) ?? []).length;
  const repairMax = Math.max(...[...score.musicXml.matchAll(/<measure number="(\d+)"/g)].map((m) => Number(m[1])), 0);
  assert.ok(repairMeasures >= 48 && repairMax === 48, `local-repair export bar count ${repairMeasures}/${repairMax}`);
  const candidateXml = readFileSync(localRepairExportPath, 'utf8');
  assertOutsideRepairWindowsMatchBaseline(rescueCReferenceXml, candidateXml);
  verifyRescueCBaseline(readFileSync(RESCUE_C_BASELINE_PATH, 'utf8'));

  const exportPath = path.join(ROOT, 'docs/v4.0-phase4b/forty-eight-bar-symphony.musicxml');
  return {
    ok: baseOk,
    name: 'V4.0 Phase 4B: 48-bar symphonic example — form, motif, locks, coda ending',
    exportPath,
    localRepairExportPath,
    localRepairLedgerPath,
    boundaryHandovers,
    densityBySection,
    carriers,
    supportByPhrase,
  };
}

try {
  const result = runPianoChamberSymphonicPhase4BTest();
  if (!result.ok) {
    console.error('FAIL', result.name);
    process.exit(1);
  }
  console.log('PASS', result.name);
  console.log('export', result.exportPath);
  console.log('local-repair', result.localRepairExportPath);
  console.log('ledger', result.localRepairLedgerPath);
  console.log('handovers', JSON.stringify(result.boundaryHandovers));
  console.log('density', JSON.stringify(result.densityBySection));
  console.log('foreground', JSON.stringify([...result.carriers.entries()]));
  console.log('support', JSON.stringify([...result.supportByPhrase.entries()]));
} catch (error) {
  console.error('FAIL', error instanceof Error ? error.message : error);
  process.exit(1);
}
