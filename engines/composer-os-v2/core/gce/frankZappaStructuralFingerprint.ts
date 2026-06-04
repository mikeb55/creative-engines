/**
 * Frank Zappa — GCE structural fingerprint (duo / Song Mode compositional structure).
 * Additive to {@link ../song-mode/frankZappaSlice} harmony devices + Slonimsky solo lane.
 * Distinct from riff-path FZ_* receipt compiler.
 */

import type { CompositionContext } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from './resolveMelodicPartId';
import type { CategoryScore, GceStructureSection } from './gceAutoScorers';
import { scoreRhythmicIdentity } from './gceAutoScorers';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { MelodicNote } from './gce_melody_eval';
import { scoreModelToMelodicLine } from './scoreModelToMelodicLine';

export const FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID = 'frank_zappa_duo_structural_v1' as const;

/** 7/8 + 5/4 + 4/4 splice catalog for meter-disruption scoring. */
export const ZAPPA_GCE_METER_SPLICE = [
  { label: '7/8', groups: [3, 2, 2], numerator: 7, denominator: 8 },
  { label: '5/4', groups: [3, 2], numerator: 5, denominator: 4 },
  { label: '4/4', groups: [4], numerator: 4, denominator: 4 },
] as const;

export type ZappaHarmonicCadenceTarget = 'bII' | 'bVII' | 'tritone_sub';

/** How Zappa GCE auto meter interacts with Song section meter. */
export type ZappaGceMeterMode = 'disrupt' | 'respect' | 'own';

export interface FrankZappaStructuralFingerprint {
  id: typeof FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID;
  phraseFragmentation: 'high';
  meterMapId: 'zappa_meter_map';
  meterSplice: typeof ZAPPA_GCE_METER_SPLICE;
  harmonicCadenceTargets: readonly ZappaHarmonicCadenceTarget[];
  texturalContrastOperators: readonly ('density_drop' | 'density_spike')[];
  quoteCollage: { metadataOnly: true };
  /** Sudden meter changes at section boundaries (auto barMeterMap when no request map). */
  metricDisruption: boolean;
  /** Per-bar probabilistic guitar↔bass register swap during Phase 4. */
  registerShiftProbability: number;
  /** Ironic Ionian/Lydian mode coverage — displaced major, not straight tonal resolution. */
  ionianLydianModeCoverage: {
    lydian: { raisedFourthPresent: true; avoidDominantResolution: true };
    ionian: { tonicMajorContext: true; phraseEndingsAvoidTonic: true };
    metricDisplacementOnPhraseStart: true;
  };
  /** Section kind planner may assign incompatible adjacent surfaces (march ↔ ballad). */
  absurdistJuxtaposition: boolean;
  /** Weight toward picking clashing section kinds at boundaries (0–1). */
  styleCollisionWeight: number;
  /**
   * Section-meter interaction when auto barMeterMap is enabled.
   * - `disrupt` (default): Zappa splice overlays section meter
   * - `respect`: section meter untouched — safe for String Quartet + Zappa
   * - `own`: Zappa replaces section meter (`req.barMeterMap` still wins)
   */
  zappaGceMeterMode: ZappaGceMeterMode;
}

export const FRANK_ZAPPA_STRUCTURAL_FINGERPRINT: FrankZappaStructuralFingerprint = {
  id: FRANK_ZAPPA_GCE_STRUCTURAL_FINGERPRINT_ID,
  phraseFragmentation: 'high',
  meterMapId: 'zappa_meter_map',
  meterSplice: ZAPPA_GCE_METER_SPLICE,
  harmonicCadenceTargets: ['bII', 'bVII', 'tritone_sub'],
  texturalContrastOperators: ['density_drop', 'density_spike'],
  quoteCollage: { metadataOnly: true },
  metricDisruption: true,
  registerShiftProbability: 0.65,
  ionianLydianModeCoverage: {
    lydian: { raisedFourthPresent: true, avoidDominantResolution: true },
    ionian: { tonicMajorContext: true, phraseEndingsAvoidTonic: true },
    metricDisplacementOnPhraseStart: true,
  },
  absurdistJuxtaposition: true,
  styleCollisionWeight: 0.7,
  zappaGceMeterMode: 'disrupt',
};

