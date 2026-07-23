/**
 * GCE ending context — distinguishes terminal charts vs looping riffs vs intentional open endings.
 * Does **not** change numeric finalBarTension threshold (still > 0.7 when the gate applies).
 */

export type EndingContext = 'terminal' | 'loop' | 'open_idiom';

export const ENDING_CONTEXTS: readonly EndingContext[] = ['terminal', 'loop', 'open_idiom'] as const;

export function isEndingContext(v: unknown): v is EndingContext {
  return v === 'terminal' || v === 'loop' || v === 'open_idiom';
}

/**
 * Resolve ending context for formal FBT hard-gate evaluation.
 * Explicit request/metadata wins; `riff_generator` defaults to `loop`; everything else `terminal`.
 * `acknowledgeOpenIdiomEnding` promotes to `open_idiom` (conscious accept of unresolved terminal close).
 */
export function resolveEndingContext(opts: {
  presetId?: string | null;
  endingContext?: EndingContext | null;
  acknowledgeOpenIdiomEnding?: boolean | null;
}): EndingContext {
  if (opts.acknowledgeOpenIdiomEnding === true) return 'open_idiom';
  if (isEndingContext(opts.endingContext)) return opts.endingContext;
  const pid = (opts.presetId ?? '').trim();
  if (pid === 'riff_generator') return 'loop';
  return 'terminal';
}

/** Fields to stamp onto GenerationMetadata for formal FBT gate readers. */
export function endingContextMetadataStamp(opts: {
  presetId?: string | null;
  endingContext?: EndingContext | null;
  acknowledgeOpenIdiomEnding?: boolean | null;
}): { endingContext: EndingContext; acknowledgeOpenIdiomEnding?: true } {
  const endingContext = resolveEndingContext(opts);
  return {
    endingContext,
    ...(opts.acknowledgeOpenIdiomEnding === true ? { acknowledgeOpenIdiomEnding: true as const } : {}),
  };
}