/**
 * Coltrane + Messiaen pitch-field spine — Session 2 tests.
 */

import type { CompositionContext } from '../core/compositionContext';
import { ContrapuntalLineEngine } from '../core/counterpoint/ContrapuntalLineEngine';
import { USE_PITCH_FIELD_NOTE_SELECTION } from '../core/counterpoint/engineFeatureFlags';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { resolveBarSymbol } from '../core/harmony/harmonySpineProvider';
import {
  buildPitchFieldSpine,
  isUsingPitchFieldSubstrate,
  MESSIAEN_MODES,
  shouldUsePitchFieldSubstrate,
} from '../core/harmony/pitchFieldResolver';
import type { PitchFieldRegion } from '../core/harmony/pitchFieldSpineTypes';
import {
  COLTRANE_SQ_VRB_PROFILE,
  applyColtraneSqVrbProfile,
} from '../core/counterpoint/vrbProfiles/coltraneSqVrb';
import { COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS } from '../core/counterpoint/vrbProfiles/coltraneSqVrbFingerprints';
import {
  MESSIAEN_SQ_VRB_PROFILE,
  applyMessiaenSqVrbProfile,
} from '../core/counterpoint/vrbProfiles/messiaenSqVrb';
import { MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS } from '../core/counterpoint/vrbProfiles/messiaenSqVrbFingerprints';
import {
  SQ_VRB_PROFILE_REGISTRY_IDS,
  getSqVrbProfile,
} from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVrbFamily } from '../core/counterpoint/vrbProfiles/vrbFamilies';
import {
  MESSIAEN_MODE_OPTIONS,
  SQ_TO_BB_SQ_COMPOSER_OPTIONS,
} from '../ui/sqToBbWorkflowUi';

function minimalContext(
  totalBars: number,
  vrbId: string,
  extra?: Partial<CompositionContext>,
): CompositionContext {
  const chord = 'Cmaj7';
  return {
    seed: 88031,
    form: { totalBars, sections: [] },
    voiceBundle: getVoiceRuleBundle(vrbId),
    generationMetadata: { sqLineVrbId: vrbId },
    chordSymbolPlan: {
      totalBars,
      segments: [{ chord, startBar: 1, bars: totalBars }],
    },
    ...extra,
  } as unknown as CompositionContext;
}

