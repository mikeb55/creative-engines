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
  | 'modal_minor'
  | 'unknown';

type ReasonCode = 'NO_PARSE' | 'NO_FUNCTION' | 'NO_CANDIDATES' | 'REJECTED' | 'APPLIED';

export interface ParsedChordSymbol {
  original: string;
  canonical: string;
  root: string;
  body: string;
  slashBass?: string;
  normalizedBody: string;
  qualityToken: string;
  extensions: string[];
  alterations: string[];
}

export interface EraNormalizerDebugCounters {
  era: EraId;
  changed: number;
  unchanged: number;
  skippedByReason: Record<string, number>;
  byRule: Record<string, number>;
  reasonCodes: Record<ReasonCode, number>;
}

export interface EraNormalizerContext {
  /** Melody note pitch class (0-11) by chord index, when available. */
  melodyPitchClassByIndex?: Array<number | undefined>;
  /** Neighbor symbols for lightweight continuity scoring. */
  previousChordSymbol?: string;
  nextChordSymbol?: string;
  debug?: boolean;
  debugCounters?: EraNormalizerDebugCounters;
  /** Phase 2+3a — optional voice bundle for voicing policy nudges (parallel-fifth bias stub). */
  voiceBundle?: import('../composer/voiceRuleBundle').VoiceRuleBundle;
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
  const reasonCodes: Record<ReasonCode, number> = {
    NO_PARSE: 0,
    NO_FUNCTION: 0,
    NO_CANDIDATES: 0,
    REJECTED: 0,
    APPLIED: 0,
  };
  return {
    era,
    changed: 0,
    unchanged: 0,
    skippedByReason,
    byRule: {},
    reasonCodes,
  };
}

function bump(rec: Record<string, number>, key: string): void {
  rec[key] = (rec[key] ?? 0) + 1;
}

function normalizeBodyForTokenScan(body: string): string {
  return body.toLowerCase().replace(/\s+/g, '');
}

export function canonicalizeChordSymbol(raw: string): string {
  return raw
    .trim()
    .replace(/min(?=\d|$|\s)/gi, 'm')
    .replace(/mi(?=\d|$|\s)/gi, 'm')
    .replace(/-(?=[0-9]|$)/g, 'm')
    .replace(/Ma(?=j|\d|$)/g, 'maj')
    .replace(/M(?=\d|$)/g, 'maj')
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/△/g, 'maj')
    .replace(/\s+/g, '');
}

function resolveQualityToken(normalizedBody: string): string {
  const ordered: Array<[RegExp, string]> = [
    [/7alt/i, '7alt'],
    [/maj7/i, 'maj7'],
    [/min9/i, 'min9'],
    [/m9/i, 'm9'],
    [/maj/i, 'maj'],
    [/min/i, 'min'],
    [/m/i, 'm'],
    [/7/i, '7'],
  ];
  for (const [rx, token] of ordered) {
    if (rx.test(normalizedBody)) return token;
  }
  return '';
}

