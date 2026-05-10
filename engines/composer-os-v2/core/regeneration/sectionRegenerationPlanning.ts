/**
 * Bar-range validation for section-scoped regeneration (LOCK-aware).
 */

import type { AppLocks } from '../../app-api/appApiTypes';
import type { FormId } from '../form/formPlanner';
import { resolveFormSections } from '../form/formPlanner';

export interface SectionRegenerationBarSpec {
  startBar: number;
  endBar: number;
}

/** Returns locked bar spans when UI locks "section A" / "section B" using {@link resolveFormSections}. */
export function lockedBarSpansFromSectionLocks(
  formId: FormId | undefined,
  locks: AppLocks | undefined
): Array<{ startBar: number; endBar: number; label: string }> {
  if (!formId || !locks) return [];
  const secs = resolveFormSections(formId);
  const out: Array<{ startBar: number; endBar: number; label: string }> = [];
  if (locks.sectionA) {
    for (const s of secs) {
      const L = s.label;
      if (L === 'A' || L === "A'" || L === "A''") {
        out.push({
          label: L,
          startBar: s.startBar,
          endBar: s.startBar + s.length - 1,
        });
      }
    }
  }
  if (locks.sectionB) {
    const b = secs.find((s) => s.label === 'B');
    if (b) {
      out.push({
        label: 'B',
        startBar: b.startBar,
        endBar: b.startBar + b.length - 1,
      });
    }
  }
  return out;
}

function rangesOverlap(aLo: number, aHi: number, bLo: number, bHi: number): boolean {
  return !(aHi < bLo || bHi < aLo);
}

/**
 * Validates a 1-based inclusive regen span against total bars, melody lock, and optional section A/B locks.
 */
export function validateSectionRegenerationBarRange(params: {
  spec: SectionRegenerationBarSpec;
  totalBars: number;
  fullChordBarCount: number;
  locks?: AppLocks;
  formId?: FormId;
}): { ok: true } | { ok: false; error: string } {
  const { spec, totalBars, fullChordBarCount, locks, formId } = params;
  const { startBar, endBar } = spec;

  if (!Number.isFinite(startBar) || !Number.isFinite(endBar)) {
    return { ok: false, error: 'startBar and endBar must be finite numbers' };
  }
  const sb = Math.floor(startBar);
  const eb = Math.floor(endBar);
  if (sb < 1 || eb < sb) {
    return { ok: false, error: 'invalid bar range (need 1 ≤ startBar ≤ endBar)' };
  }
  if (eb > totalBars) {
    return { ok: false, error: `endBar ${eb} exceeds totalBars ${totalBars}` };
  }
  if (fullChordBarCount !== totalBars) {
    return {
      ok: false,
      error: `harmony length ${fullChordBarCount} does not match totalBars ${totalBars}`,
    };
  }

  if (locks?.melody) {
    return { ok: false, error: 'melody lock is on — section regeneration would rewrite melody' };
  }

  const lockedSpans = lockedBarSpansFromSectionLocks(formId, locks);
  for (const span of lockedSpans) {
    if (rangesOverlap(sb, eb, span.startBar, span.endBar)) {
      return {
        ok: false,
        error: `range overlaps locked section ${span.label} (bars ${span.startBar}-${span.endBar})`,
      };
    }
  }

  return { ok: true };
}
