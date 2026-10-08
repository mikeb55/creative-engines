/**
 * Musician-facing Dev 7 readouts for Pentatonic Options.
 * These functions measure and describe. They do not plan a phrase or choose a field.
 */
import { fieldFromResource, measureFieldDistance, registeredFieldsAround, type PentatonicField } from '../../../engines/composer-os-v2/core/pentatonic/fieldDistance';
import { planGradedOut, type OutnessLevel } from '../../../engines/composer-os-v2/core/pentatonic/gradedOut';
import { planLayeredField, type LayerRole } from '../../../engines/composer-os-v2/core/pentatonic/layeredField';
import { extractParentField } from '../../../engines/composer-os-v2/core/pentatonic/parentExtraction';
import { planPivotLink } from '../../../engines/composer-os-v2/core/pentatonic/pivotLink';
import { canonicalPitchSetId, parseNoteList, sharpName } from '../../../engines/composer-os-v2/core/pentatonic/pitch';
import type { PracticeRequest } from '../../../engines/composer-os-v2/core/pentatonic/practiceFacade';

export interface AdvisoryCard {
  ready: boolean;
  writesPhrase: false;
  text: string;
  detail: string;
}

const BAND: Record<OutnessLevel, string> = {
  SUBTLE: 'NEAR',
  MODERATE: 'RELATED',
  STRONG: 'OUTSIDE',
  REMOTE: 'REMOTE',
};

export function describeFieldDistance(input: {
  centre?: string;
  fieldId?: string;
  targetCentre?: string;
  targetFieldId?: string;
} = {}): AdvisoryCard {
  const source = fieldFromResource(input.fieldId || 'minor_pentatonic', input.centre || 'C');
  const targetId = (input.targetFieldId || '').trim();
  if (!source) return card(false, 'That field is not in the vocabulary.', '');
  if (!targetId) return card(false, 'Choose a target field.', '');
  const target = fieldFromResource(targetId, (input.targetCentre || '').trim() || input.centre || 'C');
  if (!target) return card(false, 'That target is not in the vocabulary.', '');
  const distance = measureFieldDistance(source, target);
  const text = [
    'CURRENT FIELD:',
    musicianName(source),
    '',
    'TARGET:',
    musicianName(target),
    '',
    'DISTANCE:',
    distance.distanceClass,
    '',
    'SHARED NOTES:',
    String(distance.sharedCount),
  ].join('\n');
  const detail = `Centre ${distance.centreRelationship.replaceAll('_', ' ').toLowerCase()}. Continuity ${distance.continuityPotential.toFixed(2)}.`;
  return card(true, text, detail);
}

export function describeOutness(request: PracticeRequest = {}, outness: OutnessLevel = 'MODERATE'): AdvisoryCard {
  const source = fieldFromResource(request.fieldId || 'minor_pentatonic', request.centre || 'C');
  if (!source) return card(false, 'That field is not in the vocabulary.', '');
  const home = fieldFromResource(source.resourceId ?? 'minor_pentatonic', request.centre || 'C');
  const plan = planGradedOut({ source, outness, home });
  const names = bandNames(source, outness, plan.disposition === 'DISTANCE' ? plan.destination : null);
  const body = plan.disposition === 'STAY' || names.length === 0
    ? 'None. The current field already sits in that band. Nothing was chosen.'
    : names.join('\n');
  const text = [
    `${outness} candidates`,
    '',
    'CURRENT FIELD:',
    musicianName(source),
    '',
    'IN THIS BAND:',
    body,
    '',
    'Report only. No phrase was written.',
  ].join('\n');
  return card(true, text, 'A distance band is a report. Dev 6 still decides whether to move.');
}

export function describePivot(input: {
  centre?: string;
  fieldId?: string;
  targetCentre?: string;
  targetFieldId?: string;
  motif?: string;
} = {}): AdvisoryCard {
  const source = fieldFromResource(input.fieldId || 'minor_pentatonic', input.centre || 'C');
  if (!source) return card(false, 'That field is not in the vocabulary.', '');
  const targetId = (input.targetFieldId || '').trim();
  if (!targetId) return card(false, 'Choose a target field first', '');
  const target = fieldFromResource(targetId, (input.targetCentre || '').trim() || input.centre || 'C');
  if (!target) return card(false, 'That target is not in the vocabulary.', '');
  const pivot = planPivotLink({
    source,
    destination: target,
    home: source,
    motifPitchClasses: notePcs(input.motif),
  });
  if (pivot.mechanism === 'NO_CREDIBLE_PIVOT') {
    return card(true, [
      'NO CREDIBLE PIVOT',
      '',
      'COMMON TONES:',
      'None',
      '',
      'PIVOT NOTE:',
      'None',
      '',
      'MOVING NOTES:',
      'None',
      '',
      'LANDING:',
      'None',
    ].join('\n'), 'These fields share no pitch class. No link was written.');
  }
  const moving = pivot.movingTones.length === 0
    ? 'None'
    : pivot.movingTones.map((pair) => `${pcName(pair.from, source)} → ${pcName(pair.to, target)}`).join(', ');
  const text = [
    'COMMON TONES:',
    pivot.commonTones.length ? pivot.commonTones.map((pc) => pcName(pc, source)).join(' ') : 'None',
    '',
    'PIVOT NOTE:',
    pivot.pivotNotes.length ? pivot.pivotNotes.map((pc) => pcName(pc, source)).join(' ') : 'None',
    '',
    'MOVING NOTES:',
    moving,
    '',
    'LANDING:',
    pivot.landingNote === null ? 'None' : pcName(pivot.landingNote, target),
  ].join('\n');
  return card(true, text, 'Check only. The target field was already chosen.');
}

