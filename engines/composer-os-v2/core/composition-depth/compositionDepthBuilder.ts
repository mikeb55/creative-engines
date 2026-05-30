/**
 * V89 composition depth — develop existing MusicContext harmonic material (always-on).
 */

import {
  noteNameToPitchClass,
  normalizeChordSymbol,
  parseChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  harmonyBarsFromMusicContext,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextMotif } from '../music-context/musicContextTypes';
import { mulberry32 } from '../remix/vaultSeedMix';
import type {
  CompositionDepth,
  DramaticArcFunction,
  HarmonicDevelopmentSegment,
  MotivicTransformation,
  ReharmonisationSuggestion,
  SectionArcEntry,
} from './compositionDepthTypes';

const ARC_ORDER: readonly DramaticArcFunction[] = [
  'exposition',
  'development',
  'climax',
  'resolution',
];

const ARC_LABEL: Record<DramaticArcFunction, string> = {
  exposition: 'Exposition — establish tonal centre and primary cells',
  development: 'Development — chromatic drift and reharm colour',
  climax: 'Climax — peak tension and registral density',
  resolution: 'Resolution — cadential release and recall',
};

function chordTensionWeight(symbol: string): number {
  const s = symbol.toLowerCase();
  if (/alt|#9|b9|dim|°|ø|m7b5|aug|\+/.test(s)) return 0.85;
  if (/7|sus|9|11|13/.test(s)) return 0.55;
  if (/m7|min/.test(s)) return 0.4;
  return 0.25;
}

function splitArcRanges(totalBars: number): SectionArcEntry[] {
  if (totalBars <= 0) return [];
  if (totalBars <= 4) {
    return ARC_ORDER.slice(0, totalBars).map((fn, i) => ({
      function: fn,
      startBar: i,
      endBar: i,
      label: ARC_LABEL[fn],
    }));
  }
  const w = [0.25, 0.35, 0.2, 0.2];
  const counts = w.map((f) => Math.max(1, Math.round(totalBars * f)));
  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > totalBars) {
    const idx = counts.indexOf(Math.max(...counts));
    counts[idx]!--;
    sum--;
  }
  while (sum < totalBars) {
    counts[1]! += 1;
    sum++;
  }
  const entries: SectionArcEntry[] = [];
  let bar = 0;
  for (let i = 0; i < ARC_ORDER.length; i++) {
    const span = counts[i]!;
    if (span <= 0 || bar >= totalBars) break;
    const endBar = Math.min(totalBars - 1, bar + span - 1);
    const fn = ARC_ORDER[i]!;
    entries.push({ function: fn, startBar: bar, endBar, label: ARC_LABEL[fn] });
    bar = endBar + 1;
  }
  return entries;
}

function phaseForArc(fn: DramaticArcFunction): HarmonicDevelopmentSegment['phase'] {
  if (fn === 'exposition') return 'tension_rise';
  if (fn === 'development') return 'tension_rise';
  if (fn === 'climax') return 'plateau';
  return 'release';
}

function buildHarmonicDevelopmentPlan(
  bars: readonly string[],
  arcMap: readonly SectionArcEntry[],
): HarmonicDevelopmentSegment[] {
  return arcMap.map((arc) => {
    const slice = bars.slice(arc.startBar, arc.endBar + 1);
    const tensions = slice.map(chordTensionWeight);
    const tensionLevel =
      tensions.length > 0 ? tensions.reduce((a, b) => a + b, 0) / tensions.length : 0.3;
    const phase = phaseForArc(arc.function);
    const description =
      phase === 'plateau'
        ? `Sustain harmonic colour across bars ${arc.startBar + 1}–${arc.endBar + 1}`
        : phase === 'release'
          ? `Ease tension toward cadential recall (bars ${arc.startBar + 1}–${arc.endBar + 1})`
          : `Accumulate harmonic motion (bars ${arc.startBar + 1}–${arc.endBar + 1})`;
    return {
      phase,
      startBar: arc.startBar,
      endBar: arc.endBar,
      tensionLevel: Math.round(tensionLevel * 100) / 100,
      chordSymbols: slice,
      description,
    };
  });
}

