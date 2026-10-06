/**
 * Dev 3.3 centre and HOME collection.
 * Centre is a count of explicit harmony roots. HOME is an anchor-window fit
 * against registry collections that contain that centre.
 * Title, filename, and part order are not inputs.
 */

import { chromaticFrictionMeasure } from './chromaticFriction';
import type { PentatonicScoreEvent, PentatonicScoreImport } from './musicXmlScore';
import { mod12, parseNoteToken, PENTATONIC_NOTE_CHOICES } from './pitch';
import { getPentatonicArchetype } from './registry';

const INTERVAL_NAME = [
  'unison',
  'minor 2nd',
  'major 2nd',
  'minor 3rd',
  'major 3rd',
  'perfect 4th',
  'tritone',
  'perfect 5th',
  'minor 6th',
  'major 6th',
  'minor 7th',
  'major 7th',
] as const;

const MAJOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb', [-6]: 'Gb', [-5]: 'Db', [-4]: 'Ab', [-3]: 'Eb', [-2]: 'Bb', [-1]: 'F',
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};
const MINOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Ab', [-6]: 'Eb', [-5]: 'Bb', [-4]: 'F', [-3]: 'C', [-2]: 'G', [-1]: 'D',
  0: 'A', 1: 'E', 2: 'B', 3: 'F#', 4: 'C#', 5: 'G#', 6: 'D#', 7: 'A#',
};

