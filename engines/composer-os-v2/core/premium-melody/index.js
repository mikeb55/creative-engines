"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  BEATS_PER_BAR: () => import_premiumMelodyCellLibrary.BEATS_PER_BAR,
  PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER: () => import_premiumMelodyPitchProfile.PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER,
  PreserveMelodyTimingGridError: () => import_enrichMelodyExpression.PreserveMelodyTimingGridError,
  PreservePitchSequenceError: () => import_enrichMelodyRhythm.PreservePitchSequenceError,
  applyPremiumMelodyPinExport: () => import_premiumMelodyRouting.applyPremiumMelodyPinExport,
  applyPremiumMelodySurfaceOrnaments: () => import_premiumMelodyPitchPipeline.applyPremiumMelodySurfaceOrnaments,
  assertPreserveMelodyTimingGrid: () => import_enrichMelodyExpression.assertPreserveMelodyTimingGrid,
  assertPreservePitchSequence: () => import_enrichMelodyRhythm.assertPreservePitchSequence,
  assertValidPremiumMelodyPitchProfile: () => import_premiumMelodyPitchProfile.assertValidPremiumMelodyPitchProfile,
  buildPremiumMelodyPitchSlotList: () => import_premiumMelodyPitchPipeline.buildPremiumMelodyPitchSlotList,
  deriveMelodyRhythmSeed: () => import_premiumMelodyPrng.deriveMelodyRhythmSeed,
  derivePremiumMelodyPhrasePlanSeed: () => import_premiumMelodyPitchPipeline.derivePremiumMelodyPhrasePlanSeed,
  derivePremiumMelodyPitchSlotSeed: () => import_premiumMelodyPitchPipeline.derivePremiumMelodyPitchSlotSeed,
  derivePremiumMelodySurfaceOrnamentSeed: () => import_premiumMelodyPitchPipeline.derivePremiumMelodySurfaceOrnamentSeed,
  detectPhraseRoles: () => import_premiumMelodyPhrase.detectPhraseRoles,
  distinctArticulationTypes: () => import_enrichMelodyExpression.distinctArticulationTypes,
  distinctMelodyIoiBuckets: () => import_premiumMelodyMetrics.distinctMelodyIoiBuckets,
  durationTrigramDiversity: () => import_premiumMelodyMetrics.durationTrigramDiversity,
  enrichMelodyExpression: () => import_enrichMelodyExpression.enrichMelodyExpression,
  enrichMelodyRhythm: () => import_enrichMelodyRhythm.enrichMelodyRhythm,
  familyWeightForPhase: () => import_premiumMelodyCellLibrary.familyWeightForPhase,
  harmonyByBarFromImportTimeline: () => import_premiumMelodyRouting.harmonyByBarFromImportTimeline,
  indexInPhrase: () => import_premiumMelodyPhrase.indexInPhrase,
  interiorOnsetFromCellLibrary: () => import_premiumMelodyCellLibrary.interiorOnsetFromCellLibrary,
  isOffbeatOnset: () => import_premiumMelodyPhrase.isOffbeatOnset,
  isPremiumMelodyStrongBeat: () => import_premiumMelodyPhrase.isPremiumMelodyStrongBeat,
  isStructuralLandingIndex: () => import_premiumMelodyPhrase.isStructuralLandingIndex,
  melodyIoiEntropy: () => import_premiumMelodyMetrics.melodyIoiEntropy,
  melodyOffbeatRatio: () => import_premiumMelodyMetrics.melodyOffbeatRatio,
  melodyStructuralLandingCount: () => import_premiumMelodyMetrics.melodyStructuralLandingCount,
  melodySyncopationScore: () => import_premiumMelodyMetrics.melodySyncopationScore,
  mulberry32: () => import_premiumMelodyPrng.mulberry32,
  onsetClassDominance: () => import_premiumMelodyMetrics.onsetClassDominance,
  phraseDensityArcPresent: () => import_premiumMelodyMetrics.phraseDensityArcPresent,
  phraseLengthAt: () => import_premiumMelodyPhrase.phraseLengthAt,
  phraseVelocitySpread: () => import_enrichMelodyExpression.phraseVelocitySpread,
  pickWeightedTemplate: () => import_premiumMelodyCellLibrary.pickWeightedTemplate,
  pinPremiumMelodyExport: () => import_premiumMelodyPin.pinPremiumMelodyExport,
  resolvePremiumMelodyOnsetCollisionsSmart: () => import_premiumMelodyCollision.resolvePremiumMelodyOnsetCollisionsSmart,
  runPremiumMelodyHarmonyRhythmExpressionPipeline: () => import_premiumMelodyRouting.runPremiumMelodyHarmonyRhythmExpressionPipeline,
  runPremiumMelodyPitchPipeline: () => import_premiumMelodyPitchPipeline.runPremiumMelodyPitchPipeline,
  selectRhythmCellForNote: () => import_premiumMelodyCellLibrary.selectRhythmCellForNote,
  structuralLandingOnset: () => import_premiumMelodyPhrase.structuralLandingOnset
});
module.exports = __toCommonJS(index_exports);
var import_premiumMelodyPitchProfile = require("./premiumMelodyPitchProfile");
var import_premiumMelodyPitchPipeline = require("./premiumMelodyPitchPipeline");
var import_premiumMelodyPrng = require("./premiumMelodyPrng");
var import_premiumMelodyCellLibrary = require("./premiumMelodyCellLibrary");
var import_premiumMelodyCollision = require("./premiumMelodyCollision");
var import_premiumMelodyPhrase = require("./premiumMelodyPhrase");
var import_premiumMelodyMetrics = require("./premiumMelodyMetrics");
var import_enrichMelodyRhythm = require("./enrichMelodyRhythm");
var import_enrichMelodyExpression = require("./enrichMelodyExpression");
var import_premiumMelodyPin = require("./premiumMelodyPin");
var import_premiumMelodyRouting = require("./premiumMelodyRouting");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BEATS_PER_BAR,
  PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER,
  PreserveMelodyTimingGridError,
  PreservePitchSequenceError,
  applyPremiumMelodyPinExport,
  applyPremiumMelodySurfaceOrnaments,
  assertPreserveMelodyTimingGrid,
  assertPreservePitchSequence,
  assertValidPremiumMelodyPitchProfile,
  buildPremiumMelodyPitchSlotList,
  deriveMelodyRhythmSeed,
  derivePremiumMelodyPhrasePlanSeed,
  derivePremiumMelodyPitchSlotSeed,
  derivePremiumMelodySurfaceOrnamentSeed,
  detectPhraseRoles,
  distinctArticulationTypes,
  distinctMelodyIoiBuckets,
  durationTrigramDiversity,
  enrichMelodyExpression,
  enrichMelodyRhythm,
  familyWeightForPhase,
  harmonyByBarFromImportTimeline,
  indexInPhrase,
  interiorOnsetFromCellLibrary,
  isOffbeatOnset,
  isPremiumMelodyStrongBeat,
  isStructuralLandingIndex,
  melodyIoiEntropy,
  melodyOffbeatRatio,
  melodyStructuralLandingCount,
  melodySyncopationScore,
  mulberry32,
  onsetClassDominance,
  phraseDensityArcPresent,
  phraseLengthAt,
  phraseVelocitySpread,
  pickWeightedTemplate,
  pinPremiumMelodyExport,
  resolvePremiumMelodyOnsetCollisionsSmart,
  runPremiumMelodyHarmonyRhythmExpressionPipeline,
  runPremiumMelodyPitchPipeline,
  selectRhythmCellForNote,
  structuralLandingOnset
});
