export type MusicianErrorCode =
  | 'INVALID_REQUEST'
  | 'UNKNOWN_COMPOSER'
  | 'REGISTRY_UNAVAILABLE'
  | 'GENERATION_FAILED'
  | 'WRITE_FAILED'
  | 'ENGINE_CRASH'
  | 'BUSY';

export interface MusicianGenerateRequest {
  composerSlug: string;
  seed: number;
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
