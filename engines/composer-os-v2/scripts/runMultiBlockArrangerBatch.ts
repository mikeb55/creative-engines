/**
 * Multi-block arranger batch — 3 arrangements via mosaic conductor (no engine changes).
 */

import * as fs from "fs";
import * as path from "path";
import { generateComposition, type GenerateResult } from "../app-api/generateComposition";
import type { GenerateRequest } from "../app-api/appApiTypes";
import { ART_ROCK_BAND_DRUMS_PART_ID } from "../core/export/appendArtRockBandDrumsToScore";
import { getDispatchEntry } from "../core/mosaic-mode/mosaicComposerDispatch";
import { composerForBar } from "../core/mosaic-mode/mosaicBarHelpers";
import { resolveMosaicSectionStyles } from "../core/mosaic-mode/resolveMosaicSectionStyles";
import { runGoldenPath } from "../core/goldenPath/runGoldenPath";

const PROOF_SEED = 90106;
const BARS_PER_BLOCK = 8;
const OUTPUT_DIR = path.join(__dirname, "..", "output", "multi-block-arranger-batch");

type BlockSpec = { chords: string[]; composer: string };
type ArrangementSpec = { name: string; blocks: BlockSpec[] };

const CHORD_PALETTES: BlockSpec[] = [
  { composer: "_", chords: ["Em(maj7)", "Fmaj7#11/E", "Am6", "Cmaj7", "G7sus4", "F#m7b5", "B7alt", "Em(add9)"] },
  { composer: "_", chords: ["Dmaj7", "A/C#", "Bm7", "Gmaj7", "D/F#", "Em7", "A7", "Dmaj9"] },
  { composer: "_", chords: ["Cm7", "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dm7b5", "G7alt", "Cm(add9)"] },
  { composer: "_", chords: ["Am7", "D7", "Gmaj7", "Cmaj7", "F#m7b5", "B7", "Em7", "Am9"] },
];

const ARRANGEMENTS: ArrangementSpec[] = [
  { name: "A", blocks: [
    { composer: "verlaine", chords: [...CHORD_PALETTES[0]!.chords] },
    { composer: "marr", chords: [...CHORD_PALETTES[1]!.chords] },
  ]},
  { name: "B", blocks: [
    { composer: "verlaine", chords: [...CHORD_PALETTES[0]!.chords] },
    { composer: "marr", chords: [...CHORD_PALETTES[1]!.chords] },
    { composer: "fripp", chords: [...CHORD_PALETTES[2]!.chords] },
  ]},
  { name: "C", blocks: [
    { composer: "verlaine", chords: [...CHORD_PALETTES[0]!.chords] },
    { composer: "marr", chords: [...CHORD_PALETTES[1]!.chords] },
    { composer: "fripp", chords: [...CHORD_PALETTES[2]!.chords] },
    { composer: "verlaine", chords: [...CHORD_PALETTES[0]!.chords] },
  ]},
];

function assertBlocks(blocks: BlockSpec[]): void {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.chords.length !== BARS_PER_BLOCK) throw new Error(`block ${i}: need ${BARS_PER_BLOCK} chords`);
    if (!getDispatchEntry(b.composer)) throw new Error(`block ${i}: unknown composer ${b.composer}`);
  }
}

function buildParent(blocks: BlockSpec[]): string[] {
  return blocks.flatMap((b) => [...b.chords]);
}

function buildPlan(blocks: BlockSpec[]): NonNullable<GenerateRequest["mosaicSectionPlan"]> {
  return blocks.map((block, i) => ({
    sectionLabel: `block${i}`,
    startBar: i * BARS_PER_BLOCK + 1,
    endBar: i * BARS_PER_BLOCK + BARS_PER_BLOCK,
    songwriterStyleId: block.composer,
  }));
}

function buildRequest(name: string, blocks: BlockSpec[]): GenerateRequest {
  const parent = buildParent(blocks);
  const n = parent.length;
  if (n % 8 !== 0 || n < 8 || n > 64) throw new Error(`invalid parent length ${n}`);
  return {
    presetId: "guitar_bass_duo",
    styleStack: { primary: "barry_harris" },
    seed: PROOF_SEED,
    totalBars: n,
    longFormEnabled: true,
    bandModeEnabled: true,
    harmonyMode: "custom_locked",
    chordProgressionText: parent.join(" | "),
    mosaicSectionPlan: buildPlan(blocks),
    bpm: 120,
    title: `Multi-block batch ${name}`,
  };
}

