"use strict";
/**
 * Composer OS V2 — Run manifest generator
 * Essential for replay/debug.
 * Keep in sync with createRunManifest.ts (Node may resolve .js first).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRunManifest = createRunManifest;
/** Create run manifest. */
function createRunManifest(input) {
    return {
        composerOsVersion: input.version,
        seed: input.seed,
        presetId: input.presetId,
        ecmMode: input.ecmMode,
        scoreTitle: input.scoreTitle,
        activeModules: input.activeModules,
        activeModuleCategories: input.activeModuleCategories,
        presetType: input.presetType,
        songModeVoiceType: input.songModeVoiceType,
        songSectionSummary: input.songSectionSummary,
        songHookId: input.songHookId,
        songHookSummary: input.songHookSummary,
        songLeadSheetReady: input.songLeadSheetReady,
        songwritingModuleIds: input.songwritingModuleIds,
        bigBandFormSequence: input.bigBandFormSequence,
        bigBandOrchestrationReady: input.bigBandOrchestrationReady,
        bigBandModuleIds: input.bigBandModuleIds,
        stringQuartetFormSequence: input.stringQuartetFormSequence,
        stringQuartetOrchestrationReady: input.stringQuartetOrchestrationReady,
        stringQuartetModuleIds: input.stringQuartetModuleIds,
        feelMode: input.feelMode,
        instrumentProfiles: input.instrumentProfiles,
        readinessScores: input.readinessScores,
        validationPassed: input.validationPassed,
        validationErrors: input.validationErrors,
        exportTarget: input.exportTarget,
        timestamp: input.timestamp,
    };
}
