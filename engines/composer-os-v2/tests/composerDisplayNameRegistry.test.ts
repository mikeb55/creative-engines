import {
  resolveComposerDisplayName,
  snakeCaseIdToDisplayName,
} from '../app-api/composerDisplayNameRegistry';
import { resolveSongModeStudyTitle } from '../app-api/scoreTitleDefaults';

describe('composer display names + Song Mode study titles', () => {
  it('resolves shipped composers from composerCoverageManifest.json', () => {
    expect(resolveComposerDisplayName('sonic_youth')).toBe('Sonic Youth');
    expect(resolveComposerDisplayName('joni_mitchell')).toBe('Joni Mitchell');
    expect(resolveComposerDisplayName('bacharach')).toBe('Bacharach');
    expect(resolveComposerDisplayName('frank_zappa')).toBe('Frank Zappa');
  });

  it('resolves aliases via normalizeSongwriterStyleKey', () => {
    expect(resolveComposerDisplayName('zappa')).toBe('Frank Zappa');
  });

  it('falls back to title-cased id when manifest has no row', () => {
    expect(snakeCaseIdToDisplayName('some_new_writer')).toBe('Some New Writer');
    expect(resolveComposerDisplayName('some_new_writer')).toBe('Some New Writer');
  });

  it('formats Song Mode study titles', () => {
    expect(resolveSongModeStudyTitle('sonic_youth', 676545)).toBe('Sonic Youth Study 676545');
    expect(resolveSongModeStudyTitle('joni_mitchell', 123456)).toBe('Joni Mitchell Study 123456');
    expect(resolveSongModeStudyTitle('bacharach', 877236)).toBe('Bacharach Study 877236');
    expect(resolveSongModeStudyTitle('frank_zappa', 728647)).toBe('Frank Zappa Study 728647');
    expect(resolveSongModeStudyTitle(undefined, 1)).toBe('Song Mode Study 1');
  });
});
