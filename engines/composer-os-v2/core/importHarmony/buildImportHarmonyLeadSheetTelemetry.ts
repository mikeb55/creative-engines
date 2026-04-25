/**
 * Stage 1 — Pure telemetry for Song Mode LeadSheet MusicXML adaptation (no routing / exporter changes).
 */

import type { SongModeLeadSheetXmlAdaptResult } from '../song-mode/songModeLeadSheetAdapter';
import type {
  ImportHarmonyLeadSheetAdaptDetail,
  ImportHarmonyLeadSheetPipelineStage,
} from '../compositionContext';

export interface ImportHarmonyLeadSheetTelemetry {
  importHarmonyShouldParseLeadSheetInput: boolean;
  importHarmonyLeadSheetPipelineStage?: ImportHarmonyLeadSheetPipelineStage;
  importHarmonyLeadSheetAdaptDetail?: ImportHarmonyLeadSheetAdaptDetail;
  importHarmonyChordEventCount?: number;
  importHarmonyTimelineEventCount?: number;
}

function countsFromLeadSheet(adapt: SongModeLeadSheetXmlAdaptResult): {
  chordEvents: number;
  timelineEvents: number;
} {
  const ls = adapt.leadSheet;
  if (!ls) return { chordEvents: 0, timelineEvents: 0 };
  return {
    chordEvents: ls.chordEvents?.length ?? 0,
    timelineEvents: ls.importedHarmonyTimeline?.events?.length ?? 0,
  };
}

function classifyFailure(adapt: SongModeLeadSheetXmlAdaptResult): {
  stage: ImportHarmonyLeadSheetPipelineStage;
  detail: ImportHarmonyLeadSheetAdaptDetail;
} {
  const errBlob = adapt.errors.join(' | ').toLowerCase();

  if (errBlob.includes('could not be unpacked') || errBlob.includes('not be unpacked or validated')) {
    return { stage: 'musicxml_unpack_failed', detail: 'musicxml_unpack_failed' };
  }
  if (errBlob.includes('no chord events')) {
    return { stage: 'adapt_failed', detail: 'adapt_no_chord_events' };
  }
  if (errBlob.includes('musicxml parse failed')) {
    return { stage: 'musicxml_import_failed', detail: 'musicxml_import_failed' };
  }
  return { stage: 'adapt_failed', detail: 'adapt_other' };
}

/**
 * Derives LeadSheet pipeline telemetry from the same inputs used by Song Mode routing.
 * Safe to call when no MusicXML was supplied (`shouldParseLeadSheetInput === false`).
 */
export function buildImportHarmonyLeadSheetTelemetry(input: {
  shouldParseLeadSheetInput: boolean;
  leadSheetAdapted: SongModeLeadSheetXmlAdaptResult | undefined;
}): ImportHarmonyLeadSheetTelemetry {
  if (!input.shouldParseLeadSheetInput) {
    return { importHarmonyShouldParseLeadSheetInput: false, importHarmonyLeadSheetPipelineStage: 'skipped' };
  }

  const adapt = input.leadSheetAdapted;
  if (!adapt) {
    return {
      importHarmonyShouldParseLeadSheetInput: true,
      importHarmonyLeadSheetPipelineStage: 'adapt_failed',
      importHarmonyLeadSheetAdaptDetail: 'adapt_other',
    };
  }

  const counts = countsFromLeadSheet(adapt);

  if (adapt.ok) {
    return {
      importHarmonyShouldParseLeadSheetInput: true,
      importHarmonyLeadSheetPipelineStage: 'adapt_ok',
      importHarmonyChordEventCount: counts.chordEvents,
      importHarmonyTimelineEventCount: counts.timelineEvents,
    };
  }

  const { stage, detail } = classifyFailure(adapt);
  return {
    importHarmonyShouldParseLeadSheetInput: true,
    importHarmonyLeadSheetPipelineStage: stage,
    importHarmonyLeadSheetAdaptDetail: detail,
    importHarmonyChordEventCount: counts.chordEvents,
    importHarmonyTimelineEventCount: counts.timelineEvents,
  };
}
