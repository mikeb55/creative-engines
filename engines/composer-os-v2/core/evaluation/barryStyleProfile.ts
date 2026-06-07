import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const barryDimensions: StyleDimensionDefinition[] = [
  {
    id: 'thematicMonolith',
    label: 'Thematic Monolith',
    weight: 0.22,
    featureKeys: ['form.themeRestatementRate', 'form.motifCellReuseRate'],
  },
  {
    id: 'bondHarmony',
    label: 'Bond Harmony',
    weight: 0.22,
    featureKeys: ['harmonic.bondChordRate', 'harmonic.minorMaj7Rate'],
  },
  {
    id: 'brassStringPolarity',
    label: 'Brass-String Polarity',
    weight: 0.2,
    featureKeys: ['orchestration.blockBrassRate', 'orchestration.stringMassRate'],
  },
  {
    id: 'melodicNobility',
    label: 'Melodic Nobility',
    weight: 0.18,
    featureKeys: ['melody.declarativePhraseRate', 'melody.meanPhraseLengthBars'],
  },
  {
    id: 'restraintPlusMass',
    label: 'Restraint Plus Mass',
    weight: 0.18,
    featureKeys: ['form.climaxAccumulationRate', 'orchestration.gestureSpaceRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

export interface BarryHardFailReason {
  code: string;
  message: string;
}

export function evaluateBarryHardFails(features: ExtractedStyleFeatures): BarryHardFailReason[] {
  const fails: BarryHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const orch = features.orchestration ?? {};
  const melody = features.melody ?? {};
  const formal = features.formal ?? {};
  const rhythm = features.rhythm ?? {};

  const themeReuse = num(formal.themeRestatementRate ?? formal.motifCellReuseRate);
  if (themeReuse != null && themeReuse < 0.65) {
    fails.push({ code: 'thematic_monolith_low', message: 'Thematic monolith below 0.65 — no dominant theme identity.' });
  }

  const bondRate = num(harmonic.bondChordRate ?? harmonic.minorMaj7Rate);
  if (bondRate != null && bondRate < 0.58) {
    fails.push({ code: 'bond_harmony_low', message: 'Bond harmony palette below 0.58 — min(maj7)/Bond chord language missing.' });
  }

  const blockBrass = num(orch.blockBrassRate);
  const stringMass = num(orch.stringMassRate);
  if (blockBrass != null && stringMass != null && blockBrass < 0.62 && stringMass < 0.58) {
    fails.push({ code: 'brass_string_polarity_low', message: 'Brass-string polarity below threshold — block brass + string mass absent.' });
  }

  const declarative = num(melody.declarativePhraseRate);
  if (declarative != null && declarative < 0.55) {
    fails.push({ code: 'melodic_nobility_low', message: 'Melodic nobility below 0.55 — square declarative arcs missing.' });
  }

  const climaxAccum = num(formal.climaxAccumulationRate);
  if (climaxAccum != null && climaxAccum < 0.52) {
    fails.push({ code: 'restraint_plus_mass_low', message: 'Climax-by-accumulation below 0.52 — decorative motion not Barry mass.' });
  }

  const chromaticString = num(orch.chromaticStringObsessionRate);
  if (chromaticString != null && chromaticString > 0.55) {
    fails.push({ code: 'herrmann_bleed', message: 'Chromatic inner-string agitation dominant — Herrmann bleed.' });
  }

  const modalFolk = num(melody.modalFolkIconRate);
  if (modalFolk != null && modalFolk > 0.5) {
    fails.push({ code: 'morricone_bleed', message: 'Sparse modal folk icons dominant — Morricone bleed.' });
  }

  const atonalCell = num(harmonic.atonalOpenCellRate);
  if (atonalCell != null && atonalCell > 0.48) {
    fails.push({ code: 'goldsmith_bleed', message: 'Atonal interval-cell writing — Goldsmith bleed.' });
  }

  const oddGroove = num(rhythm.oddMeterAccentRate);
  const latinGrid = num(rhythm.percussionGridLock);
  if (oddGroove != null && latinGrid != null && oddGroove > 0.55 && latinGrid > 0.6) {
    fails.push({ code: 'schifrin_bleed', message: 'Odd-meter Latin groove engine — Schifrin bleed.' });
  }

  const decorativeMotion = num(formal.decorativeMotionRate);
  if (decorativeMotion != null && decorativeMotion > 0.55 && (themeReuse ?? 0) < 0.55) {
    fails.push({ code: 'generic_hollywood', message: 'Constant decorative motion without dominant theme — not Barry.' });
  }

  return fails;
}

function scoreThematicMonolith(reuse: number | null, cellReuse: number | null): number {
  const r = reuse ?? cellReuse ?? 0;
  if (r >= 0.75) return 10;
  if (r >= 0.65) return 7;
  if (r >= 0.55) return 4;
  return 1;
}

function scoreBondHarmony(bond: number | null, minMaj7: number | null): number {
  const b = bond ?? minMaj7 ?? 0;
  if (b >= 0.65) return 10;
  if (b >= 0.55) return 7;
  if (b >= 0.45) return 4;
  return 1;
}

function scoreBrassStringPolarity(brass: number | null, strings: number | null): number {
  const b = brass ?? 0;
  const s = strings ?? 0;
  if (b >= 0.68 && s >= 0.62) return 10;
  if (b >= 0.58 || s >= 0.55) return 7;
  if (b >= 0.48) return 4;
  return 1;
}

function scoreMelodicNobility(declarative: number | null, phraseLen: number | null): number {
  const d = declarative ?? 0;
  const p = phraseLen ?? 0;
  if (d >= 0.62 && p >= 4) return 10;
  if (d >= 0.52) return 7;
  if (d >= 0.42) return 4;
  return 1;
}

function scoreRestraintPlusMass(climax: number | null, space: number | null): number {
  const c = climax ?? 0;
  const s = space ?? 0;
  if (c >= 0.62 && s >= 0.45) return 10;
  if (c >= 0.52) return 7;
  if (c >= 0.42) return 4;
  return 1;
}

function scoreBarry(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const o = f.orchestration ?? {};
  const formal = f.formal ?? {};

  const byId: Record<string, number> = {
    thematicMonolith: scoreThematicMonolith(
      num(formal.themeRestatementRate),
      num(formal.motifCellReuseRate)
    ),
    bondHarmony: scoreBondHarmony(num(h.bondChordRate), num(h.minorMaj7Rate)),
    brassStringPolarity: scoreBrassStringPolarity(num(o.blockBrassRate), num(o.stringMassRate)),
    melodicNobility: scoreMelodicNobility(num(m.declarativePhraseRate), num(m.meanPhraseLengthBars)),
    restraintPlusMass: scoreRestraintPlusMass(num(formal.climaxAccumulationRate), num(o.gestureSpaceRate)),
  };

  const dimensions: StyleDimensionScore[] = input.profile.dimensions.map((d) => {
    const s = byId[d.id] ?? 1;
    return {
      id: d.id,
      label: d.label,
      score: s,
      weight: d.weight,
      weightedScore: s * d.weight,
      targetDescription: d.description,
    };
  });

  const finalStyleScore = dimensions.reduce((acc, d) => acc + (d.weightedScore ?? d.score * d.weight), 0);

  let weakestDimensionId = dimensions[0]?.id ?? '';
  let strongestDimensionId = dimensions[0]?.id ?? '';
  let minS = Infinity;
  let maxS = -Infinity;
  for (const d of dimensions) {
    if (d.score < minS) {
      minS = d.score;
      weakestDimensionId = d.id;
    }
    if (d.score > maxS) {
      maxS = d.score;
      strongestDimensionId = d.id;
    }
  }

  const hardFails = evaluateBarryHardFails(f);
  const pass = finalStyleScore >= input.profile.threshold && hardFails.length === 0;

  return {
    styleId: input.profile.id,
    styleName: input.profile.name ?? input.profile.label ?? input.profile.id,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass,
    threshold: input.profile.threshold,
    notes: hardFails.length ? hardFails.map((x) => x.message) : undefined,
  };
}

export const barryStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'barry',
  name: 'John Barry',
  family: 'film',
  threshold: 7.0,
  dimensions: barryDimensions,
  score: scoreBarry,
};

