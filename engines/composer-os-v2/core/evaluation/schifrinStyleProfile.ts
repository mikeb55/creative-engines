import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const schifrinDimensions: StyleDimensionDefinition[] = [
  {
    id: 'oddMeterGroove',
    label: 'Odd Meter Groove',
    weight: 0.22,
    featureKeys: ['rhythm.oddMeterAccentRate', 'rhythm.syncopationDensity'],
  },
  {
    id: 'latinPercussionGrid',
    label: 'Latin Percussion Grid',
    weight: 0.22,
    featureKeys: ['rhythm.percussionGridLock', 'rhythm.claveSubdivisionRate'],
  },
  {
    id: 'brassAttackDensity',
    label: 'Brass Attack Density',
    weight: 0.2,
    featureKeys: ['orchestration.brassStabRate', 'orchestration.brassRegisterSpread'],
  },
  {
    id: 'modalAlteredHarmony',
    label: 'Modal Altered Harmony',
    weight: 0.18,
    featureKeys: ['harmonic.modalVampRate', 'harmonic.functionalCloseRate'],
  },
  {
    id: 'motivicCompactness',
    label: 'Motivic Compactness',
    weight: 0.18,
    featureKeys: ['form.motifCellLengthBars', 'melody.repeatedNoteEntryRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

export interface SchifrinHardFailReason {
  code: string;
  message: string;
}

export function evaluateSchifrinHardFails(features: ExtractedStyleFeatures): SchifrinHardFailReason[] {
  const fails: SchifrinHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const rhythm = features.rhythm ?? {};
  const orch = features.orchestration ?? {};
  const melody = features.melody ?? {};
  const formal = features.formal ?? {};

  const oddMeter = num(rhythm.oddMeterAccentRate);
  if (oddMeter != null && oddMeter < 0.65) {
    fails.push({ code: 'odd_meter_groove_low', message: 'Odd meter groove below 0.65 — motor energy missing.' });
  }

  const percussionGrid = num(rhythm.percussionGridLock ?? rhythm.claveSubdivisionRate);
  if (percussionGrid != null && percussionGrid < 0.72) {
    fails.push({ code: 'latin_percussion_grid_low', message: 'Latin percussion grid below 0.72 — clave layer not structural.' });
  }

  const brassAttack = num(orch.brassStabRate);
  if (brassAttack != null && brassAttack < 0.68) {
    fails.push({ code: 'brass_attack_low', message: 'Brass attack density below 0.68 — syncopated engine inactive.' });
  }

  const modalVamp = num(harmonic.modalVampRate);
  if (modalVamp != null && modalVamp < 0.62) {
    fails.push({ code: 'modal_altered_low', message: 'Modal altered harmony below 0.62 — vamp field not locked to groove.' });
  }

  const motifCell = num(formal.motifCellLengthBars);
  if (motifCell != null && motifCell > 2.5) {
    fails.push({ code: 'motivic_compactness_low', message: 'Motif spans exceed 2 bars — not Schifrin cell logic.' });
  }

  const repeatedNote = num(melody.repeatedNoteEntryRate);
  if (repeatedNote != null && repeatedNote < 0.68) {
    fails.push({ code: 'motivic_entry_low', message: 'Motivic compactness below 0.68 — angular cell entries missing.' });
  }

  const functionalClose = num(harmonic.functionalCloseRate);
  if (functionalClose != null && functionalClose > 0.25) {
    fails.push({ code: 'cadential_closure_high', message: 'Classical cadential closure too high for Schifrin groove lock.' });
  }

  const chromaticStringObsession = num(orch.chromaticStringObsessionRate);
  if (chromaticStringObsession != null && chromaticStringObsession > 0.55) {
    fails.push({ code: 'herrmann_bleed', message: 'Dense chromatic string obsession — Herrmann bleed.' });
  }

  const pastoralStillness = num(melody.pastoralStillnessRate);
  if (pastoralStillness != null && pastoralStillness > 0.5) {
    fails.push({ code: 'morricone_bleed', message: 'Sparse pastoral stillness — Morricone bleed.' });
  }

  const atonalWithoutGroove = num(harmonic.atonalOpenCellRate);
  const grooveLock = num(rhythm.percussionGridLock);
  if (atonalWithoutGroove != null && atonalWithoutGroove > 0.5 && (grooveLock ?? 0) < 0.6) {
    fails.push({ code: 'goldsmith_bleed', message: 'Atonal open cells without groove — Goldsmith bleed.' });
  }

  const loungeMelody = num(melody.symmetricalLoungeMelodyRate);
  if (loungeMelody != null && loungeMelody > 0.45) {
    fails.push({ code: 'mancini_bleed', message: 'Suave symmetrical lounge melody — Mancini bleed.' });
  }

  const motorEnergy = num(rhythm.motorEnergyRate ?? rhythm.syncopationDensity);
  if (motorEnergy != null && motorEnergy < 0.55) {
    fails.push({ code: 'passive_output', message: 'Passive output with no motor energy — not Schifrin.' });
  }

  return fails;
}

function scoreDimension(id: string, features: ExtractedStyleFeatures): number {
  const harmonic = features.harmonic ?? {};
  const rhythm = features.rhythm ?? {};
  const orch = features.orchestration ?? {};
  const melody = features.melody ?? {};
  const formal = features.formal ?? {};

  switch (id) {
    case 'oddMeterGroove': {
      const odd = num(rhythm.oddMeterAccentRate) ?? 0;
      const sync = num(rhythm.syncopationDensity) ?? 0;
      if (odd >= 0.72 && sync >= 0.6) return 10;
      if (odd >= 0.65) return 7;
      if (odd >= 0.5) return 4;
      return 1;
    }
    case 'latinPercussionGrid': {
      const grid = num(rhythm.percussionGridLock ?? rhythm.claveSubdivisionRate) ?? 0;
      if (grid >= 0.8) return 10;
      if (grid >= 0.72) return 7;
      if (grid >= 0.6) return 4;
      return 1;
    }
    case 'brassAttackDensity': {
      const brass = num(orch.brassStabRate) ?? 0;
      if (brass >= 0.75) return 10;
      if (brass >= 0.68) return 7;
      if (brass >= 0.55) return 4;
      return 1;
    }
    case 'modalAlteredHarmony': {
      const modal = num(harmonic.modalVampRate) ?? 0;
      const close = num(harmonic.functionalCloseRate) ?? 1;
      if (modal >= 0.7 && close <= 0.2) return 10;
      if (modal >= 0.62 && close <= 0.25) return 7;
      if (modal >= 0.5) return 4;
      return 1;
    }
    case 'motivicCompactness': {
      const cell = num(formal.motifCellLengthBars) ?? 8;
      const rep = num(melody.repeatedNoteEntryRate) ?? 0;
      if (cell <= 2 && rep >= 0.75) return 10;
      if (cell <= 2 && rep >= 0.68) return 7;
      if (cell <= 3) return 4;
      return 1;
    }
    default:
      return 4;
  }
}

function scoreSchifrin(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const byId: Record<string, number> = {};
  for (const d of schifrinDimensions) {
    byId[d.id] = scoreDimension(d.id, f);
  }

  const dimensions: StyleDimensionScore[] = schifrinDimensions.map((d) => ({
    id: d.id,
    label: d.label,
    weight: d.weight,
    score: byId[d.id] ?? 1,
    weightedScore: (byId[d.id] ?? 1) * d.weight,
  }));

  const weighted = dimensions.reduce((sum, d) => sum + d.score * (d.weight ?? 0), 0);
  const hardFails = evaluateSchifrinHardFails(f);
  const threshold = input.profile.threshold ?? 7;
  const pass = weighted >= threshold && hardFails.length === 0;
  let weakestDimensionId = dimensions[0]?.id ?? '';
  let strongestDimensionId = dimensions[0]?.id ?? '';
  for (const d of dimensions) {
    const curWeak = dimensions.find((x) => x.id === weakestDimensionId);
    if (curWeak && d.score < curWeak.score) weakestDimensionId = d.id ?? weakestDimensionId;
    const curStrong = dimensions.find((x) => x.id === strongestDimensionId);
    if (curStrong && d.score > curStrong.score) strongestDimensionId = d.id ?? strongestDimensionId;
  }

  return {
    styleId: input.profile.id,
    styleName: input.profile.name ?? input.profile.label ?? input.profile.id,
    pass,
    finalStyleScore: weighted,
    dimensions,
    weakestDimensionId,
    strongestDimensionId,
    threshold,
    hardFails: hardFails.length ? hardFails : undefined,
  };
}

export const schifrinStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'schifrin',
  name: 'Lalo Schifrin — Groove Film / Jazz-Latin',
  label: 'Lalo Schifrin — Groove Film / Jazz-Latin',
  threshold: 7.0,
  dimensions: schifrinDimensions,
  score: scoreSchifrin,
  family: 'film',
};
