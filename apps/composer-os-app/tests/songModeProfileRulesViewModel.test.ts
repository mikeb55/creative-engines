import { describe, expect, it } from 'vitest';
import { buildSongModeProfileRuleRows } from '../src/utils/songModeProfileRulesViewModel';

describe('buildSongModeProfileRuleRows', () => {
  it('builds readable rows from compact Song Mode profile/rule diagnostics', () => {
    const rows = buildSongModeProfileRuleRows({
      styleProfile: 'STYLE_SOPHISTICATED_POP',
      primarySongwriterStyleId: 'bacharach',
      secondarySongwriterStyleId: 'donald_fagen',
      authorOverlayId: 'jimmy_webb',
      styleFingerprint: 'bacharach|donald_fagen|jimmy_webb|-|0.62|0.58',
      resolvedRuleIds: ['bacharach.chromatic_mediant', 'found.hook_object'],
      songwriterCompProfileId: 'bacharach',
      bacharachSongModeRuleBundleId: 'bacharach_song_mode_rule_bundle_v1',
      behaviourSourceIds: ['bacharach', 'style_sophisticated_pop'],
    });

    expect(rows.profileRows.some((r) => r.label === 'Style profile' && r.value === 'STYLE_SOPHISTICATED_POP')).toBe(
      true
    );
    expect(rows.ruleSetRows.some((r) => r.label === 'Resolved rules' && r.value.includes('bacharach.chromatic_mediant'))).toBe(true);
    expect(rows.behaviourSourceRows.some((r) => r.value.includes('style_sophisticated_pop'))).toBe(true);
  });
});
