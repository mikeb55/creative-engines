/**
 * Big Band / String Quartet — section-scoped regen: fragment realisation + MusicXML splice (same LOCK pattern as duo/ECM).
 */

import type { GenerateRequest } from '../../app-api/appApiTypes';
import { runBigBandRealisation } from '../big-band/runBigBandRealisation';
import type { StringQuartetRunInput } from '../string-quartet/runStringQuartetMode';
import { runQuartetRealisation } from '../string-quartet/runQuartetRealisation';
import { deriveChordBarsFromProgressionOrLeadSheet } from './ensembleChordBars';
import { fragmentBarMeterMapFromFull } from './barMeterMapFragment';
import { splicePartwiseMusicXmlMeasures } from './musicXmlSectionSplice';
import { validateSectionRegenerationBarRange } from './sectionRegenerationPlanning';
import { sliceLeadSheetChordEventsForSpan } from './sliceLeadSheetChordSpan';
import type { FormId } from '../form/formPlanner';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { GenerationMetadata } from '../compositionContext';

type BigBandRealisationInput = Parameters<typeof runBigBandRealisation>[0];
type QuartetRealisationInput = Parameters<typeof runQuartetRealisation>[0];

export function sectionRegenerationReceiptLine(startBar: number, endBar: number, span: number): string {
  return `section_regen bars ${startBar}-${endBar} span=${span}`;
}

export function runBigBandSectionRegenerationPipeline(params: {
  req: GenerateRequest;
  baseMusicXml: string;
  ensembleInput: BigBandRealisationInput;
  totalBars: number;
}):
  | {
      ok: true;
      mergedXml: string;
      fragmentRealised: ReturnType<typeof runBigBandRealisation>;
      receipt: string;
    }
  | { ok: false; error: string } {
  const { req, baseMusicXml, ensembleInput, totalBars } = params;
  const sr = req.sectionRegeneration;
  if (!sr) return { ok: false, error: 'sectionRegeneration missing' };

  const fullBars = deriveChordBarsFromProgressionOrLeadSheet({
    chordProgressionText: ensembleInput.chordProgressionText as string | undefined,
    leadSheet: ensembleInput.leadSheet,
    totalBars,
  });
  if (!fullBars || fullBars.length !== totalBars) {
    return {
      ok: false,
      error:
        'section regeneration requires harmony for every bar (piped chord progression or import lock filling all bars)',
    };
  }

  const vr = validateSectionRegenerationBarRange({
    spec: { startBar: sr.startBar, endBar: sr.endBar },
    totalBars,
    fullChordBarCount: fullBars.length,
    locks: req.locks,
    formId: req.formId as FormId | undefined,
  });
  if (!vr.ok) return { ok: false, error: vr.error };

  const sb = Math.floor(sr.startBar);
  const eb = Math.floor(sr.endBar);
  const sliceBars = fullBars.slice(sb - 1, eb);
  const span = sliceBars.length;
  if (span !== eb - sb + 1) return { ok: false, error: 'internal slice length mismatch' };

  const fragMeterMap = fragmentBarMeterMapFromFull(ensembleInput.barMeterMap, sb, span);
  const slicedLead = sliceLeadSheetChordEventsForSpan(ensembleInput.leadSheet, sb, eb);

  const fragmentInput: BigBandRealisationInput = {
    ...ensembleInput,
    totalBars: span,
    chordProgressionText: sliceBars.join('|'),
    ...(slicedLead ? { leadSheet: slicedLead } : {}),
    ...(fragMeterMap && Object.keys(fragMeterMap).length > 0 ? { barMeterMap: fragMeterMap } : {}),
  };

  let fragmentRealised: ReturnType<typeof runBigBandRealisation>;
  try {
    fragmentRealised = runBigBandRealisation(fragmentInput);
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }

  const fragXml = fragmentRealised.exportPipeline.xml;
  if (!fragmentRealised.exportPipeline.ok || !fragXml?.trim()) {
    return {
      ok: false,
      error:
        fragmentRealised.exportPipeline.errors?.join(' | ') ??
        'fragment big band realisation did not produce MusicXML',
    };
  }

  const merged = splicePartwiseMusicXmlMeasures(baseMusicXml.trim(), fragXml, sb, eb);
  if (!merged.ok) {
    return { ok: false, error: merged.errors.join('; ') };
  }

  return {
    ok: true,
    mergedXml: merged.xml,
    fragmentRealised,
    receipt: sectionRegenerationReceiptLine(sb, eb, span),
  };
}

