import { buildGuitarBassDuoSlonimskyContext } from '../core/slonimsky/slonimskyPatternService';
import { selectSlonimskyPattern } from '../core/slonimsky/slonimskyEngine';

function testGbdContextBuilds(): boolean {
  const ctx = buildGuitarBassDuoSlonimskyContext({
    duoIntent: 'guitar_lead',
    phase: 3,
    seed: 42,
    songwriterId: 'frank_zappa',
    totalQuarterBeats: 4,
    chordSymbol: 'Am7',
    keyPc: 9,
    effectiveLow: 52,
    effectiveHigh: 84,
  });
  return ctx.maxBeats === 4 && ctx.chordSymbol === 'Am7' && !!selectSlonimskyPattern(ctx, 42);
}

export function runSlonimskyGbdContextTests(): { name: string; ok: boolean }[] {
  return [['Slonimsky Z8 — buildGuitarBassDuoSlonimskyContext', testGbdContextBuilds]].map(
    ([name, fn]) => ({
      name: name as string,
      ok: (fn as () => boolean)(),
    })
  );
}
