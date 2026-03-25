/**
 * Reference reuse adapter (metadata only).
 */

import { applyReferenceInfluence } from '../core/reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../core/reference-import/extractReferenceBehaviour';
import { parseLeadSheetReferenceText } from '../core/reference-import/leadSheetReferenceParser';
import { createRunManifest } from '../core/run-ledger/createRunManifest';

export function runReferenceReuseAdapterTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const ls = parseLeadSheetReferenceText('Am | Dm | G | C');
  const prof = ls.piece ? extractReferenceBehaviour(ls.piece) : null;
  const env = prof
    ? applyReferenceInfluence(prof, 'song_mode', 'hint_only', 'subtle')
    : null;
  out.push({
    ok: !!env && env.hints.length > 0 && env.metadata.referenceFormArc !== undefined,
    name: 'applyReferenceInfluence returns envelope for song_mode',
  });

  const bb = prof ? applyReferenceInfluence(prof, 'big_band', 'blend', 'moderate') : null;
  out.push({
    ok: !!bb && bb.target === 'big_band',
    name: 'big_band target receives hints',
  });

  const m = createRunManifest({
    version: 'test',
    seed: 1,
    presetId: 'guitar_bass_duo',
    activeModules: ['barry_harris'],
    feelMode: 'swing',
    instrumentProfiles: ['guitar', 'bass'],
    readinessScores: { release: 0.8, mx: 0.8 },
    validationPassed: true,
    timestamp: new Date().toISOString(),
    referenceSourceKind: 'lead_sheet_text',
    referenceBehaviourSummary: 'sectional / medium density',
    referenceInfluenceMode: 'hint_only',
    referenceInfluenceStrength: 'subtle',
  });
  out.push({
    ok:
      m.referenceSourceKind === 'lead_sheet_text' &&
      (m.referenceBehaviourSummary?.includes('sectional') ?? false),
    name: 'createRunManifest carries reference metadata',
  });

  return out;
}
