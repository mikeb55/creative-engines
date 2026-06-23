/**
 * Multi-block arranger conductor v1 — hand-edited blocks → parent locked harmony + mosaicSectionPlan.
 */

import * as fs from "fs";
import * as path from "path";
import { generateComposition } from "../app-api/generateComposition";
import type { GenerateRequest } from "../app-api/appApiTypes";
import { ART_ROCK_BAND_DRUMS_PART_ID } from "../core/export/appendArtRockBandDrumsToScore";
import { getDispatchEntry } from "../core/mosaic-mode/mosaicComposerDispatch";
import { composerForBar } from "../core/mosaic-mode/mosaicBarHelpers";
import { resolveMosaicSectionStyles } from "../core/mosaic-mode/resolveMosaicSectionStyles";
import { runGoldenPath } from "../core/goldenPath/runGoldenPath";

const PROOF_SEED = 90106;
const BARS_PER_BLOCK = 8;
const OUTPUT_DIR = path.join(__dirname, "..", "output", "multi-block-arranger");

const BLOCKS: Array<{ chords: string[]; composer: string }> = [
  { composer: "verlaine", chords: ["Em(maj7)", "Fmaj7#11/E", "Am6", "Cmaj7", "G7sus4", "F#m7b5", "B7alt", "Em(add9)"] },
  { composer: "marr", chords: ["Dmaj7", "A/C#", "Bm7", "Gmaj7", "D/F#", "Em7", "A7", "Dmaj9"] },
  { composer: "fripp", chords: ["Cm7", "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dm7b5", "G7alt", "Cm(add9)"] },
];

function assertBlockShape(): void {
  for (let i = 0; i < BLOCKS.length; i++) {
    const block = BLOCKS[i]!;
    if (block.chords.length !== BARS_PER_BLOCK) throw new Error(`BLOCKS[${i}] must have ${BARS_PER_BLOCK} chords`);
    if (!getDispatchEntry(block.composer)) throw new Error(`Unknown composer: ${block.composer}`);
  }
}

function buildParentChords(): string[] { return BLOCKS.flatMap((b) => [...b.chords]); }

function buildMosaicSectionPlan(): NonNullable<GenerateRequest["mosaicSectionPlan"]> {
  return BLOCKS.map((block, i) => ({
    sectionLabel: `block${i}`,
    startBar: i * BARS_PER_BLOCK + 1,
    endBar: i * BARS_PER_BLOCK + BARS_PER_BLOCK,
    songwriterStyleId: block.composer,
  }));
}

function assertParentLength(n: number): void {
  if (n % 8 !== 0 || n < 8 || n > 64) throw new Error(`parent length invalid: ${n}`);
}

function buildRequest(parent: string[], plan: NonNullable<GenerateRequest["mosaicSectionPlan"]>): GenerateRequest {
  return {
    presetId: "guitar_bass_duo", styleStack: { primary: "barry_harris" }, seed: PROOF_SEED,
    totalBars: parent.length, longFormEnabled: true, bandModeEnabled: true, harmonyMode: "custom_locked",
    chordProgressionText: parent.join(" | "), mosaicSectionPlan: plan, bpm: 120, title: "Multi-block arranger v1",
  };
}

function xmlHasDrumsPart(xml: string): boolean {
  return xml.includes(`id="${ART_ROCK_BAND_DRUMS_PART_ID}"`) || /<part-name>Drums<\/part-name>/i.test(xml);
}

function rehearsalMarksFromXml(xml: string): Array<{ bar: number; label: string }> {
  const marks: Array<{ bar: number; label: string }> = [];
  for (const m of xml.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/gi)) {
    const bar = parseInt(m[1]!, 10);
    const rehearsal = (m[2] ?? "").match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
    if (rehearsal?.[1]) marks.push({ bar, label: rehearsal[1].trim() });
  }
  return marks;
}

function composerEvidenceFromGoldenPath(req: GenerateRequest) {
  const gp = runGoldenPath(PROOF_SEED, {
    presetId: req.presetId, harmonyMode: req.harmonyMode, chordProgressionText: req.chordProgressionText,
    totalBars: req.totalBars, longFormEnabled: req.longFormEnabled, bandModeEnabled: req.bandModeEnabled,
    mosaicSectionPlan: req.mosaicSectionPlan,
  });
  const meta = gp.context.generationMetadata;
  const sampleBars = [1, 8, 9, 16, 17, 24].filter((b) => b <= (req.totalBars ?? 24));
  const composerByBarSample: Record<number, string> = {};
  for (const bar of sampleBars) composerByBarSample[bar] = composerForBar(bar, gp.context);
  const routing = resolveMosaicSectionStyles(gp.context.form, meta);
  return {
    mosaicSectionOwnership: meta.mosaicSectionOwnership,
    composerByBarSample,
    mosaicLockRegistry: meta.mosaicLockRegistry?.map((e) => ({ sectionLabel: e.sectionLabel, composerId: e.composerId })),
    routingMode: routing.mode,
  };
}

function main(): void {
  assertBlockShape();
  const parent = buildParentChords();
  assertParentLength(parent.length);
  const plan = buildMosaicSectionPlan();
  const req = buildRequest(parent, plan);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const result = generateComposition(req, OUTPUT_DIR);
  const chordFailures: string[] = [];
  if (result.chordProgressionParseFailed) chordFailures.push(String(result.chordProgressionParseFailed));
  const dx = result.chordExportDiagnostics;
  if (dx) {
    for (let i = 0; i < parent.length; i++) {
      const e = dx.perChord[i];
      if (e?.usedFallback || e?.warning) chordFailures.push(`${parent[i]} -> ${e.normalizedSymbol}`);
    }
  }
  const drumsPresent = !!(result.success && result.xml && xmlHasDrumsPart(result.xml));
  const rehearsalMarks = result.xml ? rehearsalMarksFromXml(result.xml) : [];
  const evidence = result.success ? composerEvidenceFromGoldenPath(req) : undefined;
  const distinct = evidence ? [...new Set(Object.values(evidence.composerByBarSample))] : [];
  const threeApplied = evidence?.routingMode === "duo" && distinct.length === 3 && distinct.includes("verlaine") && distinct.includes("marr") && distinct.includes("fripp");
  console.log(JSON.stringify({ success: result.success, error: result.error, musicxmlPath: result.filepath, totalBars: parent.length, drumsPresent, chordFailures, rehearsalMarks, composerEvidence: evidence, threeDistinctComposersApplied: threeApplied }, null, 2));
  if (!result.success) process.exitCode = 1;
}

main();
