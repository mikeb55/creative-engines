/**
 * Pentatonic Dev 2.2 — change-cost floor and scored chromatic friction.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev22.test.ts
 */
import assert from 'node:assert/strict';
import { chromaticFrictionMeasure } from '../core/pentatonic/chromaticFriction';
import { DEFAULT_PENTATONIC_SCORING, PENTATONIC_EVALUATOR_VERSION } from '../core/pentatonic/evaluate';
import { WWH_DUO_EVIDENCE_WEIGHTS, WWH_DUO_PROFILE_ID } from '../core/pentatonic/evidenceProfiles';
import { PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { getPentatonicArchetype } from '../core/pentatonic/registry';
import { parseNoteToken } from '../core/pentatonic/pitch';
import {
  DEFAULT_PENTATONIC_PATH_CONFIG,
  PENTATONIC_PATH_CONFIG_VERSION,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5,
  liquidChangeParts,
  resolvePathConfig,
} from '../core/pentatonic/pathConfig';

function collection(archetypeId: 'major_pentatonic' | 'minor_pentatonic', root: string): number[] {
  const note = parseNoteToken(root);
  const archetype = getPentatonicArchetype(archetypeId);
  if (!note || !archetype) throw new Error(`missing ${archetypeId} ${root}`);
  return archetype.intervals.map((interval) => (note.pc + interval) % 12);
}

function oldDiscounted(previous: number[], next: number[], boundary: boolean): number {
  const parts = liquidChangeParts({
    changed: true,
    previous,
    next,
    phraseBoundary: boundary,
    config: DEFAULT_PENTATONIC_PATH_CONFIG,
  });
  return parts.discounted;
}

const probes = [
  { name: 'A Major → D Major, boundary', previous: collection('major_pentatonic', 'A'), next: collection('major_pentatonic', 'D'), boundary: true },
  { name: 'A Major → D Major, mid-phrase', previous: collection('major_pentatonic', 'A'), next: collection('major_pentatonic', 'D'), boundary: false },
  { name: 'C Minor → D Minor, boundary', previous: collection('minor_pentatonic', 'C'), next: collection('minor_pentatonic', 'D'), boundary: true },
  { name: 'C Minor → A Minor, boundary', previous: collection('minor_pentatonic', 'C'), next: collection('minor_pentatonic', 'A'), boundary: true },
  { name: 'A Minor → E Minor, boundary', previous: collection('minor_pentatonic', 'A'), next: collection('minor_pentatonic', 'E'), boundary: true },
];

export function runPentatonicDev22Tests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
      console.log(`PASS ${name}`);
    } catch (error) {
      rows.push({ ok: false, name });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  };

  console.log('DEV 2.2 CHANGE-COST PROBES');
  console.log(`base ${DEFAULT_PENTATONIC_PATH_CONFIG.changeCost}`);
  console.log(`floor ${0.5 * DEFAULT_PENTATONIC_PATH_CONFIG.changeCost}`);
  console.log(`distinct-resource penalty ${DEFAULT_PENTATONIC_PATH_CONFIG.distinctResourcePenalty} (separate; added only on first use)`);
  for (const probe of probes) {
    const parts = liquidChangeParts({
      changed: true,
      previous: probe.previous,
      next: probe.next,
      phraseBoundary: probe.boundary,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    const oldNet = oldDiscounted(probe.previous, probe.next, probe.boundary);
    const firstUse = parts.net + DEFAULT_PENTATONIC_PATH_CONFIG.distinctResourcePenalty;
    console.log(
      [
        probe.name,
        `discounts common ${parts.commonToneDiscount} displacement ${parts.displacementDiscount} boundary ${parts.phraseBoundaryDiscount}`,
        `old liquid/net ${oldNet}`,
        `new floored ${parts.net}`,
        `floorApplied ${parts.floorApplied}`,
        `first-use total ${firstUse}`,
      ].join(' | ')
    );
  }

  check('genuine collection change cannot fall below half the base cost', () => {
    for (const probe of probes) {
      const parts = liquidChangeParts({
        changed: true,
        previous: probe.previous,
        next: probe.next,
        phraseBoundary: probe.boundary,
        config: DEFAULT_PENTATONIC_PATH_CONFIG,
      });
      assert.ok(parts.net >= 0.175 - 1e-9, probe.name);
      assert.equal(parts.net, Math.max(0.175, parts.discounted));
    }
    const boundary = probes[0]!;
    const parts = liquidChangeParts({
      changed: true,
      previous: boundary.previous,
      next: boundary.next,
      phraseBoundary: true,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    assert.ok(Math.abs(parts.discounted - 0.013333333333333336) < 1e-12);
    assert.equal(parts.net, 0.175);
  });

  check('a later return pays the same floored change cost and no extra distinct penalty inside the transition', () => {
    const forward = liquidChangeParts({
      changed: true,
      previous: collection('major_pentatonic', 'A'),
      next: collection('major_pentatonic', 'D'),
      phraseBoundary: true,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    const back = liquidChangeParts({
      changed: true,
      previous: collection('major_pentatonic', 'D'),
      next: collection('major_pentatonic', 'A'),
      phraseBoundary: true,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    assert.equal(forward.net, 0.175);
    assert.equal(back.net, forward.net);
    assert.equal(forward.gross, DEFAULT_PENTATONIC_PATH_CONFIG.changeCost);
  });

  check('NONE boundary is half the base change and ignores discounts', () => {
    const config = resolvePathConfig({ phraseBoundaryChangeDiscount: 0.3 });
    const intoNone = liquidChangeParts({
      changed: true,
      previous: collection('major_pentatonic', 'A'),
      next: null,
      phraseBoundary: true,
      config,
    });
    const outOfNone = liquidChangeParts({
      changed: true,
      previous: null,
      next: collection('major_pentatonic', 'A'),
      phraseBoundary: true,
      config,
    });
    assert.equal(intoNone.floorApplied, false);
    assert.equal(intoNone.commonToneDiscount, 0);
    assert.equal(intoNone.displacementDiscount, 0);
    assert.equal(intoNone.phraseBoundaryDiscount, 0);
    assert.equal(intoNone.net, 0.5 * config.changeCost);
    assert.equal(intoNone.gross, intoNone.net);
    assert.equal(outOfNone.net, intoNone.net);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
  });

  check('same collection is not a change', () => {
    const held = liquidChangeParts({
      changed: false,
      previous: collection('major_pentatonic', 'A'),
      next: collection('major_pentatonic', 'A'),
      phraseBoundary: true,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    assert.equal(held.net, 0);
  });

  check('friction component matches the shared measure and is not an avoid-note veto', () => {
    const aMajor = collection('major_pentatonic', 'A');
    const clean = chromaticFrictionMeasure(aMajor, [
      { role: 'melody', pitchClass: 9, duration: 2, spelling: 'A' },
      { role: 'bass', pitchClass: 4, duration: 2, spelling: 'E' },
    ]);
    assert.equal(clean.component, 1);
    const neighbour = chromaticFrictionMeasure(aMajor, [
      { role: 'melody', pitchClass: 3, duration: 1, spelling: 'Eb' },
      { role: 'bass', pitchClass: 9, duration: 3, spelling: 'A' },
    ]);
    assert.equal(neighbour.frictionDuration, 1);
    assert.equal(neighbour.eligibleDuration, 4);
    assert.equal(neighbour.component, 0.75);
    const neighbourOnly = chromaticFrictionMeasure(aMajor, [{ role: 'melody', pitchClass: 8, duration: 1, spelling: 'G#' }]);
    assert.equal(neighbourOnly.frictionDuration, 1);
    assert.equal(neighbourOnly.component, 0);
    const silent = chromaticFrictionMeasure(aMajor, []);
    assert.equal(silent.component, null);
    assert.equal(DEFAULT_PENTATONIC_SCORING.weights.friction, 0.8);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.friction, 1.4);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.melody, 2.6);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.harmony, 0.9);
    assert.equal(DEFAULT_PENTATONIC_SCORING.minimumSuitability, 0.62);
    assert.equal(PENTATONIC_EVALUATOR_VERSION, 'pentatonic-evaluator-1.1');
    assert.equal(WWH_DUO_PROFILE_ID, 'wwh-duo-1.1');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4, 'pentatonic-path-config-1.1');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5, 'pentatonic-path-config-1.2');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION, 'pentatonic-path-config-1.4');
  });

  check('Dev 2.2 fingerprint stays documented and the live fingerprint moved', () => {
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, 'acd91358d754dbabf6132ebdb6b0f1b28cead13c28daeb35f9ff0e1bc231dc8f');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, 'ef43cf14487dfdc85c93075ae4eda977e4bd984396a8052646a4d1593b849b97');
    const live = pentatonicFrozenConfigFingerprint();
    assert.notEqual(live, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4);
    assert.notEqual(live, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5);
    assert.notEqual(live, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6);
    assert.equal(live, 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6');
  });

  return rows;
}

const rows = runPentatonicDev22Tests();
const failed = rows.filter((row) => !row.ok);
if (failed.length > 0) process.exit(1);
