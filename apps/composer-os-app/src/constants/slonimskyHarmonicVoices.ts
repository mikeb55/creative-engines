import { getVoiceRuleBundle } from '@composer-os/core/composer/voiceRuleBundles';

export type SlonimskyHarmonicVoiceMode =
  | 'song_mode'
  | 'gbd'
  | 'big_band'
  | 'string_quartet'
  | 'sq_to_bb'
  | 'riff_generator'
  | 'other';

export type SlonimskyHarmonicVoiceOption = {
  id: string;
  label: string;
  /** No dedicated VRB bundle — UI warns; do not set {@link GenerateRequest.harmonicVoice}. */
  genericVoiceWarning?: boolean;
};

const VOICE_LABELS: Record<string, string> = {
  wayne_shorter: 'Wayne Shorter',
  bill_evans: 'Bill Evans',
  herbie_hancock: 'Herbie Hancock',
  larry_carlton: 'Larry Carlton',
  david_gilmour: 'David Gilmour',
  pat_metheny: 'Pat Metheny',
  thelonious_monk: 'Thelonious Monk',
  john_coltrane: 'John Coltrane',
  duke_ellington: 'Duke Ellington',
  debussy: 'Debussy',
  jobim: 'Antonio Carlos Jobim',
  nile_rodgers: 'Nile Rodgers',
  eddie_van_halen: 'Eddie Van Halen',
  hendrix: 'Jimi Hendrix',
  fripp: 'Robert Fripp',
  sonic_youth: 'Sonic Youth',
  wes_montgomery: 'Wes Montgomery',
  joe_pass: 'Joe Pass',
  allan_holdsworth: 'Allan Holdsworth',
  scott_henderson: 'Scott Henderson',
};

/** Engine {@link getVoiceRuleBundle} resolves to a non-neutral bundle. */
export function isConfirmedHarmonicVoiceBundle(id: string): boolean {
  const bundle = getVoiceRuleBundle(id);
  return bundle.voiceId !== 'neutral';
}

function option(id: string, genericVoiceWarning = false): SlonimskyHarmonicVoiceOption | null {
  if (!genericVoiceWarning && !isConfirmedHarmonicVoiceBundle(id)) return null;
  return {
    id,
    label: VOICE_LABELS[id] ?? id.replace(/_/g, ' '),
    ...(genericVoiceWarning ? { genericVoiceWarning: true } : {}),
  };
}

/** Curated roster — confirmed VRB bundles only (plus sonic_youth warning). */
const SONG_MODE_VOICE_IDS = [
  'wayne_shorter',
  'bill_evans',
  'herbie_hancock',
  'larry_carlton',
  'david_gilmour',
  'pat_metheny',
  'thelonious_monk',
  'john_coltrane',
  'duke_ellington',
  'debussy',
  'jobim',
] as const;

const GBD_VOICE_IDS = [
  'nile_rodgers',
  'eddie_van_halen',
  'larry_carlton',
  'david_gilmour',
  'hendrix',
  'fripp',
  'wes_montgomery',
  'joe_pass',
  'allan_holdsworth',
  'scott_henderson',
] as const;

/** GBD Slonimsky writer — planning stub only (no VRB / no harmony slice). */
export const SLONIMSKY_GBD_STUB_WRITER_IDS = [
  'wes_montgomery',
  'joe_pass',
  'allan_holdsworth',
  'scott_henderson',
] as const;

const SONIC_YOUTH_OPTION: SlonimskyHarmonicVoiceOption = {
  id: 'sonic_youth',
  label: VOICE_LABELS.sonic_youth,
  genericVoiceWarning: true,
};

/** Song Mode writer + Harmonic Voice — no dedicated VRB; UI warns only. */
export const SLONIMSKY_SONIC_YOUTH_GENERIC_VOICE_ID = 'sonic_youth' as const;

/** Song Mode Slonimsky writer — planning stub only (no harmony slice). */
export const SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = [] as const;

export function isSlonimskySongModeStubWriter(id: string): boolean {
  const t = id.trim().toLowerCase();
  return (SLONIMSKY_SONG_MODE_STUB_WRITER_IDS as readonly string[]).includes(t);
}

export function isSlonimskyGbdStubWriter(id: string): boolean {
  const t = id.trim().toLowerCase();
  return (SLONIMSKY_GBD_STUB_WRITER_IDS as readonly string[]).includes(t);
}

export function isSlonimskyGenericVoiceWarning(id: string): boolean {
  const t = id.trim().toLowerCase();
  return (
    t === SLONIMSKY_SONIC_YOUTH_GENERIC_VOICE_ID ||
    isSlonimskySongModeStubWriter(t) ||
    isSlonimskyGbdStubWriter(t)
  );
}

export function slonimskySongModeWriterWarningBody(id: string): string {
  if (isSlonimskySongModeStubWriter(id)) {
    return '⚠ stub voice — no dedicated Song Mode harmony slice; engine uses generic planning weights only.';
  }
  return SLONIMSKY_GENERIC_VOICE_WARNING_BODY;
}

export function slonimskyGbdWriterWarningBody(id: string): string {
  if (isSlonimskyGbdStubWriter(id)) {
    return '⚠ stub voice — no dedicated VRB bundle or GBD harmony slice; macro flavor only.';
  }
  if (id.trim().toLowerCase() === SLONIMSKY_SONIC_YOUTH_GENERIC_VOICE_ID) {
    return SLONIMSKY_GENERIC_VOICE_WARNING_BODY;
  }
  return '';
}

export const SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX = ' ⚠ generic voice';

export const SLONIMSKY_GENERIC_VOICE_WARNING_BODY =
  '⚠ generic voice — no dedicated VRB bundle; engine uses neutral harmonic voice.';

export function slonimskyHarmonicVoiceModeForPreset(presetId: string): SlonimskyHarmonicVoiceMode {
  if (presetId === 'song_mode') return 'song_mode';
  if (presetId === 'guitar_bass_duo' || presetId === 'guitar_bass_duo_single_line') return 'gbd';
  if (presetId === 'big_band') return 'big_band';
  if (presetId === 'string_quartet') return 'string_quartet';
  if (presetId === 'sq_to_bb') return 'sq_to_bb';
  if (presetId === 'riff_generator') return 'riff_generator';
  return 'other';
}

export function slonimskyHarmonicVoiceOptionsForMode(
  mode: SlonimskyHarmonicVoiceMode
): SlonimskyHarmonicVoiceOption[] {
  const ids =
    mode === 'gbd'
      ? GBD_VOICE_IDS
      : mode === 'song_mode' || mode === 'big_band' || mode === 'string_quartet' || mode === 'sq_to_bb'
        ? SONG_MODE_VOICE_IDS
        : mode === 'riff_generator'
          ? ([...GBD_VOICE_IDS, 'frank_zappa'] as const)
          : [];
  const out: SlonimskyHarmonicVoiceOption[] = [];
  for (const id of ids) {
    const o = option(id, mode === 'gbd' && isSlonimskyGbdStubWriter(id));
    if (o) out.push(o);
  }
  if (mode === 'song_mode' || mode === 'big_band' || mode === 'string_quartet') {
    out.push(SONIC_YOUTH_OPTION);
  }
  return out;
}
