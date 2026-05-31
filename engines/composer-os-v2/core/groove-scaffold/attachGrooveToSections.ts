/**
 * Attach imported groove loops to song section bar ranges.
 */

import {
  beatsPerBarFromTimeSignature,
  type GrooveDrumEvent,
  type GrooveSectionAssignment,
  type ImportedGroove,
  type ImportedGrooveMusicContext,
} from './importGrooveMidiTypes';

const DEFAULT_TEMPO = 120;

function cloneGroove(groove: ImportedGroove): ImportedGroove {
  return {
    ...groove,
    events: groove.events.map((e) => ({ ...e })),
  };
}

function loopGrooveEventsForSection(
  groove: ImportedGroove,
  startBar: number,
  endBar: number,
): GrooveDrumEvent[] {
  const beatsPerBar = beatsPerBarFromTimeSignature(
    groove.timeSignatureNumerator,
    groove.timeSignatureDenominator,
  );
  const sectionBarCount = Math.max(0, endBar - startBar + 1);
  const sectionLengthQuarters = sectionBarCount * beatsPerBar;
  const loopLengthQuarters = groove.loopLengthBars * beatsPerBar;

  if (sectionLengthQuarters <= 0 || groove.events.length === 0) {
    return [];
  }

  const expanded: GrooveDrumEvent[] = [];
  let loopOffset = 0;

  while (loopOffset < sectionLengthQuarters - 1e-9) {
    for (const event of groove.events) {
      const beatPosition = loopOffset + event.beatPosition;
      if (beatPosition >= sectionLengthQuarters - 1e-9) continue;
      const remaining = sectionLengthQuarters - beatPosition;
      expanded.push({
        ...event,
        beatPosition,
        durationQuarters: Math.min(event.durationQuarters, remaining),
      });
    }
    if (loopLengthQuarters <= 0) break;
    loopOffset += loopLengthQuarters;
  }

  expanded.sort((a, b) => a.beatPosition - b.beatPosition || a.pitch - b.pitch);
  return expanded;
}

/**
 * Loop each assignment groove to fill `[startBar, endBar]`; truncate when the section is shorter than one loop.
 */
export function attachImportedGrooveToSongSections(
  assignments: GrooveSectionAssignment[],
): ImportedGrooveMusicContext {
  const expandedAssignments: GrooveSectionAssignment[] = assignments.map((assignment) => {
    const groove = cloneGroove(assignment.groove);
    groove.events = loopGrooveEventsForSection(groove, assignment.startBar, assignment.endBar);
    return {
      ...assignment,
      groove,
    };
  });

  const totalBars =
    expandedAssignments.length === 0
      ? 0
      : Math.max(...expandedAssignments.map((a) => a.endBar));

  return {
    sourceEngineId: 'imported_groove',
    assignments: expandedAssignments,
    totalBars,
    tempo: DEFAULT_TEMPO,
  };
}

export { loopGrooveEventsForSection };
