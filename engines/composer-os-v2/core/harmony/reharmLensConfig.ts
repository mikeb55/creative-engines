export type ReharmLensConfig = {
  lensId: string;
  displayName: string;
  tritoneRate: number;
  susBias: number;
  chromaticMediantBias: number;
  poolSampling: boolean;
};

const NEUTRAL: ReharmLensConfig = {
  lensId: 'neutral',
  displayName: 'Neutral',
  tritoneRate: 0.35,
  susBias: 0.35,
  chromaticMediantBias: 0.35,
  poolSampling: false,
};

type LensPreset = Omit<ReharmLensConfig, 'lensId' | 'displayName'>;

const VOICES: Record<string, { displayName: string } & LensPreset> = {
  antonio_carlos_jobim: {
    displayName: 'Antônio Carlos Jobim',
    tritoneRate: 0.55,
    susBias: 0.52,
    chromaticMediantBias: 0.48,
    poolSampling: true,
  },
  bill_evans: {
    displayName: 'Bill Evans',
    tritoneRate: 0.26,
    susBias: 0.64,
    chromaticMediantBias: 0.56,
    poolSampling: false,
  },
  wayne_shorter: {
    displayName: 'Wayne Shorter',
    tritoneRate: 0.2,
    susBias: 0.45,
    chromaticMediantBias: 0.85,
    poolSampling: true,
  },
  thelonious_monk: {
    displayName: 'Thelonious Monk',
    tritoneRate: 0.35,
    susBias: 0.05,
    chromaticMediantBias: 0.75,
    poolSampling: false,
  },
  john_coltrane: {
    displayName: 'John Coltrane',
    tritoneRate: 0.15,
    susBias: 0.5,
    chromaticMediantBias: 0.95,
    poolSampling: true,
  },
  herbie_hancock: {
    displayName: 'Herbie Hancock',
    tritoneRate: 0.15,
    susBias: 0.85,
    chromaticMediantBias: 0.6,
    poolSampling: true,
  },
  donald_fagen: {
    displayName: 'Donald Fagen',
    tritoneRate: 0.5,
    susBias: 0.4,
    chromaticMediantBias: 0.58,
    poolSampling: true,
  },
  radiohead: {
    displayName: 'Radiohead',
    tritoneRate: 0.28,
    susBias: 0.6,
    chromaticMediantBias: 0.48,
    poolSampling: true,
  },
  philip_glass: {
    displayName: 'Philip Glass',
    tritoneRate: 0.14,
    susBias: 0.44,
    chromaticMediantBias: 0.26,
    poolSampling: false,
  },
  bernard_herrmann: {
    displayName: 'Bernard Herrmann',
    tritoneRate: 0.46,
    susBias: 0.38,
    chromaticMediantBias: 0.56,
    poolSampling: false,
  },
  duke_ellington: {
    displayName: 'Duke Ellington',
    tritoneRate: 0.42,
    susBias: 0.46,
    chromaticMediantBias: 0.48,
    poolSampling: true,
  },
  maria_schneider: {
    displayName: 'Maria Schneider',
    tritoneRate: 0.38,
    susBias: 0.53,
    chromaticMediantBias: 0.58,
    poolSampling: true,
  },
  gil_evans: {
    displayName: 'Gil Evans',
    tritoneRate: 0.32,
    susBias: 0.58,
    chromaticMediantBias: 0.62,
    poolSampling: true,
  },
};

function normalizeSongwriterKey(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (!k) return '';
  const aliases: Record<string, string> = {
    jobim: 'antonio_carlos_jobim',
    ac_jobim: 'antonio_carlos_jobim',
  };
  return aliases[k] ?? k;
}

function titleCaseId(id: string): string {
  if (!id) return 'Unknown';
  return id
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Heuristic lens weights for composer-aware reharm (Phase A — values only; ranking consumes these later).
 */
export function buildReharmLensConfig(songwriterStyleId: string): ReharmLensConfig {
  const key = normalizeSongwriterKey(songwriterStyleId);
  const preset = key ? VOICES[key] : undefined;
  if (!preset) {
    const baseId = key || 'neutral';
    return {
      ...NEUTRAL,
      lensId: baseId,
      displayName: titleCaseId(baseId),
    };
  }
  const { displayName, ...nums } = preset;
  return {
    lensId: key,
    displayName,
    ...nums,
  };
}
