/**
 * Scaffold premium-melody composer 2a-start kit (V86 pattern).
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/scaffoldPremiumMelodyComposer.ts --composer bill_evans --seed 90301
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const V2_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(V2_ROOT, '..', '..');
const REGISTRY_PATH = path.join(__dirname, 'scaffold', 'premium-melody-composer', 'registry.json');
const PROMPT_TPL_PATH = path.join(
  __dirname,
  'scaffold',
  'premium-melody-composer',
  'prompts',
  'isolation-baseline-2a.md.tpl'
);
const OUT_ROOT = path.join(__dirname, 'scaffold', 'out');

interface ProfileJson {
  syncopationShiftRate: number;
  anticipationBias: number;
  offbeatTrimCeiling: number;
  barSlotNudgesEnabled: boolean;
  structuralLandingMode: string;
  expressionCharacter: string;
  cellFamilyWeightScale: Record<string, number> | null;
}

interface RegistryComposer {
  slug: string;
  displayName: string;
  prefix: string;
  coreDir: string;
  builderPrefix: string;
  seed: number;
  v86Track: string;
  frozen: boolean;
  scaffolded: boolean;
  goldenFixtureBasename?: string;
}

interface RegistryFile {
  reservedComposerSlugs: string[];
  reservedPrefixes: string[];
  globalDenyPaths: string[];
  composers: RegistryComposer[];
}

interface ComposerContext {
  slug: string;
  displayName: string;
  prefix: string;
  prefixUpper: string;
  prefixPascal: string;
  builderPrefix: string;
  coreDir: string;
  seed: number;
  v86Track: string;
  profileId: string;
  profile: ProfileJson;
  profileValuesBlock: string;
}

interface PlannedFile {
  relPath: string;
  content: string;
}

const DEFAULT_PROFILE: Omit<ProfileJson, 'cellFamilyWeightScale'> & {
  cellFamilyWeightScale: null;
} = {
  syncopationShiftRate: 0.4,
  anticipationBias: 0.3,
  offbeatTrimCeiling: 0.52,
  barSlotNudgesEnabled: false,
  structuralLandingMode: 'float_preserve',
  expressionCharacter: 'modal_lyric',
  cellFamilyWeightScale: null,
};

function loadRegistry(): RegistryFile {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return JSON.parse(raw) as RegistryFile;
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function normalizeRel(rel: string): string {
  return toPosix(path.normalize(rel)).replace(/^\.\//, '');
}

function buildFrozenDenyPaths(registry: RegistryFile): string[] {
  const out: string[] = [];
  for (const c of registry.composers) {
    if (!c.frozen) continue;
    out.push(`engines/composer-os-v2/core/${c.coreDir}`);
    out.push(`engines/composer-os-v2/tests/${c.prefix}GoldenMaster.test.ts`);
    if (c.goldenFixtureBasename) {
      out.push(`engines/composer-os-v2/tests/golden/${c.goldenFixtureBasename}.golden.json`);
      out.push(`engines/composer-os-v2/tests/golden/${c.goldenFixtureBasename}.golden.musicxml`);
    }
  }
  return out;
}

function buildDenyPaths(registry: RegistryFile): string[] {
  const paths = [...registry.globalDenyPaths.map(normalizeRel), ...buildFrozenDenyPaths(registry).map(normalizeRel)];
  return [...new Set(paths)];
}

function pathMatchesDeny(relPath: string, denyPaths: string[]): string | null {
  const norm = normalizeRel(relPath);
  for (const deny of denyPaths) {
    const d = normalizeRel(deny);
    if (norm === d || norm.startsWith(`${d}/`)) return d;
  }
  return null;
}

function isAllowedWrite(relPath: string, ctx: ComposerContext): boolean {
  const norm = normalizeRel(relPath);
  const allowed = [
    `engines/composer-os-v2/core/${ctx.coreDir}/`,
    `engines/composer-os-v2/tests/${ctx.prefix}GoldenMaster.test.ts`,
    `engines/composer-os-v2/scripts/run${ctx.prefixPascal}PremiumMelodyAutoValidation.ts`,
    `engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-`,
  ];
  return allowed.some((a) => norm === a.replace(/\/$/, '') || norm.startsWith(a));
}

function formatProfileBlock(profile: ProfileJson, seed: number): string {
  const lines = [
    `    syncopationShiftRate: ${profile.syncopationShiftRate},`,
    `    anticipationBias: ${profile.anticipationBias},`,
    `    offbeatTrimCeiling: ${profile.offbeatTrimCeiling},`,
    `    barSlotNudgesEnabled: ${profile.barSlotNudgesEnabled},`,
    `    structuralLandingMode: '${profile.structuralLandingMode}',`,
    `    expressionCharacter: '${profile.expressionCharacter}',`,
    `    rhythmSeedSalt: ${seed},`,
    `    // projectedOffbeatBlockThreshold, restPhraseBreakBeats, longNotePhraseBreakBeats: omit -> BH defaults`,
  ];
  if (profile.cellFamilyWeightScale && Object.keys(profile.cellFamilyWeightScale).length > 0) {
    lines.push(`    // 2b: tune cellFamilyWeightScale`);
    lines.push(`    cellFamilyWeightScale: ${JSON.stringify(profile.cellFamilyWeightScale, null, 2)
      .split('\n')
      .map((l, i) => (i === 0 ? l : `    ${l}`))
      .join('\n')},`);
  } else {
    lines.push(`    // 2b: add cellFamilyWeightScale when tuning`);
  }
  return lines.join('\n');
}

function renderProfile(ctx: ComposerContext): string {
  return `/**
 * PROVISIONAL — ${ctx.displayName} isolation profile (${ctx.v86Track} Commit 2a).
 * Reuses BH benchmark pitches for isolation/determinism only — native benchmark in 2c.
 * Fixture freezes for real only after 2c native benchmark + threshold calibration.
 */

