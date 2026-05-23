import type { CompositionContext } from '../core/compositionContext';
import { applySongModeSlonimskyCellLayer } from '../core/song-mode/songModeSlonimsky';

function testSongModeSlonimskyReceipt(): boolean {
  const context = {
    seed: 42,
    presetId: 'song_mode',
    generationMetadata: { songwriterStyleId: 'pat_metheny', generatedAt: 't' },
    lockedHarmonyBarsRaw: ['Dm7'],
  } as unknown as CompositionContext;
  applySongModeSlonimskyCellLayer(context);
  const lines = context.generationMetadata.slonimskySongModeCellReceipts;
  return !!lines?.length && lines[0]!.startsWith('z9:songwriter=pat_metheny');
}

export function runSongModeSlonimskyTests(): { name: string; ok: boolean }[] {
  return [['Slonimsky Z9 — song mode cell receipt', testSongModeSlonimskyReceipt]].map(([name, fn]) => ({
    name: name as string,
    ok: (fn as () => boolean)(),
  }));
}
