/**
 * Pentatonic Engine Dev 7.1 — Dev 6 owns stay/move. Dev 7 reports only.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev71.test.ts
 */
import assert from 'node:assert/strict';
import { planAutoColor, type AutoColorPlan } from '../core/pentatonic/autoColor';
import { adviseColourNavigation, planColourNavigation } from '../core/pentatonic/dev7Integration';
import { fieldFromPitchClasses, fieldFromResource, measureFieldDistance } from '../core/pentatonic/fieldDistance';
import { planGradedOut } from '../core/pentatonic/gradedOut';
import { layerRoleForDuo, planLayeredField } from '../core/pentatonic/layeredField';
import { extractParentField } from '../core/pentatonic/parentExtraction';
import { planPivotLink } from '../core/pentatonic/pivotLink';
import { connectFields, moveOut } from '../core/pentatonic/practiceFacade';

const results: { ok: boolean; name: string; error?: string }[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ ok: true, name });
  } catch (error) {
    results.push({ ok: false, name, error: error instanceof Error ? error.message : String(error) });
  }
}

const holdCtx = {
  intentions: ['STAY_CURRENT'] as const,
  formFunction: 'continuation' as const,
  currentResourceId: 'minor_pentatonic',
  homeResourceId: 'minor_pentatonic',
  homeKnown: true,
  fieldIsHome: true,
  centreNote: 'C',
  hasMotif: true,
};

function copyPlan(plan: AutoColorPlan, patch: Partial<AutoColorPlan>): AutoColorPlan {
  return { ...plan, ...patch };
}

check('A RETAIN cannot become a new field', () => {
  const direct = planAutoColor(holdCtx);
  const retained = copyPlan(direct, { operator: 'RETAIN', outcome: 'KEEP_CURRENT', fieldChanged: false, action: 'retain', generationNeeded: false });
  const before = JSON.stringify(retained);
  const advice = adviseColourNavigation({ ...holdCtx, outness: 'REMOTE', parentPitchClasses: [0, 2, 4, 5, 7, 9, 11], layered: true }, retained);
  assert.equal(advice.applied, false);
  assert.equal(JSON.stringify(retained), before);
  assert.equal(retained.fieldChanged, false);
  assert.equal(retained.targetResourceId, direct.targetResourceId);
});

check('B HOLD_FIELD cannot be overridden', () => {
  const direct = planAutoColor(holdCtx);
  const held = copyPlan(direct, { operator: 'HOLD_FIELD', outcome: 'PLAN', fieldChanged: false, action: 'retain', generationNeeded: false });
  const advice = adviseColourNavigation({ ...holdCtx, outness: 'STRONG' }, held);
  assert.equal(advice.applied, false);
  assert.equal(held.fieldChanged, false);
  assert.equal(held.operator, 'HOLD_FIELD');
  if (advice.gradedOut) {
    assert.equal(advice.gradedOut.initiatesMove, false);
    assert.match(advice.explanation, /Informational|does not choose|Dev 6/);
  }
});

check('C NONE cannot be lifted by extraction', () => {
  const ctx = { ...holdCtx, pathIsNone: true, intentions: ['MORE_AMBIGUOUS'] as const, parentPitchClasses: [0, 2, 4, 5, 7, 9, 11] };
  const direct = planAutoColor(ctx);
  const wrapped = planColourNavigation(ctx);
  assert.equal(direct.outcome, 'NONE');
  assert.deepEqual(wrapped.dev6, direct);
  assert.equal(wrapped.advice.applied, false);
  assert.equal(wrapped.advice.extraction, null);
  assert.equal(wrapped.dev6.fieldChanged, false);
});

check('D NO_PHRASE cannot become generated material', () => {
  const ctx = {
    ...holdCtx,
    intentions: ['ANSWER_BASS'] as const,
    hasMotif: false,
    outness: 'MODERATE' as const,
    parentPitchClasses: [0, 2, 4, 7, 9],
    layered: true,
  };
  const direct = planAutoColor(ctx);
  assert.equal(direct.outcome, 'NO_PHRASE');
  assert.equal(direct.generationNeeded, false);
  const advice = adviseColourNavigation(ctx, direct);
  assert.equal(advice.applied, false);
  assert.equal(advice.consulted, 'SILENCE');
  assert.equal(advice.gradedOut, null);
  assert.equal(advice.extraction, null);
  assert.equal(advice.layered, null);
  assert.equal(direct.generationNeeded, false);
  assert.equal(direct.fieldChanged, false);
});