function rootPcFromSymbol(symbol: string): number {
  const parsed = parseChordSymbol(symbol);
  const m = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  const name = m?.[1] ?? 'C';
  return noteNameToPitchClass(name) ?? 0;
}

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function pcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function motifFromContext(ctx: MusicContext, bars: readonly string[]): MusicContextMotif {
  if (ctx.motif && ctx.motif.intervalPattern.length > 0) return ctx.motif;
  const roots = bars.slice(0, 4).map(rootPcFromSymbol);
  const intervalPattern: number[] = [];
  for (let i = 1; i < roots.length; i++) {
    intervalPattern.push(((roots[i]! - roots[i - 1]! + 18) % 12) - 6);
  }
  if (intervalPattern.length === 0) intervalPattern.push(2, -1, 2);
  return {
    id: 'harmony-derived',
    intervalPattern,
    rhythmPattern: [{ startBeat: 0, duration: 2 }],
    contourPattern: intervalPattern.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0)),
    producer: 'song_mode',
  };
}

function buildMotivicTransformations(motif: MusicContextMotif): MotivicTransformation[] {
  const intervals = [...motif.intervalPattern];
  const rhythm = motif.rhythmPattern?.map((r) => ({ ...r }));
  return [
    {
      kind: 'augmentation',
      sourceMotifId: motif.id,
      intervalPattern: intervals,
      rhythmPattern: rhythm?.map((r) => ({ startBeat: r.startBeat * 2, duration: r.duration * 2 })),
      description: 'Double rhythmic values; preserve pitch intervals for long-line development',
    },
    {
      kind: 'inversion',
      sourceMotifId: motif.id,
      intervalPattern: intervals.map((iv) => -iv),
      rhythmPattern: rhythm,
      description: 'Invert interval directions around the source cell anchor',
    },
    {
      kind: 'retrograde',
      sourceMotifId: motif.id,
      intervalPattern: [...intervals].reverse(),
      rhythmPattern: rhythm ? [...rhythm].reverse() : undefined,
      description: 'Retrograde interval order — recall source contour backwards',
    },
    {
      kind: 'fragmentation',
      sourceMotifId: motif.id,
      intervalPattern: intervals.slice(0, Math.max(1, Math.ceil(intervals.length / 2))),
      rhythmPattern: rhythm?.slice(0, Math.max(1, Math.ceil((rhythm?.length ?? 1) / 2))),
      description: 'Use opening cell only; repeat and transpose for developmental episodes',
    },
  ];
}

function tritoneRoot(rootPc: number): string {
  return pcName(rootPc + 6);
}

function reharmAlternatives(symbol: string, rng: () => number): ReharmonisationSuggestion['alternatives'] {
  const norm = normalizeChordSymbol(symbol);
  const s = norm.toLowerCase();
  const rootPc = rootPcFromSymbol(norm);
  const root = pcName(rootPc);
  const alts: ReharmonisationSuggestion['alternatives'][number][] = [];

  if (/maj7/.test(s) && !/#11/.test(s)) {
    alts.push({ symbol: `${root}maj9`, rationale: 'Upper-structure extension — same function, richer colour' });
    alts.push({ symbol: `${root}sus2`, rationale: 'Suspended tonic — delay cadential third' });
  } else if (/m7b5|ø/.test(s)) {
    alts.push({ symbol: `${root}dim7`, rationale: 'Diminished passing — chromatic approach to dominant' });
    alts.push({ symbol: `${tritoneRoot(rootPc)}7`, rationale: 'Tritone substitution — Monk/Wayne lateral dominant' });
  } else if (/m7/.test(s)) {
    alts.push({ symbol: `${root}m9`, rationale: 'Dorian extension — preserve minor function' });
    alts.push({ symbol: `${pcName(rootPc + 3)}maj7`, rationale: 'Relative major mediant — tonal side-step' });
  } else if (/7alt|alt/.test(s)) {
    alts.push({ symbol: `${root}7b9`, rationale: 'Altered dominant subset — reduce pitch count' });
    alts.push({ symbol: `${tritoneRoot(rootPc)}7`, rationale: 'Tritone sub — same resolution target' });
  } else if (/7sus|sus/.test(s)) {
    alts.push({ symbol: `${root}7`, rationale: 'Resolve sus tension to functioning dominant' });
    alts.push({ symbol: `${root}m7`, rationale: 'Modal interchange — minor iv colour on dominant' });
  } else if (/7/.test(s)) {
    alts.push({ symbol: `${tritoneRoot(rootPc)}7`, rationale: 'Tritone substitution — chromatic bass motion' });
    alts.push({ symbol: `${root}7alt`, rationale: 'Heighten dominant altereds for climax bars' });
  } else if (/\bm(?!aj)/.test(s)) {
    alts.push({ symbol: `${root}m7`, rationale: 'Minor seventh colour — prelude to ii–V' });
    alts.push({ symbol: `${pcName(rootPc + 9)}7`, rationale: 'Backdoor dominant approach' });
  } else {
    alts.push({ symbol: `${root}maj7`, rationale: 'Tertian major seventh — stable reharm bed' });
    alts.push({ symbol: `${root}6`, rationale: 'Major sixth — jazz tonic substitute' });
  }

  if (alts.length <= 2) return alts;
  const pick = rng() > 0.5 ? alts.slice(0, 2) : [alts[0]!, alts[2] ?? alts[1]!];
  return pick.slice(0, 2);
}

