import { useCallback, useMemo, useState } from 'react';
import { musicXmlToImportTimeline } from '@composer-os/core/import/musicXmlToImportTimeline';
import { midiToImportTimeline } from '@composer-os/core/import/midiToImportTimeline';
import { extractScoreMusicXmlFromUint8Array } from '@composer-os/core/lead-sheet/musicXmlScoreInput';
import type {
  ImportSourceFormat,
  MosaicImportTimeline,
} from '@composer-os/core/import/mosaicImportTimeline';
import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';

export type MosaicImportMode = 'lock' | 'variations' | 'styleTransfer';

export type MosaicImportFileExt = 'midi' | 'musicxml';

export interface MosaicImportWorkflowState {
  importTimeline: MosaicImportTimeline | null;
  importMode: MosaicImportMode | null;
  parseError: string | null;
  parseDiagnostics: string[];
  fileName: string | null;
  sourceFormat: ImportSourceFormat | null;
  /** MIDI header BPM when available; MusicXML ingest has no tempo on IR. */
  tempoBpm: number | null;
}

const INITIAL_STATE: MosaicImportWorkflowState = {
  importTimeline: null,
  importMode: null,
  parseError: null,
  parseDiagnostics: [],
  fileName: null,
  sourceFormat: null,
  tempoBpm: null,
};

export function detectMosaicImportFormat(fileName: string): MosaicImportFileExt | null {
  const lower = fileName.trim().toLowerCase();
  if (/\.(mid|midi)$/.test(lower)) return 'midi';
  if (/\.(musicxml|mxl|xml)$/.test(lower)) return 'musicxml';
  return null;
}

export function confidenceStripColor(confidence: number): 'green' | 'amber' | 'red' {
  if (confidence >= 0.85) return 'green';
  if (confidence >= 0.5) return 'amber';
  return 'red';
}

/** Pure helper for mode selection (tested; hook uses identical state update). */
export function withMosaicImportMode(
  state: MosaicImportWorkflowState,
  mode: MosaicImportMode,
): MosaicImportWorkflowState {
  return { ...state, importMode: mode };
}

export async function parseMosaicImportFile(
  file: File,
): Promise<{
  timeline: MosaicImportTimeline;
  tempoBpm: number | null;
}> {
  const format = detectMosaicImportFormat(file.name);
  if (!format) {
    throw new Error('Unsupported file type. Use .mid, .midi, .musicxml, .mxl, or .xml.');
  }

  const buffer = await file.arrayBuffer();

  if (format === 'musicxml') {
    const extracted = extractScoreMusicXmlFromUint8Array(new Uint8Array(buffer));
    if (!extracted.ok || !extracted.xml) {
      throw new Error(extracted.errors.join(' ') || 'Could not read MusicXML from file.');
    }
    const timeline = musicXmlToImportTimeline(extracted.xml);
    return { timeline, tempoBpm: null };
  }

  const timeline = midiToImportTimeline(new Uint8Array(buffer));
  return { timeline, tempoBpm: 120 };
}

export function useMosaicImportWorkflow() {
  const [state, setState] = useState<MosaicImportWorkflowState>(INITIAL_STATE);

  const loadFile = useCallback(async (file: File) => {
    setState((prev) => ({
      ...prev,
      parseError: null,
      parseDiagnostics: [],
      fileName: file.name,
    }));

    try {
      const { timeline, tempoBpm } = await parseMosaicImportFile(file);
      setState({
        importTimeline: timeline,
        importMode: null,
        parseError: null,
        parseDiagnostics: timeline.parseDiagnostics ?? [],
        fileName: file.name,
        sourceFormat: timeline.sourceFormat,
        tempoBpm,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({
        importTimeline: null,
        importMode: null,
        parseError: message,
        parseDiagnostics: [],
        fileName: file.name,
        sourceFormat: detectMosaicImportFormat(file.name),
        tempoBpm: null,
      });
    }
  }, []);

  const clearImport = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setMode = useCallback((mode: MosaicImportMode) => {
    setState((prev) => ({ ...prev, importMode: mode }));
  }, []);

  const toGenerateRequestPartial = useCallback((): Partial<GenerateRequest> => {
    if (!state.importTimeline || !state.importMode) return {};
    // V81c — wire importTimeline + mode flags into GenerateRequest.
    return {};
  }, [state.importMode, state.importTimeline]);

  const actions = useMemo(
    () => ({
      loadFile,
      clearImport,
      setMode,
    }),
    [clearImport, loadFile, setMode],
  );

  return { state, actions, toGenerateRequestPartial };
}

export type MosaicImportWorkflow = ReturnType<typeof useMosaicImportWorkflow>;
