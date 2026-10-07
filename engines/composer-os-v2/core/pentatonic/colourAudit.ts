/**
 * Dev 7C audits.
 * minor_sixth keeps its shipped intervals.
 * The jazz minor-6 shape [0, 3, 5, 7, 9] is a rotation of an existing resource, so it is not added.
 */

import { listPentatonicColourResources } from './colourRegistry';
import { adjacentSemitoneCount, fieldFromPitchClasses, rotationNormalForm } from './fieldDistance';
import type { ColourBand } from './colourTypes';

export interface MinorSixthAudit {
  resourceId: 'minor_sixth_pentatonic';
  shippedIntervals: readonly number[];
  trueMinorSixConcept: readonly [0, 3, 5, 7, 9];
  intervalsMatchConcept: boolean;
  nameMisleading: true;
  conceptRotationOf: string | null;
  registryChanged: false;
  action: 'NO_CHANGE';
  report: string;
}

export interface EdgeAuditIssue {
  resourceId: string;
  issue: string;
}

const BAND: Record<ColourBand, number> = { low: 0, moderate: 1, high: 2 };

export function auditMinorSixth(): MinorSixthAudit {
  const resource = listPentatonicColourResources().find((item) => item.id === 'minor_sixth_pentatonic');
  const shipped = resource?.intervals ?? [];
  const concept = fieldFromPitchClasses([0, 3, 5, 7, 9], 'C');
  return {
    resourceId: 'minor_sixth_pentatonic',
    shippedIntervals: shipped,
    trueMinorSixConcept: [0, 3, 5, 7, 9],
    intervalsMatchConcept: shipped.join(',') === '0,3,5,7,9',
    nameMisleading: true,
    conceptRotationOf: concept?.resourceId ?? null,
    registryChanged: false,
    action: 'NO_CHANGE',
    report:
      'minor_sixth_pentatonic is [0, 3, 5, 8, 10]: minor pentatonic with a flat sixth instead of the fifth. The name suggests the minor-6 collection [0, 3, 5, 7, 9]. That collection is a rotation of an existing resource, so it was not added. The shipped id and intervals stay.',
  };
}

export function auditEdgeMetadata(): { issues: EdgeAuditIssue[]; corrected: readonly string[] } {
  const issues: EdgeAuditIssue[] = [];
  for (const resource of listPentatonicColourResources()) {
    const semitones = adjacentSemitoneCount(resource.intervals);
    const edge = resource.metadata.chromaticEdge;
    if (semitones >= 1 && edge === 'low') issues.push({ resourceId: resource.id, issue: 'contains a semitone while chromatic edge is low' });
    if (semitones === 0 && edge === 'high') issues.push({ resourceId: resource.id, issue: 'no semitone while chromatic edge is high' });
    if (BAND[resource.metadata.brightness] === 2 && BAND[resource.metadata.darkness] === 2) {
      issues.push({ resourceId: resource.id, issue: 'brightness and darkness are both high' });
    }
    if (BAND[resource.metadata.stability] === 2 && BAND[resource.metadata.tension] === 2) {
      issues.push({ resourceId: resource.id, issue: 'stability and tension are both high' });
    }
    if (rotationNormalForm(resource.intervals).length !== 5) issues.push({ resourceId: resource.id, issue: 'normal form is not five notes' });
  }
  return {
    issues,
    corrected: [] as string[],
    leftInPlace: [
      'dorian_pentatonic contains a semitone and chromaticEdge stays low. Raising it changes the Dev 6 darker/brighter tie-break.',
      'aeolian_pentatonic contains a semitone and chromaticEdge stays low, for the same reason.',
    ],
  };
}