const NC = /^(n\.?\s*c\.?|nc)$/i;
const PRIMED = /^[A-Ga-g][′'’]$/;
const CENTRE_MIN = 4;
const CENTRE_MARGIN = 2;
const HOME_FIT_MIN = 0.62;
const HOME_GAP = 0.05;

export type CentreStatus = 'CENTRE' | 'CENTRE_INSUFFICIENT';
export type HomeIdentityStatus = 'HOME' | 'HOME_AMBIGUOUS' | 'HOME_INSUFFICIENT' | 'CENTRE_INSUFFICIENT';

export interface CentreScoreRow {
  pc: number;
  spelling: string;
  score: number;
  reasons: readonly string[];
}

export interface HomeFitRow {
  name: string;
  interval: string;
  third: 'major-third' | 'minor-third' | 'no-third';
  archetypeId: 'major_pentatonic' | 'minor_pentatonic';
  referenceNote: string;
  pitchClasses: readonly number[];
  fit: number;
  membership: number;
  friction: number;
  wholeMembership: number;
}

export interface CentreHomeIdentity {
  centreStatus: CentreStatus;
  centre: { pc: number; spelling: string; score: number; margin: number } | null;
  restatement: 'used' | 'omitted';
  restatementDetail: string;
  scores: readonly CentreScoreRow[];
  homeStatus: HomeIdentityStatus;
  home: { archetypeId: 'major_pentatonic' | 'minor_pentatonic'; referenceNote: string; pitchClasses: readonly number[] } | null;
  colourScoring: 'on' | 'omitted';
  windowModeConflict: boolean;
  fits: readonly HomeFitRow[];
  reading: string;
  evidence: readonly string[];
}

function quantize(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function noteName(pc: number): string {
  return PENTATONIC_NOTE_CHOICES[mod12(pc)] ?? 'C';
}

export function intervalFromCentre(centrePc: number, targetPc: number): string {
  return INTERVAL_NAME[mod12(targetPc - centrePc)] ?? 'unison';
}

function rootOf(symbol: string | undefined): { pc: number; spelling: string } | null {
  if (!symbol || NC.test(symbol.trim())) return null;
  const token = symbol.trim().match(/^([A-Ga-g](?:bb|##|b|#|x)?)/);
  if (!token) return null;
  const parsed = parseNoteToken(token[1]!);
  return parsed ? { pc: parsed.pc, spelling: parsed.spelling } : null;
}

function motifToken(label: string): string | null {
  return label.trim().match(/^(M\d+)/)?.[1] ?? null;
}

function attacksOf(events: readonly PentatonicScoreEvent[]): { role: 'melody' | 'bass'; pitchClass: number; duration: number }[] {
  return events.flatMap((event) =>
    event.soundingAttacks.flatMap((attack) => {
      const parsed = parseNoteToken(attack.spelling);
      if (!parsed || !(attack.durationBeats > 0)) return [];
      if (attack.role !== 'melody' && attack.role !== 'bass') return [];
      return [{ role: attack.role, pitchClass: parsed.pc, duration: attack.durationBeats }];
    })
  );
}

function printedKeyTieBreak(score: PentatonicScoreImport): { pc: number; spelling: string } | null {
  const keys = score.keySignatures.filter((key) => key.mode === 'major' || key.mode === 'minor');
  if (keys.length === 0) return null;
  const firstLabel = score.events[0]?.sourceLabel;
  const barOne = keys.filter((key) => key.sourceLabel === firstLabel);
  const distinct = new Set(barOne.map((key) => `${key.fifths}:${key.mode}`));
  if (barOne.length === 0 || distinct.size !== 1) return null;
  const all = new Set(keys.map((key) => `${key.fifths}:${key.mode}`));
  if (all.size !== 1) return null;
  const only = barOne[0]!;
  const mode = only.mode === 'minor' ? 'minor' : 'major';
  const spelling = (mode === 'minor' ? MINOR_BY_FIFTHS : MAJOR_BY_FIFTHS)[only.fifths];
  const parsed = spelling ? parseNoteToken(spelling) : null;
  if (!parsed) return null;
  return { pc: parsed.pc, spelling: parsed.spelling };
}

function thirdOf(set: readonly number[], centrePc: number): HomeFitRow['third'] {
  const major = set.includes(mod12(centrePc + 4));
  const minor = set.includes(mod12(centrePc + 3));
  if (major && !minor) return 'major-third';
  if (minor && !major) return 'minor-third';
  return 'no-third';
}

interface NamedSet {
  name: string;
  interval: string;
  third: HomeFitRow['third'];
  archetypeId: 'major_pentatonic' | 'minor_pentatonic';
  referenceNote: string;
  referencePc: number;
  pitchClasses: number[];
}

function collectionsContaining(centrePc: number): NamedSet[] {
  const major = getPentatonicArchetype('major_pentatonic');
  const minor = getPentatonicArchetype('minor_pentatonic');
  if (!major || !minor) return [];
  const bucket = new Map<string, NamedSet>();
  for (const archetype of [major, minor]) {
    for (let root = 0; root < 12; root += 1) {
      const pitchClasses = archetype.intervals.map((interval) => mod12(root + interval));
      if (!pitchClasses.includes(centrePc)) continue;
      const key = [...pitchClasses].sort((a, b) => a - b).join(',');
      const centreIsTonic = root === centrePc;
      const mode = archetype.id === 'major_pentatonic' ? 'major' : 'minor';
      const named: NamedSet = {
        name: centreIsTonic ? `${noteName(centrePc)} ${mode}` : `${noteName(root)} ${mode}`,
        interval: centreIsTonic ? `unison ${mode}` : `${intervalFromCentre(centrePc, root)} ${mode}`,
        third: thirdOf(pitchClasses, centrePc),
        archetypeId: archetype.id as 'major_pentatonic' | 'minor_pentatonic',
        referenceNote: noteName(root),
        referencePc: root,
        pitchClasses,
      };
      const existing = bucket.get(key);
      if (!existing || centreIsTonic) bucket.set(key, named);
    }
  }
  return [...bucket.values()];
}

function fitOf(events: readonly PentatonicScoreEvent[], pitchClasses: readonly number[]): { membership: number; friction: number; fit: number } {
  const attacks = attacksOf(events);
  const total = attacks.reduce((sum, attack) => sum + attack.duration, 0);
  const inside = attacks.filter((attack) => pitchClasses.includes(attack.pitchClass)).reduce((sum, attack) => sum + attack.duration, 0);
  const membership = total <= 0 ? 0 : inside / total;
  const friction = chromaticFrictionMeasure(pitchClasses, attacks).frictionShare;
  return { membership: quantize(membership), friction: quantize(friction), fit: quantize(membership - friction) };
}

function preferredThirds(rows: readonly { third: HomeFitRow['third']; fit: number }[]): HomeFitRow['third'][] {
  if (rows.length === 0) return [];
  const best = Math.max(...rows.map((row) => row.fit));
  return [...new Set(rows.filter((row) => row.fit === best).map((row) => row.third))];
}

export function inferCentreAndHome(score: PentatonicScoreImport): CentreHomeIdentity {
  const evidence: string[] = ['Title, filename, and part order were not used.'];
  const tally = new Map<number, { score: number; spelling: string; reasons: string[] }>();
  const add = (pc: number, spelling: string, amount: number, reason: string) => {
    const row = tally.get(pc) ?? { score: 0, spelling, reasons: [] };
    row.score += amount;
    if (!row.spelling) row.spelling = spelling;
    row.reasons.push(reason);
    tally.set(pc, row);
  };

  const openingHit = score.events
    .flatMap((event) => event.harmonyEvidence.map((item) => ({ event, item })))
    .find((hit) => !NC.test(hit.item.symbol) && rootOf(hit.item.symbol));
  const opening = openingHit ? rootOf(openingHit.item.symbol) : null;
  if (opening) add(opening.pc, opening.spelling, 2, `opening harmony ${openingHit!.item.symbol} +2`);
  else evidence.push('Opening harmony root missing.');

  let finalRoot: { pc: number; spelling: string } | null = null;
  let finalLabel = '';
  let finalSymbol = '';
  for (let index = score.events.length - 1; index >= 0; index -= 1) {
    const event = score.events[index]!;
    const root = rootOf(event.chordSymbol);
    if (!root) continue;
    finalRoot = root;
    finalLabel = event.sourceLabel;
    finalSymbol = event.chordSymbol ?? '';
    add(root.pc, root.spelling, 2, `final harmony ${finalSymbol} bar ${finalLabel} +2`);
    break;
  }
  if (!finalRoot) evidence.push('Final harmony root missing.');

  const openingMotif = score.motifs[0]?.label ?? null;
  const openingToken = openingMotif ? motifToken(openingMotif) : null;
  const primedAnywhere = score.events.some((event) => event.sectionMarks.some((mark) => PRIMED.test(mark.trim())));
  const restatement: 'used' | 'omitted' = openingToken || primedAnywhere ? 'used' : 'omitted';
  const restatementDetail = restatement === 'omitted'
    ? 'No stored motif annotation and no primed section letter. Restatement term omitted.'
    : `Restatement term used. Opening motif ${openingMotif ?? 'none'}. Primed letter ${primedAnywhere}.`;
  evidence.push(restatementDetail);
  const firstMotifLabel = score.motifs[0]?.sourceLabel ?? null;

  for (const event of score.events) {
    if (!event.sourceBoundary) continue;
    const root = rootOf(event.chordSymbol);
    if (!root) {
      evidence.push(`Section ${event.sourceLabel} ${event.sectionMarks.join('/')} has no harmony root.`);
      continue;
    }
    add(root.pc, root.spelling, 1, `section ${event.sourceLabel} ${event.sectionMarks.join('/')} root ${root.spelling} +1`);
    if (restatement === 'omitted') continue;
    if (firstMotifLabel !== null && event.sourceLabel === firstMotifLabel) continue;
    const motifsHere = score.motifs.filter((item) => item.sourceLabel === event.sourceLabel).map((item) => item.label);
    const motifMatch = Boolean(openingToken && motifsHere.some((label) => motifToken(label) === openingToken));
    const primed = event.sectionMarks.some((mark) => PRIMED.test(mark.trim()));
    if (motifMatch || primed) {
      add(root.pc, root.spelling, 1, `RESTATEMENT ${event.sourceLabel} ${motifsHere.join(',') || event.sectionMarks.join('/')} +1`);
    }
  }

  const bassSupport = new Map<number, number>();
  const melodyEmphasis = new Map<number, number>();
  for (const attack of attacksOf(score.events)) {
    if (attack.role === 'melody') melodyEmphasis.set(attack.pitchClass, (melodyEmphasis.get(attack.pitchClass) ?? 0) + attack.duration);
    if (attack.role === 'bass') {
      bassSupport.set(attack.pitchClass, (bassSupport.get(attack.pitchClass) ?? 0) + attack.duration);
      const fifth = mod12(attack.pitchClass - 7);
      bassSupport.set(fifth, (bassSupport.get(fifth) ?? 0) + attack.duration);
    }
  }
  const keyTie = printedKeyTieBreak(score);
  evidence.push(keyTie ? `Printed key tie-break ${keyTie.spelling}.` : 'Printed key is not a tie-break.');

  const scores: CentreScoreRow[] = [...tally.entries()]
    .map(([pc, row]) => ({ pc, spelling: row.spelling || noteName(pc), score: row.score, reasons: row.reasons }))
    .sort((a, b) => b.score - a.score || a.pc - b.pc);
  for (const row of scores) evidence.push(`CENTRE ${row.spelling} ${row.score}: ${row.reasons.join('; ')}`);

  const best = scores[0];
  const secondScore = scores[1]?.score ?? 0;
  const margin = best ? best.score - secondScore : 0;
  if (!best || best.score < CENTRE_MIN || margin < CENTRE_MARGIN) {
    const reading = 'CENTRE_INSUFFICIENT. No centre was invented.';
    evidence.push(reading);
    return {
      centreStatus: 'CENTRE_INSUFFICIENT',
      centre: best ? { pc: best.pc, spelling: best.spelling, score: best.score, margin } : null,
      restatement,
      restatementDetail,
      scores,
      homeStatus: 'CENTRE_INSUFFICIENT',
      home: null,
      colourScoring: 'omitted',
      windowModeConflict: false,
      fits: [],
      reading,
      evidence,
    };
  }

  const tied = scores.filter((row) => row.score === best.score);
  tied.sort((a, b) => {
    const bass = (bassSupport.get(b.pc) ?? 0) - (bassSupport.get(a.pc) ?? 0);
    if (bass !== 0) return bass;
    const key = (keyTie?.pc === b.pc ? 1 : 0) - (keyTie?.pc === a.pc ? 1 : 0);
    if (key !== 0) return key;
    const melody = (melodyEmphasis.get(b.pc) ?? 0) - (melodyEmphasis.get(a.pc) ?? 0);
    if (melody !== 0) return melody;
    return a.pc - b.pc;
  });
  const centre = tied[0]!;
  evidence.push(`CENTRE ${centre.spelling} score ${centre.score} margin ${margin}.`);

  const named = collectionsContaining(centre.pc);
  const sectionStarts = score.events.filter((event) => event.sourceBoundary && rootOf(event.chordSymbol)?.pc === centre.pc);
  const sectionWindows = sectionStarts.map((start) => {
    const index = score.events.indexOf(start);
    return { label: `section ${start.sourceLabel}`, events: score.events.slice(index, index + 4) };
  });
  const ending = { label: 'ending', events: score.events.slice(-4) };
  const unique = new Map<string, PentatonicScoreEvent>();
  for (const window of [...sectionWindows, ending]) {
    for (const event of window.events) unique.set(event.id, event);
  }
  const pooled = [...unique.values()];
  const whole = score.events;
  const fits: HomeFitRow[] = named.map((set) => {
    const anchor = fitOf(pooled, set.pitchClasses);
    const song = fitOf(whole, set.pitchClasses);
    return {
      name: set.name,
      interval: set.interval,
      third: set.third,
      archetypeId: set.archetypeId,
      referenceNote: set.referenceNote,
      pitchClasses: set.pitchClasses,
      fit: anchor.fit,
      membership: anchor.membership,
      friction: anchor.friction,
      wholeMembership: song.membership,
    };
  });
  fits.sort((a, b) => b.fit - a.fit || b.wholeMembership - a.wholeMembership || a.name.localeCompare(b.name));
  for (const row of fits) {
    evidence.push(
      `ANCHOR ${row.name} (${row.interval}) third ${row.third} fit ${row.fit} membership ${row.membership} friction ${row.friction} whole ${row.wholeMembership}.`
    );
  }

  const perWindow = [...sectionWindows, ending].map((window) => ({
    label: window.label,
    rows: named.map((set) => ({ third: thirdOf(set.pitchClasses, centre.pc), fit: fitOf(window.events, set.pitchClasses).fit, name: set.name })),
  }));
  const openingPref = sectionWindows[0] ? preferredThirds(perWindow[0]!.rows) : [];
  let windowModeConflict = false;
  if (openingPref.length === 1) {
    for (const window of perWindow.slice(1)) {
      const prefs = preferredThirds(window.rows);
      if (prefs.length === 1 && prefs[0] !== openingPref[0]) windowModeConflict = true;
    }
  }
  if (windowModeConflict) evidence.push('Opening and a return or ending window prefer different modes.');

  const top = fits[0];
  const second = fits[1];
  const gap = top && second ? quantize(top.fit - second.fit) : top ? top.fit : 0;
  const closeThird = Boolean(top && second && gap <= HOME_GAP && top.third !== second.third);
  let homeStatus: HomeIdentityStatus = 'HOME';
  if (!top || top.fit < HOME_FIT_MIN) homeStatus = 'HOME_INSUFFICIENT';
  else if (closeThird || windowModeConflict) homeStatus = 'HOME_AMBIGUOUS';
  const colourScoring = homeStatus === 'HOME' ? 'on' : 'omitted';
  const home = homeStatus === 'HOME' && top
    ? { archetypeId: top.archetypeId, referenceNote: top.referenceNote, pitchClasses: [...top.pitchClasses] }
    : null;
  const reading =
    homeStatus === 'HOME' && top
      ? `CENTRE ${centre.spelling}. HOME ${top.name}.`
      : homeStatus === 'HOME_AMBIGUOUS'
        ? `CENTRE ${centre.spelling}. HOME_AMBIGUOUS(${centre.spelling}). Colour scoring omitted. Labels are intervals from ${centre.spelling}.`
        : `CENTRE ${centre.spelling}. HOME_INSUFFICIENT. Colour scoring omitted. Labels are intervals from ${centre.spelling}.`;
  evidence.push(reading);
  return {
    centreStatus: 'CENTRE',
    centre: { pc: centre.pc, spelling: centre.spelling, score: centre.score, margin },
    restatement,
    restatementDetail,
    scores,
    homeStatus,
    home,
    colourScoring,
    windowModeConflict,
    fits,
    reading,
    evidence,
  };
}