function uniqueChordsInOrder(bars: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bar of bars) {
    const sym = normalizeChordSymbol(String(bar || '').trim());
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out;
}

function buildComposerNotes(params: {
  ctx: MusicContext;
  arcMap: readonly SectionArcEntry[];
  motif: MusicContextMotif;
  reharmCount: number;
}): string {
  const bars = params.ctx.totalBars;
  const key = `${params.ctx.key.root} ${params.ctx.key.mode}`;
  const arcSummary = params.arcMap.map((a) => a.function).join(' → ');
  return [
    `Develops the existing ${bars}-bar ${key} material without replacing the harmonic skeleton.`,
    `Dramatic arc: ${arcSummary}.`,
    `Source motif "${params.motif.id}" yields augmentation, inversion, retrograde, and fragmentation paths.`,
    `${params.reharmCount} chord slots carry 1–2 reharm interpretations for sectional colour.`,
    `Tension rises through development, plateaus at climax, releases in the final section.`,
  ].join(' ');
}

/** Generate compositional elaboration of the same harmonic material. */
export function buildCompositionDepthFromMusicContext(ctx: MusicContext): CompositionDepth {
  const bars = harmonyBarsFromMusicContext(ctx);
  const normalizedBars = bars.map(normalizeChordSymbol);
  const checksum = computeMusicContextChecksum(normalizedBars);
  if (checksum !== ctx.harmony.checksum) {
    throw new Error('Composition depth: harmony checksum mismatch after normalisation');
  }

  const rng = mulberry32((ctx.seed ^ 0x0d8907) >>> 0);
  const sectionArcMap = splitArcRanges(normalizedBars.length);
  const harmonicDevelopmentPlan = buildHarmonicDevelopmentPlan(normalizedBars, sectionArcMap);
  const sourceMotif = motifFromContext(ctx, normalizedBars);
  const motivicTransformations = buildMotivicTransformations(sourceMotif);
  const reharmonisationSuggestions = uniqueChordsInOrder(normalizedBars).map((symbol) => ({
    originalSymbol: symbol,
    alternatives: reharmAlternatives(symbol, rng),
  }));
  const reharmonisationCount = reharmonisationSuggestions.reduce(
    (n, row) => n + row.alternatives.length,
    0,
  );
  const arcSpanBars =
    sectionArcMap.length > 0
      ? sectionArcMap[sectionArcMap.length - 1]!.endBar - sectionArcMap[0]!.startBar + 1
      : 0;

  const payload = {
    sectionCount: sectionArcMap.length,
    reharmonisationCount,
    motivicTransformationCount: motivicTransformations.length,
    arcSpanBars,
  };

  return {
    harmonicDevelopmentPlan,
    motivicTransformations,
    reharmonisationSuggestions,
    sectionArcMap,
    composerNotes: buildComposerNotes({
      ctx,
      arcMap: sectionArcMap,
      motif: sourceMotif,
      reharmCount: reharmonisationCount,
    }),
    provenance: {
      sourceEngineId: 'composition_depth',
      capturedAt: Date.now(),
      sourceContextEngineId: ctx.provenance?.sourceEngineId,
    },
    receipt: {
      engine: 'composition_depth',
      kind: 'composition_depth_complete',
      payload,
    },
  };
}
