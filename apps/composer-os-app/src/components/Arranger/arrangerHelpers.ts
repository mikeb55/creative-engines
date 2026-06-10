import type { GenerateRequest, StyleTransferEcho } from '@composer-os/app-api/appApiTypes';
import { importTimelineToLockedHarmony } from '@composer-os/core/import/importTimelineAdapters';
import type { MosaicImportTimeline } from '@composer-os/core/import/mosaicImportTimeline';
import { APP_PRESET_REGISTRY, type AppPresetCard } from '../../constants/composerOsPresetUi';
import {
  buildMosaicImportGeneratePartial,
  type MosaicImportPartialConfig,
} from '../mosaic-import/useMosaicImportWorkflow';

export type ArrangerErrorCode = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

export const ARRANGER_ERROR_MESSAGES: Record<ArrangerErrorCode, string> = {
  E0: 'Something went wrong. Try again.',
  E1: "We couldn't read your file. Try a different MIDI or MusicXML file.",
  E2: 'Arrangement failed. Check your file and settings, then retry.',
  E3: 'Cancelled.',
  E4: 'Composer OS is busy or unavailable. Wait a moment and try again.',
};

export const ARRANGER_PROGRESS_STAGES = [
  'Reading your tune…',
  'Applying harmony…',
  'Choosing voicings…',
  'Building chord-melody under melody…',
  'Exporting your chart…',
] as const;

export type ArrangerStyleTransferComposer = { id: string; label: string };

export const ARRANGER_STYLE_TRANSFER_COMPOSERS: readonly ArrangerStyleTransferComposer[] = [
  { id: 'barry_harris', label: 'Barry Harris' },
  { id: 'bill_evans', label: 'Bill Evans' },
  { id: 'bacharach', label: 'Bacharach' },
  { id: 'herbie_hancock', label: 'Herbie Hancock' },
  { id: 'antonio_carlos_jobim', label: 'Antônio Carlos Jobim' },
  { id: 'donald_fagen', label: 'Donald Fagen' },
  { id: 'ecm_chamber', label: 'ECM Chamber' },
  { id: 'charlie_parker', label: 'Charlie Parker' },
  { id: 'thelonious_monk', label: 'Thelonious Monk' },
  { id: 'andrew_hill', label: 'Andrew Hill' },
  { id: 'kate_bush', label: 'Kate Bush' },
  { id: 'frank_zappa', label: 'Frank Zappa' },
  { id: 'pat_metheny', label: 'Pat Metheny' },
  { id: 'joe_pass', label: 'Joe Pass' },
  { id: 'john_coltrane', label: 'John Coltrane' },
  { id: 'gil_evans', label: 'Gil Evans' },
  { id: 'cole_porter', label: 'Cole Porter' },
  { id: 'gershwin', label: 'Gershwin' },
  { id: 'brian_wilson', label: 'Brian Wilson' },
  { id: 'stevie_wonder', label: 'Stevie Wonder' },
  { id: 'radiohead', label: 'Radiohead' },
  { id: 'joni_mitchell', label: 'Joni Mitchell' },
  { id: 'wayne_shorter', label: 'Wayne Shorter' },
  { id: 'stephen_sondheim', label: 'Stephen Sondheim' },
  { id: 'mccoy_tyner', label: 'McCoy Tyner' },
];

const COMPOSER_BY_ID = new Map(ARRANGER_STYLE_TRANSFER_COMPOSERS.map((c) => [c.id, c]));

export function listArrangerStyleTransferComposers(): readonly ArrangerStyleTransferComposer[] {
  return ARRANGER_STYLE_TRANSFER_COMPOSERS;
}

export function arrangerComposerLabel(composerId: string): string {
  return COMPOSER_BY_ID.get(composerId)?.label ?? composerId.replace(/_/g, ' ');
}

export function composerSubtitle(composerId: string): string {
  if (composerId === 'barry_harris') return '6th-diminished chord-melody';
  if (composerId === 'bill_evans') return 'Modal jazz voicings';
  if (composerId === 'joe_pass') return 'Walking chord-melody guitar';
  return 'Style-transfer arrangement';
}

