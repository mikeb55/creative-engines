/**
 * Generate receipt UI — export integrity badge, mixed-preset, download XML helpers.
 */
import type { MixedPresetEcho } from '@composer-os/app-api/appApiTypes';
import {
  buildGenerateXmlDownloadName,
  buildMixedPresetBadgeView,
  hasDownloadableGenerateXml,
  resolveExportIntegrityBadge,
} from '../../../apps/composer-os-app/src/lib/generateReceiptUi';

function mixedEcho(overrides: Partial<MixedPresetEcho> = {}): MixedPresetEcho {
  return {
    applied: true,
    exportIntegrityPassed: true,
    totalParts: 21,
    sections: [
      { label: 'intro', startBar: 1, endBar: 8, presetRole: 'duo', partCount: 2 },
      { label: 'shout', startBar: 9, endBar: 16, presetRole: 'big_band', partCount: 15 },
    ],
    ...overrides,
  };
}

describe('generateReceiptUi', () => {
  test('A) exportIntegrityPassed=true → badge pass', () => {
    expect(
      resolveExportIntegrityBadge({
        loading: false,
        hasError: false,
        success: true,
        exportIntegrityPassed: true,
      }),
    ).toBe('pass');
  });

  test('B) exportIntegrityPassed=false → badge fail', () => {
    expect(
      resolveExportIntegrityBadge({
        loading: false,
        hasError: false,
        success: true,
        exportIntegrityPassed: false,
      }),
    ).toBe('fail');
  });

  test('C) no validation / idle → badge unknown, not fail', () => {
    expect(
      resolveExportIntegrityBadge({
        loading: false,
        hasError: false,
        success: undefined,
        exportIntegrityPassed: undefined,
      }),
    ).toBe('unknown');
  });

  test('D) general failure — error or success=false → badge unknown', () => {
    expect(
      resolveExportIntegrityBadge({
        loading: false,
        hasError: true,
        success: false,
        exportIntegrityPassed: false,
      }),
    ).toBe('unknown');
    expect(
      resolveExportIntegrityBadge({
        loading: false,
        hasError: false,
        success: false,
        exportIntegrityPassed: false,
      }),
    ).toBe('unknown');
  });

  test('E) mixedPresetEcho present → mixed-preset badge view', () => {
    const view = buildMixedPresetBadgeView(mixedEcho({ exportIntegrityPassed: false }));
    expect(view.headline).toContain('Mixed-preset: 2 sections');
    expect(view.headline).toContain('integrity fail');
    expect(view.rolesLine).toContain('duo');
    expect(view.rolesLine).toContain('big band');
    expect(view.integrityPass).toBe(false);
  });

  test('F) Download XML available when result.xml present on success', () => {
    expect(hasDownloadableGenerateXml({ success: true, xml: '<score-partwise/>' })).toBe(true);
    expect(hasDownloadableGenerateXml({ success: true, xml: '   ' })).toBe(false);
    expect(hasDownloadableGenerateXml({ success: false, xml: '<score-partwise/>' })).toBe(false);
    expect(hasDownloadableGenerateXml(null)).toBe(false);
  });

  test('G) buildGenerateXmlDownloadName uses output label + seed', () => {
    expect(buildGenerateXmlDownloadName({ outputLabel: 'My Chart', seed: 42 })).toBe('My_Chart_42.musicxml');
    expect(buildGenerateXmlDownloadName({ filename: 'run.musicxml' })).toBe('run.musicxml');
  });
});