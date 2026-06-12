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
var premiumMelodyRouting_exports = {};
__export(premiumMelodyRouting_exports, {
  applyPremiumMelodyPinExport: () => applyPremiumMelodyPinExport,
  harmonyByBarFromImportTimeline: () => harmonyByBarFromImportTimeline,
  runPremiumMelodyHarmonyRhythmExpressionPipeline: () => runPremiumMelodyHarmonyRhythmExpressionPipeline
});
module.exports = __toCommonJS(premiumMelodyRouting_exports);
var import_enrichMelodyRhythm = require("./enrichMelodyRhythm");
var import_enrichMelodyExpression = require("./enrichMelodyExpression");
var import_premiumMelodyPin = require("./premiumMelodyPin");
var import_premiumMelodyPitchPipeline = require("./premiumMelodyPitchPipeline");
function harmonyByBarFromImportTimeline(ir) {
  const out = {};
  for (const h of ir.harmonyByBar) {
    out[h.bar] = h.chordSymbol;
  }
  return out;
}
function runPremiumMelodyHarmonyRhythmExpressionPipeline(melodyLine, profile, seed, options) {
  const normalizedSeed = (options?.seed ?? seed) >>> 0;
  const rhythmMeta = { familyCounts: {}, totalNotes: 0 };
  const rhythmMelody = (0, import_enrichMelodyRhythm.enrichMelodyRhythm)(melodyLine, profile, {
    seed: normalizedSeed,
    meta: rhythmMeta
  });
  let pitchMelody = rhythmMelody;
  let slotList;
  let pitchTrace;
  const pitchProfile = profile.pitchProfile;
  if (pitchProfile != null) {
    const pitchResult = (0, import_premiumMelodyPitchPipeline.runPremiumMelodyPitchPipeline)(
      rhythmMelody,
      profile,
      pitchProfile,
      normalizedSeed,
      options
    );
    pitchMelody = pitchResult.pitchMelody;
    slotList = pitchResult.slotList;
    pitchTrace = pitchResult.pitchTrace;
  }
  let exportMelody = (0, import_enrichMelodyExpression.enrichMelodyExpression)(pitchMelody, profile, {
    seed: normalizedSeed,
    rhythmMeta
  });
  if (pitchProfile != null && pitchProfile.surfaceRules != null && slotList != null) {
    exportMelody = (0, import_premiumMelodyPitchPipeline.applyPremiumMelodySurfaceOrnaments)(
      exportMelody,
      slotList,
      pitchProfile,
      normalizedSeed
    );
  }
  return { rhythmMelody, exportMelody, rhythmMeta, pitchTrace };
}
function applyPremiumMelodyPinExport(score, melodyLine, profile, seed, pinOptions, pipelineOptions) {
  const { rhythmMelody, exportMelody, rhythmMeta, pitchTrace } = runPremiumMelodyHarmonyRhythmExpressionPipeline(melodyLine, profile, seed, pipelineOptions);
  const newScore = (0, import_premiumMelodyPin.pinPremiumMelodyExport)(score, exportMelody, pinOptions);
  return { score: newScore, rhythmMelody, exportMelody, rhythmMeta, pitchTrace };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyPremiumMelodyPinExport,
  harmonyByBarFromImportTimeline,
  runPremiumMelodyHarmonyRhythmExpressionPipeline
});