/** Arranger Step 3 preset dropdown — Song Mode default + ensemble reorchestrate paths. */
export const ARRANGER_PRESET_IDS = ['song_mode', 'string_quartet', 'big_band'] as const;

export type ArrangerPresetId = (typeof ARRANGER_PRESET_IDS)[number];

export function normalizeArrangerPresetId(presetId: string): ArrangerPresetId {
  const id = presetId.trim();
  return (ARRANGER_PRESET_IDS as readonly string[]).includes(id)
    ? (id as ArrangerPresetId)
    : ARRANGER_GENERATE_PRESET_ID;
}

export function listArrangerPresetOptions(): readonly AppPresetCard[] {
  const byId = new Map(APP_PRESET_REGISTRY.map((p) => [p.id, p]));
  return ARRANGER_PRESET_IDS.map((id) => byId.get(id)).filter(
    (p): p is AppPresetCard => !!p?.supported,
  );
}

export function confidenceDotCount(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.max(1, Math.min(5, Math.round(confidence * 5)));
}

export function formatKeyLabel(timeline: MosaicImportTimeline | null): string {
  if (!timeline) return '—';
  const { tonic, mode } = timeline.keyEstimate;
  if (!tonic?.trim()) return '—';
  if (mode === 'major') return `${tonic} major`;
  if (mode === 'minor') return `${tonic} minor`;
  return tonic;
}

export function progressStageIndex(elapsedSeconds: number): number {
  if (elapsedSeconds < 8) return 0;
  if (elapsedSeconds < 20) return 1;
  if (elapsedSeconds < 35) return 2;
  if (elapsedSeconds < 55) return 3;
  return 4;
}