check('E STRUCTURAL_SILENCE cannot become a new field', () => {
  const ctx = { ...holdCtx, intentions: ['MORE_SPACE'] as const, outness: 'REMOTE' as const, layered: true };
  const direct = planAutoColor(ctx);
  assert.equal(direct.outcome, 'STRUCTURAL_SILENCE');
  const advice = adviseColourNavigation(ctx, direct);
  assert.equal(advice.applied, false);
  assert.equal(advice.consulted, 'SILENCE');
  assert.equal(advice.gradedOut, null);
  assert.equal(direct.fieldChanged, false);
});

check('F GRADED_OUT without a Dev 6 move is informational', () => {
  const direct = planAutoColor(holdCtx);
  const advice = adviseColourNavigation({ ...holdCtx, outness: 'SUBTLE' }, direct);
  assert.equal(advice.applied, false);
  assert.equal(advice.consulted, 'GRADED_OUT');
  assert.equal(advice.gradedOut?.initiatesMove, false);
  assert.match(advice.explanation, /Informational/);
  assert.equal(advice.explanation.toLowerCase().includes('move to'), false);
  assert.equal(direct.fieldChanged, false);
});

check('G GRADED_OUT with a Dev 6 move reports that destination only', () => {
  const direct = planAutoColor(holdCtx);
  const moved = copyPlan(direct, {
    operator: 'SLIP',
    outcome: 'PLAN',
    action: 'change',
    fieldChanged: true,
    generationNeeded: true,
    targetResourceId: 'major_pentatonic',
    silencePreference: 'NONE',
    homeReturn: false,
  });
  const advice = adviseColourNavigation({ ...holdCtx, outness: 'REMOTE' }, moved);
  assert.equal(advice.applied, false);
  assert.equal(advice.gradedOut?.destination.resourceId, 'major_pentatonic');
  assert.equal(advice.gradedOut?.initiatesMove, false);
  assert.match(advice.explanation, /does not replace/);
  assert.equal(moved.targetResourceId, 'major_pentatonic');
  assert.equal(advice.pivot?.destination.resourceId, 'major_pentatonic');
});

check('H PIVOT_LINK requires an existing destination', () => {
  const open = connectFields({ fieldId: 'minor_pentatonic', centre: 'C' });
  assert.match(open.text, /No destination/);
  assert.equal(open.candidates.find((row) => row.slot === 'Destination')?.text, 'None');
  const closed = connectFields({ fieldId: 'minor_pentatonic', destinationFieldId: 'major_pentatonic', centre: 'C' });
  assert.equal(closed.candidates.find((row) => row.slot === 'Destination')?.text.includes('Major') || closed.candidates.find((row) => row.slot === 'Destination')?.text.includes('major'), true);
  const source = fieldFromResource('minor_pentatonic', 'C');
  const destination = fieldFromResource('major_pentatonic', 'C');
  assert.ok(source && destination);
  const pivot = planPivotLink({ source, destination });
  assert.equal(pivot.destination.resourceId, 'major_pentatonic');
});

check('I zero-share pair returns no credible pivot', () => {
  const source = fieldFromPitchClasses([8, 10, 0, 3, 7], 'Ab');
  const destination = fieldFromPitchClasses([9, 11, 2, 4, 6], 'A');
  assert.ok(source && destination);
  const distance = measureFieldDistance(source, destination);
  assert.equal(distance.sharedCount, 0);
  const pivot = planPivotLink({ source, destination });
  assert.equal(pivot.mechanism, 'NO_CREDIBLE_PIVOT');
  assert.deepEqual([...pivot.pivotNotes], []);
  assert.equal(pivot.landingNote, null);
  assert.equal(pivot.linkPhraseNeeded, false);
  assert.equal(pivot.explanation.toLowerCase().includes('nearest'), false);
});

