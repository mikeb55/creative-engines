/**
 * V1.5p9 — Tritonic monitor panel adapters.
 */

import { buildMusicContextFromHarmonyBars } from './harmonyBarsMusicContextShell';
import { buildMusicContextFromTritonicMelody } from '../tritonic/tritonicMelody';
import { buildTritonicDictionary } from '../tritonic/tritonicCell';
import {
  buildTritonicMonitorViewFromMusicContext,
  resolveTritonicMonitorEngineId,
  shouldShowTritonicMonitor,
} from './tritonicMonitorPanels';

function tritonicMelodyCtx() {
  const dict = buildTritonicDictionary();
  return buildMusicContextFromTritonicMelody(
    {
      mode: 'ecm',
      cells: dict.cells,
      behaviourOptions: { oddityScore: 0.35, delayedResolution: true, melodyPriority: false },
    },
    0,
  );
}

describe('tritonicMonitorPanels', () => {
  it('shouldShowTritonicMonitor for tritonic and wyble_tritonic', () => {
    const mc = tritonicMelodyCtx();
    expect(shouldShowTritonicMonitor(mc)).toBe(true);
    const wyble = buildMusicContextFromHarmonyBars({
      harmonyBars: ['Dm7', 'G7'],
      sourceEngineId: 'wyble_tritonic',
      presetId: 'wyble_tritonic',
    });
    expect(shouldShowTritonicMonitor(wyble)).toBe(true);
    expect(shouldShowTritonicMonitor(buildMusicContextFromHarmonyBars({
      harmonyBars: ['C'],
      sourceEngineId: 'duo',
    }))).toBe(false);
  });

  it('resolveTritonicMonitorEngineId maps vault receipt to vault_tritonic', () => {
    const vault = buildMusicContextFromHarmonyBars({
      harmonyBars: ['Cmaj7', 'Dm7'],
      sourceEngineId: 'tritonic',
      presetId: 'tritonic_vault_ecm',
    });
    const vaultWithReceipt = {
      ...vault,
      receipts: [
        ...vault.receipts,
        {
          engine: 'tritonic',
          kind: 'tritonic_vault_realisation_complete',
          payload: { mode: 'ecm', barCount: 2 },
        },
      ],
    };
    expect(resolveTritonicMonitorEngineId(vaultWithReceipt)).toBe('vault_tritonic');
  });

  it('buildTritonicMonitorViewFromMusicContext returns snapshot from receipt', () => {
    const view = buildTritonicMonitorViewFromMusicContext(tritonicMelodyCtx());
    expect(view.engineId).toBe('tritonic');
    expect(view.snapshot?.columns.length).toBeGreaterThan(0);
    expect(view.hasReceipt).toBe(true);
  });
});
