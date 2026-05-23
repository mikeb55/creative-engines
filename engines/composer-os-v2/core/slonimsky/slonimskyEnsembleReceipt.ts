/**
 * Z10 / Z11 — ensemble Slonimsky cell selection receipts (BB + SQ).
 */

import { selectSlonimskyPattern, type SlonimskyContext } from './slonimskyEngine';

export type SlonimskyEnsembleKind = 'bb' | 'sq';

export function pushEnsembleSlonimskyCellReceipt(
  sink: string[] | undefined,
  ensemble: SlonimskyEnsembleKind,
  bar: number,
  ctx: SlonimskyContext,
  seed: number
): void {
  if (!sink) return;
  const pattern = selectSlonimskyPattern(ctx, seed + bar * 31);
  sink.push(
    `z${ensemble === 'bb' ? '10' : '11'}:${ensemble}@bar${bar} pattern=${pattern?.id ?? 'none'} intent=${ctx.phraseIntent}`
  );
}

/** Z8 — guitar–bass duo golden-path cell selection receipt (first bar only to limit noise). */
export function pushGbdSlonimskyCellReceipt(
  sink: string[] | undefined,
  bar: number,
  ctx: SlonimskyContext,
  seed: number
): void {
  if (!sink || bar !== 1) return;
  const pattern = selectSlonimskyPattern(ctx, seed + bar * 31);
  sink.push(`z8:gbd@bar${bar} pattern=${pattern?.id ?? 'none'} intent=${ctx.phraseIntent}`);
}