function chordTonePcs(symbol: string): Set<number> {
  const row = resolveBarSymbol(
    {
      ...minimalContext(4, 'gershwin'),
      chordSymbolPlan: {
        totalBars: 4,
        segments: [{ chord: symbol, startBar: 1, bars: 4 }],
      },
    } as CompositionContext,
    1,
  );
  void row;
  const hp = symbol.match(/^([A-G](?:#|b)?)/i)?.[1] ?? 'C';
  const roots: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const rpc = roots[hp.charAt(0).toUpperCase()] ?? 0;
  return new Set([rpc, (rpc + 4) % 12, (rpc + 7) % 12, (rpc + 10) % 12]);
}

function notePcsFromLines(vrbId: string, ctx: CompositionContext): number[] {
  const engine = new ContrapuntalLineEngine(vrbId, ctx);
  const lines = engine.generateLines(8, 'chords_only');
  const pcs: number[] = [];
  for (const v of lines.voices) {
    for (const n of v.notes) {
      pcs.push(((n.pitchMidi % 12) + 12) % 12);
    }
  }
  return pcs;
}

function testSongGuardOrnetteSong(): boolean {
  return !shouldUsePitchFieldSubstrate(getVoiceRuleBundle('ornette_coleman'), 'song');
}

function testSongGuardOrnetteInstrumental(): boolean {
  return shouldUsePitchFieldSubstrate(getVoiceRuleBundle('ornette_coleman'), 'instrumental');
}

function testSongGuardGershwinSong(): boolean {
  return !shouldUsePitchFieldSubstrate(getVoiceRuleBundle('gershwin'), 'song');
}

function testSongGuardColtraneSong(): boolean {
  return !shouldUsePitchFieldSubstrate(getVoiceRuleBundle('coltrane'), 'song');
}

function testSongGuardMessiaenInstrumental(): boolean {
  return shouldUsePitchFieldSubstrate(getVoiceRuleBundle('messiaen'), 'instrumental');
}

function testOrnetteNotesFromPitchField(): boolean {
  if (!USE_PITCH_FIELD_NOTE_SELECTION) return true;
  const ctx = minimalContext(8, 'ornette_coleman', { sectionLabelMode: 'instrumental' });
  const spine = buildPitchFieldSpine('ornette_coleman', 8, ctx);
  const allowed = new Set<number>();
  for (let b = 1; b <= 8; b++) {
    const row = resolveBarSymbol(ctx, b, 'melody');
    for (const e of row.pitchField?.allowedPcs ?? []) allowed.add(e.pc);
  }
  const used = notePcsFromLines('ornette_coleman', ctx);
  if (allowed.size < 4) return false;
  const chordOnly = chordTonePcs('Cmaj7');
  const allChordTones = used.length > 0 && used.every((pc) => chordOnly.has(pc));
  return used.every((pc) => allowed.has(pc)) && !allChordTones;
}

function testGershwinChordSpineUnchanged(): boolean {
  if (!USE_PITCH_FIELD_NOTE_SELECTION) return true;
  const ctx = minimalContext(8, 'gershwin', { sectionLabelMode: 'instrumental' });
  const used = notePcsFromLines('gershwin', ctx);
  const chordOnly = chordTonePcs('Cmaj7');
  return used.length > 0 && used.every((pc) => chordOnly.has(pc));
}

function testColtraneSigma(): boolean {
  return getSqVrbProfile('coltrane')?.gceScorerAdjustments.registerCohesionStdevCeilingSt === 31;
}

function testColtraneSubstrate(): boolean {
  return COLTRANE_SQ_VRB_PROFILE.harmonicSubstrate === 'pitch-field-spine';
}

function testColtraneRegistry(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.includes('coltrane');
}

function testColtraneOverlap(): boolean {
  return COLTRANE_SQ_VRB_PROFILE.pitchFieldOptions?.defaultOverlapPolicy === 'shared-parent';
}

function testColtraneMelodyOverlay(): boolean {
  const spine = buildPitchFieldSpine('coltrane', 8, minimalContext(8, 'coltrane'));
  const mel = spine.regions[0]?.voiceOverlays.find((v) => v.voiceId === 'melody');
  return (mel?.overlapWithParent ?? 0) >= 0.75;
}

function testColtraneM2Weight(): boolean {
  const w = COLTRANE_SQ_VRB_PROFILE.contrapuntalLinePolicy;
  void w;
  const pool = COLTRANE_SQ_VRB_PROFILE;
  void pool;
  const interval = (COLTRANE_SQ_VRB_PROFILE as unknown as { intervalPool?: { semitones: number; weight: number }[] })
    .intervalPool;
  void interval;
  const fromProfile = getSqVrbProfile('coltrane');
  const spine = buildPitchFieldSpine('coltrane', 8, minimalContext(8, 'coltrane'));
  const m2 = spine.regions[0]?.intervalPool.find((i) => i.semitones === 1);
  return (m2?.weight ?? 0) >= 0.9;
}

function testColtraneSuppressFunctional(): boolean {
  return getVoiceRuleBundle('coltrane').suppressFunctionalResolution === true;
}

function testColtraneBestBb(): boolean {
  return COLTRANE_SQ_VRB_PROFILE.bestBbStyle === 'mingus';
}

function testColtraneFingerprints(): boolean {
  return COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS.length >= 30;
}

function testWorkLoveSupreme(): boolean {
  return COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_A_LOVE_SUPREME'));
}

function testWorkAscension(): boolean {
  return COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_ASCENSION'));
}

function testDiffOrnette(): boolean {
  return COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_ORNETTE'));
}

function testColtraneFamily(): boolean {
  return getVrbFamily('coltrane') === 'modal_contemporary';
}

function testCellGeneratorType(): boolean {
  const sample: PitchFieldRegion = {
    id: 't',
    startBar: 1,
    endBar: 4,
    parentPcSet: [0, 4, 7],
    intervalPool: [{ semitones: 2, weight: 1 }],
    voiceOverlays: [{ voiceId: 'melody', overlapWithParent: 0.8 }],
    cellGenerator: 'trichord',
  };
  return sample.cellGenerator === 'trichord';
}

function testMessiaenSigma(): boolean {
  return getSqVrbProfile('messiaen')?.gceScorerAdjustments.registerCohesionStdevCeilingSt === 22;
}

function testMessiaenSubstrate(): boolean {
  return MESSIAEN_SQ_VRB_PROFILE.harmonicSubstrate === 'pitch-field-spine';
}

function testMessiaenRegistry(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.includes('messiaen');
}

function testMessiaenMode2(): boolean {
  return (
    MESSIAEN_MODES[2].length === 8 &&
    MESSIAEN_MODES[2].join(',') === [0, 1, 3, 4, 6, 7, 9, 10].join(',')
  );
}

function testMessiaenMode1(): boolean {
  return MESSIAEN_MODES[1].join(',') === [0, 2, 4, 6, 8, 10].join(',');
}

function testMessiaenSpineMode2(): boolean {
  const ctx = minimalContext(8, 'messiaen', { messiaenModeId: 2 });
  const spine = buildPitchFieldSpine('messiaen', 8, ctx);
  const pcs = spine.regions[0]?.parentPcSet ?? [];
  return pcs.join(',') === MESSIAEN_MODES[2].join(',');
}

function testMessiaenSpineMode1(): boolean {
  const ctx = minimalContext(8, 'messiaen', { messiaenModeId: 1 });
  const spine = buildPitchFieldSpine('messiaen', 8, ctx);
  return spine.regions[0]?.parentPcSet.join(',') === MESSIAEN_MODES[1].join(',');
}

function testMessiaenMutationRange(): boolean {
  const ctx = minimalContext(24, 'messiaen');
  const spine = buildPitchFieldSpine('messiaen', 24, ctx);
  const transitions = spine.regions.map((r) => r.transitionOut).filter(Boolean);
  return transitions.every((t) => {
    const m = t!.mutationStrength;
    return m >= 0.2 && m <= 0.45;
  });
}

function testMessiaenSuppressFunctional(): boolean {
  return getVoiceRuleBundle('messiaen').suppressFunctionalResolution === true;
}

function testMessiaenBestBb(): boolean {
  return MESSIAEN_SQ_VRB_PROFILE.bestBbStyle === 'schneider';
}

function testMessiaenFingerprints(): boolean {
  return MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS.length >= 30;
}

function testWorkQuartet(): boolean {
  return MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_QUARTET_END_OF_TIME'));
}

function testDiffPart(): boolean {
  return MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_PART'));
}

function testRegistry22(): boolean {
  return SQ_VRB_PROFILE_REGISTRY_IDS.length === 22;
}

function testMessiaenModeOptions7(): boolean {
  return MESSIAEN_MODE_OPTIONS.length === 7;
}

function testMessiaenMode2Label(): boolean {
  return MESSIAEN_MODE_OPTIONS[1]?.label === 'M2 · Shadowed (Octatonic)';
}

function testMessiaenInUi(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_OPTIONS.some((o) => o.id === 'messiaen');
}

function testColtraneInUi(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_OPTIONS.some((o) => o.id === 'coltrane');
}

function testMessiaenFamily(): boolean {
  return getVrbFamily('messiaen') === 'modal_contemporary';
}

function testApplyColtraneProfile(): boolean {
  const stub = getVoiceRuleBundle('coltrane');
  const applied = applyColtraneSqVrbProfile({ ...stub, sqVrbProfileId: undefined });
  return applied.sqVrbProfileId === 'coltrane' && applied.pitchFieldGoverned === true;
}

function testApplyMessiaenProfile(): boolean {
  const stub = getVoiceRuleBundle('messiaen');
  const applied = applyMessiaenSqVrbProfile({ ...stub, sqVrbProfileId: undefined });
  return applied.sqVrbProfileId === 'messiaen' && applied.pitchFieldGoverned === true;
}

function testMessiaenSubstrateFlag(): boolean {
  return isUsingPitchFieldSubstrate(getVoiceRuleBundle('messiaen'));
}

export function runColtraneMessiaenPitchFieldTests(): boolean {
  const cases: [string, () => boolean][] = [
    ['shouldUsePitchFieldSubstrate(ORNETTE,song)→false', testSongGuardOrnetteSong],
    ['shouldUsePitchFieldSubstrate(ORNETTE,instrumental)→true', testSongGuardOrnetteInstrumental],
    ['shouldUsePitchFieldSubstrate(GERSHWIN,song)→false', testSongGuardGershwinSong],
    ['shouldUsePitchFieldSubstrate(COLTRANE,song)→false', testSongGuardColtraneSong],
    ['shouldUsePitchFieldSubstrate(MESSIAEN,instrumental)→true', testSongGuardMessiaenInstrumental],
    ['Ornette notes from pitchField pool', testOrnetteNotesFromPitchField],
    ['Gershwin root+3+5+7 path unchanged', testGershwinChordSpineUnchanged],
    ['coltrane σ === 31', testColtraneSigma],
    ['coltrane harmonicSubstrate pitch-field-spine', testColtraneSubstrate],
    ['coltrane in registry', testColtraneRegistry],
    ['coltrane defaultOverlapPolicy shared-parent', testColtraneOverlap],
    ['coltrane melody overlay >= 0.75', testColtraneMelodyOverlay],
    ['coltrane intervalPool m2 >= 0.90', testColtraneM2Weight],
    ['coltrane suppressFunctionalResolution', testColtraneSuppressFunctional],
    ['coltrane bestBbStyle mingus', testColtraneBestBb],
    ['coltrane fingerprints >= 30', testColtraneFingerprints],
    ['WORK_A_LOVE_SUPREME receipt', testWorkLoveSupreme],
    ['WORK_ASCENSION receipt', testWorkAscension],
    ['DIFF_VS_ORNETTE receipt', testDiffOrnette],
    ['getVrbFamily(coltrane) modal_contemporary', testColtraneFamily],
    ['PitchFieldRegion cellGenerator field', testCellGeneratorType],
    ['messiaen σ === 22', testMessiaenSigma],
    ['messiaen harmonicSubstrate', testMessiaenSubstrate],
    ['messiaen in registry', testMessiaenRegistry],
    ['MESSIAEN_MODES[2] octatonic', testMessiaenMode2],
    ['MESSIAEN_MODES[1] whole tone', testMessiaenMode1],
    ['buildPitchFieldSpine messiaen mode 2', testMessiaenSpineMode2],
    ['buildPitchFieldSpine messiaen mode 1', testMessiaenSpineMode1],
    ['messiaen mutationStrength 0.20–0.45', testMessiaenMutationRange],
    ['messiaen suppressFunctionalResolution', testMessiaenSuppressFunctional],
    ['messiaen bestBbStyle schneider', testMessiaenBestBb],
    ['messiaen fingerprints >= 30', testMessiaenFingerprints],
    ['WORK_QUARTET_END_OF_TIME receipt', testWorkQuartet],
    ['DIFF_VS_PART receipt', testDiffPart],
    ['registry total === 22', testRegistry22],
    ['MESSIAEN_MODE_OPTIONS.length === 7', testMessiaenModeOptions7],
    ['MESSIAEN_MODE_OPTIONS[1] M2 label', testMessiaenMode2Label],
    ['messiaen in UI picker', testMessiaenInUi],
    ['coltrane in UI picker', testColtraneInUi],
    ['getVrbFamily(messiaen) modal_contemporary', testMessiaenFamily],
    ['applyColtraneSqVrbProfile', testApplyColtraneProfile],
    ['applyMessiaenSqVrbProfile', testApplyMessiaenProfile],
    ['isUsingPitchFieldSubstrate(messiaen)', testMessiaenSubstrateFlag],
  ];
  let ok = true;
  for (const [name, fn] of cases) {
    if (!fn()) {
      console.error(`[coltraneMessiaenPitchField] FAIL: ${name}`);
      ok = false;
    }
  }
  return ok;
}
