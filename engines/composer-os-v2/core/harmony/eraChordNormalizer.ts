/**
 * Era-aware chord symbol normalization pass.
 *
 * Implementation plan (inline):
 * 1) Parse symbols into root/body/slash + derived extension tokens.
 * 2) Classify each chord into a coarse functional family.
 * 3) Build era/function-scoped rewrite candidates (same function family only).
 * 4) Score candidates with safety-first priorities.
 * 5) Apply best safe rewrite (or keep original) and update debug counters.
 */

export type EraId =
  | 'swing'
  | 'bebop'
  | 'cool_jazz'
  | 'hard_bop'
  | 'post_bop'
  | 'fusion'
  | 'contemporary';

export type ChordFunctionClass =
  | 'tonic_major'
  | 'tonic_minor'
  | 'predominant_minor'
  | 'dominant'
  | 'sus_dominant'
  | 'diminished'
  | 'half_diminished'
  | 'modal_major'
  | 'modal_minor';

export interface ParsedChordSymbol {
  original: string;
  root: string;
  body: string;
  slashBass?: string;
  normalizedBody: string;
  extensions: string[];
  alterations: string[];
}

export interface EraNormalizerDebugCounters {
  era: EraId;
  changed: number;
  unchanged: number;
  skippedByReason: Record<string, number>;
  byRule: Record<string, number>;
}

export interface EraNormalizerContext {
  /** Melody note pitch class (0-11) by chord index, when available. */
  melodyPitchClassByIndex?: Array<number | undefined>;
  /** Neighbor symbols for lightweight continuity scoring. */
  previousChordSymbol?: string;
  nextChordSymbol?: string;
  debug?: boolean;
  debugCounters?: EraNormalizerDebugCounters;
}

interface RewriteCandidate {
  symbolBody: string;
  ruleName: string;
  eraMatchBoost: number;
}

const DEFAULT_SKIP_REASONS = [
  'parse_failed',
  'safety_root',
  'safety_bass',
  'safety_function',
  'melody_clash',
  'no_better_candidate',
] as const;

function initDebugCounters(era: EraId): EraNormalizerDebugCounters {
  const skippedByReason: Record<string, number> = {};
  for (const r of DEFAULT_SKIP_REASONS) skippedByReason[r] = 0;
  return {
    era,
    changed: 0,
    unchanged: 0,
    skippedByReason,
    byRule: {},
  };
}

function bump(rec: Record<string, number>, key: string): void {
  rec[key] = (rec[key] ?? 0) + 1;
}

function normalizeBodyForTokenScan(body: string): string {
  return body.toLowerCase().replace(/\s+/g, '');
}

