/**
 * Static Wyble role maps — shape + known part ids (no generation behaviour).
 */

import { BB_PART_RHYTHM } from '../core/big-band/buildBigBandOrchestrationPlan';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VC } from '../core/string-quartet/stringQuartetTypes';
import {
  WYBLE_ROLE_MAP_BIG_BAND,
  WYBLE_ROLE_MAP_DUO_FAMILY,
  WYBLE_ROLE_MAP_STRING_QUARTET,
} from '../core/wyble/ensembleWybleRoleMaps';
import type { EnsembleWybleRoleMap, WybleVoiceRole } from '../core/wyble/wybleVoiceLayoutTypes';
import { WYBLE_VOICE_ROLES } from '../core/wyble/wybleVoiceLayoutTypes';

const DUO_EXPECTED: Record<WybleVoiceRole, { partId: string; voice?: number }> = {
  lead_line: { partId: 'guitar', voice: 1 },
  inner_counter: { partId: 'guitar', voice: 2 },
  bass_anchor: { partId: 'bass' },
};

const SQ_EXPECTED_PART_IDS = new Set<string>([SQ_PART_V1, SQ_PART_V2, SQ_PART_VC]);

const BB_EXPECTED_PART_IDS = new Set<string>(['bb_alto_sax', 'bb_tenor_sax', BB_PART_RHYTHM]);

function assertThreeRoles(map: EnsembleWybleRoleMap): void {
  const keys = Object.keys(map) as WybleVoiceRole[];
  expect(keys.sort()).toEqual([...WYBLE_VOICE_ROLES].sort());
  for (const role of WYBLE_VOICE_ROLES) {
    const t = map[role];
    expect(t).toBeDefined();
    expect(typeof t.partId).toBe('string');
    expect(t.partId.length).toBeGreaterThan(0);
  }
}

describe('Wyble ensemble role maps', () => {
  it('duo family map has three roles, non-empty partIds, and expected guitar/bass targets', () => {
    assertThreeRoles(WYBLE_ROLE_MAP_DUO_FAMILY);
    for (const role of WYBLE_VOICE_ROLES) {
      const t = WYBLE_ROLE_MAP_DUO_FAMILY[role];
      const e = DUO_EXPECTED[role];
      expect(t.partId).toBe(e.partId);
      expect(t.voice).toBe(e.voice);
    }
  });

  it('string quartet map uses known SQ_PART_* ids', () => {
    assertThreeRoles(WYBLE_ROLE_MAP_STRING_QUARTET);
    for (const role of WYBLE_VOICE_ROLES) {
      expect(SQ_EXPECTED_PART_IDS.has(WYBLE_ROLE_MAP_STRING_QUARTET[role].partId)).toBe(true);
    }
  });

  it('big band map uses known front-line + bass staff ids', () => {
    assertThreeRoles(WYBLE_ROLE_MAP_BIG_BAND);
    for (const role of WYBLE_VOICE_ROLES) {
      expect(BB_EXPECTED_PART_IDS.has(WYBLE_ROLE_MAP_BIG_BAND[role].partId)).toBe(true);
    }
  });
});