export function describeExtraction(request: PracticeRequest = {}): AdvisoryCard {
  const parent = [...notePcs(request.targetNotes), ...notePcs(request.bassNotes), ...notePcs(request.heldNotes), ...notePcs(request.motif)];
  const current = fieldFromResource(request.fieldId || 'minor_pentatonic', request.centre || 'C');
  const extracted = extractParentField({
    parentPitchClasses: parent,
    melodyPitchClasses: notePcs(request.targetNotes),
    bassPitchClasses: notePcs(request.bassNotes),
    motifPitchClasses: notePcs(request.motif),
    current,
    centreSpelling: request.centre || 'C',
  });
  if (extracted.disposition !== 'FIELDS') {
    return card(true, [
      'POSSIBLE FIELDS',
      '',
      extracted.disposition,
      extracted.explanation,
    ].join('\n'), 'Advisory. Nothing was selected.');
  }
  const lines = extracted.candidates.map((row) => musicianName(row.field));
  return card(true, [
    'POSSIBLE FIELDS',
    '',
    ...lines,
    '',
    'Advisory. Dev 6 has not selected these.',
  ].join('\n'), extracted.explanation);
}

export function describeDuo(request: PracticeRequest = {}): AdvisoryCard {
  const hasDuo = Boolean(
    (request.bassNotes || '').trim()
    || (request.guitarRole || '').trim()
    || request.category === 'ANSWER_BASS'
    || request.category === 'SUPPORT_BASS'
  );
  if (!hasDuo) return card(false, '', 'Duo analysis appears when bass or a guitar role is set.');
  const field = fieldFromResource(request.fieldId || 'minor_pentatonic', request.centre || 'C');
  if (!field) return card(false, 'That field is not in the vocabulary.', '');
  const role = layerRole(request.guitarRole);
  const plan = planLayeredField({ field, role });
  const words = layerWords(role);
  const text = [
    'DUO ANALYSIS',
    '',
    'FIELD:',
    musicianName(field),
    '',
    'GUITAR:',
    words.guitar,
    '',
    'BASS:',
    words.bass,
    '',
    'ROLE:',
    words.role,
  ].join('\n');
  const detail = plan.guitarSubset.length + plan.bassSubset.length === 0
    ? 'Both layers rest.'
    : `Guitar ${plan.guitarSubset.map((pc) => pcName(pc, field)).join(' ')}. Bass ${plan.bassSubset.map((pc) => pcName(pc, field)).join(' ')}.`;
  return card(true, text, detail);
}

function card(ready: boolean, text: string, detail: string): AdvisoryCard {
  return { ready, writesPhrase: false, text, detail };
}

function musicianName(field: PentatonicField): string {
  const parts = field.displayName.split(' ');
  return `${parts[0]} ${parts.slice(1).join(' ').toLowerCase()}`;
}

function notePcs(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  const parsed = parseNoteList(raw.split(/[\s,]+/).filter(Boolean));
  return parsed.ok ? parsed.notes.map((note) => note.pc) : [];
}

function pcName(pc: number, field: PentatonicField): string {
  const index = field.pitchClasses.indexOf(((pc % 12) + 12) % 12);
  if (index >= 0 && field.noteNames[index]) return field.noteNames[index];
  return sharpName(pc);
}

function bandNames(source: PentatonicField, outness: OutnessLevel, primary: PentatonicField | null): string[] {
  const wanted = BAND[outness];
  const sourceId = canonicalPitchSetId(source.pitchClasses);
  const seen = new Set<string>();
  const names: string[] = [];
  const push = (field: PentatonicField) => {
    const id = canonicalPitchSetId(field.pitchClasses);
    if (id === sourceId || seen.has(id)) return;
    seen.add(id);
    names.push(musicianName(field));
  };
  if (primary) push(primary);
  for (const field of registeredFieldsAround(source.referenceSpelling)) {
    if (names.length >= 4) break;
    const distance = measureFieldDistance(source, field);
    if (distance.distanceClass !== wanted) continue;
    push(field);
  }
  return names.slice(0, 4);
}

function layerRole(role: PracticeRequest['guitarRole']): LayerRole {
  if (role === 'SPACE') return 'SHARED_SPACE';
  if (role === 'COUNTERPOINT') return 'COUNTERPOINT';
  if (role === 'GUITAR_RESPONDS' || role === 'GUITAR_SUPPORTS') return 'GUITAR_SLOW_BASS_ACTIVE';
  if (role === 'GUITAR_LEADS' || role === 'SHARED_FIELD') return 'GUITAR_ACTIVE_BASS_SLOW';
  return 'GUITAR_ACTIVE_BASS_SLOW';
}

function layerWords(role: LayerRole): { guitar: string; bass: string; role: string } {
  switch (role) {
    case 'GUITAR_SLOW_BASS_ACTIVE':
      return { guitar: 'sparse upper subset', bass: 'active lower subset', role: 'bass leads / guitar responds' };
    case 'COUNTERPOINT':
      return { guitar: 'independent subset', bass: 'independent subset', role: 'counterpoint' };
    case 'SHARED_SPACE':
      return { guitar: 'rest', bass: 'rest', role: 'shared space' };
    case 'CALL_RESPONSE':
      return { guitar: 'answer subset', bass: 'call subset', role: 'call and response' };
    default:
      return { guitar: 'active upper subset', bass: 'sparse lower subset', role: 'guitar leads / bass responds' };
  }
}