const ZAPPA_SONGWRITER_IDS = new Set([
  'frank_zappa',
  'zappa',
  'mothers',
  'mothers_of_invention',
  'fz',
]);

export function isFrankZappaSongwriterId(id?: string): boolean {
  if (!id) return false;
  return ZAPPA_SONGWRITER_IDS.has(id.trim().toLowerCase());
}

function chordSymbolHitsTarget(symbol: string, target: ZappaHarmonicCadenceTarget): boolean {
  const s = symbol.trim();
  const low = s.toLowerCase();
  if (target === 'tritone_sub') {
    return /7alt|7#11|7b9|7#9|m7b5|dim7|alt\b|tritone/i.test(s);
  }
  if (target === 'bVII') {
    return /\/[A-G][#b]?7\b|7sus|mixolydian|b7\b/i.test(s) || /\b[A-G][#b]?7(?!alt)/i.test(low);
  }
  if (target === 'bII') {
    return /\/[Dd][#b]?|bII|Db|C#\/|Neapolitan|maj7#11|7#11/i.test(s);
  }
  return false;
}

function barMeterMatchesSplice(
  meter: { numerator: number; denominator: number } | undefined
): boolean {
  if (!meter) return false;
  return ZAPPA_GCE_METER_SPLICE.some(
    (row) => row.numerator === meter.numerator && row.denominator === meter.denominator
  );
}

function resolveBarMeterMap(context?: CompositionContext, score?: ScoreModel): BarMeterMap | undefined {
  return context?.generationMetadata?.barMeterMap ?? context?.barMeterMap ?? score?.barMeterMap;
}

function guitarAttacksPerBar(score: ScoreModel): number[] {
  const part =
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar') ??
    score.parts.find((p) => p.id === 'guitar') ??
    score.parts[0];
  if (!part) return [];
  return part.measures.map((m) => {
    let n = 0;
    for (const e of m.events) {
      if (e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1) n++;
    }
    return n;
  });
}

/** High fragmentation — section churn + weak return consistency (non-resolving form). */
export function scoreFrankZappaPhraseFragmentation(
  chords: string[],
  sections: GceStructureSection[]
): CategoryScore {
  if (sections.length < 2) {
    return { score: 5, justification: 'Zappa structural: few sections (fragmentation neutral)' };
  }
  const roles = sections.map((s) => s.role);
  const adjacentChanges = roles.filter((r, i) => i > 0 && r !== roles[i - 1]).length;
  const adjacentContrast = adjacentChanges / (sections.length - 1);

  const roleGroups = new Map<string, string[][]>();
  for (const sec of sections) {
    const secChords = chords.slice(sec.barStart - 1, sec.barEnd);
    if (!roleGroups.has(sec.role)) roleGroups.set(sec.role, []);
    roleGroups.get(sec.role)!.push(secChords);
  }
  let returnSim = 0;
  let pairs = 0;
  for (const [, groups] of roleGroups) {
    if (groups.length < 2) continue;
    for (let i = 1; i < groups.length; i++) {
      const a = new Set(groups[0]);
      const b = new Set(groups[i]);
      const intersection = [...a].filter((c) => b.has(c)).length;
      const union = new Set([...a, ...b]).size;
      returnSim += union > 0 ? intersection / union : 0;
      pairs++;
    }
  }
  const returnConsistency = pairs > 0 ? returnSim / pairs : 0.5;
  const fragmentationScore = 0.55 * adjacentContrast + 0.45 * (1 - returnConsistency);
  const score = Math.max(0, Math.min(10, Math.round(fragmentationScore * 10 * 10) / 10));
  return {
    score,
    justification:
      `Zappa fragmentation high: adjacent role churn ${(adjacentContrast * 10).toFixed(1)}/10, ` +
      `low return consistency ${(returnConsistency * 10).toFixed(1)}/10`,
  };
}

/** Meter map carries 7/8 / 5/4 / 4/4 splice (not steady 4/4 only). */
export function scoreFrankZappaMeterDisruption(
  context: CompositionContext | undefined,
  score: ScoreModel,
  totalBars: number
): CategoryScore {
  const map = resolveBarMeterMap(context, score);
  if (!map || totalBars < 2) {
    return {
      score: 4,
      justification: 'Zappa meter: no barMeterMap (disruption unverified)',
    };
  }
  let spliceHits = 0;
  let oddHits = 0;
  for (let b = 1; b <= totalBars; b++) {
    const m = map[b];
    if (barMeterMatchesSplice(m)) spliceHits++;
    if (m && (m.numerator !== 4 || m.denominator !== 4)) oddHits++;
  }
  const spliceRate = spliceHits / totalBars;
  const oddRate = oddHits / totalBars;
  const pillarScore = Math.max(
    0,
    Math.min(10, Math.round((4 + spliceRate * 4 + oddRate * 2) * 10) / 10)
  );
  return {
    score: pillarScore,
    justification:
      `Zappa zappa_meter_map: ${spliceHits}/${totalBars} splice bars, ${oddHits}/${totalBars} non-4/4`,
  };
}

/** ♭II / ♭VII / tritone-sub as cadence targets in harmony spine. */
export function scoreFrankZappaHarmonicNonResolution(chords: string[]): CategoryScore {
  if (!chords.length) return { score: 0, justification: 'Zappa harmony: no chords' };
  let hits = 0;
  const perTarget: Record<ZappaHarmonicCadenceTarget, number> = {
    bII: 0,
    bVII: 0,
    tritone_sub: 0,
  };
  for (const c of chords) {
    for (const t of FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.harmonicCadenceTargets) {
      if (chordSymbolHitsTarget(c, t)) {
        hits++;
        perTarget[t]++;
        break;
      }
    }
  }
  const rate = hits / chords.length;
  const targetCoverage =
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.harmonicCadenceTargets.filter((t) => perTarget[t] > 0)
      .length / FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.harmonicCadenceTargets.length;
  const score = Math.max(
    0,
    Math.min(10, Math.round((3 + rate * 5 + targetCoverage * 2) * 10) / 10)
  );
  return {
    score,
    justification:
      `Zappa cadence targets ${hits}/${chords.length} bars (bII=${perTarget.bII} bVII=${perTarget.bVII} tritone=${perTarget.tritone_sub})`,
  };
}

/** Sudden density drop/spike between adjacent bars (guitar attack counts). */
export function scoreFrankZappaTexturalContrast(score: ScoreModel, totalBars: number): CategoryScore {
  const perBar = guitarAttacksPerBar(score);
  if (perBar.length < 3) {
    return { score: 5, justification: 'Zappa texture: sparse guitar data' };
  }
  let spikes = 0;
  let drops = 0;
  for (let i = 1; i < perBar.length; i++) {
    const prev = perBar[i - 1] ?? 0;
    const cur = perBar[i] ?? 0;
    if (prev >= 2 && cur <= Math.max(0, prev - 2)) drops++;
    if (prev <= 1 && cur >= prev + 3) spikes++;
  }
  const events = drops + spikes;
  const rate = events / Math.max(1, perBar.length - 1);
  const pillarScore = Math.max(0, Math.min(10, Math.round((4 + rate * 6) * 10) / 10));
  return {
    score: pillarScore,
    justification: `Zappa texture contrast: ${drops} drops + ${spikes} spikes / ${totalBars} bars`,
  };
}

function harmonyRootPc(symbol: string): number | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = /^([A-G][#b]?)/i.exec(hp);
  return m ? noteNameToPitchClass(m[1]!) : undefined;
}

function chordHasRaisedFourth(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  return /#11|\(#11\)|maj7#11|Δ#11|lyd/i.test(hp);
}

function isDominantSymbol(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase().replace(/\s/g, '');
  if (/mmaj|dim|ø|sus|m7b5/.test(tl)) return false;
  if (/^m(?!aj)/.test(tl)) return false;
  return /\b7|9|11|13|alt/.test(tl) || /^[a-g][#b]?7/.test(tl);
}

function isMajorTonicSymbol(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase().replace(/\s/g, '');
  if (/m(?!aj)|dim|ø|sus|m7b5/.test(tl)) return false;
  return /maj|Δ|\^|add|6\/9|^[a-g][#b]?$/.test(tl);
}

function isDominantToTonicResolution(prev: string, next: string): boolean {
  const prevRoot = harmonyRootPc(prev);
  const nextRoot = harmonyRootPc(next);
  if (prevRoot === undefined || nextRoot === undefined) return false;
  if (!isDominantSymbol(prev) || !isMajorTonicSymbol(next)) return false;
  return ((prevRoot - nextRoot + 12) % 12) === 7;
}

function phraseStartNotes(melody: MelodicNote[]): MelodicNote[] {
  const pitched = melody.filter((n) => !n.rest && n.midi > 0);
  if (!pitched.length) return [];
  const starts: MelodicNote[] = [pitched[0]!];
  for (let i = 1; i < pitched.length; i++) {
    const prev = pitched[i - 1]!;
    const cur = pitched[i]!;
    const gap = cur.bar - prev.bar + (cur.beat - prev.beat) / 4;
    if (gap >= 0.45) starts.push(cur);
  }
  return starts;
}

function phraseEndingNotes(melody: MelodicNote[]): Array<{ note: MelodicNote; chordIndex: number }> {
  const pitched = melody.filter((n) => !n.rest && n.midi > 0);
  if (!pitched.length) return [];
  const endings: Array<{ note: MelodicNote; chordIndex: number }> = [];
  for (let i = 0; i < pitched.length; i++) {
    const cur = pitched[i]!;
    const next = pitched[i + 1];
    const gap = next ? next.bar - cur.bar + (next.beat - cur.beat) / 4 : 99;
    if (gap >= 0.45) endings.push({ note: cur, chordIndex: Math.max(0, cur.bar - 1) });
  }
  return endings;
}

function beatIsUnexpectedSubdivision(beat: number): boolean {
  const frac = ((beat % 1) + 1) % 1;
  if (frac < 0.06 || frac > 0.94) return false;
  return Math.abs(frac - 0.25) < 0.08 || Math.abs(frac - 0.5) < 0.08 || Math.abs(frac - 0.75) < 0.08;
}

/** Lydian ironic — raised 4th colour present, dominant→tonic resolution suppressed. */
export function scoreFrankZappaLydianIronic(chords: string[]): CategoryScore {
  if (!chords.length) return { score: 0, justification: 'Zappa Lydian: no chords' };
  const raisedHits = chords.filter((c) => chordHasRaisedFourth(c)).length;
  let domRes = 0;
  for (let i = 1; i < chords.length; i++) {
    if (isDominantToTonicResolution(chords[i - 1]!, chords[i]!)) domRes++;
  }
  const raisedRate = raisedHits / chords.length;
  const domRate = domRes / Math.max(1, chords.length - 1);
  const score = Math.max(
    0,
    Math.min(10, Math.round((3 + raisedRate * 5 + (1 - domRate) * 2) * 10) / 10)
  );
  return {
    score,
    justification:
      `Zappa Lydian ironic: #11/raised-4th ${raisedHits}/${chords.length}, ` +
      `dominant resolution ${domRes}/${Math.max(1, chords.length - 1)} suppressed`,
  };
}

/** Ionian ironic — tonic major field but phrase endings avoid tonic pitch class. */
export function scoreFrankZappaIonianAvoidTonic(chords: string[], melody: MelodicNote[]): CategoryScore {
  const majorBars = chords.filter((c) => isMajorTonicSymbol(c)).length;
  if (majorBars === 0) {
    return { score: 4, justification: 'Zappa Ionian: no major tonic field' };
  }
  const endings = phraseEndingNotes(melody);
  if (!endings.length) {
    return { score: 5, justification: 'Zappa Ionian: sparse melody (tonic avoidance neutral)' };
  }
  let avoid = 0;
  let eligible = 0;
  for (const { note, chordIndex } of endings) {
    const sym = chords[chordIndex] ?? chords[chords.length - 1]!;
    if (!isMajorTonicSymbol(sym)) continue;
    const tonic = harmonyRootPc(sym);
    if (tonic === undefined) continue;
    eligible++;
    const notePc = ((note.midi % 12) + 12) % 12;
    if (notePc !== tonic) avoid++;
  }
  const avoidRate = eligible > 0 ? avoid / eligible : 0.5;
  const majorRate = majorBars / chords.length;
  const score = Math.max(
    0,
    Math.min(10, Math.round((3 + avoidRate * 4 + majorRate * 2) * 10) / 10)
  );
  return {
    score,
    justification:
      `Zappa Ionian displaced: phrase endings avoid tonic ${avoid}/${eligible}, ` +
      `major tonic field ${majorBars}/${chords.length}`,
  };
}

/** Both modes — phrase starts land on unexpected beat subdivisions (metric displacement). */
export function scoreFrankZappaModeMetricDisplacement(melody: MelodicNote[]): CategoryScore {
  const starts = phraseStartNotes(melody);
  if (!starts.length) {
    return { score: 4, justification: 'Zappa mode displacement: no phrase starts' };
  }
  const displaced = starts.filter((n) => beatIsUnexpectedSubdivision(n.beat)).length;
  const rate = displaced / starts.length;
  const score = Math.max(0, Math.min(10, Math.round((3 + rate * 6) * 10) / 10));
  return {
    score,
    justification: `Zappa mode displacement: ${displaced}/${starts.length} phrase starts off grid`,
  };
}

/** Composite Ionian/Lydian ironic mode pillar for Zappa GCE gate. */
export function scoreFrankZappaIonianLydianModeCoverage(
  chords: string[],
  melody: MelodicNote[]
): CategoryScore {
  const lyd = scoreFrankZappaLydianIronic(chords);
  const ion = scoreFrankZappaIonianAvoidTonic(chords, melody);
  const disp = scoreFrankZappaModeMetricDisplacement(melody);
  const composite = Math.max(
    0,
    Math.min(10, Math.round(((lyd.score + ion.score + disp.score) / 3) * 10) / 10)
  );
  return {
    score: composite,
    justification: `Lydian=${lyd.score.toFixed(1)} Ionian=${ion.score.toFixed(1)} displacement=${disp.score.toFixed(1)}`,
  };
}

export type FrankZappaStructuralGateInput = {
  score: ScoreModel;
  context: CompositionContext;
  chords: string[];
  sections: GceStructureSection[];
  melody: MelodicNote[];
};

/** Composite structural pillars for Frank Zappa GCE gate (additive pillars only). */
export function scoreFrankZappaStructuralPillars(input: FrankZappaStructuralGateInput): Array<{
  name: string;
  score: number;
  weight: number;
  justification: string;
}> {
  const lastSection = input.sections[input.sections.length - 1];
  const tb = Math.max(
    1,
    input.context.form.totalBars,
    lastSection?.barEnd ?? 0,
    input.chords.length
  );
  const frag = scoreFrankZappaPhraseFragmentation(input.chords, input.sections);
  const meter = scoreFrankZappaMeterDisruption(input.context, input.score, tb);
  const harm = scoreFrankZappaHarmonicNonResolution(input.chords);
  const texture = scoreFrankZappaTexturalContrast(input.score, tb);
  const modeCov = scoreFrankZappaIonianLydianModeCoverage(input.chords, input.melody);
  const rhythm = scoreRhythmicIdentity(input.melody, {
    placementMode: 'anti_metric',
    targetOffbeatWindow: [0.42, 0.68],
    anticipationRateMax: 0.35,
    grooveStabilityTolerance: 0.55,
  });
  return [
    { name: 'Zappa Phrase Fragmentation', weight: 1.5, score: frag.score, justification: frag.justification },
    { name: 'Zappa Meter Disruption', weight: 1.5, score: meter.score, justification: meter.justification },
    { name: 'Zappa Harmonic Non-Resolution', weight: 2, score: harm.score, justification: harm.justification },
    { name: 'Zappa Textural Contrast', weight: 1.5, score: texture.score, justification: texture.justification },
    { name: 'Zappa Ionian/Lydian Ironic Mode', weight: 1.5, score: modeCov.score, justification: modeCov.justification },
    { name: 'Zappa Rhythmic Anti-Metric', weight: 1, score: rhythm.score, justification: rhythm.justification },
    {
      name: 'Zappa Quote/Collage (metadata)',
      weight: 0,
      score: 10,
      justification: `quoteCollage metadataOnly=${FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.quoteCollage.metadataOnly}`,
    },
  ];
}

export function buildFrankZappaStructuralGateMelody(score: ScoreModel): MelodicNote[] {
  return scoreModelToMelodicLine(score, resolveMelodicPartId(score));
}