import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';

export const ${ctx.prefixUpper}_ISOLATION_PROVISIONAL_PROFILE_ID = '${ctx.profileId}';

export function build${ctx.builderPrefix}IsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: ${ctx.prefixUpper}_ISOLATION_PROVISIONAL_PROFILE_ID,
${formatProfileBlock(ctx.profile, ctx.seed)}
  };
}
`;
}

function renderValidation(ctx: ComposerContext): string {
  const pu = ctx.prefixUpper;
  return `/**
 * ${ctx.displayName} premium-melody conformance thresholds (${ctx.v86Track} Commit 2a — PLACEHOLDER).
 * Separate from BH thresholds — no phrase-density arc check (BH-specific).
 * Tune in 2b/2c; freeze after native benchmark calibration.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';

export const ${ctx.prefixUpper}_OFFBEAT_RATIO_MIN = 0.28;
export const ${ctx.prefixUpper}_OFFBEAT_RATIO_MAX = 0.52;
export const ${ctx.prefixUpper}_IOI_ENTROPY_MIN = 1.4;
export const ${ctx.prefixUpper}_VELOCITY_SPREAD_MIN = 4;
export const ${ctx.prefixUpper}_VELOCITY_SPREAD_MAX = 12;

export interface ${ctx.prefixPascal}PremiumMelodyConformanceResult {
  pass: boolean;
  offbeatRatio: number;
  offbeatRatioMin: number;
  offbeatRatioMax: number;
  offbeatRatioPass: boolean;
  ioiEntropy: number;
  ioiEntropyMin: number;
  ioiEntropyPass: boolean;
  velocityMin: number;
  velocityMax: number;
  velocitySpread: number;
  velocitySpreadMin: number;
  velocitySpreadMax: number;
  velocitySpreadPass: boolean;
  details: string[];
}

export function validate${ctx.prefixPascal}PremiumMelodyConformance(
  rhythmMelody: readonly ImportMelodyNote[],
  exportMelody: readonly PremiumMelodyExpressiveNote[],
  rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta
): ${ctx.prefixPascal}PremiumMelodyConformanceResult {
  const offbeatRatio =
    rhythmMeta?.offbeatRatio != null ? rhythmMeta.offbeatRatio : melodyOffbeatRatio(rhythmMelody);
  const offbeatRatioPass =
    offbeatRatio >= ${pu + '_OFFBEAT_RATIO_MIN'} && offbeatRatio <= ${pu + '_OFFBEAT_RATIO_MAX'};

  const ioiEntropy = melodyIoiEntropy(rhythmMelody);
  const ioiEntropyPass = ioiEntropy >= ${pu + '_IOI_ENTROPY_MIN'};

  const vels = exportMelody.map((n) => n.velocity).filter((v): v is number => v != null);
  const velocityMin = vels.length > 0 ? Math.min(...vels) : 0;
  const velocityMax = vels.length > 0 ? Math.max(...vels) : 0;
  const velocitySpread = velocityMax - velocityMin;
  const velocitySpreadPass =
    velocitySpread >= ${pu + '_VELOCITY_SPREAD_MIN'} && velocitySpread <= ${pu + '_VELOCITY_SPREAD_MAX'};

  const details: string[] = [];
  if (!offbeatRatioPass) {
    details.push(
      'offbeatRatio ' +
        offbeatRatio.toFixed(3) +
        ' outside [' +
        ${pu + '_OFFBEAT_RATIO_MIN'} +
        ', ' +
        ${pu + '_OFFBEAT_RATIO_MAX'} +
        ']'
    );
  }
  if (!ioiEntropyPass) {
    details.push('ioiEntropy ' + ioiEntropy.toFixed(3) + ' < ' + ${pu + '_IOI_ENTROPY_MIN'});
  }
  if (!velocitySpreadPass) {
    details.push(
      'velocitySpread ' +
        velocitySpread +
        ' outside [' +
        ${pu + '_VELOCITY_SPREAD_MIN'} +
        ', ' +
        ${pu + '_VELOCITY_SPREAD_MAX'} +
        ']'
    );
  }

  const pass = offbeatRatioPass && ioiEntropyPass && velocitySpreadPass;
  return {
    pass,
    offbeatRatio,
    offbeatRatioMin: ${pu + '_OFFBEAT_RATIO_MIN'},
    offbeatRatioMax: ${pu + '_OFFBEAT_RATIO_MAX'},
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyMin: ${pu + '_IOI_ENTROPY_MIN'},
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadMin: ${pu + '_VELOCITY_SPREAD_MIN'},
    velocitySpreadMax: ${pu + '_VELOCITY_SPREAD_MAX'},
    velocitySpreadPass,
    details,
  };
}
`;
}

function renderGoldenMaster(ctx: ComposerContext): string {
  const pu = ctx.prefixUpper;
  const pp = ctx.prefixPascal;
  const bp = ctx.builderPrefix;
  return `/**
 * ${ctx.v86Track} Commit 2a - ${ctx.displayName} golden-master baseline (isolation, seed ${ctx.seed}).
 * Byte-exact characterization on reused BH pitches (isolation/determinism only).
 * PROVISIONAL - native benchmark lands in 2c; freezes after 2c threshold calibration.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import type { Articulation, NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import type { PremiumMelodyDurationAccentKind } from '../core/premium-melody/enrichMelodyExpression';

export const ${pu}_GOLDEN_SEED = ${ctx.seed};
export const ${pu}_GOLDEN_FIXTURE_NAME = 'BH_Benchmark_JazzMelody.musicxml';
export const ${pu}_GOLDEN_PROFILE = '${ctx.profileId} (PROVISIONAL)';

const GOLDEN_DIR = path.join(__dirname, 'golden');
const JSON_FIXTURE = path.join(GOLDEN_DIR, '${ctx.prefix}-isolation-seed${ctx.seed}.golden.json');
const XML_FIXTURE = path.join(GOLDEN_DIR, '${ctx.prefix}-isolation-seed${ctx.seed}.golden.musicxml');

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  ${pu}_GOLDEN_FIXTURE_NAME
);

export type ${pp}GoldenMelodyEvent = {
  bar: number;
  onset: string;
  duration: string;
  pitch: number;
  articulation: Articulation | null;
  velocity: number | null;
  accent: PremiumMelodyDurationAccentKind;
};

export type ${pp}GoldenJsonPayload = {
  seed: number;
  fixture: string;
  profile: string;
  noteCount: number;
  events: ${pp}GoldenMelodyEvent[];
};

function beat4dp(value: number): string {
  return value.toFixed(4);
}

export function normalizeMusicXmlLf(xml: string): string {
  return xml.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
}

function guitarVoice1ExpressiveFromScore(score: ScoreModel): ImportMelodyNote[] {
  const part = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!part) return [];
  const out: ImportMelodyNote[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      out.push({
        bar: m.index,
        onsetBeat: n.startBeat,
        durationBeats: n.duration,
        midiPitch: n.pitch,
        confidence: 1,
        fieldOrigin: 'explicit',
        ...(n.articulation ? { articulation: n.articulation } : {}),
        ...(n.velocity != null ? { velocity: n.velocity } : {}),
        ...(n.durationAccent ? { durationAccent: n.durationAccent } : {}),
      });
    }
  }
  return out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);
}

function toGoldenEvent(note: ImportMelodyNote & { durationAccent?: PremiumMelodyDurationAccentKind }): ${pp}GoldenMelodyEvent {
  return {
    bar: note.bar,
    onset: beat4dp(note.onsetBeat),
    duration: beat4dp(note.durationBeats),
    pitch: note.midiPitch,
    articulation: note.articulation ?? null,
    velocity: note.velocity ?? null,
    accent: note.durationAccent ?? 'none',
  };
}

export function build${pp}GoldenJsonPayload(score: ScoreModel): ${pp}GoldenJsonPayload {
  const notes = guitarVoice1ExpressiveFromScore(score);
  return {
    seed: ${pu}_GOLDEN_SEED,
    fixture: ${pu}_GOLDEN_FIXTURE_NAME,
    profile: ${pu}_GOLDEN_PROFILE,
    noteCount: notes.length,
    events: notes.map(toGoldenEvent),
  };
}

export function serialize${pp}GoldenJson(payload: ${pp}GoldenJsonPayload): string {
  return \`\${JSON.stringify(payload, null, 2)}\\n\`;
}

export function run${pp}GoldenPath(): { score: ScoreModel; xml: string } {
  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    throw new Error(\`BH jazz benchmark fixture missing: \${BENCHMARK_FIXTURE}\`);
  }
  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);

  const gp = runGoldenPathOnce(${pu}_GOLDEN_SEED, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: '${ctx.slug}',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });

  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));

  if (!generationOk || !gp.xml || !gp.score) {
    throw new Error(\`${ctx.displayName} golden path failed: \${gp.errors[0] ?? 'no xml/score'}\`);
  }

  return { score: gp.score, xml: normalizeMusicXmlLf(gp.xml) };
}

export function build${pp}GoldenSnapshot(): { jsonText: string; xmlText: string } {
  const { score, xml } = run${pp}GoldenPath();
  return {
    jsonText: serialize${pp}GoldenJson(build${pp}GoldenJsonPayload(score)),
    xmlText: xml.endsWith('\\n') ? xml : \`\${xml}\\n\`,
  };
}

export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function diff${pp}GoldenEvents(
  expected: ${pp}GoldenMelodyEvent[],
  actual: ${pp}GoldenMelodyEvent[]
): string[] {
  const lines: string[] = [];
  const maxLen = Math.max(expected.length, actual.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (!exp) {
      lines.push(\`+ event[\${i}]: \${JSON.stringify(act)}\`);
      continue;
    }
    if (!act) {
      lines.push(\`- event[\${i}]: \${JSON.stringify(exp)}\`);
      continue;
    }
    const keys: (keyof ${pp}GoldenMelodyEvent)[] = [
      'bar', 'onset', 'duration', 'pitch', 'articulation', 'velocity', 'accent',
    ];
    for (const key of keys) {
      if (exp[key] !== act[key]) {
        lines.push(\`event[\${i}].\${key}: expected=\${JSON.stringify(exp[key])} actual=\${JSON.stringify(act[key])}\`);
      }
    }
  }
  return lines;
}

function firstByteDiffIndex(expected: string, actual: string): number | null {
  const len = Math.min(expected.length, actual.length);
  for (let i = 0; i < len; i++) {
    if (expected.charCodeAt(i) !== actual.charCodeAt(i)) return i;
  }
  if (expected.length !== actual.length) return len;
  return null;
}

export function write${pp}GoldenFixtures(): void {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const { jsonText, xmlText } = build${pp}GoldenSnapshot();
  fs.writeFileSync(JSON_FIXTURE, jsonText, 'utf8');
  fs.writeFileSync(XML_FIXTURE, xmlText, 'utf8');
  console.log(\`Wrote \${JSON_FIXTURE} (\${jsonText.length} bytes)\`);
  console.log(\`Wrote \${XML_FIXTURE} (\${xmlText.length} bytes)\`);
  console.log(\`JSON sha256: \${sha256Hex(jsonText)}\`);
  console.log(\`XML sha256: \${sha256Hex(xmlText)}\`);
}

export function run${ctx.prefix}GoldenMasterTests(): { name: string; ok: boolean; detail?: string }[] {
  const results: { name: string; ok: boolean; detail?: string }[] = [];

  if (!fs.existsSync(JSON_FIXTURE) || !fs.existsSync(XML_FIXTURE)) {
    return [{
      name: '${ctx.prefix}GoldenMaster - fixtures present',
      ok: false,
      detail: \`missing \${!fs.existsSync(JSON_FIXTURE) ? JSON_FIXTURE : XML_FIXTURE}\`,
    }];
  }

  let snapshot: { jsonText: string; xmlText: string };
  try {
    snapshot = build${pp}GoldenSnapshot();
  } catch (e) {
    return [{
      name: '${ctx.prefix}GoldenMaster - regenerate seed ${ctx.seed}',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }];
  }

  const expectedJson = fs.readFileSync(JSON_FIXTURE, 'utf8');
  const expectedXml = fs.readFileSync(XML_FIXTURE, 'utf8');
  const jsonHash = sha256Hex(snapshot.jsonText);
  const xmlHash = sha256Hex(snapshot.xmlText);

  const jsonOk = snapshot.jsonText === expectedJson;
  if (jsonOk) {
    results.push({
      name: \`${ctx.prefix}GoldenMaster - JSON byte-exact seed ${ctx.seed} (sha256 \${jsonHash.slice(0, 12)}...)\`,
      ok: true,
    });
  } else {
    let expectedPayload: ${pp}GoldenJsonPayload;
    let actualPayload: ${pp}GoldenJsonPayload;
    try {
      expectedPayload = JSON.parse(expectedJson) as ${pp}GoldenJsonPayload;
      actualPayload = JSON.parse(snapshot.jsonText) as ${pp}GoldenJsonPayload;
    } catch {
      expectedPayload = { seed: ${pu}_GOLDEN_SEED, fixture: '', profile: '', noteCount: 0, events: [] };
      actualPayload = expectedPayload;
    }
    const eventDiff = diff${pp}GoldenEvents(expectedPayload.events ?? [], actualPayload.events ?? []);
    const preview = eventDiff.slice(0, 16).join('\\n');
    results.push({
      name: \`${ctx.prefix}GoldenMaster - JSON byte-exact seed ${ctx.seed}\`,
      ok: false,
      detail: \`sha256 expected=\${sha256Hex(expectedJson).slice(0, 12)} actual=\${jsonHash.slice(0, 12)}\${
        eventDiff.length ? \`\\n\${preview}\${eventDiff.length > 16 ? \`\\n...+\${eventDiff.length - 16} more\` : ''}\` : ''
      }\`,
    });
  }

  const xmlOk = snapshot.xmlText === expectedXml;
  if (xmlOk) {
    results.push({
      name: \`${ctx.prefix}GoldenMaster - MusicXML byte-exact seed ${ctx.seed} (sha256 \${xmlHash.slice(0, 12)}...)\`,
      ok: true,
    });
  } else {
    const idx = firstByteDiffIndex(expectedXml, snapshot.xmlText);
    const ctxStr =
      idx != null
        ? \`\\nfirst diff @ byte \${idx}\\nexpected: \${JSON.stringify(expectedXml.slice(Math.max(0, idx - 40), idx + 40))}\\nactual:   \${JSON.stringify(snapshot.xmlText.slice(Math.max(0, idx - 40), idx + 40))}\`
        : '';
    results.push({
      name: \`${ctx.prefix}GoldenMaster - MusicXML byte-exact seed ${ctx.seed}\`,
      ok: false,
      detail: \`sha256 expected=\${sha256Hex(expectedXml).slice(0, 12)} actual=\${xmlHash.slice(0, 12)}\${ctxStr}\`,
    });
  }

  return results;
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'write-fixtures') {
    write${pp}GoldenFixtures();
    process.exit(0);
  }
  if (cmd === 'run') {
    const rows = run${ctx.prefix}GoldenMasterTests();
    for (const row of rows) {
      console.log(\`\${row.ok ? 'PASS' : 'FAIL'}: \${row.name}\${row.detail ? \`\\n  \${row.detail}\` : ''}\`);
    }
    process.exit(rows.every((r) => r.ok) ? 0 : 1);
  }
  console.error('Usage: npx tsx ${ctx.prefix}GoldenMaster.test.ts write-fixtures | run');
  process.exit(1);
}
`;
}

function renderAutoValidation(ctx: ComposerContext): string {
  const pu = ctx.prefixUpper;
  const pp = ctx.prefixPascal;
  const bp = ctx.builderPrefix;
  return `/**
 * ${ctx.v86Track} Commit 2a - ${ctx.displayName} premium-melody auto-validation.
 * Runs golden path seed ${ctx.seed} on BH isolation benchmark (2a).
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/run${pp}PremiumMelodyAutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { run${pp}GoldenPath } from '../tests/${ctx.prefix}GoldenMaster.test';
import { runPremiumMelodyHarmonyRhythmExpressionPipeline } from '../core/premium-melody/premiumMelodyRouting';
import { build${bp}IsolationProvisionalProfile } from '../core/${ctx.coreDir}/${ctx.prefix}PremiumMelodyProfile';
import { validate${pp}PremiumMelodyConformance } from '../core/${ctx.coreDir}/${ctx.prefix}PremiumMelodyValidation';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyOffbeatRatio } from '../core/premium-melody/premiumMelodyMetrics';

const ${pu}_QA_PATH = path.join('C:', 'Users', 'mike', 'Documents', 'Mike Composer Files', 'Song Mode', '${ctx.prefix}-v86-2a-check.musicxml');

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

const ${pu}_GOLDEN_SEED = ${ctx.seed};

function main(): void {
  console.log('=== ${ctx.displayName} ${ctx.v86Track} Commit 2a Auto-Validation ===');
  console.log('Seed: ' + ${pu}_GOLDEN_SEED);

  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    console.error('FAIL - benchmark fixture missing: ' + BENCHMARK_FIXTURE);
    process.exit(1);
  }

  let xml: string;
  try {
    const result = run${pp}GoldenPath();
    xml = result.xml;
  } catch (e) {
    console.error('FAIL - golden path error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const rawMelodyLine = ir.melodyLine ?? [];
  console.log('Raw melody notes from fixture: ' + rawMelodyLine.length);

  const profile = build${bp}IsolationProvisionalProfile();
  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(rawMelodyLine, profile, ${pu}_GOLDEN_SEED);

  const postTrimOffbeatRatio = melodyOffbeatRatio(rhythmMelody);
  const rhythmMetaForValidation = { ...rhythmMeta, offbeatRatio: postTrimOffbeatRatio };

  const familySummary = Object.entries(rhythmMeta.familyCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([f, c]) => f + '=' + c)
    .join(', ');
  const longGapCount = rhythmMeta.familyCounts['long_gap'] ?? 0;
  const delayedCount = rhythmMeta.familyCounts['delayed'] ?? 0;
  const combinedShare = rhythmMeta.totalNotes > 0 ? ((longGapCount + delayedCount) / rhythmMeta.totalNotes) * 100 : 0;

  console.log('Family counts: ' + familySummary);
  console.log('long_gap+delayed combined share: ' + combinedShare.toFixed(1) + '% (informational)');

  const validation = validate${pp}PremiumMelodyConformance(rhythmMelody, exportMelody, rhythmMetaForValidation);

  console.log('\\n--- Validation Results ---');
  console.log(
    'offbeatRatio: ' +
      validation.offbeatRatio.toFixed(3) +
      ' [' +
      validation.offbeatRatioMin +
      ', ' +
      validation.offbeatRatioMax +
      '] -> ' +
      (validation.offbeatRatioPass ? 'PASS' : 'FAIL')
  );
  console.log(
    'ioiEntropy:   ' +
      validation.ioiEntropy.toFixed(3) +
      ' >= ' +
      validation.ioiEntropyMin +
      ' -> ' +
      (validation.ioiEntropyPass ? 'PASS' : 'FAIL')
  );
  console.log(
    'velocitySpread: ' +
      validation.velocitySpread +
      ' (min=' +
      validation.velocityMin +
      ', max=' +
      validation.velocityMax +
      ') [' +
      validation.velocitySpreadMin +
      ', ' +
      validation.velocitySpreadMax +
      '] -> ' +
      (validation.velocitySpreadPass ? 'PASS' : 'FAIL')
  );

  if (validation.details.length > 0) {
    console.log('\\nFailures:');
    for (const d of validation.details) console.log('  - ' + d);
  }

  console.log('\\nOverall: ' + (validation.pass ? 'PASS' : 'FAIL'));

  const qaDir = path.dirname(${pu}_QA_PATH);
  if (fs.existsSync(qaDir)) {
    fs.writeFileSync(${pu}_QA_PATH, xml, 'utf8');
    console.log('\\nQA MusicXML written to: ' + ${pu}_QA_PATH);
  } else {
    console.log('\\nSong Mode dir not found, skipping XML write: ' + qaDir);
  }

  if (!validation.pass) {
    process.exit(1);
  }
}

main();
`;
}

function renderRoutingSnippet(ctx: ComposerContext): string {
  const bp = ctx.builderPrefix;
  return `// Paste into runGoldenPath.ts (2a routing — ${ctx.displayName})
// import { build${bp}IsolationProvisionalProfile } from '../${ctx.coreDir}/${ctx.prefix}PremiumMelodyProfile';
// import { applyPremiumMelodyPinExport } from '../premium-melody/premiumMelodyPin';

  if (
    styleTransferResult?.composerApplied === '${ctx.slug}' &&
    options?.importTimeline &&
    (appliedContext.presetId ?? 'guitar_bass_duo') === 'guitar_bass_duo' &&
    (options.preserveMelody ?? true)
  ) {
    const ${ctx.prefix}Profile = build${bp}IsolationProvisionalProfile();
    const melodyLine = options.importTimeline.melodyLine;
    const ${ctx.prefix}PinResult = applyPremiumMelodyPinExport(score, melodyLine, ${ctx.prefix}Profile, seed);
    score = ${ctx.prefix}PinResult.score;
    appliedContext.generationMetadata = {
      ...appliedContext.generationMetadata,
      ${ctx.prefix}PremiumMelodyProfile: ${ctx.prefix}Profile.id,
      ${ctx.prefix}PremiumMelodyRhythmMeta: ${ctx.prefix}PinResult.rhythmMeta,
    };
  }
`;
}

function renderChangelog2a(ctx: ComposerContext): string {
  return `- **${ctx.v86Track} Commit 2a — ${ctx.displayName} golden-master baseline (isolation)** — Provisional profile **\`${ctx.profileId}\`** (\`${ctx.prefix}PremiumMelodyProfile.ts\`) + **\`runGoldenPath.ts\`** routing (\`${ctx.slug}\` + \`guitar_bass_duo\` + import timeline → premium-melody rhythm + expression + **\`pinPremiumMelodyExport\`**). Deterministic output captured at seed **${ctx.seed}** on reused **\`BH_Benchmark_JazzMelody.musicxml\`** pitches for isolation/determinism only — **not** ${ctx.displayName}-authentic material (native benchmark in **2c**). **\`${ctx.prefix}GoldenMaster.test.ts\`** + **\`${ctx.prefix}-isolation-seed${ctx.seed}.golden.json\`** / **\`.golden.musicxml\`** (PROVISIONAL). BH byte-identical to **1a** golden master. Gates: **\`${ctx.prefix}GoldenMaster\`** PASS, **\`bhGoldenMaster\`** PASS, smoke **664/664**, BH auto-validation **8/8**.\n`;
}

function renderChangelog2b(ctx: ComposerContext): string {
  return `- **${ctx.v86Track} Commit 2b — ${ctx.displayName} profile + routing + validation** — [FILL: profile tuning, threshold provisional values, fixture re-approval sha256]. BH **1a** golden master **byte-identical**. Gates: smoke **664/664**, BH **8/8**, **\`bhGoldenMaster\`** PASS, **\`${ctx.prefix}GoldenMaster\`** PASS.\n`;
}

function renderChangelog2c(ctx: ComposerContext): string {
  return `- **${ctx.v86Track} Commit 2c — ${ctx.displayName} native benchmark + golden-master freeze** — Original benchmark **\`${ctx.prefixUpper}_Benchmark_*.musicxml\`**. Fixtures **\`${ctx.prefix}-modal-seed${ctx.seed}.golden.*\`** (**FROZEN**). Thresholds finalized. BH byte-identical untouched. Gates: smoke **664/664**, BH **8/8**, **\`bhGoldenMaster\`** PASS, **\`${ctx.prefix}GoldenMaster\`** PASS.\n`;
}

function renderHandbookStub(ctx: ComposerContext): string {
  return `**${ctx.displayName} golden-master baseline (${ctx.v86Track} Commit 2a — PROVISIONAL):** Seed **${ctx.seed}**, profile **\`${ctx.profileId}\`**, fixtures **\`${ctx.prefix}-isolation-seed${ctx.seed}.golden.*\`**, test **\`${ctx.prefix}GoldenMaster.test.ts\`**. Input reuses **\`BH_Benchmark_JazzMelody.musicxml\`** (isolation only; native benchmark in **2c**). Validation: **\`${ctx.prefix}PremiumMelodyValidation.ts\`**, **\`run${ctx.prefixPascal}PremiumMelodyAutoValidation.ts\`** — PLACEHOLDER thresholds until **2c** freeze. QA export: **Song Mode** / \`${ctx.prefix}-v86-2a-check.musicxml\`.\n`;
}

const PROMPT_TEMPLATE_FALLBACK = `# V86 isolation-baseline (2a) — [COMPOSER_NAME]

**Stated purpose:** changing [COMPOSER_NAME] only. BH must stay byte-identical —
if bhGoldenMaster goes red, STOP, diff, do not push through, do not touch BH fixtures.

## Context
Scaffold already generated (do not regenerate unless missing):
- Profile: \`core/[COMPOSER_DIR]/[PREFIX]PremiumMelodyProfile.ts\`
- Golden test: \`[GOLDEN_TEST_PATH]\`
- Validation: \`[VALIDATION_PATH]\`
- Auto-validation: \`scripts/run[PrefixPascal]PremiumMelodyAutoValidation.ts\`
- Routing snippet: \`[ROUTING_SNIPPET_PATH]\` (paste manually)

## Tasks
1. **ROUTING** — Wire [COMPOSER_SLUG] in \`runGoldenPath.ts\` using snippet.
2. **PROFILE** — Confirm isolation provisional profile:
[PROFILE_VALUES_BLOCK]
3. **FIXTURES** — Run \`[GOLDEN_WRITE_CMD]\`. Input: BH benchmark (isolation ONLY).
4. **GATE** — smoke 664/664, BH 8/8, bhGoldenMaster PASS, [PREFIX]GoldenMaster PASS.
5. **DOCS** — Insert CHANGELOG + HANDBOOK stubs; regenerate docx.
6. **COMMIT** — git add named files only. BH fixtures untouched.

## Non-goals
No native benchmark, no threshold finalization, no engine hooks, no pitch layer.
`;

function loadPromptTemplate(): string {
  if (fs.existsSync(PROMPT_TPL_PATH)) {
    return fs.readFileSync(PROMPT_TPL_PATH, 'utf8');
  }
  return PROMPT_TEMPLATE_FALLBACK;
}

function renderPrompt(ctx: ComposerContext, paths: Record<string, string>): string {
  const tpl = loadPromptTemplate();
  const replacements: Record<string, string> = {
    '[COMPOSER_NAME]': ctx.displayName,
    '[COMPOSER_SLUG]': ctx.slug,
    '[PREFIX]': ctx.prefix,
    '[PREFIX_UPPER]': ctx.prefixUpper,
    '[PrefixPascal]': ctx.prefixPascal,
    '[ComposerPascal]': ctx.builderPrefix,
    '[SEED]': String(ctx.seed),
    '[V86_TRACK]': ctx.v86Track,
    '[PROFILE_ID]': ctx.profileId,
    '[COMPOSER_DIR]': ctx.coreDir,
    '[PROFILE_VALUES_BLOCK]': ctx.profileValuesBlock,
    '[GOLDEN_TEST_PATH]': paths.goldenTest,
    '[VALIDATION_PATH]': paths.validation,
    '[ROUTING_SNIPPET_PATH]': paths.routingSnippet,
    '[CHANGELOG_STUB_PATH]': paths.changelog2a,
    '[HANDBOOK_STUB_PATH]': paths.handbook,
    '[GOLDEN_WRITE_CMD]': `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/${ctx.prefix}GoldenMaster.test.ts write-fixtures`,
    '[GOLDEN_RUN_CMD]': `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/${ctx.prefix}GoldenMaster.test.ts run`,
    '[QA_EXPORT_PATH]': `${ctx.prefix}-v86-2a-check.musicxml`,
    '[AUTO_VALIDATION_CMD]': `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/run${ctx.prefixPascal}PremiumMelodyAutoValidation.ts`,
  };
  let out = tpl;
  for (const [slot, value] of Object.entries(replacements)) {
    out = out.split(slot).join(value);
  }
  return out;
}

function planFiles(ctx: ComposerContext): PlannedFile[] {
  const rel = (p: string) => normalizeRel(p);
  const paths = {
    profile: rel(`engines/composer-os-v2/core/${ctx.coreDir}/${ctx.prefix}PremiumMelodyProfile.ts`),
    validation: rel(`engines/composer-os-v2/core/${ctx.coreDir}/${ctx.prefix}PremiumMelodyValidation.ts`),
    goldenTest: rel(`engines/composer-os-v2/tests/${ctx.prefix}GoldenMaster.test.ts`),
    autoValidation: rel(`engines/composer-os-v2/scripts/run${ctx.prefixPascal}PremiumMelodyAutoValidation.ts`),
    routingSnippet: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-runGoldenPath-snippet.ts.txt`),
    changelog2a: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-CHANGELOG-2a.stub.md`),
    changelog2b: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-CHANGELOG-2b.stub.md`),
    changelog2c: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-CHANGELOG-2c.stub.md`),
    handbook: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-HANDBOOK.stub.md`),
    prompt: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-prompt-2a.md`),
    manifest: rel(`engines/composer-os-v2/scripts/scaffold/out/${ctx.prefix}-manifest.json`),
  };

  const prompt = renderPrompt(ctx, {
    goldenTest: paths.goldenTest,
    validation: paths.validation,
    routingSnippet: paths.routingSnippet,
    changelog2a: paths.changelog2a,
    handbook: paths.handbook,
  });

  const manifest = {
    composer: ctx.slug,
    seed: ctx.seed,
    prefix: ctx.prefix,
    v86Track: ctx.v86Track,
    filesWritten: [
      paths.profile,
      paths.validation,
      paths.goldenTest,
      paths.autoValidation,
      paths.routingSnippet,
      paths.changelog2a,
      paths.changelog2b,
      paths.changelog2c,
      paths.handbook,
      paths.prompt,
    ],
    nextSteps: [
      `Paste ${paths.routingSnippet} into runGoldenPath.ts`,
      `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/${ctx.prefix}GoldenMaster.test.ts write-fixtures`,
      `npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhGoldenMaster.test.ts run`,
      'npm run test:composer-smoke',
    ],
  };

  return [
    { relPath: paths.profile, content: renderProfile(ctx) },
    { relPath: paths.validation, content: renderValidation(ctx) },
    { relPath: paths.goldenTest, content: renderGoldenMaster(ctx) },
    { relPath: paths.autoValidation, content: renderAutoValidation(ctx) },
    { relPath: paths.routingSnippet, content: renderRoutingSnippet(ctx) },
    { relPath: paths.changelog2a, content: renderChangelog2a(ctx) },
    { relPath: paths.changelog2b, content: renderChangelog2b(ctx) },
    { relPath: paths.changelog2c, content: renderChangelog2c(ctx) },
    { relPath: paths.handbook, content: renderHandbookStub(ctx) },
    { relPath: paths.prompt, content: prompt },
    { relPath: paths.manifest, content: `${JSON.stringify(manifest, null, 2)}\n` },
  ];
}

function parseArgs(argv: string[]): {
  composer?: string;
  seed?: number;
  displayName?: string;
  prefix?: string;
  profileJson?: string;
  dryRun: boolean;
  force: boolean;
} {
  const out: ReturnType<typeof parseArgs> = { dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--composer') out.composer = argv[++i];
    else if (a === '--seed') out.seed = Number(argv[++i]);
    else if (a === '--display-name') out.displayName = argv[++i];
    else if (a === '--prefix') out.prefix = argv[++i];
    else if (a === '--profile-json') out.profileJson = argv[++i];
  }
  return out;
}

function loadProfileJson(profileJsonPath: string | undefined, seed: number): ProfileJson {
  if (!profileJsonPath) {
    return { ...DEFAULT_PROFILE };
  }
  const raw = fs.readFileSync(profileJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<ProfileJson>;
  return {
    syncopationShiftRate: parsed.syncopationShiftRate ?? DEFAULT_PROFILE.syncopationShiftRate,
    anticipationBias: parsed.anticipationBias ?? DEFAULT_PROFILE.anticipationBias,
    offbeatTrimCeiling: parsed.offbeatTrimCeiling ?? DEFAULT_PROFILE.offbeatTrimCeiling,
    barSlotNudgesEnabled: parsed.barSlotNudgesEnabled ?? DEFAULT_PROFILE.barSlotNudgesEnabled,
    structuralLandingMode: parsed.structuralLandingMode ?? DEFAULT_PROFILE.structuralLandingMode,
    expressionCharacter: parsed.expressionCharacter ?? DEFAULT_PROFILE.expressionCharacter,
    cellFamilyWeightScale: parsed.cellFamilyWeightScale ?? null,
  };
}

function buildContext(
  entry: RegistryComposer,
  args: ReturnType<typeof parseArgs>
): ComposerContext {
  const prefix = (args.prefix ?? entry.prefix).toLowerCase();
  const prefixUpper = prefix.toUpperCase();
  const profile = loadProfileJson(args.profileJson, args.seed!);
  const profileValuesBlock = formatProfileBlock(profile, args.seed!)
    .split('\n')
    .map((l) => `   ${l}`)
    .join('\n');
  return {
    slug: entry.slug,
    displayName: args.displayName ?? entry.displayName,
    prefix,
    prefixUpper,
    prefixPascal: capitalize(prefix),
    builderPrefix: entry.builderPrefix,
    coreDir: entry.coreDir,
    seed: args.seed!,
    v86Track: entry.v86Track,
    profileId: `${prefix}_isolation_provisional`,
    profile,
    profileValuesBlock,
  };
}

function validatePrefix(prefix: string, registry: RegistryFile): void {
  if (!/^[a-z]{2,4}$/.test(prefix)) {
    throw new Error(`Invalid prefix "${prefix}" — must be 2-4 lowercase letters.`);
  }
  if (registry.reservedPrefixes.includes(prefix)) {
    throw new Error(`Reserved prefix "${prefix}" — cannot scaffold.`);
  }
}

function validateComposerSlug(slug: string, registry: RegistryFile): RegistryComposer {
  if (registry.reservedComposerSlugs.includes(slug)) {
    throw new Error(`Reserved composer slug "${slug}" — cannot scaffold.`);
  }
  const entry = registry.composers.find((c) => c.slug === slug);
  if (!entry) {
    throw new Error(`Unknown composer "${slug}" — not in registry.json.`);
  }
  if (entry.frozen) {
    throw new Error(`Composer "${slug}" is frozen — cannot scaffold.`);
  }
  return entry;
}

function validateSeed(seed: number, registry: RegistryFile, slug: string): void {
  if (!Number.isInteger(seed) || seed <= 0) {
    throw new Error(`Invalid seed "${seed}" — must be a positive integer.`);
  }
  const collision = registry.composers.find((c) => c.seed === seed && c.slug !== slug);
  if (collision) {
    throw new Error(`Seed ${seed} already used by ${collision.slug} in registry.json.`);
  }
}

function validatePlannedFiles(files: PlannedFile[], ctx: ComposerContext, denyPaths: string[], force: boolean): void {
  for (const f of files) {
    if (!isAllowedWrite(f.relPath, ctx)) {
      throw new Error(`Path not on allowlist: ${f.relPath}`);
    }
    const denyHit = pathMatchesDeny(f.relPath, denyPaths);
    if (denyHit) {
      throw new Error(`Path on denylist (frozen/global): ${f.relPath} (matched ${denyHit})`);
    }
    const abs = path.join(REPO_ROOT, f.relPath);
    if (fs.existsSync(abs) && !force) {
      throw new Error(`File exists (use --force): ${f.relPath}`);
    }
  }
}

function writePlannedFiles(files: PlannedFile[]): string[] {
  const written: string[] = [];
  for (const f of files) {
    const abs = path.join(REPO_ROOT, f.relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.content, 'utf8');
    written.push(abs);
  }
  return written;
}

function rollback(writtenAbs: string[]): void {
  for (const abs of [...writtenAbs].reverse()) {
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      /* ignore */
    }
  }
}