export function parseChordSymbol(symbol: string): ParsedChordSymbol | null {
  const s = canonicalizeChordSymbol(symbol);
  if (!s) return null;
  const rootMatch = /^([A-G](?:#|b)?)(.*)$/i.exec(s);
  if (!rootMatch) return null;
  const root = rootMatch[1]!;
  let remainder = rootMatch[2] ?? '';
  let slashBass: string | undefined;
  const slashBassMatch = /(.*)\/([A-G](?:#|b)?)$/i.exec(remainder);
  if (slashBassMatch) {
    remainder = slashBassMatch[1] ?? '';
    slashBass = slashBassMatch[2] ?? undefined;
  }
  const bodyRaw = remainder.trim();
  const body = bodyRaw.length > 0 ? bodyRaw : '';
  const n = normalizeBodyForTokenScan(body);
  const qualityToken = resolveQualityToken(n);
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
    original: symbol,
    canonical: s,
    root,
    body,
    slashBass,
    normalizedBody: n,
    qualityToken,
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
  if (n.includes('7alt')) out.push('7b9', '7#9', '9', '7');
  return out;
}

function isDominantAlteredFamily(parsed: ParsedChordSymbol, functionClass: ChordFunctionClass): boolean {
  if (!(functionClass === 'dominant' || functionClass === 'sus_dominant')) return false;
  const n = parsed.normalizedBody;
  return (
    n.includes('alt') ||
    n.includes('b9') ||
    n.includes('#9') ||
    n.includes('b13') ||
    n.includes('#11') ||
    n.includes('7b9') ||
    n.includes('7#9') ||
    n.includes('7b13') ||
    n.includes('7#11') ||
    n.includes('7alt') ||
    n.includes('13b9')
  );
}

function isMajorModernFamily(parsed: ParsedChordSymbol): boolean {
  const n = parsed.normalizedBody;
  return (
    n.includes('maj7#11') ||
    n.includes('maj9#11') ||
    n.includes('maj9') ||
    n.includes('maj13') ||
    n.includes('maj7')
  );
}

function isDominant13(parsed: ParsedChordSymbol, functionClass: ChordFunctionClass): boolean {
  if (!(functionClass === 'dominant' || functionClass === 'sus_dominant')) return false;
  const n = parsed.normalizedBody;
  return n.includes('13') && !n.includes('b13');
}

function isSusFamily(parsed: ParsedChordSymbol, functionClass: ChordFunctionClass): boolean {
  const n = parsed.normalizedBody;
  return functionClass === 'sus_dominant' || n.includes('sus4') || n.includes('7sus4') || n.includes('13sus') || n.includes('sus');
}

export function getEraRewriteCandidates(
  parsed: ParsedChordSymbol,
  era: EraId,
  functionClass: ChordFunctionClass
): Array<{ symbolBody: string; ruleName: string }> {
  if (functionClass === 'unknown') return [];
  const n = parsed.normalizedBody;
  const out: RewriteCandidate[] = [];
  const push = (symbolBody: string, ruleName: string, eraMatchBoost: number) =>
    out.push({ symbolBody, ruleName, eraMatchBoost });

  if (functionClass === 'tonic_major' && isMajorModernFamily(parsed)) {
    if (era === 'swing') {
      if (n.includes('maj9') || n.includes('maj7#11') || n.includes('maj9#11')) {
        push('6/9', 'swing_major_modern_to_6_9', 1.0);
      }
      if (n.includes('maj7')) {
        push('6', 'swing_major7_to_6', 0.95);
      }
    }
    if (era === 'cool_jazz' && n.includes('maj7#11')) {
      push('maj7', 'cool_tonic_major_reduce_sharp11', 0.8);
      push('6/9', 'cool_tonic_major_6_9', 0.7);
    }
  }

  if (isDominantAlteredFamily(parsed, functionClass)) {
    if (era === 'swing') {
      if (n.includes('7alt') || n.includes('13b9')) {
        push('7b9', 'swing_dom_alt_to_7b9', 1.0);
      } else {
        push('7b9', 'swing_dom_simplify_7b9', 1.0);
        push('9', 'swing_dom_simplify_9', 0.9);
        push('7', 'swing_dom_simplify_7', 0.85);
      }
    }
    if (era === 'bebop') {
      if (n.includes('7alt') && (parsed.root.toUpperCase() === 'A' || parsed.root.toUpperCase() === 'E')) {
        push('7alt', 'bebop_dom_keep_alt_root_color', 1.05);
      }
      push('7b9', 'bebop_dom_keep_tension_b9', 1.0);
      push('7#9', 'bebop_dom_keep_tension_sharp9', 0.95);
    }
    if (era === 'hard_bop') {
      push('7#9', 'hardbop_dom_alt_to_7sharp9', 0.95);
      push('7b9', 'hardbop_dom_alt_to_7b9', 0.9);
    }
    if (era === 'cool_jazz' && (n.includes('alt') || n.includes('#9') || n.includes('b13'))) {
      push('9', 'cool_dom_lighten_to_9', 0.8);
      push('7', 'cool_dom_lighten_to_7', 0.7);
    }
  }

  if (isDominant13(parsed, functionClass)) {
    if (era === 'swing') {
      push('9', 'swing_dom13_to_9', 0.95);
      push('7', 'swing_dom13_to_7', 0.9);
    }
    // bebop/post_bop keep dominant 13 as-is (no rewrite candidate).
  }

  if (isSusFamily(parsed, functionClass)) {
    if (era === 'swing') {
      push('7', 'swing_sus_to_7', 0.95);
      push('', 'swing_sus_to_plain', 0.7);
    }
    // post_bop/fusion keep sus colors as-is.
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
  if (context.voiceBundle?.voicingPolicy.forbidParallelFifths) {
    score -= 0.02;
  }
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
  const reasonDebug = context.debug || process.env.COMPOSER_OS_ERA_REASON_DEBUG === '1';
  const out: string[] = [];
  for (let i = 0; i < chords.length; i++) {
    const symbol = chords[i] ?? '';
    const canonical = canonicalizeChordSymbol(symbol);
    if (!canonical) {
      bump(counters.reasonCodes, 'NO_PARSE');
      bump(counters.skippedByReason, 'parse_failed');
      counters.unchanged += 1;
      out.push(symbol);
      if (reasonDebug) console.log(`[era-normalizer] era=${era} reason=NO_PARSE original="${symbol}"`);
      continue;
    }
    const parsed = parseChordSymbol(canonical);
    if (!parsed) {
      bump(counters.reasonCodes, 'NO_PARSE');
      bump(counters.skippedByReason, 'parse_failed');
      counters.unchanged += 1;
      out.push(symbol);
      if (reasonDebug) console.log(`[era-normalizer] era=${era} reason=NO_PARSE original="${symbol}" canonical="${canonical}"`);
      continue;
    }
    const fnClass = classifyChordFunction(parsed, {
      previous: chords[i - 1],
      next: chords[i + 1],
    });
    if (fnClass === 'unknown') {
      bump(counters.reasonCodes, 'NO_FUNCTION');
      counters.unchanged += 1;
      out.push(parsed.canonical);
      if (reasonDebug) console.log(`[era-normalizer] era=${era} reason=NO_FUNCTION original="${symbol}" canonical="${parsed.canonical}"`);
      continue;
    }
    const candidates = getEraRewriteCandidates(parsed, era, fnClass);
    if (candidates.length === 0) {
      bump(counters.reasonCodes, 'NO_CANDIDATES');
      counters.unchanged += 1;
      out.push(parsed.canonical);
      if (reasonDebug) {
        console.log(`[era-normalizer] era=${era} reason=NO_CANDIDATES original="${symbol}" canonical="${parsed.canonical}" function="${fnClass}"`);
      }
      continue;
    }
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
      bump(counters.reasonCodes, 'REJECTED');
      bump(counters.skippedByReason, 'no_better_candidate');
      counters.unchanged += 1;
      out.push(formatChordSymbol(parsed));
      if (reasonDebug) {
        console.log(
          `[era-normalizer] era=${era} reason=REJECTED original="${symbol}" canonical="${parsed.canonical}" rewritten="${formatChordSymbol(parsed)}" skipped=no_better_candidate`
        );
      }
      continue;
    }

    bump(counters.reasonCodes, 'APPLIED');
    counters.changed += 1;
    bump(counters.byRule, chosenRule);
    const rewritten = formatChordSymbol(chosen);
    out.push(rewritten);
    if (reasonDebug) {
      console.log(
        `[era-normalizer] era=${era} reason=APPLIED original="${symbol}" canonical="${parsed.canonical}" rewritten="${rewritten}" rule=${chosenRule}`
      );
    }
  }
  if (reasonDebug) {
    const summary = Object.entries(counters.reasonCodes)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
    console.log(`[era-normalizer] era=${era} reason-summary ${summary}`);
  }
  return out;
}

export function createEraNormalizerDebugCounters(era: EraId): EraNormalizerDebugCounters {
  return initDebugCounters(era);
}
