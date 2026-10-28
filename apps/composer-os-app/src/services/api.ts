import type { SystemCheckResponse } from '../system-check/systemCheckTypes';
import type { IRealVaultOutput, ParsedChart } from '@composer-os/core/irealpro';
import type { AnalyticalModeResult } from '@composer-os/core/music-context/musicContextTypes';

const BASE = '/api';

function parseOkJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

function friendlyHttpMessage(status: number, bodyText: string): string {
  let msg = bodyText;
  try {
    const j = JSON.parse(bodyText) as { error?: string };
    if (j.error) msg = j.error;
  } catch {
    /* use raw */
  }
  if (status === 0 || status >= 500) {
    return msg || 'Composer OS had a problem on the server. Try again or restart the app.';
  }
  if (status === 404) {
    return 'That feature was not found. Update Composer OS.';
  }
  if (status === 413) {
    return 'LeadSheet MusicXML is too large for the current web request limit.';
  }
  if (status === 408 || status === 504) {
    return 'The request took too long. Try again or use Try Another.';
  }
  return msg || `Request failed (${status})`;
}

function isDesktopIpc(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.composerOsDesktop &&
    window.composerOsDesktop.integration === 'ipc'
  );
}

export { isDesktopIpc };

async function ipcInvoke<T>(channel: string, payload?: unknown): Promise<T> {
  const bridge = window.composerOsDesktop;
  if (!bridge?.invokeApi) {
    throw new Error('Composer OS desktop IPC bridge is not available.');
  }
  return bridge.invokeApi(channel, payload) as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  if (isDesktopIpc()) {
    const map: Record<string, string> = {
      '/presets': 'composer-os-api:get-presets',
      '/style-modules': 'composer-os-api:get-style-modules',
      '/output-directory': 'composer-os-api:get-output-directory',
      '/diagnostics': 'composer-os-api:get-diagnostics',
      '/outputs': 'composer-os-api:get-outputs',
      '/riff-phrase-corpus': 'composer-os-api:get-riff-phrase-corpus',
    };
    const ch = map[path];
    if (!ch) throw new Error(`Unknown IPC path: ${path}`);
    return ipcInvoke<T>(ch);
  }
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`);
  } catch {
    throw new Error(
      'Composer OS is not reachable. Make sure the app is running and try again.'
    );
  }
  const text = await r.text();
  if (!r.ok) {
    throw new Error(friendlyHttpMessage(r.status, text));
  }
  return parseOkJson<T>(text);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (isDesktopIpc()) {
    if (path === '/generate') {
      const rec = body as Record<string, unknown>;
      if (typeof rec.__generateCorrelationId === 'string') {
        console.log('[GEN-CORR] api ipc-invoke composer-os-api:generate', {
          corr: rec.__generateCorrelationId,
          alternateGuitarTuning: rec.alternateGuitarTuning,
        });
      }
      return ipcInvoke<T>('composer-os-api:generate', body);
    }
    if (path === '/open-output-folder') {
      console.log('[OPEN-FOLDER] api ipc-invoke composer-os-api:open-output-folder', body ?? {});
      return ipcInvoke<T>('composer-os-api:open-output-folder', body ?? {});
    }
    if (path === '/system-check') {
      return ipcInvoke<T>('composer-os-api:run-system-check', body ?? {});
    }
    if (path === '/pdf/generate-from-pdf') {
      return ipcInvoke<T>('composer-os-api:pdf-generate-from-pdf', body ?? {});
    }
    if (path === '/melodic-variation-pack') {
      return ipcInvoke<T>('composer-os-api:melodic-variation-pack', body ?? {});
    }
    if (path === '/analyse') {
      return ipcInvoke<T>('composer-os-api:analyse', body ?? {});
    }
    if (path === '/export-pdf') {
      return ipcInvoke<T>('composer-os-api:export-pdf', body ?? {});
    }
    if (path === '/export-guitar-pro') {
      return ipcInvoke<T>('composer-os-api:export-guitar-pro', body ?? {});
    }
    if (path === '/generate-comping') {
      return ipcInvoke<T>('composer-os-api:generate-comping', body ?? {});
    }
    if (path === '/piano/compose') {
      return ipcInvoke<T>('composer-os-api:compose-piano', body ?? {});
    }
    if (path === '/harmony-lab') {
      return ipcInvoke<T>('composer-os-api:harmony-lab', body ?? {});
    }
    if (path === '/long-line-practice/probe') {
      return ipcInvoke<T>('composer-os-api:long-line-practice-probe', body ?? {});
    }
    if (path === '/long-line-practice') {
      return ipcInvoke<T>('composer-os-api:long-line-practice', body ?? {});
    }
    if (path === '/piano-chamber') {
      return ipcInvoke<T>('composer-os-api:piano-chamber', body ?? {});
    }
    if (path === '/bhl/defaults') return ipcInvoke<T>('composer-os-api:bhl-defaults', body ?? {});
    if (path === '/bhl/inspect') return ipcInvoke<T>('composer-os-api:bhl-inspect', body ?? {});
    if (path === '/bhl/compose') return ipcInvoke<T>('composer-os-api:bhl-compose', body ?? {});
    if (path === '/bhl/export') return ipcInvoke<T>('composer-os-api:bhl-export', body ?? {});
    if (path === '/bhl/open') return ipcInvoke<T>('composer-os-api:bhl-open', body ?? {});
    if (path === '/bhl/catalog') return ipcInvoke<T>('composer-os-api:bhl-catalog', body ?? {});
    if (path === '/bhl/candidates') return ipcInvoke<T>('composer-os-api:bhl-candidates', body ?? {});
    if (path === '/bhl/refine') return ipcInvoke<T>('composer-os-api:bhl-refine', body ?? {});
    if (path === '/bhl/compare') return ipcInvoke<T>('composer-os-api:bhl-compare', body ?? {});
    if (path === '/bhl/project/save') return ipcInvoke<T>('composer-os-api:bhl-project-save', body ?? {});
    if (path === '/bhl/project/open') return ipcInvoke<T>('composer-os-api:bhl-project-open', body ?? {});
    if (path === '/bhl/scratch') return ipcInvoke<T>('composer-os-api:bhl-scratch', body ?? {});
    if (path === '/pentatonic/project/save') return ipcInvoke<T>('composer-os-api:pentatonic-project-save', body ?? {});
    if (path === '/pentatonic/project/open') return ipcInvoke<T>('composer-os-api:pentatonic-project-open', body ?? {});
    if (path === '/hexatonic/project/save') return ipcInvoke<T>('composer-os-api:hexatonic-project-save', body ?? {});
    if (path === '/hexatonic/project/open') return ipcInvoke<T>('composer-os-api:hexatonic-project-open', body ?? {});
    if (path === '/hexatonic/laboratory/save') return ipcInvoke<T>('composer-os-api:hexatonic-laboratory-save', body ?? {});
    if (path === '/hexatonic/laboratory/open') return ipcInvoke<T>('composer-os-api:hexatonic-laboratory-open', body ?? {});
    if (path === '/evaluation/score') return ipcInvoke<T>('composer-os-api:evaluation-score', body ?? {});
    if (path === '/develop/discover') return ipcInvoke<T>('composer-os-api:develop-discover', body ?? {});
    if (path === '/develop/voice') return ipcInvoke<T>('composer-os-api:develop-voice', body ?? {});
    if (path === '/develop/coherence') return ipcInvoke<T>('composer-os-api:develop-coherence', body ?? {});
    if (path === '/develop/dual-part') return ipcInvoke<T>('composer-os-api:develop-dual-part', body ?? {});
    if (path === '/evaluation/compare') return ipcInvoke<T>('composer-os-api:evaluation-compare', body ?? {});
    if (path === '/evaluation/review/create') return ipcInvoke<T>('composer-os-api:evaluation-review-create', body ?? {});
    if (path === '/evaluation/review/save') return ipcInvoke<T>('composer-os-api:evaluation-review-save', body ?? {});
    if (path === '/evaluation/review/open') return ipcInvoke<T>('composer-os-api:evaluation-review-open', body ?? {});
    throw new Error(`Unknown IPC POST path: ${path}`);
  }
  let r: Response;
  const url = `${BASE}${path}`;
  try {
    const rec = body as Record<string, unknown>;
    if (path === '/generate' && typeof rec.__generateCorrelationId === 'string') {
      console.log('[GEN-CORR] api fetch POST serialized', {
        corr: rec.__generateCorrelationId,
        json: JSON.stringify(body),
      });
    }
    console.log('[UI][api-post] start', { url, body });
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Composer OS is not reachable. Make sure the app is running and try again.'
    );
  }
  const text = await r.text();
  console.log('[UI][api-post] end', { url, status: r.status, ok: r.ok, body: text });
  if (!r.ok) {
    throw new Error(friendlyHttpMessage(r.status, text));
  }
  return parseOkJson<T>(text);
}

export interface OutputDirectoryResponse {
  path: string;
  displayPath?: string;
  /** Preset id → subfolder under Mike Composer Files */
  presetFolders?: Record<string, string>;
}

export interface AppStyleModuleDto {
  id: string;
  name: string;
  enabled: boolean;
  type?: string;
}

export interface DiagnosticsResponse {
  appName: string;
  version: string;
  supportedModes?: Array<{
    presetId: string;
    displayName: string;
    capability: string;
    honestNote: string;
  }>;
  /** Same as `/presets` — full app preset registry (includes Riff Generator). */
  registeredPresets?: Array<{ id: string; name: string; description: string; supported: boolean }>;
  apiBasePath: string;
  activePort: number;
  desktopTransport?: 'ipc' | 'http';
  outputDirectory: string;
  outputDirectoryDisplay: string;
  outputDirectoryExists: boolean;
  outputDirectoryWritable: boolean;
  backendReachable: true;
  styleModules?: AppStyleModuleDto[];
}

/** Phase 1.5 RiffGen — mirrors engine `RiffPhraseCorpusResponse`. */
export interface RiffPhraseCorpusDto {
  version: 1;
  ok: boolean;
  error?: string;
  source: {
    phrasesPath: string;
    auditPath: string;
    derivedRoot: string;
    loadedAt: string;
    phrasesExists: boolean;
    auditExists: boolean;
  };
  phrases: Array<Record<string, unknown>>;
  audit: Array<Record<string, unknown>>;
  stats: {
    byCategory: Record<
      string,
      {
        files: number;
        phrases: number;
        barsIn: number;
        parseOk: number;
        parseFail: number;
        tieFixups: number;
        droppedOrnaments: number;
        meterMismatch: number;
      }
    >;
    barCountHist: Record<string, number>;
    startTypeHist: Record<string, number>;
    endTypeHist: Record<string, number>;
    meterMismatchFiles: string[];
    totals: {
      files: number;
      parseOk: number;
      phrases: number;
      phrasesInvalidSkipped: number;
      tieFixups: number;
      droppedOrnaments: number;
      auditPhrasesOutSum: number;
    };
  };
}

export function displayOutputPath(r: OutputDirectoryResponse): string {
  return r.displayPath ?? r.path;
}

export interface OpenOutputFolderResponse {
  success: boolean;
  openedPath?: string;
  message?: string;
}

export async function fetchDiagnostics(): Promise<DiagnosticsResponse | null> {
  try {
    return await get<DiagnosticsResponse>('/diagnostics');
  } catch {
    return null;
  }
}

export const api = {
  getPresets: () =>
    get<{ presets: { id: string; name: string; description?: string; supported: boolean }[] }>(
      '/presets'
    ),
  getStyleModules: () => get<{ modules: AppStyleModuleDto[] }>('/style-modules'),
  getRiffPhraseCorpus: () => get<RiffPhraseCorpusDto>('/riff-phrase-corpus'),
  getOutputDirectory: () => get<OutputDirectoryResponse>('/output-directory'),
  getDiagnostics: () => get<DiagnosticsResponse>('/diagnostics'),
  generate: (req: Record<string, unknown>) => post<Record<string, unknown>>('/generate', req),
  pianoChamber: (req: Record<string, unknown>) =>
    post<{
      ok: boolean;
      error?: string;
      proposalOnly?: boolean;
      proposal?: {
        bars: number;
        beats: number;
        beatType: number;
        metres?: Array<{ bar: number; throughBar: number; beats: number; beatType: number; groups: number[] | null }>;
        tempoBpm: number | null;
        tempoSource: string;
        uncertain: string[];
        motifNote: string;
        events: Array<{
          eventId: string;
          bar: number;
          midi: number;
          proposedRole: 'melody' | 'bass' | 'countermelody' | 'harmonic_support' | 'rhythmic_figure' | 'unassigned';
          confidence: 'low' | 'medium';
          needsConfirmation: true;
          reason: string;
        }>;
        phrases: Array<{ id: string; startBar: number; endBar: number; reason: string }>;
        parts?: Array<{ partId: string; name: string }>;
        protectedEventIds?: string[];
      };
      musicXml?: string;
      midiBase64?: string;
      midiSetBase64?: string;
      midiManifest?: { label: string; files: string[]; routes: Array<{ partId: string; file: string; track: number; channel: number; program: number }> };
      fidelity?: {
        mode: string;
        tempoBpm: number;
        phrases: Array<{ id: string; startBar: number; endBar: number; role: string; foreground: string; answer: string | null; answerOperator: string | null }>;
        derivedAnswers: Array<{ phraseId: string; operator: string; partId: string; notes: number }>;
        silence: Array<{ bar: number; reason: string }>;
        warnings: string[];
        listeningQuestions: string[];
        preview: Array<{ partId: string; midi: number; onset: number; duration: number }>;
        musicalQualityScore: null;
        musicallyApproved: false;
      };
    }>('/piano-chamber', req),
  harmonyLab: (req: Record<string, unknown>) =>
    post<{
      ok: boolean;
      error?: string;
      musicXml?: string;
      midiBase64?: string;
      partIds?: string[];
      noteCount?: number;
      summary?: string;
      lockStatus?: string;
      intervalText?: string;
    }>('/harmony-lab', req),
  longLinePracticeProbe: (req: { xml: string }) =>
    post<{
      ok: boolean;
      error?: string;
      issues?: readonly string[];
      barCount?: number;
      tempoBpm?: number | null;
      sourceSha256?: string;
      register?: { low: number; high: number };
    }>('/long-line-practice/probe', req),
  longLinePractice: (req: {
    xml: string;
    startBar: number;
    endBar: number;
    register: { low: number; high: number };
    seed: number;
    tempoBpmFallback?: number;
    profiles?: readonly ('lyrical' | 'intervallic' | 'experimental')[];
  }) =>
    post<{
      ok: boolean;
      error?: string;
      issues?: readonly string[];
      context?: {
        canGenerate?: boolean;
        range?: { startBar: number; endBar: number };
        issues?: readonly string[];
      } | null;
      scores?: Array<{ profile: 'lyrical' | 'intervallic' | 'experimental'; title: string; xml: string }>;
    }>('/long-line-practice', req),
  composePiano: (req: Record<string, unknown>) =>
    post<{
      ok: boolean;
      code?: string;
      error?: string;
      filepath?: string;
      midiFilepath?: string;
      outputDirectory?: string;
      elapsedSeconds?: number;
      soundingAttacks?: number;
      seedEffect?: string;
      bars?: number;
      tempo?: number;
      title?: string;
      innerVoice?: boolean;
      pedalEventCount?: number;
      validation?: { oracleOk?: boolean; errors?: string[] };
    }>('/piano/compose', req),
  generateWayneShorter: (body: {
    title: string;
    seed?: number;
    mode?: string;
    profile?: string;
    custom_chords?: string | null;
  }) =>
    ipcInvoke<{ path: string; filename: string }>('composer-os-api:generate-wayne-shorter', body),
  generateCharliePark: (body: {
    title: string;
    seed?: number;
    custom_chords?: string | null;
    song_form?: string;
  }) =>
    ipcInvoke<{ path: string; filename: string }>('composer-os-api:generate-charlie-parker', body),
  generateMonk: (body: { title: string; seed?: number }) =>
    ipcInvoke<{ path: string; filename: string }>('composer-os-api:generate-monk', body),
  getOutputs: () => get<{ outputs: Array<Record<string, unknown>> }>('/outputs'),
  openOutputFolder: (opts?: { path?: string }) =>
    post<OpenOutputFolderResponse>('/open-output-folder', opts ?? {}),
  runSystemCheck: () => post<SystemCheckResponse>('/system-check', {}),
  generateFromPdf: (body: {
    pdfBase64: string;
    pageNumber?: number;
    mode?: 'solo' | 'melody';
    tuningId?: string;
    riffStyle?: string;
    drift?:
      | 'neutral'
      | 'darker'
      | 'brighter'
      | 'more-suspended'
      | 'more-unstable'
      | 'more-cinematic';
    seed?: number;
    duoIntent?: 'conversational' | 'supportive';
    songwriterStyleId?: string;
    chorusCount?: number;
  }) =>
    post<{
      success: true;
      output: IRealVaultOutput | null;
      parsedChart?: ParsedChart | null;
      error?: string;
    }>('/pdf/generate-from-pdf', body),
  melodicVariationPack: (body: {
    melody: Array<{ pitch: number; duration: number }>;
    variationCount: number;
    chords: string[];
    songwriterId: string;
    sections?: Array<{ label: string; barStart: number; barEnd: number; role?: string }>;
  }) =>
    post<{
      success: true;
      scoringMode: 'melody-only';
      melody: Array<{ pitch: number; duration: number }>;
      variations: Array<{
        melody: Array<{ pitch: number; duration: number }>;
        gceScore: number;
        transform: string;
      }>;
    }>('/melodic-variation-pack', body),
  analyse: (body: { chords: string[]; key?: string }) =>
    post<{ success: true; result: AnalyticalModeResult } | { success: false; error: string }>(
      '/analyse',
      body
    ),
  exportPdf: (body: { musicXmlPath: string; outputPath: string }) =>
    post<{ success: boolean; path?: string; error?: string }>('/export-pdf', body),
  exportGuitarPro: (body: { musicXmlPath: string; outputPath: string }) =>
    post<{ success: boolean; path?: string; error?: string }>('/export-guitar-pro', body),
  generateComping: (body: {
    chords: string[];
    key: string;
    bpm: number;
    bars: number;
    timeSignature?: { num: number; den: number };
    options: {
      style: 'freddie_green' | 'shell_voicing' | 'full_chord';
      beatPattern: 'beats_2_4' | 'beats_1_3' | 'all_beats' | 'offbeats';
      voicingDensity: 'sparse' | 'medium' | 'dense';
      muted: boolean;
    };
  }) =>
    post<
      | {
          success: true;
          result: {
            chordVoicings: Array<{
              barIndex: number;
              beat: number;
              symbol: string;
              midiPitches: number[];
              duration: number;
            }>;
            musicContext: import('@composer-os/core/music-context/musicContextTypes').MusicContext;
            warnings: string[];
          };
        }
      | { success: false; error: string }
    >('/generate-comping', body),
  bhlDefaults: () => post<Record<string, unknown>>('/bhl/defaults', {}),
  bhlInspect: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/inspect', body),
  bhlCompose: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/compose', body),
  bhlExport: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/export', body),
  bhlOpen: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/open', body),
  bhlCatalog: () => post<Record<string, unknown>>('/bhl/catalog', {}),
  bhlCandidates: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/candidates', body),
  bhlRefine: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/refine', body),
  bhlCompare: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/compare', body),
  bhlSaveProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/project/save', body),
  bhlOpenProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/project/open', body),
  bhlScratch: (body: Record<string, unknown>) => post<Record<string, unknown>>('/bhl/scratch', body),
  pentatonicSaveProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/pentatonic/project/save', body),
  pentatonicOpenProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/pentatonic/project/open', body),
  hexatonicSaveProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/hexatonic/project/save', body),
  hexatonicOpenProject: (body: Record<string, unknown>) => post<Record<string, unknown>>('/hexatonic/project/open', body),
  hexatonicSaveLaboratory: (body: Record<string, unknown>) => post<Record<string, unknown>>('/hexatonic/laboratory/save', body),
  hexatonicOpenLaboratory: (body: Record<string, unknown>) => post<Record<string, unknown>>('/hexatonic/laboratory/open', body),
  evaluateMusicalScore: (body: Record<string, unknown>) => post<Record<string, unknown>>('/evaluation/score', body),
  developDiscover: (body: Record<string, unknown>) => post<Record<string, unknown>>('/develop/discover', body),
  developVoice: (body: Record<string, unknown>) => post<Record<string, unknown>>('/develop/voice', body),
  developCoherence: (body: Record<string, unknown>) => post<Record<string, unknown>>('/develop/coherence', body),
  developDualPart: (body: Record<string, unknown>) => post<Record<string, unknown>>('/develop/dual-part', body),
  compareMusicalScores: (body: Record<string, unknown>) => post<Record<string, unknown>>('/evaluation/compare', body),
  createHumanReview: (body: Record<string, unknown>) => post<Record<string, unknown>>('/evaluation/review/create', body),
  saveHumanReview: (body: Record<string, unknown>) => post<Record<string, unknown>>('/evaluation/review/save', body),
  openHumanReview: (body: Record<string, unknown>) => post<Record<string, unknown>>('/evaluation/review/open', body),
};

/** Shape checks for generation receipts (tests). */
export function isGenerationReceiptShape(r: Record<string, unknown>): boolean {
  if (typeof r.success !== 'boolean') return false;
  if (!r.validation || typeof r.validation !== 'object') return false;
  const v = r.validation as Record<string, unknown>;
  if (typeof v.readiness !== 'object' || v.readiness === null) return false;
  const rd = v.readiness as Record<string, unknown>;
  if (typeof rd.release !== 'number' || typeof rd.mx !== 'number') return false;
  return true;
}
