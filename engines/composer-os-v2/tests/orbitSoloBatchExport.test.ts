/**
 * Orbit four-engine solo batch — unit tests (V107p4).
 */

import { loopHarmonyBarsToLength, exportSoloMusicContextToMusicXml, validateMusicXmlHarmonyRoots, sanitizeMusicXmlHarmonyRoots } from '../core/solo/soloMusicContextExport';
import { buildMusicContextFromTritonic, realiseTritonicSolo } from '../core/tritonic/tritonicRealisation';
import { buildMusicContextFromVault, realiseVaultSolo } from '../core/vault/vaultRealisation';
import { realiseZappaSoloFromBehaviour } from '../core/zappa-solo/zappaSoloRealisation';

const ORBIT_28 = [
  'Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'Abmaj7', 'Gbmaj7',
  'Ebmaj7', 'Fmaj7', 'Ebmaj7', 'Dbmaj7', 'Bmaj7', 'Bbm9', 'NC',
  'Gbmaj7', 'Emaj7', 'G', 'G', 'Eb', 'Eb', 'G', 'G', 'G',
  'Dbmaj7', 'Bb7', 'Fmaj7', 'NC', 'NC',
];

describe('loopHarmonyBarsToLength', () => {
  it('loops short sequences to target bar count', () => {
    const out = loopHarmonyBarsToLength(['Am7', 'D7'], 5);
    expect(out).toEqual(['Am7', 'D7', 'Am7', 'D7', 'Am7']);
  });

  it('preserves exact 28-bar Orbit sequence', () => {
    expect(loopHarmonyBarsToLength(ORBIT_28, 28)).toEqual(ORBIT_28);
  });
});

describe('Orbit solo engines', () => {
  it('buildMusicContextFromTritonic — vault-anchored float, 28 bars', () => {
    const ctx = buildMusicContextFromTritonic({
      harmonyBars: ORBIT_28,
      totalBars: 28,
      bpm: 90,
      floatingCells: true,
      behaviourBiases: { resolutionDelay: 0.65, motifSingability: 0.85 },
    });
    expect(ctx.totalBars).toBe(28);
    expect(ctx.harmony.bars.length).toBe(28);
    expect(ctx.receipts.some((r) => r.kind === 'tritonic_vault_realisation_complete')).toBe(true);
  });

  it('tritonic solo export passes integrity', () => {
    const { musicContext, soloNotes } = realiseTritonicSolo({
      harmonyBars: ORBIT_28,
      totalBars: 28,
      bpm: 90,
    });
    const ex = exportSoloMusicContextToMusicXml(musicContext, soloNotes, { title: 'Tritonic test' });
    expect(ex.exportIntegrityPassed).toBe(true);
    expect(ex.measureCount).toBe(28);
    expect(ex.noteCount).toBeGreaterThan(28);
    expect(soloNotes.length).toBeGreaterThanOrEqual(28 * 3);
    const byBar = new Map<number, number>();
    for (const n of soloNotes) {
      byBar.set(n.barIndex, (byBar.get(n.barIndex) ?? 0) + 1);
    }
    expect(byBar.size).toBe(28);
    for (let b = 1; b <= 28; b++) {
      expect(byBar.get(b) ?? 0).toBeGreaterThanOrEqual(3);
      expect(byBar.get(b) ?? 0).toBeLessThanOrEqual(5);
    }
    const receipt = musicContext.receipts.find((r) => r.kind === 'tritonic_vault_realisation_complete');
    const payload = receipt?.payload as Record<string, unknown>;
    expect(payload.noteDensityPerBar).toEqual({ min: 3, targetLow: 3, targetHigh: 5 });
    expect(payload.expandedSoloNoteCount).toBe(soloNotes.length);
  });

  it('buildMusicContextFromVault — triad pairs, locked harmony', () => {
    const ctx = buildMusicContextFromVault({
      harmonyBars: ORBIT_28,
      totalBars: 28,
      triadPairsMode: true,
      upperStructureContrast: 'high',
      reharmonisationAppetite: 'low',
    });
    expect(ctx.harmony.source).toBe('locked');
    expect(ctx.receipts.some((r) => r.kind === 'vault_realisation_complete')).toBe(true);
  });

  it('vault triad-pair solo export passes integrity', () => {
    const { musicContext, soloNotes } = realiseVaultSolo({
      harmonyBars: ORBIT_28,
      totalBars: 28,
      triadPairsMode: true,
      reharmonisationAppetite: 'low',
    });
    const ex = exportSoloMusicContextToMusicXml(musicContext, soloNotes, { title: 'Vault test' });
    expect(ex.exportIntegrityPassed).toBe(true);
    expect(ex.measureCount).toBe(28);
  });

  it('zappa solo realisation carries receipt metrics', () => {
    const { musicContext, soloLine, soloNotes } = realiseZappaSoloFromBehaviour({
      harmonyBars: ORBIT_28,
      totalBars: 28,
      seed: 28001,
      dramaticArc: true,
      closureRefusalScore: 0.5,
      rhythmicElasticityScore: 0.8,
      modalAnchorRatio: 0.65,
    });
    const receipt = musicContext.receipts.find((r) => r.kind === 'zappa_solo_realisation_complete');
    expect(receipt).toBeDefined();
    expect(soloLine.allNotes.filter((n) => !n.isRest).length).toBeGreaterThan(0);
    const payload = receipt?.payload as Record<string, number>;
    expect(typeof payload.modalAnchorRatio).toBe('number');
    expect(typeof payload.closureRefusalScore).toBe('number');
    for (const n of soloNotes) {
      expect(n.pitch).toBeGreaterThanOrEqual(62);
      expect(n.pitch).toBeLessThanOrEqual(86);
    }
  });

  it('MusicXML harmony root-step sanitizer fixes multi-char accidentals', () => {
    const bad = `<harmony><root><root-step>Db</root-step></root></harmony>`;
    const fixed = sanitizeMusicXmlHarmonyRoots(bad);
    expect(validateMusicXmlHarmonyRoots(fixed)).toEqual([]);
    expect(fixed).toContain('<root-step>D</root-step>');
    expect(fixed).toContain('<root-alter>-1</root-alter>');
  });
});
