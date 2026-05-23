/**
 * W2/W3/W6 — Slonimsky knob extreme goldens (mapper + measurable output deltas).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  applyFigureResponseToPunchMaps,
  generateBrassPunches,
  generateShoutChorus,
} from '../core/arranging/bigBandPatterns';
import {
  buildBigBandSlonimskyContext,
  chromaticStrengthToOutsideLevel,
} from '../core/slonimsky/slonimskyPatternService';
import {
  DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE,
  mapBigBandSlonimskyMiddleToGenerateRequest,
} from '../../../apps/composer-os-app/src/types/slonimskyEnsembleState';
import { mapSqBbHybridToGenerateRequest } from '../../../apps/composer-os-app/src/types/slonimskySqBbHybridState';

const GOLDENS_DIR = path.join(__dirname, 'slonimskyKnobGoldens');

export function loadKnobGolden<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(GOLDENS_DIR, fileName), 'utf8')) as T;
}

type BbKnobGolden = {
  id: string;
  engineField: string;
  knobMin: number;
  knobMax: number;
  mapperAtMin: { figureResponse?: string; chromaticStrength?: string };
  mapperAtMax: { figureResponse?: string; chromaticStrength?: string };
  outputEvidence: { metric: string; seed: number; chordBars?: number; barIndex?: number };
};

type SqBbHybridGolden = {
  id: string;
  fields: { densitySplit: string; registerCarve: string };
  densitySplit: {
    knobMin: number;
    knobMax: number;
    mapperAtMin: { blendStrength: string; bbLightTouch?: boolean };
    mapperAtMax: { blendStrength: string };
  };
  registerCarve: {
    knobMin: number;
    knobMax: number;
    mapperAtMin: { chromaticStrength: string };
    mapperAtMax: { chromaticStrength: string };
  };
};

function middleAtCohesion(cohesion: number) {
  return mapBigBandSlonimskyMiddleToGenerateRequest({
    ...DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE,
    cohesion,
    harmonicGrip: 0,
  });
}

function middleAtHarmonicGrip(harmonicGrip: number) {
  return mapBigBandSlonimskyMiddleToGenerateRequest({
    ...DEFAULT_BIG_BAND_SLONIMSKY_MIDDLE,
    cohesion: 0,
    harmonicGrip,
  });
}

export function verifyBbCohesionKnobGolden(): boolean {
  const fx = loadKnobGolden<BbKnobGolden>('bbCohesionExtremes.json');
  const atMin = middleAtCohesion(fx.knobMin);
  const atMax = middleAtCohesion(fx.knobMax);
  if (
    atMin.figureResponse !== fx.mapperAtMin.figureResponse ||
    atMax.figureResponse !== fx.mapperAtMax.figureResponse
  ) {
    return false;
  }
  const chords = Array.from({ length: fx.outputEvidence.chordBars ?? 32 }, () => 'Cmaj7');
  const brass0 = generateBrassPunches(chords, [0, 2]);
  const shout0 = generateShoutChorus(chords);
  const seed = fx.outputEvidence.seed;
  const low = applyFigureResponseToPunchMaps(brass0, shout0, chords.length, {
    figureResponse: atMin.figureResponse,
    seed,
  });
  const high = applyFigureResponseToPunchMaps(brass0, shout0, chords.length, {
    figureResponse: atMax.figureResponse,
    seed,
  });
  return high.brass.size > low.brass.size;
}

export function verifyBbHarmonicGripKnobGolden(): boolean {
  const fx = loadKnobGolden<BbKnobGolden>('bbHarmonicGripExtremes.json');
  const atMin = middleAtHarmonicGrip(fx.knobMin);
  const atMax = middleAtHarmonicGrip(fx.knobMax);
  if (
    atMin.chromaticStrength !== fx.mapperAtMin.chromaticStrength ||
    atMax.chromaticStrength !== fx.mapperAtMax.chromaticStrength
  ) {
    return false;
  }
  const seed = fx.outputEvidence.seed;
  const barIndex = fx.outputEvidence.barIndex ?? 4;
  const base = { seed, barIndex, chordSymbol: 'Cmaj7', registerLow: 55, registerHigh: 84 };
  const levelMin =
    buildBigBandSlonimskyContext({
      ...base,
      allowedOutsideOverride: chromaticStrengthToOutsideLevel(atMin.chromaticStrength)!,
    }).allowedOutsideLevel ?? 0;
  const levelMax =
    buildBigBandSlonimskyContext({
      ...base,
      allowedOutsideOverride: chromaticStrengthToOutsideLevel(atMax.chromaticStrength)!,
    }).allowedOutsideLevel ?? 0;
  return levelMin > levelMax;
}

export function verifySqBbHybridKnobGolden(): boolean {
  const fx = loadKnobGolden<SqBbHybridGolden>('sqBbHybridExtremes.json');
  const densityMin = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'conversation',
    foregroundOwner: 'alternating',
    densitySplit: fx.densitySplit.knobMin,
    registerCarve: 0,
  });
  const densityMax = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'conversation',
    foregroundOwner: 'alternating',
    densitySplit: fx.densitySplit.knobMax,
    registerCarve: 0,
  });
  if (
    densityMin.blendStrength !== fx.densitySplit.mapperAtMin.blendStrength ||
    densityMax.blendStrength !== fx.densitySplit.mapperAtMax.blendStrength ||
    !densityMin.bbLightTouch
  ) {
    return false;
  }
  const regMin = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'conversation',
    foregroundOwner: 'alternating',
    densitySplit: 0,
    registerCarve: fx.registerCarve.knobMin,
  });
  const regMax = mapSqBbHybridToGenerateRequest({
    ensembleRelationship: 'conversation',
    foregroundOwner: 'alternating',
    densitySplit: 0,
    registerCarve: fx.registerCarve.knobMax,
  });
  return (
    regMin.chromaticStrength === fx.registerCarve.mapperAtMin.chromaticStrength &&
    regMax.chromaticStrength === fx.registerCarve.mapperAtMax.chromaticStrength &&
    fx.fields.densitySplit === 'blendStrength' &&
    fx.fields.registerCarve === 'chromaticStrength'
  );
}
