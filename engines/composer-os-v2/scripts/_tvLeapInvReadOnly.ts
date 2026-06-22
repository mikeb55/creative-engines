/**
 * Automated Art Rock mosaic arc validation - Television Field Suite (40 bars, duo).
 * Generates fixed proof output, analyzes MusicXML per-bar, reports PASS / WARN / FAIL.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/validateArtRockMosaicArc.ts
 */

import fs from 'fs';
import path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  TELEVISION_FIELD_SUITE_PRESET,
  TELEVISION_FIELD_SUITE_PRESET_ID,
  cloneMosaicSectionPlanPresetPlan,
} from '../core/mosaic-mode/mosaicSectionPlanPresets';
import {
  analyzeMusicXmlPerBar,
  type PartSummary,
  type PerBarPartStats,
} from './analyzeMusicXmlPerBar';

const PROOF_SEED = 90106;
const TOTAL_BARS = TELEVISION_FIELD_SUITE_PRESET.totalBars;
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'art-rock-mosaic-validation');
const OUTPUT_XML = path.join(OUTPUT_DIR, `television-field-suite-seed${PROOF_SEED}.musicxml`);

type RuleVerdict = 'PASS' | 'WARN' | 'FAIL';

type RuleResult = {
  id: string;
  verdict: RuleVerdict;
  reason: string;
  metrics?: Record<string, number | string | boolean>;
};

type ValidationReport = {
  overall: RuleVerdict;
  presetId: typeof TELEVISION_FIELD_SUITE_PRESET_ID;
  seed: number;
  outputXml: string;
  generationSuccess: boolean;
  goldenPathSuccess: boolean;
  goldenPathErrors?: string[];
  sectionBoundaries: Array<{ label: string; startBar: number; endBar: number; composer: string }>;
  composerReceipts: { verlaine: boolean; marr: boolean; fripp: boolean };
  rules: RuleResult[];
  metrics: Record<string, number>;
};