export function runStringQuartetSectionRegenerationPipeline(params: {
  req: GenerateRequest;
  baseMusicXml: string;
  quartetInput: QuartetRealisationInput;
  totalBars: number;
  /** Fragment metadata builder — caller passes span-local totals + sliced chord text + optional barMeter override. */
  buildFragmentGenerationMetadata?: (
    span: number,
    sliceChordText: string,
    fragmentBarMeterMap: BarMeterMap | undefined
  ) => GenerationMetadata | undefined;
}):
  | {
      ok: true;
      mergedXml: string;
      fragmentRealised: ReturnType<typeof runQuartetRealisation>;
      receipt: string;
    }
  | { ok: false; error: string } {
  const { req, baseMusicXml, quartetInput, totalBars, buildFragmentGenerationMetadata } = params;
  const sr = req.sectionRegeneration;
  if (!sr) return { ok: false, error: 'sectionRegeneration missing' };

  const fullBars = deriveChordBarsFromProgressionOrLeadSheet({
    chordProgressionText: quartetInput.chordProgressionText as string | undefined,
    leadSheet: quartetInput.leadSheet,
    totalBars,
  });
  if (!fullBars || fullBars.length !== totalBars) {
    return {
      ok: false,
      error:
        'section regeneration requires harmony for every bar (piped chord progression or import lock filling all bars)',
    };
  }

  const vr = validateSectionRegenerationBarRange({
    spec: { startBar: sr.startBar, endBar: sr.endBar },
    totalBars,
    fullChordBarCount: fullBars.length,
    locks: req.locks,
    formId: req.formId as FormId | undefined,
  });
  if (!vr.ok) return { ok: false, error: vr.error };

  const sb = Math.floor(sr.startBar);
  const eb = Math.floor(sr.endBar);
  const sliceBars = fullBars.slice(sb - 1, eb);
  const span = sliceBars.length;
  if (span !== eb - sb + 1) return { ok: false, error: 'internal slice length mismatch' };

  const sliceText = sliceBars.join('|');
  const fragMeterMap = fragmentBarMeterMapFromFull(quartetInput.barMeterMap, sb, span);
  const slicedLead = sliceLeadSheetChordEventsForSpan(quartetInput.leadSheet, sb, eb);

  const fragmentMeta = buildFragmentGenerationMetadata?.(
    span,
    sliceText,
    fragMeterMap && Object.keys(fragMeterMap).length > 0 ? fragMeterMap : undefined
  );

  const fragmentInput: QuartetRealisationInput = {
    ...quartetInput,
    totalBars: span,
    chordProgressionText: sliceText,
    ...(slicedLead ? { leadSheet: slicedLead } : {}),
    ...(fragMeterMap && Object.keys(fragMeterMap).length > 0 ? { barMeterMap: fragMeterMap } : {}),
    ...(fragmentMeta ? { generationMetadata: fragmentMeta } : {}),
  };

  const fragmentRealised = runQuartetRealisation(fragmentInput);
  const fragXml = fragmentRealised.exportPipeline.xml;
  if (!fragmentRealised.exportPipeline.ok || !fragXml?.trim()) {
    return {
      ok: false,
      error:
        fragmentRealised.exportPipeline.errors?.join(' | ') ??
        'fragment string quartet realisation did not produce MusicXML',
    };
  }

  const merged = splicePartwiseMusicXmlMeasures(baseMusicXml.trim(), fragXml, sb, eb);
  if (!merged.ok) {
    return { ok: false, error: merged.errors.join('; ') };
  }

  return {
    ok: true,
    mergedXml: merged.xml,
    fragmentRealised,
    receipt: sectionRegenerationReceiptLine(sb, eb, span),
  };
}
