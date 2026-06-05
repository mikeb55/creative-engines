/**
 * Composer OS V2 — Big Band preset (Prompt 5/7 planning mode).
 * Planning via `runBigBandMode`; full big-band MusicXML generation is not implemented yet.
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';
import {
  getComposerGroup,
  getGroupDefaults,
} from '../core/groups/composerGroupEngine';
import type { ComposerGroupId, GroupParams } from '../core/groups/composerGroupDefinitions';

export interface BigBandPresetWithGroup extends Preset {
  groupMode: ComposerGroupId | null;
  groupDefaults: GroupParams | null;
}

export const bigBandPreset: Preset = {
  id: 'big_band',
  name: 'Big Band',
  /** Representative rhythm-section + bass identities for manifests and future voicing work. */
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'swing',
    intensity: 0.8,
    syncopationDensity: 'high',
  },
  bigBandMetadata: {
    ensembleFamily: 'big_band',
    leadSheetChordAware: true,
    rehearsalMarkReady: true,
    sectionPlanReady: true,
    defaultEra: 'post_bop',
    supportedEras: ['swing', 'bebop', 'post_bop', 'contemporary'],
    supportedComposerStyles: [
      'ellington',
      'strayhorn',
      'basie',
      'mingus',
      'charles_mingus',
      'thad',
      'thad_jones',
      'schneider',
      'wheeler',
      'quincy_jones',
      'sebesky',
      'gil_evans',
      'bob_brookmeyer',
      'clare_fischer',
      'oliver_nelson',
      'sammy_nestico',
      'wayne_shorter',
      'henry_threadgill',
      'threadgill',
      'garbarek',
      'jan_garbarek',
      'bill_holman',
      'holman',
      'carla_bley',
      'bley',
      'weber',
      'eberhard_weber',
      'ogerman',
      'claus_ogerman',
      'schifrin',
      'lalo_schifrin',
      'surman',
      'john_surman',
      'surman_folk_modal',
      'towner',
      'ralph_towner',
      'towner_guitar_polyphony',
      'verlaine',
      'tom_verlaine',
      'television',
      'verlaine_suspended_field',
      'tv',
      'allan_holdsworth',
      'holdsworth',
      'allan_holdsworth_scale_derived',
      'mandel',
      'johnny_mandel',
      'mandel_lyric_warmth',
      'barry',
      'john_barry',
      'barry_thematic_monolith',
    ],
  },
};

/** Big Band preset plus production-world group fields for a selected composer. */
export function resolveBigBandPresetForComposer(composerId: string): BigBandPresetWithGroup {
  const groupMode = getComposerGroup(composerId);
  return {
    ...bigBandPreset,
    groupMode,
    groupDefaults: groupMode ? getGroupDefaults(groupMode) : null,
  };
}