check('J PARENT_EXTRACTION stays advisory', () => {
  const direct = planAutoColor(holdCtx);
  const ctx = { ...holdCtx, intentions: ['MORE_AMBIGUOUS'] as const, parentPitchClasses: [0, 2, 4, 5, 7, 9, 11] };
  const plan = copyPlan(planAutoColor(ctx), { operator: 'HOLD_FIELD', fieldChanged: false, outcome: 'PLAN', action: 'retain' });
  const advice = adviseColourNavigation(ctx, plan);
  assert.equal(advice.applied, false);
  assert.equal(advice.consulted, 'PARENT_EXTRACTION');
  assert.match(advice.explanation, /Report only/);
  assert.equal(plan.fieldChanged, false);
  const none = extractParentField({ parentPitchClasses: [0, 1, 2, 3, 4, 5] });
  assert.equal(none.disposition, 'NONE');
  assert.equal(direct.fieldChanged, false);
});

check('K LAYERED_FIELD stays metadata and bass response is not bass lead', () => {
  assert.equal(layerRoleForDuo('BASS_LEADS'), 'GUITAR_SLOW_BASS_ACTIVE');
  assert.equal(layerRoleForDuo('BASS_RESPONDS'), 'GUITAR_ACTIVE_BASS_SLOW');
  assert.equal(layerRoleForDuo('BASS_SUPPORTS'), 'GUITAR_ACTIVE_BASS_SLOW');
  assert.equal(layerRoleForDuo('SPACE'), 'SHARED_SPACE');
  const field = fieldFromResource('minor_pentatonic', 'C');
  assert.ok(field);
  const layered = planLayeredField({ field, role: layerRoleForDuo('BASS_RESPONDS') });
  assert.equal(layered.initiatesMove, false);
  assert.equal(layered.sameGoverningField, true);
  const plan = copyPlan(planAutoColor(holdCtx), {
    duoRole: 'BASS_RESPONDS',
    operator: 'HOLD_FIELD',
    outcome: 'PLAN',
    fieldChanged: false,
    action: 'retain',
  });
  const advice = adviseColourNavigation({ ...holdCtx, layered: true }, plan);
  assert.equal(advice.applied, false);
  assert.equal(advice.layered?.roleRelation, 'GUITAR_ACTIVE_BASS_SLOW');
  assert.equal(advice.layered?.initiatesMove, false);
});

check('L Hobo positive control is analysed and the destination stays', () => {
  const source = fieldFromPitchClasses([0, 2, 5, 7, 10], 'G');
  const destination = fieldFromPitchClasses([0, 3, 5, 8, 10], 'F');
  assert.ok(source && destination);
  const distance = measureFieldDistance(source, destination);
  assert.equal(distance.sharedCount, 3);
  assert.equal(distance.distanceClass, 'RELATED');
  const pivot = planPivotLink({ source, destination });
  assert.equal(pivot.mechanism === 'NO_CREDIBLE_PIVOT', false);
  assert.ok(pivot.commonTones.includes(0));
  assert.ok(pivot.commonTones.includes(5));
  assert.ok(pivot.commonTones.includes(10));
  const direct = planAutoColor({
    ...holdCtx,
    centreNote: 'G',
    currentResourceId: 'minor_pentatonic',
    homeResourceId: 'minor_pentatonic',
  });
  const moved = copyPlan(direct, {
    operator: 'SLIP',
    outcome: 'PLAN',
    action: 'change',
    fieldChanged: true,
    targetResourceId: 'major_pentatonic',
    silencePreference: 'NONE',
  });
  const before = moved.targetResourceId;
  const advice = adviseColourNavigation({
    ...holdCtx,
    centreNote: 'G',
    currentResourceId: 'minor_pentatonic',
    outness: 'MODERATE',
  }, moved);
  assert.equal(moved.targetResourceId, before);
  assert.equal(advice.applied, false);
  assert.equal(advice.gradedOut?.destination.resourceId, 'major_pentatonic');
  assert.match(advice.explanation, /does not replace/);
  const view = moveOut({ fieldId: 'minor_pentatonic', centre: 'G' }, 'MODERATE');
  assert.equal(view.title, 'Distance');
  assert.equal(view.text.toLowerCase().includes('move to'), false);
  const band = planGradedOut({ source, outness: 'MODERATE', home: source });
  assert.equal(band.initiatesMove, false);
  assert.equal(band.disposition === 'DISTANCE' || band.disposition === 'STAY', true);
});

const failed = results.filter((row) => !row.ok);
for (const row of results) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.error ? ` — ${row.error}` : ''}`);
}
console.log(`${results.length - failed.length}/${results.length}`);
if (failed.length > 0) process.exit(1);
