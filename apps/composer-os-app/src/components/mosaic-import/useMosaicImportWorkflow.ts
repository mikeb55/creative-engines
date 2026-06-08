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

export type MosaicVariationConfigState = {
  count: number;
  mode: 'harmonic' | 'melodic' | 'rhythmic' | 'full';
  preserveHarmony: boolean;
};

export const DEFAULT_MOSAIC_VARIATION_CONFIG: MosaicVariationConfigState = {
  count: 4,
  mode: 'full',
  preserveHarmony: false,
};

export interface MosaicImportWorkflowState {
  importTimeline: MosaicImportTimeline | null;
  importMode: MosaicImportMode | null;
  parseError: string | null;
  parseDiagnostics: string[];
  fileName: string | null;
  sourceFormat: ImportSourceFormat | null;
  /** MIDI header BPM when available; MusicXML ingest has no tempo on IR. */
  tempoBpm: number | null;
  variationConfig: MosaicVariationConfigState;
  /** User-picked variation index for re-generate; null = engine auto-select. */
  variationIndex: number | null;
}

const INITIAL_STATE: MosaicImportWorkflowState = {
  importTimeline: null,
  importMode: null,
  parseError: null,
  parseDiagnostics: [],
  fileName: null,
  sourceFormat: null,
  tempoBpm: null,
  variationConfig: DEFAULT_MOSAIC_VARIATION_CONFIG,
  variationIndex: null,
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

export type MosaicImportPartialConfig = {
  variationCount?: number;
  variationMode?: 'harmonic' | 'melodic' | 'rhythmic' | 'full';
  preserveImportHarmony?: boolean;
  styleTransferStrength?: number;
  targetComposer?: string;
  variationIndex?: number | null;
};

export type MosaicImportPartialResult = {
  partial: Partial<GenerateRequest>;
  mutexWarning: string | null;
};

export function mosaicVariationConfigToPartialConfig(
  config: MosaicVariationConfigState,
): Pick<MosaicImportPartialConfig, 'variationCount' | 'variationMode' | 'preserveImportHarmony'> {
  return {
    variationCount: config.count,
    variationMode: config.mode,
    preserveImportHarmony: config.preserveHarmony,
  };
}

export function buildMosaicImportGeneratePartial(input: {
  timeline: MosaicImportTimeline | null;
  mode: MosaicImportMode | null;
  config?: MosaicImportPartialConfig;
}): MosaicImportPartialResult {
  const { timeline, mode, config = {} } = input;
  if (!timeline || !mode) return { partial: {}, mutexWarning: null };
  const base: Partial<GenerateRequest> = { importTimeline: timeline };
  if (mode === 'lock') {
    return {
      partial: { ...base, importHarmonyMode: 'lock_harmony', preserveImportHarmony: true },
      mutexWarning: null,
    };
  }
  if (mode === 'variations') {
    const partial: Partial<GenerateRequest> = {
      ...base,
      generateVariations: true,
      variationCount: config.variationCount ?? DEFAULT_MOSAIC_VARIATION_CONFIG.count,
      variationMode: config.variationMode ?? DEFAULT_MOSAIC_VARIATION_CONFIG.mode,
      preserveImportHarmony: config.preserveImportHarmony ?? DEFAULT_MOSAIC_VARIATION_CONFIG.preserveHarmony,
    };
    if (config.variationIndex != null) {
      partial.variationIndex = config.variationIndex;
    }
    return { partial, mutexWarning: null };
  }
  return {
    partial: {
      ...base,
      styleTransfer: true,
      targetComposer: config.targetComposer,
      styleTransferStrength: config.styleTransferStrength ?? 0.5,
      preserveMelody: true,
    },
    mutexWarning: null,
  };
}

export function resolveMosaicImportPartial(primary: Partial<GenerateRequest>): {
  partial: Partial<GenerateRequest>;
  mutexWarning: string | null;
} {
  if (primary.generateVariations && primary.styleTransfer) {
    const { styleTransfer: _st, targetComposer: _tc, styleTransferStrength: _ss, preserveMelody: _pm, reorchestrate: _ro, ...rest } = primary;
    return { partial: rest, mutexWarning: 'Both variations and style-transfer were requested; variations wins.' };
  }
  return { partial: primary, mutexWarning: null };
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
        variationConfig: DEFAULT_MOSAIC_VARIATION_CONFIG,
        variationIndex: null,
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
        variationConfig: DEFAULT_MOSAIC_VARIATION_CONFIG,
        variationIndex: null,
      });
    }
  }, []);

  const clearImport = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setMode = useCallback((mode: MosaicImportMode) => {
    setState((prev) => ({ ...prev, importMode: mode }));
  }, []);

  const setVariationConfig = useCallback((patch: Partial<MosaicVariationConfigState>) => {
    setState((prev) => ({
      ...prev,
      variationConfig: { ...prev.variationConfig, ...patch },
    }));
  }, []);

  const setVariationIndex = useCallback((variationIndex: number | null) => {
    setState((prev) => ({ ...prev, variationIndex }));
  }, []);

  const toGenerateRequestPartial = useCallback(
    (overrides?: MosaicImportPartialConfig): Partial<GenerateRequest> => {
      const built = buildMosaicImportGeneratePartial({
        timeline: state.importTimeline,
        mode: state.importMode,
        config: {
          ...mosaicVariationConfigToPartialConfig(state.variationConfig),
          variationIndex: state.variationIndex,
          ...overrides,
        },
      });
      return resolveMosaicImportPartial(built.partial).partial;
    },
    [state.importMode, state.importTimeline, state.variationConfig, state.variationIndex],
  );

  const actions = useMemo(
    () => ({
      loadFile,
      clearImport,
      setMode,
      setVariationConfig,
      setVariationIndex,
    }),
    [clearImport, loadFile, setMode, setVariationConfig, setVariationIndex],
  );

  return { state, actions, toGenerateRequestPartial };
}

export type MosaicImportWorkflow = ReturnType<typeof useMosaicImportWorkflow>;
