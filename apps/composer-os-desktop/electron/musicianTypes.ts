export type MusicianErrorCode =
  | 'INVALID_REQUEST'
  | 'UNKNOWN_COMPOSER'
  | 'REGISTRY_UNAVAILABLE'
  | 'GENERATION_FAILED'
  | 'WRITE_FAILED'
  | 'ENGINE_CRASH'
  | 'BUSY';

export interface MusicianMosaicSectionPlanEntry {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  songwriterStyleId: string;
}

export interface MusicianGenerateRequest {
  composerSlug: string;
  seed: number;
  /** Optional paste — auto-padded to {@link totalBars} on the main process before generate. */
  chordProgressionText?: string;
  /** Target piece length when {@link chordProgressionText} is set (default 32). */
  totalBars?: number;
  /** Override whole-piece songwriter style (defaults to {@link composerSlug}). */
  songwriterStyleId?: string;
  /** Tab 2 Arrange in Blocks — section metadata only (no chord symbols). ≥2 sections. */
  mosaicSectionPlan?: MusicianMosaicSectionPlanEntry[];
}

export interface MusicianGenerateResponseSuccess {
  ok: true;
  outputPath: string;
  filename: string;
  composerSlug: string;
  seed: number;
}

export interface MusicianGenerateResponseFailure {
  ok: false;
  errorCode: MusicianErrorCode;
  message: string;
  detail?: string;
}

export type MusicianGenerateResponse =
  | MusicianGenerateResponseSuccess
  | MusicianGenerateResponseFailure;

export interface MusicianComposerOption {
  slug: string;
  displayName: string;
  defaultSeed: number;
  frozen: boolean;
  scaffolded: boolean;
}

export type MusicianStatusEvent =
  | {
      phase: 'ready';
      composers: MusicianComposerOption[];
      /** Dispatch-backed mosaic composer ids (from DUO_COMPOSER_REGISTRY). */
      mosaicComposerIds?: string[];
      message?: string;
    }
  | {
      phase: 'generating';
      composerSlug: string;
      seed: number;
      message?: string;
    }
  | {
      phase: 'idle';
      message?: string;
    };

export interface MusicianRegistryComposer {
  slug: string;
  displayName: string;
  seed: number;
  frozen?: boolean;
  scaffolded?: boolean;
}

export interface MusicianRegistryFile {
  composers: MusicianRegistryComposer[];
}
