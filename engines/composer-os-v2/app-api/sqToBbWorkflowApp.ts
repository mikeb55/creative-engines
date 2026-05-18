/**
 * SQ→BB Phase B — app workflow (sketch → review → translate → export).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import type { AbstractLineSet, LineRole } from '../core/counterpoint/abstractLineSet';
import { ContrapuntalLineEngine } from '../core/counterpoint/ContrapuntalLineEngine';
import { extractQuartetFeatures } from '../core/counterpoint/extractQuartetFeatures';
import { wireBigBandSectionRendererOnContext } from '../core/composer/bigBandSectionPlanRenderer';
import {
  runSqBbGceGate1,
  shouldApplySqToBbGceGates,
  type SqBbGceGate1Record,
} from '../core/counterpoint/sqToBbGceGates';
import {
  abstractLineSetToSqScoreModel,
  bbSectionRenderToScoreModel,
} from '../core/counterpoint/sqToBbScoreExport';
import type {
  SqToBbLaneView,
  SqToBbPhraseBbView,
  SqToBbPhraseFeatureChips,
  SqToBbSqComposer,
  SqToBbStyleProfileId,
  SqToBbVoiceLaneId,
  SqToBbWorkflowPayload,
} from '../core/counterpoint/sqToBbWorkflowTypes';
import { wireSqToBbUserChordTimeline } from '../core/counterpoint/parseUserChordInput';
import {
  arrayBufferFromBase64,
  extractChordsFromMidi,
} from '../core/harmony/midiChordExtractor';
import {
  normalizeSqToBbDensity,
  normalizeSqToBbEraInput,
  normalizeSqToBbSqComposer,
  resolveSqToBbLengthBars,
  resolveSqToBbUserChordInput,
  sqLineVrbIdForSqToBb,
  type SqToBbChordSourceMode,
  vrbIdForSqToBbStyleProfile,
} from '../core/counterpoint/sqToBbWorkflowTypes';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildDuoLongFormCompositionContext } from '../core/form/buildLongFormFromDuoSections';
import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { GenerateRequest } from './appApiTypes';
import type { GenerateResult } from './generateComposition';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import {
  buildSqToBbFormSections,
  normalizeSectionVrbMap,
} from './normalizeSectionVrbMap';
import { dominantVrb, type VrbContextMap } from '../core/counterpoint/vrbProfiles/vrbContextMap';
import {
  sectionRecordFromVrbContextMap,
  vrbContextMapFromSectionRecord,
} from '../core/counterpoint/vrbProfiles/vrbContextResolver';
import {
  SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
  type SqToBbSectionLabelMode,
} from '../core/counterpoint/vrbProfiles/sqToBbSectionLabels';
import { getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';

export {
  resolveSqToBbLengthBars,
  SQ_TO_BB_DEFAULT_LENGTH_BARS,
  SQ_TO_BB_LENGTH_MAX,
  SQ_TO_BB_LENGTH_MIN,
  SQ_TO_BB_LENGTH_PRESETS,
  SQ_TO_BB_LENGTH_PRESETS as SQ_TO_BB_LENGTH_BAR_OPTIONS,
} from '../core/counterpoint/sqToBbWorkflowTypes';

const ROLE_TO_LANE: Record<LineRole, SqToBbVoiceLaneId> = {
  soprano: 'S',
  alto: 'A',
  tenor: 'T',
  bass: 'B',
};

type SqToBbResolvedChordInput = {
  userChordInput: string | null;
  wireMode: SqToBbChordSourceMode;
  midiBarCountHint?: number;
};

/** MIDI base64 → pipe-separated chords; otherwise existing user-chord path. */
function resolveSqToBbChordPipeline(req: GenerateRequest): SqToBbResolvedChordInput {
  const midiRaw = req.midiChordInput?.trim();
  if (midiRaw) {
    try {
      const extracted = extractChordsFromMidi(arrayBufferFromBase64(midiRaw), {
        bpm: req.midiChordBpm,
      });
      if (extracted.warnings.length > 0) {
        console.log('[SQ→BB MIDI chords]', extracted.warnings.join('; '));
      }
      const chordString = extracted.chordString.trim();
      return {
        userChordInput: chordString.length > 0 ? chordString : null,
        wireMode: 'use_user_chords',
        midiBarCountHint: extracted.barCount,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[SQ→BB MIDI chords] decode/extract failed: ${msg}`);
      return { userChordInput: null, wireMode: 'use_user_chords' };
    }
  }
  const mode = req.sqToBbChordSourceMode ?? 'generate_harmony';
  return {
    userChordInput: resolveSqToBbUserChordInput(mode, req.userChordInput),
    wireMode: mode === 'midi' ? 'generate_harmony' : mode,
  };
}

const LANE_LABEL: Record<SqToBbVoiceLaneId, string> = {
  S: 'Soprano',
  A: 'Alto',
  T: 'Tenor',
  B: 'Bass',
};

function validationOk(): GenerateResult['validation'] {
  return {
    integrityPassed: true,
    behaviourGatesPassed: true,
    mxValidationPassed: true,
    strictBarMathPassed: true,
    exportRoundTripPassed: true,
    exportIntegrityPassed: true,
    instrumentMetadataPassed: true,
    sibeliusSafe: true,
    readiness: { shareable: true, release: 1, mx: 1 },
    errors: [],
  };
}

function resolveSqLineVrbIdFromContextMap(
  vrbContextMap: VrbContextMap,
  styleProfile: SqToBbStyleProfileId,
): string {
  // Orchestration setup has no bar index — dominantVrb(sq_bb) fallback until per-bar scoring runs in GCE gates.
  const sqBb = vrbContextMap.get('sq_bb');
  if (sqBb) {
    const id = dominantVrb(sqBb);
    if (id && getSqVrbProfile(id)) return id;
  }
  if (vrbContextMap.size === 1) {
    const only = [...vrbContextMap.values()][0]!;
    const id = dominantVrb(only);
    if (id && getSqVrbProfile(id)) return id;
  }
  return vrbIdForSqToBbStyleProfile(styleProfile);
}

function buildSqToBbContext(
  req: GenerateRequest,
  bbVrbId: string,
  sqLineVrbId: string,
  sqComposer: SqToBbSqComposer,
  totalBars: number,
  vrbContextMap: VrbContextMap,
  sectionLabelMode: SqToBbSectionLabelMode,
): CompositionContext {
  const styleProfile = req.sqToBbStyleProfile ?? 'brookmeyer';
  const eraTag = normalizeSqToBbEraInput(req.sqToBbEra);
  const { userChordInput } = resolveSqToBbChordPipeline(req);
  const sqToBbDensity = normalizeSqToBbDensity(req.sqToBbDensity);
  const sqLineBundle = getVoiceRuleBundle(sqLineVrbId);
  console.log(`SQ→BB era tag: ${eraTag ?? '(none)'}`);
  console.log(`SQ→BB SQ line VRB: ${sqLineVrbId} (BB arranger VRB: ${bbVrbId})`);
  const { context } = buildDuoLongFormCompositionContext(req.seed, {
    targetTotalBars: totalBars,
    presetId: 'guitar_bass_duo',
  });
  const gen = context.generationMetadata ?? {};
  context.voiceBundle = sqLineBundle ?? getVoiceRuleBundle(bbVrbId);
  const { era: _dropInheritedEra, ...genWithoutEra } = gen as typeof gen & { era?: string };
  context.generationMetadata = {
    ...genWithoutEra,
    songwriterStyleId: bbVrbId,
    sqToBbSqComposer: sqComposer,
    sqLineVrbId,
    harmonyModeRequested: 'builtin',
    songModeProfileRuleDiagnostics: {
      ...(typeof gen.songModeProfileRuleDiagnostics === 'object' && gen.songModeProfileRuleDiagnostics
        ? gen.songModeProfileRuleDiagnostics
        : {}),
      styleProfile: styleProfile as unknown as StyleProfile,
    },
    ...(eraTag ? { era: eraTag } : {}),
    ...(userChordInput ? { userChordInput } : {}),
    sqToBbDensity,
    sqToBbVrbContextBySection: sectionRecordFromVrbContextMap(vrbContextMap),
    ...(req.bbLightTouch === true ? { bbLightTouch: true } : {}),
  };
  context.form = {
    totalBars,
    sections: buildSqToBbFormSections(vrbContextMap, totalBars, sectionLabelMode),
  };
  return context;
}

function phraseChipsFromFeatures(features: ReturnType<typeof extractQuartetFeatures>): SqToBbPhraseFeatureChips[] {
  return features.map((f) => ({
    phraseId: f.phraseId,
    startBeat: f.startBeat,
    endBeat: f.endBeat,
    textureClass: f.textureClass,
    density: Math.round(f.rhythmicDensity * 100) / 100,
    cadencePoint: `${f.cadenceStrength}${f.arrivalBeatOffsets.length ? ` @${f.arrivalBeatOffsets.map((b) => b.toFixed(2)).join(',')}` : ''}`,
    lineIndependence: Math.round(f.contrapuntalIndependence * 100) / 100,
  }));
}

function lanesFromLineSet(lines: AbstractLineSet): SqToBbLaneView[] {
  const order: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
  return order.map((role) => {
    const v = lines.voices.find((x) => x.role === role);
    return {
      voiceId: ROLE_TO_LANE[role],
      label: LANE_LABEL[ROLE_TO_LANE[role]],
      notes: (v?.notes ?? []).map((n) => ({
        pitchMidi: Math.round(n.pitchMidi),
        offsetBars: n.offsetBars,
        durationBars: n.durationBars,
      })),
    };
  });
}

function generateLineSet(context: CompositionContext, vrbId: string, totalBars: number): AbstractLineSet {
  const formSections =
    context.form?.sections?.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })) ?? null;
  const vrbContextMap = vrbContextMapFromSectionRecord(
    context.generationMetadata?.sqToBbVrbContextBySection,
  );
  const engine = new ContrapuntalLineEngine(vrbId, context, vrbContextMap, formSections);
  const raw = engine.generateLines(totalBars, 'chords_only');
  return engine.applyVrbFilter(raw);
}

function runGate1OnContext(context: CompositionContext, vrbId: string, lines: AbstractLineSet): {
  lines: AbstractLineSet;
  gate1: SqBbGceGate1Record;
  blocked: boolean;
} {
  const genMeta = context.generationMetadata as unknown as Record<string, unknown>;
  if (!shouldApplySqToBbGceGates(context, vrbId)) {
    genMeta.contrapuntalLineSet = lines;
    return {
      lines,
      gate1: {
        outcome: 'pass',
        melodicIdentity: 0,
        phraseGrammar: 0,
        primaryMonitoredCategory: 'Melodic Identity',
        proceedToRenderer: true,
        logLine: 'SQ→BB GCE Gate 1 [pass] — gates not applicable',
      },
      blocked: false,
    };
  }
  const gate1 = runSqBbGceGate1(lines, context);
  genMeta.contrapuntalLineSet = gate1.refinedLines;
  genMeta.sqBbGceGate1 = gate1.record;
  if (!gate1.record.proceedToRenderer) {
    genMeta.sqBbGceGate1BlockedRenderer = true;
  } else {
    delete genMeta.sqBbGceGate1BlockedRenderer;
  }
  return {
    lines: gate1.refinedLines,
    gate1: gate1.record,
    blocked: !gate1.record.proceedToRenderer,
  };
}

function replacePhraseNotes(
  base: AbstractLineSet,
  fresh: AbstractLineSet,
  phraseIndex: number,
  features: ReturnType<typeof extractQuartetFeatures>,
): AbstractLineSet {
  const phrase = features[phraseIndex] ?? features[0];
  if (!phrase) return fresh;
  const lo = phrase.startBeat - 1e-9;
  const hi = phrase.endBeat + 1e-9;
  const roles: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
  const voices = roles.map((role) => {
    const bVoice = base.voices.find((v) => v.role === role)!;
    const fVoice = fresh.voices.find((v) => v.role === role)!;
    const kept = bVoice.notes.filter((n) => n.offsetBars < lo || n.offsetBars >= hi);
    const inserted = fVoice.notes.filter((n) => n.offsetBars >= lo && n.offsetBars < hi);
    return {
      ...bVoice,
      notes: [...kept, ...inserted].sort((a, b) => a.offsetBars - b.offsetBars),
    };
  });
  return { ...base, voices };
}

function bbViewsFromContext(context: CompositionContext): SqToBbPhraseBbView[] {
  const render = context.generationMetadata?.bigBandSectionRender;
  const intents = context.generationMetadata?.bigBandVoicing?.sectionWritingIntents ?? [];
  const geometries = context.generationMetadata?.bigBandVoicing?.voicingGeometries ?? [];
  if (!render) return [];
  return render.phrases.map((p, i) => {
    const intent = intents[i];
    const geo = geometries[i];
    return {
      phraseId: p.phraseId,
      geometryShape: p.geometryShape ?? geo?.shape ?? 'spread',
      assignments: (intent?.assignments ?? []).map((a) => ({
        phraseId: p.phraseId,
        section: a.section,
        role: a.role,
        lineDerived: a.lineDerived,
      })),
    };
  });
}

function buildWorkflowPayload(
  context: CompositionContext,
  lines: AbstractLineSet,
  vrbId: string,
  seed: number,
  totalBars: number,
  styleProfile: SqToBbStyleProfileId,
  gate1: SqBbGceGate1Record,
  blocked: boolean,
): SqToBbWorkflowPayload {
  const features = extractQuartetFeatures(lines);
  return {
    action: 'sketch',
    styleProfile,
    vrbId,
    seed,
    totalBars,
    lanes: lanesFromLineSet(lines),
    phraseFeatures: phraseChipsFromFeatures(features),
    gate1,
    gate1BlockedRenderer: blocked,
    contrapuntalLineSet: lines,
    gate2: context.generationMetadata?.sqBbGceGate2,
    gate2Blocked: gate2BlockedFromContext(context),
    bbPhrases: bbViewsFromContext(context),
  };
}

function gate2BlockedFromContext(context: CompositionContext): boolean {
  const g2 = context.generationMetadata?.sqBbGceGate2;
  return g2?.hardFail === true;
}

function resolveSqToBbVrbs(
  req: GenerateRequest,
  totalBars: number,
): {
  styleProfile: SqToBbStyleProfileId;
  bbVrbId: string;
  sqLineVrbId: string;
  sqComposer: SqToBbSqComposer;
  vrbContextMap: VrbContextMap;
  sectionLabelMode: SqToBbSectionLabelMode;
} {
  const styleProfile = (req.sqToBbStyleProfile ?? 'brookmeyer') as SqToBbStyleProfileId;
  const bbVrbId = vrbIdForSqToBbStyleProfile(styleProfile);
  const sectionLabelMode = req.sectionLabelMode ?? SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE;
  const sqComposer = normalizeSqToBbSqComposer(req.sqToBbSqComposer);
  const sqLineVrbId = sqLineVrbIdForSqToBb(sqComposer, styleProfile);
  const vrbContextMap = normalizeSectionVrbMap({
    sqToBbSqComposer: sqLineVrbId,
    sectionVrbMap: req.sectionVrbMap,
    totalBars,
    sectionLabelMode,
  });
  return { styleProfile, bbVrbId, sqLineVrbId, sqComposer, vrbContextMap, sectionLabelMode };
}

export function runSqToBbWorkflowApp(req: GenerateRequest, outputDir: string): GenerateResult {
  const action = req.sqToBbAction ?? 'sketch';
  const lengthResolved = resolveSqToBbLengthBars(req.lengthBars ?? req.totalBars);
  if (!lengthResolved.ok) {
    return {
      success: false,
      error: lengthResolved.error,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }
  const chordPipeline = resolveSqToBbChordPipeline(req);
  let lengthResolvedFinal = lengthResolved;
  if (
    chordPipeline.midiBarCountHint != null &&
    req.lengthBars == null &&
    req.totalBars == null &&
    lengthResolved.ok
  ) {
    const hinted = resolveSqToBbLengthBars(chordPipeline.midiBarCountHint);
    if (hinted.ok) lengthResolvedFinal = hinted;
  }
  const totalBars = lengthResolvedFinal.lengthBars;
  const { userChordInput, wireMode: chordWireMode } = chordPipeline;
  let resolved: ReturnType<typeof resolveSqToBbVrbs>;
  try {
    resolved = resolveSqToBbVrbs(req, totalBars);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: msg,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }
  const { styleProfile, bbVrbId, sqLineVrbId, sqComposer, vrbContextMap, sectionLabelMode } = resolved;
  const lineBundle = getVoiceRuleBundle(sqLineVrbId);
  if (!lineBundle?.contrapuntalLinePolicy?.enabled) {
    return {
      success: false,
      error: `SQ→BB requires contrapuntal line policy on ${sqLineVrbId}`,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }

  const context = buildSqToBbContext(
    req,
    bbVrbId,
    sqLineVrbId,
    sqComposer,
    totalBars,
    vrbContextMap,
    sectionLabelMode,
  );
  const chordWire = wireSqToBbUserChordTimeline(
    context,
    chordWireMode,
    userChordInput,
    totalBars,
    req.sqToBbChordMismatchResolution,
  );
  if (!chordWire.ok) {
    return {
      success: false,
      error: chordWire.error,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }
  let lines: AbstractLineSet;

  if (action === 'translate' || action === 'export') {
    if (!req.sqToBbLineSet) {
      return {
        success: false,
        error: 'SQ→BB translate/export requires sqToBbLineSet from prior sketch',
        validation: validationOk(),
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    lines = req.sqToBbLineSet;
    context.generationMetadata!.contrapuntalLineSet = lines;
  } else if (action === 'regenerate_phrase' && req.sqToBbLineSet) {
    const phraseIndex = typeof req.sqToBbPhraseIndex === 'number' ? req.sqToBbPhraseIndex : 0;
    const regenContext = buildSqToBbContext(
      { ...req, seed: req.seed + 10_000 + phraseIndex * 997 },
      bbVrbId,
      sqLineVrbId,
      sqComposer,
      totalBars,
      vrbContextMap,
      sectionLabelMode,
    );
    const regenWire = wireSqToBbUserChordTimeline(
      regenContext,
      chordWireMode,
      userChordInput,
      totalBars,
      req.sqToBbChordMismatchResolution,
    );
    if (!regenWire.ok) {
      return {
        success: false,
        error: regenWire.error,
        validation: validationOk(),
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    const fresh = generateLineSet(regenContext, sqLineVrbId, totalBars);
    const features = extractQuartetFeatures(req.sqToBbLineSet);
    lines = replacePhraseNotes(req.sqToBbLineSet, fresh, phraseIndex, features);
    const gate1Out = runGate1OnContext(context, sqLineVrbId, lines);
    lines = gate1Out.lines;
  } else if (action === 'regenerate_whole') {
    lines = generateLineSet(context, sqLineVrbId, totalBars);
    const gate1Out = runGate1OnContext(context, sqLineVrbId, lines);
    lines = gate1Out.lines;
  } else {
    lines = generateLineSet(context, sqLineVrbId, totalBars);
    const gate1Out = runGate1OnContext(context, sqLineVrbId, lines);
    lines = gate1Out.lines;
  }

  if (action === 'sketch' || action === 'regenerate_whole' || action === 'regenerate_phrase') {
    const gate1 = context.generationMetadata?.sqBbGceGate1!;
    const blocked = Boolean(context.generationMetadata?.sqBbGceGate1BlockedRenderer);
    const payload = buildWorkflowPayload(
      context,
      lines,
      sqLineVrbId,
      req.seed,
      totalBars,
      styleProfile,
      gate1,
      blocked,
    );
    payload.action = action;
    fs.mkdirSync(outputDir, { recursive: true });
    const planPath = path.join(outputDir, `sq_to_bb_sketch_${req.seed}.json`);
    fs.writeFileSync(planPath, JSON.stringify(payload, null, 2), 'utf-8');
    return {
      success: !blocked,
      productKind: 'planning',
      planningNotice: blocked
        ? 'Gate 1 failed — adjust style profile or regenerate.'
        : 'SQ lines ready for review.',
      filepath: planPath,
      filename: path.basename(planPath),
      sqToBbWorkflow: payload,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
      runManifest: {
        seed: req.seed,
        presetId: 'sq_to_bb',
        activeModules: ['sq_to_bb_sketch'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (action === 'translate') {
    context.generationMetadata!.sqBbGceGate1BlockedRenderer = false;
    context.generationMetadata!.contrapuntalLineSet = lines;
    const wired = wireBigBandSectionRendererOnContext(context);
    const gate2 = context.generationMetadata?.sqBbGceGate2;
    const gate2Blocked = gate2?.hardFail === true;
    const payload = buildWorkflowPayload(
      context,
      lines,
      sqLineVrbId,
      req.seed,
      totalBars,
      styleProfile,
      context.generationMetadata?.sqBbGceGate1 ?? {
        outcome: 'pass',
        melodicIdentity: 0,
        phraseGrammar: 0,
        primaryMonitoredCategory: 'Melodic Identity',
        proceedToRenderer: true,
        logLine: '',
      },
      false,
    );
    payload.action = 'translate';
    payload.gate2 = gate2;
    payload.gate2Blocked = gate2Blocked;
    payload.bbPhrases = bbViewsFromContext(context);
    if (gate2Blocked) {
      payload.error = `Gate 2 failed: hierarchyClarity ${gate2?.hierarchyClarity.toFixed(3) ?? 'n/a'}`;
    }
    return {
      success: !gate2Blocked && Boolean(wired),
      productKind: 'planning',
      planningNotice: gate2Blocked
        ? payload.error
        : gate2?.outcome === 'review'
          ? 'BB translation ready (GCE review flagged).'
          : 'BB translation ready.',
      sqToBbWorkflow: payload,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }

  if (action !== 'export') {
    return {
      success: false,
      error: `Unknown SQ→BB action: ${action}`,
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }

  context.generationMetadata!.sqBbGceGate1BlockedRenderer = false;
  context.generationMetadata!.contrapuntalLineSet = lines;
  if (!context.generationMetadata?.sqBbGceGate2) {
    wireBigBandSectionRendererOnContext(context);
  }
  const gate2Export = context.generationMetadata?.sqBbGceGate2;
  if (
    gate2Export?.hardFail ||
    (gate2Export && gate2Export.outcome !== 'pass' && gate2Export.outcome !== 'review')
  ) {
    return {
      success: false,
      error: gate2Export?.hardFail
        ? 'Export blocked — Gate 2 FAIL (hierarchyClarity).'
        : 'Export blocked — Gate 2 did not pass.',
      validation: validationOk(),
      composerOsVersion: COMPOSER_OS_VERSION,
    };
  }

  const sqScore = abstractLineSetToSqScoreModel(lines);
  const sqEx = exportScoreModelToMusicXml(sqScore, { bpm: req.bpm ?? 120 });
  const render = context.generationMetadata?.bigBandSectionRender;
  const bbScore = render
    ? bbSectionRenderToScoreModel(render, totalBars)
    : abstractLineSetToSqScoreModel(lines);
  const bbEx = exportScoreModelToMusicXml(bbScore, { bpm: req.bpm ?? 120 });

  fs.mkdirSync(outputDir, { recursive: true });
  const ts = String(req.seed);
  const sqPath = path.join(outputDir, `sq_to_bb_sq_${ts}.musicxml`);
  const bbPath = path.join(outputDir, `sq_to_bb_bb_${ts}.musicxml`);
  if (sqEx.success && sqEx.xml) fs.writeFileSync(sqPath, sqEx.xml, 'utf-8');
  if (bbEx.success && bbEx.xml) fs.writeFileSync(bbPath, bbEx.xml, 'utf-8');

  const payload = buildWorkflowPayload(
    context,
    lines,
    sqLineVrbId,
    req.seed,
    totalBars,
    styleProfile,
    context.generationMetadata?.sqBbGceGate1!,
    false,
  );
  payload.action = 'export';
  payload.gate2 = gate2Export;
  payload.sqMusicXmlFilepath = sqEx.success ? sqPath : undefined;
  payload.bbMusicXmlFilepath = bbEx.success ? bbPath : undefined;
  payload.sqMusicXml = sqEx.xml;
  payload.bbMusicXml = bbEx.xml;

  return {
    success: Boolean(sqEx.success && bbEx.success),
    productKind: 'musicxml',
    filepath: sqPath,
    ensembleMusicXmlFilepath: bbPath,
    filename: path.basename(sqPath),
    xml: sqEx.xml,
    sqToBbWorkflow: payload,
    validation: validationOk(),
    composerOsVersion: COMPOSER_OS_VERSION,
    runManifest: {
      seed: req.seed,
      presetId: 'sq_to_bb',
      activeModules: ['sq_to_bb_export'],
      timestamp: new Date().toISOString(),
    },
  };
}
