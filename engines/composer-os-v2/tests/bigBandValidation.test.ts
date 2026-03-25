/**
 * Big Band validation (Prompt 5/7).
 */

import { planBigBandDensity } from '../core/big-band/bigBandDensityPlanner';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBigBandSections } from '../core/big-band/bigBandSectionPlanner';
import {
  mergeBigBandValidation,
  validateBassAnchorCoverage,
  validateDensityOverloadBigBand,
  validateRhythmSectionAlwaysActive,
  type BigBandValidationResult,
} from '../core/big-band/bigBandValidation';

export function runBigBandValidationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const form = planDefaultBigBandForm(99, { totalBars: 32 });
  const good = planBigBandSections(form, 99);
  const density = planBigBandDensity(form);

  const vRhythm = validateRhythmSectionAlwaysActive(good);
  out.push({
    ok: vRhythm.ok,
    name: 'validation: rhythm section active',
  });

  const vBass = validateBassAnchorCoverage(good);
  out.push({
    ok: vBass.ok,
    name: 'validation: bass anchor coverage',
  });

  const badRhythm: typeof good = {
    slices: good.slices.map((s, i) =>
      i === 0
        ? {
            ...s,
            rolesBySection: { ...s.rolesBySection, rhythm_section: 'silence' },
          }
        : s
    ),
  };
  const vBad = validateRhythmSectionAlwaysActive(badRhythm);
  out.push({
    ok: !vBad.ok,
    name: 'negative: remove rhythm section role → must fail',
  });

  const badBass: typeof good = {
    slices: good.slices.map((s) => ({
      ...s,
      rolesBySection: {
        ...s.rolesBySection,
        rhythm_section: 'rhythm_anchor',
      },
    })),
  };
  const noBassAnchor = validateBassAnchorCoverage(badBass);
  out.push({
    ok: !noBassAnchor.ok,
    name: 'negative: no bass_anchor anywhere → must fail',
  });

  const overload: BigBandValidationResult = validateDensityOverloadBigBand(2, 1.35);
  out.push({
    ok: !overload.ok,
    name: 'validation catches density overload threshold',
  });

  const merged = mergeBigBandValidation(vRhythm, vBass);
  out.push({
    ok: merged.ok && merged.errors.length === 0,
    name: 'mergeBigBandValidation combines results',
  });

  void density;
  return out;
}
