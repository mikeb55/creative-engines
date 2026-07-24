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
 * True when the request consciously opts into open_idiom treatment:
 * per-generate ack **or** user-level `openIdiomDefault` preference (UX calibration).
 */
export function wantsOpenIdiomEnding(opts: {
  acknowledgeOpenIdiomEnding?: boolean | null;
  openIdiomDefault?: boolean | null;
}): boolean {
  return opts.acknowledgeOpenIdiomEnding === true || opts.openIdiomDefault === true;
}

/**
 * Resolve ending context for formal FBT hard-gate evaluation.
 * Explicit request/metadata wins; `riff_generator` defaults to `loop`; everything else `terminal`.
 * `acknowledgeOpenIdiomEnding` or `openIdiomDefault` promotes to `open_idiom`
 * (conscious accept of unresolved terminal close — disclosure required, not silent pass).
 */
export function resolveEndingContext(opts: {
  presetId?: string | null;
  endingContext?: EndingContext | null;
  acknowledgeOpenIdiomEnding?: boolean | null;
  /** User preference (default OFF): treat unresolved terminal closes like open_idiom. */
  openIdiomDefault?: boolean | null;
}): EndingContext {
  if (wantsOpenIdiomEnding(opts)) return 'open_idiom';
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
  openIdiomDefault?: boolean | null;
}): {
  endingContext: EndingContext;
  acknowledgeOpenIdiomEnding?: true;
  openIdiomDefault?: true;
} {
  const endingContext = resolveEndingContext(opts);
  return {
    endingContext,
    ...(opts.acknowledgeOpenIdiomEnding === true ? { acknowledgeOpenIdiomEnding: true as const } : {}),
    ...(opts.openIdiomDefault === true ? { openIdiomDefault: true as const } : {}),
  };
}
