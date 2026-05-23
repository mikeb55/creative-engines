/**
 * Z7 — Slonimsky harmonic scene: derive voicing colour from interval-cell pitch classes.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { HarmonicScene } from '../composer/harmonicScene';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { resolveZappaStyleMode } from '../song-mode/frankZappaSlice';
import { zappaRiffSoloControlsFrom } from '../riff-generator/zappaRiffSoloParams';
import type { ZappaEraPreset } from '../compositionContext';
import {
  generateSlonimskyPattern,
  selectSlonimskyPattern,
  type IntervalPattern,
  type SlonimskyContext,
} from './slonimskyEngine';
import { selectPatternForIntent } from './slonimskyPatternService';
import { getPatternsBySection } from './thesaurusRegistry';

export type SlonimskyDominantVoicingColor = 'stable' | 'modal' | 'altered' | 'tritone-sus';

export type SlonimskyHarmonicSceneReceipt = {
  bar: number;
  sceneId: string;
  pitchClasses: number[];
  dominantVoicingColor: SlonimskyDominantVoicingColor;
  patternId?: string;
};

function pitchClass(midiOrPc: number): number {
  return ((midiOrPc % 12) + 12) % 12;
}

/** Accumulate pitch classes from a Slonimsky interval pattern rooted at `keyPc`. */
export function pitchClassesFromIntervalPattern(
  pattern: IntervalPattern,
  keyPc: number,
  cycleSteps = 4
): number[] {
  const ctx: SlonimskyContext = {
    keyPc: pitchClass(keyPc),
    chordType: 'dominant',
    functionalStrength: 'medium',
    allowedOutsideLevel: 2,
    phraseIntent: 'build',
    basePitch: 60 + pitchClass(keyPc),
    maxBeats: 4,
  };
  const notes = generateSlonimskyPattern(pattern, ctx, keyPc + pattern.id.length * 17);
  const pcs = new Set<number>();
  for (const n of notes.slice(0, Math.max(1, cycleSteps * 2))) {
    pcs.add(pitchClass(n.midi));
  }
  if (pcs.size === 0) {
    pcs.add(pitchClass(keyPc));
    pcs.add((pitchClass(keyPc) + 4) % 12);
  }
  return [...pcs].sort((a, b) => a - b);
}

/** Map cell pitch-class set + chord root → harmonic-scene voicing colour. */
export function dominantVoicingColorFromCellPcs(
  cellPcs: readonly number[],
  rootPc: number
): SlonimskyDominantVoicingColor {
  const root = pitchClass(rootPc);
  let tritoneHits = 0;
  let chromaticHits = 0;
  for (const pc of cellPcs) {
    const ic = (pc + 12 - root) % 12;
    if (ic === 6) tritoneHits++;
    if (ic === 1 || ic === 6 || ic === 10 || ic === 11) chromaticHits++;
  }
  if (tritoneHits >= 2 || (tritoneHits >= 1 && chromaticHits >= 2)) return 'tritone-sus';
  if (chromaticHits >= 2 || tritoneHits === 1) return 'altered';
  if (cellPcs.length >= 4) return 'modal';
  return 'stable';
}

function catalogueSectionForZappaEra(era: ZappaEraPreset | undefined): string {
  switch (era) {
    case 'mothers_66':
      return 'semitone_progression';
    case 'rio_73':
      return 'tritone_progression';
    case 'synclavier_84':
      return 'intervallic_mirror_permutations';
    default:
      return 'tritone_progression';
  }
}

function pickPatternForBar(seed: number, bar: number, section: string): IntervalPattern | null {
  const sectionPatterns = getPatternsBySection(section as import('./thesaurusRegistry').ThesaurusSectionKey);
  return (
    selectPatternForIntent({
      seed: seed + bar * 997,
      sectionPatterns,
      phraseIntent: bar % 4 === 3 ? 'shock' : 'build',
      chordType: 'dominant',
      allowedOutsideLevel: 2,
    }) ?? selectSlonimskyPattern(
      {
        keyPc: 0,
        chordType: 'dominant',
        functionalStrength: 'medium',
        allowedOutsideLevel: 2,
        phraseIntent: 'build',
        basePitch: 62,
        maxBeats: 4,
      },
      seed + bar
    )
  );
}

/** Compositional Zappa — one scene colour row from Slonimsky cell pitch classes. */
export function slonimskyHarmonicSceneReceiptForBar(
  bar: number,
  scene: HarmonicScene,
  rootPc: number,
  seed: number,
  era?: ZappaEraPreset
): SlonimskyHarmonicSceneReceipt {
  const section = catalogueSectionForZappaEra(era);
  const pattern = pickPatternForBar(seed, bar, section);
  const pcs = pattern ? pitchClassesFromIntervalPattern(pattern, rootPc) : [pitchClass(rootPc)];
  const color = dominantVoicingColorFromCellPcs(pcs, rootPc);
  return {
    bar,
    sceneId: scene.sceneId,
    pitchClasses: pcs,
    dominantVoicingColor: color,
    patternId: pattern?.id,
  };
}

export function enrichHarmonicScenesWithSlonimskyCells(
  scenes: HarmonicScene[],
  seed: number,
  rootPc: number,
  era?: ZappaEraPreset
): { scenes: HarmonicScene[]; receipts: SlonimskyHarmonicSceneReceipt[] } {
  const receipts: SlonimskyHarmonicSceneReceipt[] = [];
  const out = scenes.map((scene) => {
    const midBar = Math.floor((scene.barRange[0] + scene.barRange[1]) / 2);
    const receipt = slonimskyHarmonicSceneReceiptForBar(midBar, scene, rootPc, seed, era);
    receipts.push(receipt);
    return {
      ...scene,
      dominantVoicingColor: receipt.dominantVoicingColor,
      slonimskyCellPitchClasses: receipt.pitchClasses,
    };
  });
  return { scenes: out, receipts };
}

export function applySlonimskyHarmonicSceneToContext(context: CompositionContext): void {
  const meta = context.generationMetadata;
  const songwriterId = meta.songwriterStyleId;
  if (songwriterId !== 'frank_zappa') return;
  if (resolveZappaStyleMode(context) !== 'compositional') return;
  const scenes = context.harmonicScenes;
  if (!scenes?.length) return;

  const controls = zappaRiffSoloControlsFrom(meta);
  let rpc = 0;
  const firstChord = context.lockedHarmonyBarsRaw?.[0] ?? context.harmonyContext?.bars?.[0]?.symbol;
  if (firstChord) {
    rpc = ((chordTonesForChordSymbol(firstChord).root % 12) + 12) % 12;
  }

  const { scenes: enriched, receipts } = enrichHarmonicScenesWithSlonimskyCells(
    scenes,
    context.seed,
    rpc,
    controls?.zappaEraPreset
  );
  context.harmonicScenes = enriched;
  const lines = receipts.map(
    (r) =>
      `z7:scene@${r.bar} scene=${r.sceneId} pcs=[${r.pitchClasses.join(',')}] color=${r.dominantVoicingColor}${r.patternId ? ` pattern=${r.patternId}` : ''}`
  );
  meta.slonimskyHarmonicSceneReceipts = lines;
  (meta as GenerationMetadata & { slonimskyHarmonicSceneByBar?: SlonimskyHarmonicSceneReceipt[] }).slonimskyHarmonicSceneByBar =
    receipts;
}