export function parseChordSymbol(symbol: string): ParsedChordSymbol | null {
  const s = symbol.trim();
  if (!s) return null;
  const m = /^([A-G](?:#|b)?)([^/]*)?(?:\/([A-G](?:#|b)?))?$/i.exec(s);
  if (!m) return null;
  const root = m[1]!;
  const bodyRaw = (m[2] ?? '').trim();
  const body = bodyRaw.length > 0 ? bodyRaw : '';
  const slashBass = m[3] ?? undefined;
  const n = normalizeBodyForTokenScan(body);
  const extensions: string[] = [];
  const alterations: string[] = [];
  const extTokens = ['6/9', 'maj6', '6', 'maj7', 'm7', 'm9', 'm11', '9', '11', '13', 'sus', 'sus4'] as const;
  const altTokens = ['alt', '#11', 'b13', '#9', 'b9'] as const;
  for (const t of extTokens) if (n.includes(t)) extensions.push(t);
  for (const t of altTokens) if (n.includes(t)) alterations.push(t);
  if (n.includes('dim7')) extensions.push('dim7');
  if (n.includes('m7b5')) extensions.push('m7b5');
  if (n.includes('quartal')) extensions.push('quartal');
  return {
    original: s,
    root,
    body,
    slashBass,
    normalizedBody: n,
    extensions,
    alterations,
  };
}

export function classifyChordFunction(
  parsed: ParsedChordSymbol,
  _harmonicContext?: { previous?: string; next?: string }
): ChordFunctionClass {
  const n = parsed.normalizedBody;
  if (n.includes('m7b5') || n.includes('ø')) return 'half_diminished';
  if (n.includes('dim')) return 'diminished';
  if (n.includes('sus')) return 'sus_dominant';
  if (n.includes('alt') || n.includes('7') || n.includes('b9') || n.includes('#9') || n.includes('#11') || n.includes('13')) {
    return 'dominant';
  }
  if (n.includes('mmaj') || /^m(?!aj)/.test(n) || n.includes('min')) return 'tonic_minor';
  if (n.includes('maj7#11') || n.includes('#11') || n.includes('quartal')) return 'modal_major';
  if (n.includes('m9') || n.includes('m11')) return 'modal_minor';
  if (n.includes('maj') || n.includes('6/9') || n.includes('6') || n.includes('9')) return 'tonic_major';
  return 'tonic_major';
}

function simplificationLadderFor(parsed: ParsedChordSymbol): string[] {
  const n = parsed.normalizedBody;
  const out: string[] = [];
  if (n.includes('maj7#11')) out.push('maj7', '6/9', '6');
  if (n.includes('7alt')) out.push('7#9', '7b9', '13b9', '9', '7');
  return out;
}

export function getEraRewriteCandidates(
  parsed: ParsedChordSymbol,
  era: EraId,
  functionClass: ChordFunctionClass
): Array<{ symbolBody: string; ruleName: string }> {
  const n = parsed.normalizedBody;
  const out: RewriteCandidate[] = [];
  const push = (symbolBody: string, ruleName: string, eraMatchBoost: number) =>
    out.push({ symbolBody, ruleName, eraMatchBoost });

  if (functionClass === 'tonic_major') {
    if (era === 'swing' && (n.includes('maj7') || n.includes('#11'))) {
      push('6', 'swing_tonic_major_simplify_to_6', 1.0);
      push('6/9', 'swing_tonic_major_simplify_to_6_9', 0.9);
    }
    if (era === 'cool_jazz' && n.includes('maj7#11')) {
      push('maj7', 'cool_tonic_major_reduce_sharp11', 0.8);
      push('6/9', 'cool_tonic_major_6_9', 0.7);
    }
  }

  if (functionClass === 'dominant' || functionClass === 'sus_dominant') {
    if (era === 'swing') {
      if (n.includes('alt') || n.includes('#11') || n.includes('#9') || n.includes('b13')) {
        push('7b9', 'swing_dom_simplify_7b9', 1.0);
        push('9', 'swing_dom_simplify_9', 0.85);
        push('7', 'swing_dom_simplify_7', 0.8);
      }
    }
    if (era === 'bebop') {
      if (n.includes('alt')) {
        push('7b9', 'bebop_dom_alt_to_7b9', 1.0);
        push('7#9', 'bebop_dom_alt_to_7sharp9', 0.95);
      } else if (n === '7') {
        push('7b9', 'bebop_dom_enrich_plain7_to_b9', 0.8);
      }
    }
    if (era === 'hard_bop') {
      if (n.includes('alt')) {
        push('7#9', 'hardbop_dom_alt_to_7sharp9', 0.95);
        push('7b9', 'hardbop_dom_alt_to_7b9', 0.9);
      } else if (n === '7') {
        push('13', 'hardbop_dom_enrich_13', 0.75);
      }
    }
    if (era === 'cool_jazz' && (n.includes('alt') || n.includes('#9') || n.includes('b13'))) {
      push('9', 'cool_dom_lighten_to_9', 0.8);
      push('7', 'cool_dom_lighten_to_7', 0.7);
    }
  }

  if (functionClass === 'diminished' || functionClass === 'half_diminished') {
    if (era === 'swing' && n.includes('m7b5')) {
      push('dim7', 'swing_halfdim_to_dim7', 0.6);
    }
    if (era === 'bebop' && n.includes('dim')) {
      push('dim7', 'bebop_dim_retain_dim7', 0.6);
    }
  }

  for (const ladder of simplificationLadderFor(parsed)) {
    push(ladder, `ladder_${parsed.body || 'plain'}_to_${ladder}`, 0.55);
  }

  // deterministic order by explicit priority
  return out
    .sort((a, b) => b.eraMatchBoost - a.eraMatchBoost)
    .map((x) => ({ symbolBody: x.symbolBody, ruleName: x.ruleName }));
}

function estimateMelodyClash(candidate: ParsedChordSymbol, melodyPc: number | undefined): boolean {
  if (melodyPc == null) return false;
  // conservative: avoid hard altered dominants against melody if pc unavailable-to-tone map; keep original.
  if (candidate.normalizedBody.includes('alt') || candidate.normalizedBody.includes('#9')) return true;
  return false;
}

function voiceLeadingDisruptionPenalty(
  candidateBody: string,
  ctx: Pick<EraNormalizerContext, 'previousChordSymbol' | 'nextChordSymbol'>
): number {
  const cand = normalizeBodyForTokenScan(candidateBody);
  const prev = normalizeBodyForTokenScan(ctx.previousChordSymbol ?? '');
  const next = normalizeBodyForTokenScan(ctx.nextChordSymbol ?? '');
  let penalty = 0;
  if (prev && cand !== prev && (cand.includes('alt') || prev.includes('alt'))) penalty += 0.12;
  if (next && cand !== next && (cand.includes('#11') || next.includes('#11'))) penalty += 0.08;
  return penalty;
}

export function scoreRewriteCandidate(
  original: ParsedChordSymbol,
  candidate: ParsedChordSymbol,
  context: EraNormalizerContext
): number {
  let score = 1.0;
  if (original.root !== candidate.root) score -= 100;
  if ((original.slashBass ?? '') !== (candidate.slashBass ?? '')) score -= 100;
  if (classifyChordFunction(original) !== classifyChordFunction(candidate)) score -= 100;
  score -= voiceLeadingDisruptionPenalty(candidate.body, context);
  score -= Math.min(0.2, Math.abs(candidate.body.length - original.body.length) * 0.01);
  return score;
}

export function formatChordSymbol(parsed: ParsedChordSymbol): string {
  const body = parsed.body ?? '';
  const slash = parsed.slashBass ? `/${parsed.slashBass}` : '';
  return `${parsed.root}${body}${slash}`;
}

export function normalizeChordSymbolsForEra(
  chords: string[],
  era: EraId,
  context: EraNormalizerContext = {}
): string[] {
  const counters = context.debugCounters ?? initDebugCounters(era);
  const out: string[] = [];
  for (let i = 0; i < chords.length; i++) {
    const symbol = chords[i] ?? '';
    const parsed = parseChordSymbol(symbol);
    if (!parsed) {
      bump(counters.skippedByReason, 'parse_failed');
      counters.unchanged += 1;
      out.push(symbol);
      continue;
    }
    const fnClass = classifyChordFunction(parsed, {
      previous: chords[i - 1],
      next: chords[i + 1],
    });
    const candidates = getEraRewriteCandidates(parsed, era, fnClass);
    let chosen: ParsedChordSymbol | null = null;
    let chosenRule = '';
    let bestScore = -Infinity;

    for (const cand of candidates) {
      const candidateParsed = parseChordSymbol(`${parsed.root}${cand.symbolBody}${parsed.slashBass ? `/${parsed.slashBass}` : ''}`);
      if (!candidateParsed) continue;
      if (candidateParsed.root !== parsed.root) {
        bump(counters.skippedByReason, 'safety_root');
        continue;
      }
      if ((candidateParsed.slashBass ?? '') !== (parsed.slashBass ?? '')) {
        bump(counters.skippedByReason, 'safety_bass');
        continue;
      }
      if (classifyChordFunction(candidateParsed) !== fnClass) {
        bump(counters.skippedByReason, 'safety_function');
        continue;
      }
      if (estimateMelodyClash(candidateParsed, context.melodyPitchClassByIndex?.[i])) {
        bump(counters.skippedByReason, 'melody_clash');
        continue;
      }
      const score = scoreRewriteCandidate(parsed, candidateParsed, {
        ...context,
        previousChordSymbol: chords[i - 1],
        nextChordSymbol: chords[i + 1],
      });
      if (score > bestScore) {
        bestScore = score;
        chosen = candidateParsed;
        chosenRule = cand.ruleName;
      }
    }

    if (!chosen || formatChordSymbol(chosen) === formatChordSymbol(parsed)) {
      bump(counters.skippedByReason, 'no_better_candidate');
      counters.unchanged += 1;
      out.push(formatChordSymbol(parsed));
      if (context.debug) {
        console.log(
          `[era-normalizer] era=${era} original="${symbol}" rewritten="${symbol}" skipped=no_better_candidate`
        );
      }
      continue;
    }

    counters.changed += 1;
    bump(counters.byRule, chosenRule);
    const rewritten = formatChordSymbol(chosen);
    out.push(rewritten);
    if (context.debug) {
      console.log(
        `[era-normalizer] era=${era} original="${symbol}" rewritten="${rewritten}" rule=${chosenRule}`
      );
    }
  }
  return out;
}

export function createEraNormalizerDebugCounters(era: EraId): EraNormalizerDebugCounters {
  return initDebugCounters(era);
}
