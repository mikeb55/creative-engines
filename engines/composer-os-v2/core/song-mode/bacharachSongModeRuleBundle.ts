/**
 * Bacharach Song Mode v1 — documented rule bundle (reference-informed, non-imitative).
 * Cross-score traits described in `reference/bacharach/BACHARACH_MINING_FINDINGS.md`.
 * No song titles or catalogue progressions are encoded here.
 */

export const BACHARACH_SONG_MODE_RULE_BUNDLE_ID = 'v1' as const;

/** Rule ids for receipts / debugging (not user-facing prose). */
export const BACHARACH_RULE_IDS = {
  /** Harmonic: prefer maj7 / m7 colour on I / IV / vi pillars when tonic can be inferred from bar 1. */
  H_PILLAR_MAJ7_M7: 'H1',
  /** Harmonic: one bridge bar may apply mixture or V7 colour (capped per form). */
  H_BRIDGE_COLOUR_ONE_SHOT: 'H2',
  /** Harmonic: optional dom-family colour on existing dominant in section B. */
  H_SEC_DOM_OR_DOM_RICH: 'H3',
  /** Harmonic: return section final bar may lift to maj9 on plain major. */
  H_RETURN_MAJ9_LIFT: 'H4',
  /** Section: section B uses slightly higher extension probability than A (via dressing thresholds). */
  S_B_BRIGHTER_THAN_A: 'S1',
  /** Section: phrase-length flexibility steered by metadata (not fixed bar maps). */
  S_PHRASE_IRREGULARITY_META: 'S2',
  /** Accompaniment: lower sync/density than jazz-forward profiles; melody-supportive intent. */
  A_LIGHT_COMP: 'A1',
  /** Return: at most one obvious cadence colour lift on final bar of return (pairs with H4). */
  R_RETURN_ONE_TOUCH: 'R1',
} as const;
