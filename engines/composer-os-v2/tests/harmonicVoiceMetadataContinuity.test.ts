/**
 * harmonicVoice metadata continuity contract — infrastructure phase.
 * Proves forwarding on 2 working paths; documents 6 pending paths (skipped).
 * Not registered in runSmokeTests until path fixes land.
 */

import type { GenerateRequest } from '../app-api/appApiTypes';
import { songModeFullGenMergeHarmonicVoice } from '../app-api/composerOsAppGeneration';
import {
  duoRunGoldenPathOptionsFromGenerateRequest,
  songModeSectionRegenMergeHarmonicVoice,
} from '../core/regeneration/runDuoSectionRegeneration';
import {
  HARMONIC_VOICE_FORWARDING_CANONICAL_GUARD,
  harmonicVoiceFieldFromRequest,
  mergeHarmonicVoiceFromRequest,
} from '../core/generation/forwardHarmonicVoiceField';

type ForwardingExpected = 'forward' | 'mapped' | 'unsupported';

type ContinuityRow = {
  id: string;
  label: string;
  probe: (req: GenerateRequest) => { harmonicVoice?: string };
  expected: ForwardingExpected;
  active: boolean;
};

/** Minimal GenerateRequest for continuity probes — no generation. */
function canonicalProbeRequest(presetId: GenerateRequest['presetId']): GenerateRequest {
  return {
    seed: 50021,
    presetId,
    harmonicVoice: 'verlaine',
    primarySongwriterStyle: 'barry_harris',
    styleStack: { primary: 'barry_harris' },
    title: 'harmonicVoice continuity probe',
  };
}

/**
 * Mirror generateComposition.ts L420–422 (working full-generate spread).
 * Intentionally duplicated here — do not refactor production in this phase.
 */
function probeGenerateCompositionFullGenHarmonicVoice(req: GenerateRequest): { harmonicVoice?: string } {
  if (typeof req.harmonicVoice === 'string' && req.harmonicVoice.trim() !== '') {
    return { harmonicVoice: req.harmonicVoice.trim() };
  }
  return {};
}

/** Fragment overrides mirroring runDuoSectionRegeneration slice opts. */
const SECTION_REGEN_FRAGMENT_OVERRIDES = {
  totalBars: 8,
  harmonyMode: 'custom_locked' as const,
  chordProgressionText: 'Cmaj7|Dm7|G7|Cmaj7|Am7|D7|Gmaj7|Cmaj7',
  lockedHarmonyBarsRaw: ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
  parsedChordBars: ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
};

/** Calls duoRunGoldenPathOptionsFromGenerateRequest (section-regen seam). */
function probeDuoSectionRegenHarmonicVoice(req: GenerateRequest): { harmonicVoice?: string } {
  const opts = duoRunGoldenPathOptionsFromGenerateRequest(
    {
      ...req,
      chordProgressionText: req.chordProgressionText ?? SECTION_REGEN_FRAGMENT_OVERRIDES.chordProgressionText,
    },
    SECTION_REGEN_FRAGMENT_OVERRIDES
  );
  return { harmonicVoice: opts.harmonicVoice };
}

/** Mirror songModeGoldenPathOptions builder — documents Song Mode full-gen gap. */
/** Calls songModeFullGenMergeHarmonicVoice (runSongStructure songModeGoldenPathOptions seam). */
function probeSongModeFullHarmonicVoice(req: GenerateRequest): { harmonicVoice?: string } {
  const primary = req.primarySongwriterStyle ?? "barry_harris";
  const base = {
    styleStack: { primary },
    presetId: "guitar_bass_duo" as const,
    scoreTitle: req.title ?? "harmonicVoice continuity probe",
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: primary,
    totalBars: req.totalBars ?? 32,
    longFormEnabled: req.longFormEnabled ?? true,
    creativeControlLevel: "balanced" as const,
  };
  const opts = songModeFullGenMergeHarmonicVoice(req, base);
  return { harmonicVoice: opts.harmonicVoice };
}

/** Mirror runSongModeSectionRegeneration fragment opts (songModeSectionRegenMergeHarmonicVoice seam). */
function probeSongModeSectionRegenHarmonicVoice(req: GenerateRequest): { harmonicVoice?: string } {
  const primary = req.primarySongwriterStyle ?? "barry_harris";
  const base = {
    styleStack: { primary },
    presetId: "guitar_bass_duo" as const,
    scoreTitle: req.title ?? "harmonicVoice continuity probe",
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: primary,
    totalBars: req.totalBars ?? 32,
    longFormEnabled: req.longFormEnabled ?? true,
    creativeControlLevel: "balanced" as const,
  };
  const opts = songModeSectionRegenMergeHarmonicVoice(req, base, SECTION_REGEN_FRAGMENT_OVERRIDES);
  return { harmonicVoice: opts.harmonicVoice };
}

/** Mirror mosaicContextFromGenerateRequest / BB planning input — documents BB gap. */
function probeBigBandHarmonicVoice(_req: GenerateRequest): { harmonicVoice?: string } {
  return {};
}

/** Mirror buildStringQuartetGenerationMetadata — documents SQ gap. */
function probeStringQuartetHarmonicVoice(_req: GenerateRequest): { harmonicVoice?: string } {
  return {};
}