function rehearsalMarksFromXml(xml: string): Array<{ bar: number; label: string }> {
  const marks: Array<{ bar: number; label: string }> = [];
  for (const m of xml.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/gi)) {
    const bar = parseInt(m[1]!, 10);
    const inner = m[2] ?? "";
    const rehearsal = inner.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
    if (rehearsal?.[1]) marks.push({ bar, label: rehearsal[1].trim() });
    else {
      const words = inner.match(/<words[^>]*>([^<]+)<\/words>/i);
      if (words?.[1] && /rehearsal|block|verlaine|marr|fripp/i.test(words[1])) {
        marks.push({ bar, label: words[1].trim() });
      }
    }
  }
  return marks;
}

function composersApplied(req: GenerateRequest): string[] {
  const gp = runGoldenPath(PROOF_SEED, {
    presetId: req.presetId,
    harmonyMode: req.harmonyMode,
    chordProgressionText: req.chordProgressionText,
    totalBars: req.totalBars,
    longFormEnabled: req.longFormEnabled,
    bandModeEnabled: req.bandModeEnabled,
    mosaicSectionPlan: req.mosaicSectionPlan,
  });
  const meta = gp.context.generationMetadata;
  const routing = resolveMosaicSectionStyles(gp.context.form, meta);
  if (routing.mode !== "duo") throw new Error("mosaic routing not duo");
  const tb = req.totalBars ?? 8;
  const perBlock: string[] = [];
  for (let i = 0; i < (req.mosaicSectionPlan?.length ?? 0); i++) {
    const start = i * BARS_PER_BLOCK + 1;
    const composer = composerForBar(start, gp.context);
    perBlock.push(composer);
  }
  return perBlock;
}

function chordFailures(req: GenerateRequest, result: GenerateResult): string {
  const fails: string[] = [];
  if (result.chordProgressionParseFailed) fails.push(String(result.chordProgressionParseFailed));
  const parent = req.chordProgressionText?.split("|").map((s) => s.trim()) ?? [];
  const dx = result.chordExportDiagnostics;
  if (dx) {
    for (let i = 0; i < parent.length; i++) {
      const e = dx.perChord[i];
      if (e?.usedFallback || e?.warning) fails.push(parent[i] ?? "?");
    }
  }
  return fails.length ? fails.join("; ") : "none";
}

type Row = {
  name: string;
  totalBars: number;
  blockCount: number;
  composersRequested: string;
  composersApplied: string;
  rehearsalMarks: string;
  chordParseFailures: string;
  outputPath: string;
  match: boolean;
};

function runOne(spec: ArrangementSpec): Row {
  assertBlocks(spec.blocks);
  const req = buildRequest(spec.name, spec.blocks);
  const requested = spec.blocks.map((b) => b.composer);
  const result = generateComposition(req, OUTPUT_DIR);
  if (!result.success) throw new Error(`${spec.name} failed: ${result.error}`);
  const applied = composersApplied(req);
  const match = applied.length === requested.length && applied.every((c, i) => c === requested[i]);
  if (!match) {
    throw new Error(
      `${spec.name} composer mismatch: requested [${requested.join(",")}] applied [${applied.join(",")}]`
    );
  }
  const marks = result.xml ? rehearsalMarksFromXml(result.xml) : [];
  const boundaryBars = spec.blocks.map((_, i) => i * BARS_PER_BLOCK + 1);
  const marksAtBoundaries = boundaryBars.filter((bar) => marks.some((m) => m.bar === bar));
  const rehearsalEmitted = marks.length > 0 && marksAtBoundaries.length === boundaryBars.length;
  return {
    name: spec.name,
    totalBars: req.totalBars ?? 0,
    blockCount: spec.blocks.length,
    composersRequested: requested.join(", "),
    composersApplied: applied.join(", "),
    rehearsalMarks: rehearsalEmitted
      ? `yes (${marks.map((m) => `bar${m.bar}=${m.label}`).join("; ")})`
      : marks.length > 0
        ? `partial (${marks.map((m) => `bar${m.bar}=${m.label}`).join("; ")})`
        : "no",
    chordParseFailures: chordFailures(req, result),
    outputPath: result.filepath ?? "(missing)",
    match,
  };
}

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const rows: Row[] = [];
  for (const spec of ARRANGEMENTS) rows.push(runOne(spec));
  console.log("MULTI_BLOCK_ARRANGER_BATCH");
  console.log("| name | total bars | #blocks | composers requested | composers applied | rehearsal marks | chord-parse failures | output path |");
  console.log("|------|------------|---------|-------------------|-------------------|-----------------|----------------------|-------------|");
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.totalBars} | ${r.blockCount} | ${r.composersRequested} | ${r.composersApplied} | ${r.rehearsalMarks} | ${r.chordParseFailures} | ${r.outputPath} |`
    );
  }
  console.log(JSON.stringify({ rows }, null, 2));
}

main();
