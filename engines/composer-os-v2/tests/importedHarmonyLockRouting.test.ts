import { extractLockedHarmonyBarsFromImportedTimeline } from '../core/song-mode/songModeLeadSheetAdapter';
import type { LeadSheet } from '../core/lead-sheet/leadSheetTypes';

function baseLeadSheet(): LeadSheet {
  return {
    sourceFormat: 'musicxml',
    totalBars: 4,
    sections: [],
    chordEvents: [],
    melodyEvents: [],
    repeatMarkers: [],
    dynamicSpans: [],
    tempoDirections: [],
    importedHarmonyTimeline: { events: [] },
  };
}

export function runImportedHarmonyLockRoutingTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'Imported harmony lock: carry-forward fills missing bars',
      ok: (() => {
        const leadSheet = baseLeadSheet();
        leadSheet.importedHarmonyTimeline = {
          events: [
            {
              time: { bar: 1, beat: 0, eventIndexInBar: 0 },
              sourceMarker: 'root_based',
              root: { step: 'C' },
              kind: { value: 'major-seventh', text: 'maj7' },
            },
            {
              time: { bar: 3, beat: 0, eventIndexInBar: 0 },
              sourceMarker: 'root_based',
              root: { step: 'G' },
              kind: { value: 'dominant', text: '7' },
            },
          ],
        };
        const r = extractLockedHarmonyBarsFromImportedTimeline(leadSheet, 4);
        return r.ok === true && r.lockedChordBars?.join('|') === 'Cmaj7|Cmaj7|G7|G7';
      })(),
    },
    {
      name: 'Imported harmony lock: mixed root and numeral events are usable',
      ok: (() => {
        const leadSheet = baseLeadSheet();
        leadSheet.importedHarmonyTimeline = {
          events: [
            {
              time: { bar: 1, beat: 0, eventIndexInBar: 0 },
              sourceMarker: 'numeral_based',
              root: { numeral: 'V' },
              kind: { value: 'dominant' },
            },
            {
              time: { bar: 2, beat: 0, eventIndexInBar: 0 },
              sourceMarker: 'root_based',
              root: { step: 'A' },
              kind: { value: 'minor-seventh', text: 'm7' },
              bass: { step: 'C', alter: 1 },
            },
          ],
        };
        const r = extractLockedHarmonyBarsFromImportedTimeline(leadSheet, 3);
        return r.ok === true && r.lockedChordBars?.[0] === 'V7' && r.lockedChordBars?.[1] === 'Am7/C#';
      })(),
    },
    {
      name: 'Imported harmony lock: unusable timeline returns fallback with warnings',
      ok: (() => {
        const leadSheet = baseLeadSheet();
        leadSheet.importedHarmonyTimeline = {
          events: [
            {
              time: { bar: 1, beat: 0, eventIndexInBar: 0 },
              sourceMarker: 'unknown',
              kind: { value: 'major' },
            },
          ],
        };
        const r = extractLockedHarmonyBarsFromImportedTimeline(leadSheet, 4);
        return r.ok === false && r.fallbackReason === 'timeline_unusable' && r.warnings.length > 0;
      })(),
    },
  ];
}