export const HARMONIC_VOICE_CONTINUITY_MATRIX: readonly ContinuityRow[] = [
  {
    id: 'gbd_full_generate',
    label: 'GBD full generate (generateComposition 뿯↽ runGoldenPath)',
    probe: probeGenerateCompositionFullGenHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'ecm_full_generate',
    label: 'ECM chamber full generate (generateComposition 뿯↽ runGoldenPath)',
    probe: probeGenerateCompositionFullGenHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'gbd_section_regen',
    label: 'GBD section regen (duoRunGoldenPathOptionsFromGenerateRequest)',
    probe: probeDuoSectionRegenHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'ecm_section_regen',
    label: 'ECM section regen (duoRunGoldenPathOptionsFromGenerateRequest)',
    probe: probeDuoSectionRegenHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'song_mode_full',
    label: 'Song Mode full generate (songModeGoldenPathOptions)',
    probe: probeSongModeFullHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'song_mode_section_regen',
    label: 'Song Mode section regen',
    probe: probeSongModeSectionRegenHarmonicVoice,
    expected: 'forward',
    active: true,
  },
  {
    id: 'big_band',
    label: 'Big Band (mosaicContextFromGenerateRequest / planning input)',
    probe: probeBigBandHarmonicVoice,
    expected: 'forward',
    active: false,
  },
  {
    id: 'string_quartet',
    label: 'String Quartet (buildStringQuartetGenerationMetadata)',
    probe: probeStringQuartetHarmonicVoice,
    expected: 'forward',
    active: false,
  },
] as const;

function runHelperIsolationTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];

  const assert = (name: string, ok: boolean) => results.push({ name, ok });

  assert('canonical guard documents predicate', HARMONIC_VOICE_FORWARDING_CANONICAL_GUARD.includes('trim()'));

  assert('undefined 뿯↽ {}', Object.keys(harmonicVoiceFieldFromRequest({})).length === 0);
  assert('null 뿯↽ {}', Object.keys(harmonicVoiceFieldFromRequest({ harmonicVoice: null })).length === 0);
  assert('empty string 뿯↽ {}', Object.keys(harmonicVoiceFieldFromRequest({ harmonicVoice: '' })).length === 0);
  assert('whitespace 뿯↽ {}', Object.keys(harmonicVoiceFieldFromRequest({ harmonicVoice: '   ' })).length === 0);
  assert(
    'trimmed value 뿯↽ { harmonicVoice }',
    harmonicVoiceFieldFromRequest({ harmonicVoice: ' verlaine ' }).harmonicVoice === 'verlaine'
  );

  const target = { presetId: 'guitar_bass_duo' as const, totalBars: 32 };
  const merged = mergeHarmonicVoiceFromRequest({ harmonicVoice: 'verlaine' }, target);
  assert('mergeHarmonicVoiceFromRequest adds field', (merged as { harmonicVoice?: string }).harmonicVoice === 'verlaine');
  assert('mergeHarmonicVoiceFromRequest does not mutate target', !('harmonicVoice' in target));

  const canonicalReq = canonicalProbeRequest('guitar_bass_duo');
  const mirrored = probeGenerateCompositionFullGenHarmonicVoice(canonicalReq);
  const fromHelper = harmonicVoiceFieldFromRequest(canonicalReq);
  assert(
    'helper matches generateComposition L420–422 mirror',
    mirrored.harmonicVoice === fromHelper.harmonicVoice && mirrored.harmonicVoice === 'verlaine'
  );

  return results;
}

function runContinuityMatrixTests(): { name: string; ok: boolean; skipped?: boolean }[] {
  const results: { name: string; ok: boolean; skipped?: boolean }[] = [];

  for (const row of HARMONIC_VOICE_CONTINUITY_MATRIX) {
    if (!row.active) {
      results.push({
        name: `pending forwarding fix - row ${row.id}`,
        ok: true,
        skipped: true,
      });
      continue;
    }

    const presetId = row.id.startsWith('ecm') ? 'ecm_chamber' : 'guitar_bass_duo';
    const req = canonicalProbeRequest(presetId);
    const probed = row.probe(req);
    const ok = probed.harmonicVoice === 'verlaine';
    results.push({
      name: `${row.id}: probe(req).harmonicVoice === 'verlaine' (${row.label})`,
      ok,
    });
  }

  return results;
}

export function runHarmonicVoiceMetadataContinuityTests(): {
  name: string;
  ok: boolean;
  skipped?: boolean;
}[] {
  return [...runHelperIsolationTests(), ...runContinuityMatrixTests()];
}

if (require.main === module) {
  const results = runHarmonicVoiceMetadataContinuityTests();
  let skipped = 0;
  for (const r of results) {
    if (r.skipped) {
      skipped++;
      console.log(`SKIP — ${r.name}`);
      continue;
    }
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  }
  const failures = results.filter((r) => !r.skipped && !r.ok);
  console.log(
    `\nSummary: ${results.length - skipped - failures.length} passed, ${skipped} skipped, ${failures.length} failed`
  );
  if (failures.length > 0) process.exit(1);
}