export function formatElapsed(elapsedSeconds: number): string {
  const s = Math.max(0, Math.floor(elapsedSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Default style-transfer strength for Arranger (HomeGenerate mosaic default is 0.5). */
export const ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH = 1.0;

/** Default Arranger preset (Song Mode style-transfer path). */
export const ARRANGER_GENERATE_PRESET_ID = 'song_mode' as const;

export const ARRANGER_DEFAULT_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

function arrangerStyleStackForComposer(composerId: string): GenerateRequest['styleStack'] {
  const primary = composerId.trim() || 'barry_harris';
  return {
    primary,
    styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
  };
}

export function buildArrangerGeneratePayload(input: {
  timeline: MosaicImportTimeline;
  presetId: string;
  seed: number;
  targetComposer: string;
  strength: number;
  preserveMelody: boolean;
  reorchestrate: boolean;
  bpm?: number | null;
}): Partial<GenerateRequest> {
  const composerId = input.targetComposer.trim() || 'barry_harris';
  const presetId = normalizeArrangerPresetId(input.presetId);
  const strength = input.strength ?? ARRANGER_DEFAULT_STYLE_TRANSFER_STRENGTH;
  const locked = importTimelineToLockedHarmony(input.timeline);
  const totalBars = input.timeline.bars;
  const config: MosaicImportPartialConfig = {
    targetComposer: composerId,
    styleTransferStrength: strength,
    preserveMelody: input.preserveMelody,
    reorchestrate: input.reorchestrate,
  };
  const built = buildMosaicImportGeneratePartial({
    timeline: input.timeline,
    mode: 'styleTransfer',
    config,
  });
  const tonal = input.timeline.keyEstimate.tonic?.trim();
  const out: Partial<GenerateRequest> = {
    presetId,
    seed: input.seed,
    styleStack: arrangerStyleStackForComposer(composerId),
    primarySongwriterStyle: composerId,
    creativeControlLevel: 'balanced',
    variationEnabled: false,
    totalBars,
    chordProgressionText: locked.join(' | '),
    c4Strength: 'medium',
    blendStrength: 'medium',
    ...(totalBars >= 16 ? { longFormEnabled: true } : {}),
    ...(tonal ? { tonalCenter: tonal } : {}),
    ...(input.bpm != null && input.bpm > 0 ? { bpm: Math.floor(input.bpm) } : {}),
    ...built.partial,
  };
  return out;
}

export function mapArrangerError(err: unknown, parseError?: string | null): ArrangerErrorCode {
  if (parseError?.trim()) return 'E1';
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (msg === 'CANCELLED') return 'E3';
  if (msg === 'QUEUE_FULL' || msg === 'DEFERRED_NOT_CONFIGURED') return 'E4';
  if (/unsupported file|could not read|parse|musicxml|midi/i.test(msg)) return 'E1';
  if (msg.trim()) return 'E2';
  return 'E0';
}

export function chordMelodyDetailLines(
  styleTransferEcho?: StyleTransferEcho,
  exportIntegrityPassed?: boolean,
  barsProcessed?: number,
): string[] {
  const lines: string[] = [];
  const cm = styleTransferEcho?.chordMelody;
  if (cm) {
    if (typeof cm.passingDimDensity === 'number') {
      lines.push(`passingDimDensity: ${cm.passingDimDensity.toFixed(2)}`);
    }
    lines.push(`noteCount: ${cm.noteCount}`);
    lines.push(`dim7Count: ${cm.dim7Count}`);
    lines.push(`sixthChordCount: ${cm.sixthCount}`);
  }
  if (typeof barsProcessed === 'number' && barsProcessed > 0) {
    lines.push(`barsProcessed: ${barsProcessed}`);
  }
  if (typeof exportIntegrityPassed === 'boolean') {
    lines.push(`integrityCheck: ${exportIntegrityPassed ? 'passed' : 'failed'}`);
  }
  if (styleTransferEcho) {
    lines.push(`evalScore: ${styleTransferEcho.evalScore.toFixed(2)}`);
    lines.push(`melodyRetained: ${styleTransferEcho.melodyRetained ? 'yes' : 'no'}`);
  }
  return lines;
}

export function resolveArrangerOutputPath(r: {
  filepath?: string;
  ensembleMusicXmlFilepath?: string;
  manifestPath?: string;
}): string | undefined {
  const fp = typeof r.filepath === 'string' ? r.filepath.trim() : '';
  if (fp) {
    if (fp.toLowerCase().endsWith('.json') && typeof r.ensembleMusicXmlFilepath === 'string') {
      const ens = r.ensembleMusicXmlFilepath.trim();
      if (ens) return ens;
    }
    return fp;
  }
  const ens = typeof r.ensembleMusicXmlFilepath === 'string' ? r.ensembleMusicXmlFilepath.trim() : '';
  if (ens) return ens;
  const mp = typeof r.manifestPath === 'string' ? r.manifestPath.trim() : '';
  if (mp) {
    const norm = mp.replace(/\\/g, '/');
    const meta = norm.match(/^(.*)\/_meta\/([^/]+)\.manifest\.json$/i);
    if (meta) return `${meta[1]}/${meta[2]}.musicxml`;
    if (/\.manifest\.json$/i.test(norm)) return norm.replace(/\.manifest\.json$/i, '.musicxml');
  }
  return undefined;
}

export function midiPathFromMusicXmlPath(musicXmlPath: string): string {
  return musicXmlPath.replace(/\.musicxml$/i, '.mid').replace(/\.xml$/i, '.mid').replace(/\.mxl$/i, '.mid');
}

export function averageTimelineConfidence(timeline: MosaicImportTimeline): number {
  const parts: number[] = [];
  if (timeline.keyEstimate.confidence > 0) parts.push(timeline.keyEstimate.confidence);
  for (const bar of timeline.harmonyByBar) {
    if (bar.confidence > 0) parts.push(bar.confidence);
  }
  for (const note of timeline.melodyLine) {
    if (note.confidence > 0) parts.push(note.confidence);
  }
  if (parts.length === 0) return 0.5;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}