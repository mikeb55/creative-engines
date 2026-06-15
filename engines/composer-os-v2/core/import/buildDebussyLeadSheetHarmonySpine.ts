/**
 * Shared debussy leadsheet-input harmony spine (Phase 1 + Phase 2).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import {
  buildChordSymbolPlanFromBars,
  buildHarmonyPlanFromBars,
} from '../harmony/chordProgressionParser';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import {
  extractEffectiveHarmonyFromMetadata,
  getDispatchEntry,
} from '../mosaic-mode/mosaicComposerDispatch';
import { importTimelineToLockedHarmony } from './importTimelineAdapters';
import { buildStyleTransferHarmonyBars } from './mosaicStyleTransfer';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
  type ImportMelodyNote,
  type MosaicImportTimeline,
} from './mosaicImportTimeline';

export const DEBUSSY_LEADSHEET_PROOF_CHORDS: readonly string[] = [
  'Dm9',
  'G13',
  'Cmaj9',
  'A7alt',
  'Dm9',
  'G13',
  'Cmaj9',
  'Cmaj9',
];

export const DEBUSSY_LEADSHEET_PROOF_MELODY: readonly ImportMelodyNote[] = [
  { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 2, durationBeats: 0.5, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 2.5, durationBeats: 1.5, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 0, durationBeats: 2, midiPitch: 67, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 2, durationBeats: 2, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 1, durationBeats: 0.5, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 1.5, durationBeats: 2.5, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 4, onsetBeat: 0, durationBeats: 2, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 4, onsetBeat: 2, durationBeats: 2, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 5, onsetBeat: 0, durationBeats: 4, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 6, onsetBeat: 0, durationBeats: 1, midiPitch: 71, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 6, onsetBeat: 1, durationBeats: 1, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 6, onsetBeat: 2, durationBeats: 2, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 7, onsetBeat: 0, durationBeats: 2, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 7, onsetBeat: 2, durationBeats: 2, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 8, onsetBeat: 0, durationBeats: 4, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
];

export function buildDebussyLeadSheetProofImportTimeline(): MosaicImportTimeline {
  const harmonyByBar = DEBUSSY_LEADSHEET_PROOF_CHORDS.map((chordSymbol, i) => ({
    bar: i + 1,
    chordSymbol,
    confidence: IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
    fieldOrigin: 'explicit' as const,
  }));
  return {
    schemaVersion: MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
    sourceFormat: 'musicxml',
    bars: 8,
    timeSig: { num: 4, den: 4 },
    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.95, fieldOrigin: 'explicit' },
    harmonyByBar,
    melodyLine: DEBUSSY_LEADSHEET_PROOF_MELODY.map((n) => ({ ...n })),
    parseDiagnostics: [],
  };
}

function buildProofCompositionContext(seed: number, lockedBars: string[]): CompositionContext {
  const preset = guitarBassDuoPreset;
  const sections = [
    { label: 'A', startBar: 1, length: 4 },
    { label: 'B', startBar: 5, length: 4 },
  ];
  const form = { sections, totalBars: lockedBars.length };
  return {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed,
    form,
    feel: preset.defaultFeel,
    harmony: buildHarmonyPlanFromBars(lockedBars),
    motif: { activeMotifs: [], variants: {} },
    phrase: {
      segments: sections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
      totalBars: form.totalBars,
    },
    register: {
      melody: [55, 79],
      bass: [40, 55],
      byInstrument: {
        clean_electric_guitar: [55, 79],
        acoustic_upright_bass: [28, 55],
      },
    },
    density: { segments: [], totalBars: form.totalBars },
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan: buildChordSymbolPlanFromBars(lockedBars),
    rehearsalMarkPlan: { marks: [{ label: 'A', bar: 1 }] },
    lockedHarmonyBarsRaw: [...lockedBars],
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: 'custom',
      harmonyModeRequested: 'custom_locked',
      parsedCustomProgressionBars: [...lockedBars],
      customHarmonyLocked: true,
      songwriterStyleId: 'debussy',
      builtInHarmonyFallbackOccurred: false,
    },
    validation: { gates: [], passed: true },
    readiness: {
      release: { passed: true, overall: 1, categories: [] },
      mx: { passed: true, overall: 1, categories: [] },
    },
  };
}

export interface DebussyLeadSheetHarmonySpine {
  seed: number;
  importTimeline: MosaicImportTimeline;
  context: CompositionContext;
  importedHarmonyBars: string[];
  debussyEffectiveHarmonyBars: string[];
  appliedHarmonyBars: string[];
  generationMetadata: GenerationMetadata;
}

export function buildDebussyLeadSheetHarmonySpine(seed = 90101): DebussyLeadSheetHarmonySpine {
  const importTimeline = buildDebussyLeadSheetProofImportTimeline();
  const importedHarmonyBars = importTimelineToLockedHarmony(importTimeline);
  const context = buildProofCompositionContext(seed, importedHarmonyBars);

  context.lockedHarmonyBarsRaw = [...importedHarmonyBars];
  context.generationMetadata = {
    ...context.generationMetadata,
    parsedCustomProgressionBars: [...importedHarmonyBars],
  };

  const entry = getDispatchEntry('debussy');
  if (!entry) {
    throw new Error('debussy dispatch entry missing');
  }
  entry.precompute(context);

  const sliceBars =
    extractEffectiveHarmonyFromMetadata(context.generationMetadata, 'debussy') ?? importedHarmonyBars;
  const appliedHarmonyBars = buildStyleTransferHarmonyBars(
    importedHarmonyBars,
    sliceBars,
    1,
    importTimeline,
    'free_harmony'
  );

  context.lockedHarmonyBarsRaw = [...appliedHarmonyBars];
  context.generationMetadata.parsedCustomProgressionBars = [...appliedHarmonyBars];
  context.generationMetadata.debussyEffectiveHarmonyBars = [...sliceBars];

  return {
    seed,
    importTimeline,
    context,
    importedHarmonyBars,
    debussyEffectiveHarmonyBars: [...sliceBars],
    appliedHarmonyBars,
    generationMetadata: context.generationMetadata,
  };
}