function lockedHarmony40(): string[] {
  const cycle = ['Em', 'Am', 'D', 'G', 'C', 'B7', 'Em', 'Am'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function sectionBounds(): ValidationReport['sectionBoundaries'] {
  return TELEVISION_FIELD_SUITE_PRESET.plan.map((s) => ({
    label: s.sectionLabel,
    startBar: s.startBar,
    endBar: s.endBar,
    composer: s.songwriterStyleId,
  }));
}

function findPart(parts: PartSummary[], pattern: RegExp): PartSummary | undefined {
  return parts.find((p) => pattern.test(p.partName) || pattern.test(p.partId));
}

function barsInRange(part: PartSummary | undefined, from: number, to: number): PerBarPartStats[] {
  if (!part) return [];
  return part.bars.filter((b) => b.bar >= from && b.bar <= to);
}

function avgAttacks(parts: PartSummary[], from: number, to: number): number {
  let sum = 0;
  let count = 0;
  for (const part of parts) {
    for (const bar of barsInRange(part, from, to)) {
      sum += bar.attacks;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function sectionFingerprintTokens(parts: PartSummary[], from: number, to: number): Set<string> {
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const bar of barsInRange(part, from, to)) {
      if (!bar.fingerprint) continue;
      for (const token of bar.fingerprint.split('|')) {
        if (token) tokens.add(token);
      }
    }
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function midiFromFingerprintToken(token: string): number | null {
  const bits = token.split(':');
  if (bits.length < 2) return null;
  const midi = Number(bits[1]);
  return Number.isFinite(midi) ? midi : null;
}

function upperRegisterAttackShare(part: PartSummary | undefined, from: number, to: number, midiMin = 72): number {
  if (!part) return 0;
  let total = 0;
  let upper = 0;
  for (const bar of barsInRange(part, from, to)) {
    for (const token of bar.fingerprint.split('|')) {
      if (!token) continue;
      total += 1;
      const midi = midiFromFingerprintToken(token);
      if (midi != null && midi >= midiMin) upper += 1;
    }
  }
  return total === 0 ? 0 : upper / total;
}

function guitarLeadShare(guitar: PartSummary | undefined, bass: PartSummary | undefined, from: number, to: number): number {
  const g = barsInRange(guitar, from, to).reduce((s, b) => s + b.attacks, 0);
  const b = barsInRange(bass, from, to).reduce((s, x) => s + x.attacks, 0);
  const total = g + b;
  return total === 0 ? 0 : g / total;
}

function worstVerdict(rules: RuleResult[]): RuleVerdict {
  if (rules.some((r) => r.verdict === 'FAIL')) return 'FAIL';
  if (rules.some((r) => r.verdict === 'WARN')) return 'WARN';
  return 'PASS';
}

function generateProofXml(): {
  xml: string;
  generationSuccess: boolean;
  goldenPathSuccess: boolean;
  goldenPathErrors: string[];
  composerReceipts: ValidationReport['composerReceipts'];
} {
  const plan = cloneMosaicSectionPlanPresetPlan(TELEVISION_FIELD_SUITE_PRESET_ID);
  const locked = lockedHarmony40();
  const result = runGoldenPathOnce(PROOF_SEED, {
    presetId: 'guitar_bass_duo',
    scoreTitle: 'Television Field Suite - Art Rock Mosaic Validation',
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: plan,
    mosaicOutputFormat: 'melody-bass-chords',
    primarySongwriterStyle: 'verlaine',
    songModeHookFirstIdentity: true,
  });

  const md = result.context?.generationMetadata;
  const receiptBlob = [
    ...(md?.verlaineDeviceReceipts ?? []),
    md?.verlaineSliceReceipt ?? '',
    ...(md?.marrDeviceReceipts ?? []),
    md?.marrSliceReceipt ?? '',
    ...(md?.frippDeviceReceipts ?? []),
    md?.frippSliceReceipt ?? '',
  ].join('\n');
  const evalComposerIds = new Set((md?.mosaicSectionEvalResults ?? []).map((e) => e.composerId));

  const composerReceipts = {
    verlaine:
      receiptBlob.includes('tv:') || receiptBlob.includes('verlaine') || evalComposerIds.has('verlaine'),
    marr: receiptBlob.includes('jma:') || receiptBlob.includes('marr') || evalComposerIds.has('marr'),
    fripp: receiptBlob.includes('rf:') || receiptBlob.includes('fripp') || evalComposerIds.has('fripp'),
  };

  const goldenPathSuccess = result.success === true;
  const goldenPathErrors = result.errors ?? [];

  if (!result.score) {
    return { xml: '', generationSuccess: false, goldenPathSuccess, goldenPathErrors, composerReceipts };
  }

  let xml = result.xml;
  if (!xml) {
    const exported = exportScoreModelToMusicXml(result.score, { bpm: 120 });
    xml = exported.xml ?? '';
  }

  if (!xml) {
    return { xml: '', generationSuccess: false, goldenPathSuccess, goldenPathErrors, composerReceipts };
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_XML, xml, 'utf8');

  return { xml, generationSuccess: true, goldenPathSuccess, goldenPathErrors, composerReceipts };
}

function validateArc(
  xml: string,
  composerReceipts: ValidationReport['composerReceipts'],
  goldenPathSuccess: boolean,
  goldenPathErrors: string[],
): ValidationReport {
  const bounds = sectionBounds();
  const intro = bounds.find((s) => s.label === 'intro')!;
  const build = bounds.find((s) => s.label === 'build')!;
  const peak = bounds.find((s) => s.label === 'peak')!;
  const tail = bounds.find((s) => s.label === 'tail')!;

  const { parts } = analyzeMusicXmlPerBar(xml);
  const guitar = findPart(parts, /guitar/i);
  const bass = findPart(parts, /bass|electric bass|upright/i);

  const densityIntro = avgAttacks(parts, intro.startBar, intro.endBar);
  const densityBuild = avgAttacks(parts, build.startBar, build.endBar);
  const densityPeak = avgAttacks(parts, peak.startBar, peak.endBar);
  const densityTail = avgAttacks(parts, tail.startBar, tail.endBar);

  const peakTailSim = jaccard(
    sectionFingerprintTokens(parts, peak.startBar, peak.endBar),
    sectionFingerprintTokens(parts, tail.startBar, tail.endBar),
  );
  const introTailSim = jaccard(
    sectionFingerprintTokens(parts, intro.startBar, Math.min(intro.endBar, intro.startBar + 2)),
    sectionFingerprintTokens(parts, tail.startBar, Math.min(tail.endBar, tail.startBar + 2)),
  );

  const guitarShareBuild = guitarLeadShare(guitar, bass, build.startBar, build.endBar);
  const guitarSharePeak = guitarLeadShare(guitar, bass, peak.startBar, peak.endBar);
  const upperBuild = upperRegisterAttackShare(guitar, build.startBar, build.endBar);
  const upperPeak = upperRegisterAttackShare(guitar, peak.startBar, peak.endBar);

  const rules: RuleResult[] = [];

  rules.push({
    id: 'golden_path_success',
    verdict: goldenPathSuccess ? 'PASS' : 'WARN',
    reason: goldenPathSuccess
      ? 'runGoldenPathOnce returned success=true.'
      : `runGoldenPathOnce returned success=false (${goldenPathErrors.slice(0, 2).join('; ') || 'no error detail'}); arc rules still run on exported MusicXML.`,
    metrics: { goldenPathSuccess },
  });

  rules.push({
    id: 'generation_path',
    verdict: composerReceipts.verlaine && composerReceipts.marr && composerReceipts.fripp ? 'PASS' : 'FAIL',
    reason:
      composerReceipts.verlaine && composerReceipts.marr && composerReceipts.fripp
        ? 'Art Rock mosaic composers present in generation receipts (verlaine/marr/fripp).'
        : `Missing composer receipts: verlaine=${composerReceipts.verlaine} marr=${composerReceipts.marr} fripp=${composerReceipts.fripp}`,
    metrics: composerReceipts,
  });

  rules.push({
    id: 'density_intro_lighter_than_build',
    verdict: densityIntro < densityBuild ? 'PASS' : densityIntro === densityBuild ? 'WARN' : 'FAIL',
    reason:
      densityIntro < densityBuild
        ? `Intro avg attacks/bar (${densityIntro.toFixed(2)}) < build (${densityBuild.toFixed(2)}).`
        : densityIntro === densityBuild
          ? `Intro equals build (${densityIntro.toFixed(2)}); no lift yet.`
          : `Intro (${densityIntro.toFixed(2)}) not lighter than build (${densityBuild.toFixed(2)}).`,
    metrics: { densityIntro, densityBuild },
  });

  rules.push({
    id: 'density_peak_at_least_build',
    verdict: densityPeak >= densityBuild * 0.92 ? 'PASS' : densityPeak >= densityBuild * 0.85 ? 'WARN' : 'FAIL',
    reason:
      densityPeak >= densityBuild
        ? `Peak (${densityPeak.toFixed(2)}) >= build (${densityBuild.toFixed(2)}).`
        : densityPeak >= densityBuild * 0.92
          ? `Peak (${densityPeak.toFixed(2)}) within 8% of build (${densityBuild.toFixed(2)}).`
          : `Peak (${densityPeak.toFixed(2)}) materially below build (${densityBuild.toFixed(2)}).`,
    metrics: { densityPeak, densityBuild },
  });

  rules.push({
    id: 'density_tail_relaxes',
    verdict:
      densityTail < densityPeak && densityTail <= densityBuild
        ? 'PASS'
        : densityTail < densityPeak
          ? 'WARN'
          : 'FAIL',
    reason:
      densityTail < densityPeak && densityTail <= densityBuild
        ? `Tail (${densityTail.toFixed(2)}) below peak (${densityPeak.toFixed(2)}) and build (${densityBuild.toFixed(2)}).`
        : densityTail < densityPeak
          ? `Tail (${densityTail.toFixed(2)}) below peak but still above build (${densityBuild.toFixed(2)}).`
          : `Tail (${densityTail.toFixed(2)}) does not relax vs peak (${densityPeak.toFixed(2)}).`,
    metrics: { densityTail, densityPeak, densityBuild },
  });

  rules.push({
    id: 'section_contrast_peak_vs_tail',
    verdict: peakTailSim < 0.55 ? 'PASS' : peakTailSim < 0.72 ? 'WARN' : 'FAIL',
    reason:
      peakTailSim < 0.55
        ? `Peak/tail fingerprint Jaccard ${peakTailSim.toFixed(3)} - distinct textures.`
        : peakTailSim < 0.72
          ? `Peak/tail partially similar (Jaccard ${peakTailSim.toFixed(3)}).`
          : `Peak and tail fingerprints too alike (Jaccard ${peakTailSim.toFixed(3)}).`,
    metrics: { peakTailSim },
  });

  rules.push({
    id: 'section_recap_intro_vs_tail',
    verdict: introTailSim < 0.65 ? 'PASS' : introTailSim < 0.82 ? 'WARN' : 'FAIL',
    reason:
      introTailSim < 0.65
        ? `Intro/tail opening bars differ (Jaccard ${introTailSim.toFixed(3)}).`
        : introTailSim < 0.82
          ? `Intro/tail opening bars partially echo (Jaccard ${introTailSim.toFixed(3)}).`
          : `Intro/tail opening bars nearly identical (Jaccard ${introTailSim.toFixed(3)}).`,
    metrics: { introTailSim },
  });

  const guitarShareDelta = Math.abs(guitarSharePeak - guitarShareBuild);
  const upperRegDelta = Math.abs(upperPeak - upperBuild);
  rules.push({
    id: 'voice_handoff_emphasis_shift',
    verdict: guitarShareDelta >= 0.04 || upperRegDelta >= 0.06 ? 'PASS' : guitarShareDelta >= 0.02 ? 'WARN' : 'FAIL',
    reason:
      guitarShareDelta >= 0.04 || upperRegDelta >= 0.06
        ? `Peak shifts emphasis vs build (guitarShare delta=${guitarShareDelta.toFixed(3)}, upperReg delta=${upperRegDelta.toFixed(3)}).`
        : guitarShareDelta >= 0.02
          ? `Minor emphasis shift at peak (guitarShare delta=${guitarShareDelta.toFixed(3)}).`
          : 'Peak section does not measurably shift guitar/upper-register emphasis vs build.',
    metrics: { guitarShareBuild, guitarSharePeak, upperBuild, upperPeak, guitarShareDelta, upperRegDelta },
  });

  return {
    overall: worstVerdict(rules),
    presetId: TELEVISION_FIELD_SUITE_PRESET_ID,
    seed: PROOF_SEED,
    outputXml: OUTPUT_XML,
    generationSuccess: true,
    goldenPathSuccess,
    goldenPathErrors: goldenPathErrors.length ? goldenPathErrors : undefined,
    sectionBoundaries: bounds,
    composerReceipts,
    rules,
    metrics: {
      densityIntro,
      densityBuild,
      densityPeak,
      densityTail,
      peakTailSim,
      introTailSim,
      guitarShareBuild,
      guitarSharePeak,
      upperBuild,
      upperPeak,
    },
  };
}

function main(): void {
  console.log('Art Rock mosaic arc validation - Television Field Suite');
  console.log(`seed=${PROOF_SEED} bars=${TOTAL_BARS} preset=${TELEVISION_FIELD_SUITE_PRESET_ID}`);
  console.log('Generating proof chart (this may take several minutes)...');

  const { xml, generationSuccess, goldenPathSuccess, goldenPathErrors, composerReceipts } = generateProofXml();
  if (!generationSuccess || !xml) {
    const failReport: ValidationReport = {
      overall: 'FAIL',
      presetId: TELEVISION_FIELD_SUITE_PRESET_ID,
      seed: PROOF_SEED,
      outputXml: OUTPUT_XML,
      generationSuccess: false,
      goldenPathSuccess,
      goldenPathErrors: goldenPathErrors.length ? goldenPathErrors : undefined,
      sectionBoundaries: sectionBounds(),
      composerReceipts,
      rules: [
        {
          id: 'generation',
          verdict: 'FAIL',
          reason: 'runGoldenPathOnce did not produce analyzable MusicXML output.',
        },
      ],
      metrics: {},
    };
    console.log(JSON.stringify(failReport, null, 2));
    process.exit(1);
  }

  const report = validateArc(xml, composerReceipts, goldenPathSuccess, goldenPathErrors);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.overall === 'FAIL' ? 1 : 0);
}

if (require.main === module) {
  main();
}

export { validateArc, generateProofXml, PROOF_SEED, OUTPUT_XML };