function runBhGoldenMasterPostFlight(): boolean {
  try {
    const out = execSync(
      'npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhGoldenMaster.test.ts run',
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' }
    );
    return /PASS: bhGoldenMaster/.test(out);
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    console.error(err.stdout ?? err.stderr ?? String(e));
    return false;
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.composer || args.seed == null) {
    console.error(
      'Usage: npx tsx scaffoldPremiumMelodyComposer.ts --composer <slug> --seed <int> [--display-name] [--prefix] [--profile-json] [--dry-run] [--force]'
    );
    process.exit(1);
  }

  const registry = loadRegistry();
  const entry = validateComposerSlug(args.composer, registry);
  validateSeed(args.seed, registry, args.composer);
  const ctx = buildContext(entry, args);
  validatePrefix(ctx.prefix, registry);

  const prefixOwner = registry.composers.find((c) => c.prefix === ctx.prefix && c.slug !== ctx.slug);
  if (prefixOwner) {
    throw new Error(`Prefix "${ctx.prefix}" already owned by ${prefixOwner.slug}.`);
  }

  const denyPaths = buildDenyPaths(registry);
  const files = planFiles(ctx);
  validatePlannedFiles(files, ctx, denyPaths, args.force);

  if (args.dryRun) {
    console.log('=== DRY RUN — no files written ===');
    console.log(`Composer: ${ctx.displayName} (${ctx.slug}) seed ${ctx.seed} prefix ${ctx.prefix}`);
    console.log('Would generate:');
    for (const f of files) {
      console.log(`  ${f.relPath} (${f.content.length} bytes)`);
    }
    console.log('\nDenylist (derived):');
    for (const d of denyPaths) console.log(`  ${d}`);
    process.exit(0);
  }

  let written: string[] = [];
  try {
    written = writePlannedFiles(files);
    console.log(`Scaffold wrote ${written.length} files for ${ctx.displayName} (${ctx.slug}).`);
    for (const abs of written) {
      console.log(`  ${normalizeRel(path.relative(REPO_ROOT, abs))}`);
    }

    const bhOk = runBhGoldenMasterPostFlight();
    if (!bhOk) {
      console.error('BH oracle red — scaffold rolled back.');
      rollback(written);
      process.exit(1);
    }
    console.log('Post-flight: bhGoldenMaster PASS');
  } catch (e) {
    rollback(written);
    throw e;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
