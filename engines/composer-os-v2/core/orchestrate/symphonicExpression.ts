/**
 * V4.0 Phase 3 expressive orchestration.
 * Opt-in on Phase 2 allocation. `legacy` does not call this pass.
 * Dynamics, hairpins, slurs, articulations, and velocities change.
 * Pitches, onsets, durations, ties, and tempo do not.
 */

import type { ArticulationV34, DynamicMark, NoteEvent, PartDynamicEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { SymphonicPhrasePlan } from './symphonicWriting';
import { SYMPHONIC_SLOTS } from './symphonicWriting';

export interface ExpressionDecision {
  phraseId: string;
  partId: string;
  role: 'foreground' | 'answer' | 'support' | 'bass' | 'colour';
  contour: 'arch' | 'rising' | 'falling' | 'leap' | 'static';
  tension: number;
  marks: DynamicMark[];
  wedge: 'none' | 'rise' | 'fall' | 'arch';
  articulations: string[];
}

export interface Phase3ExpressionReceipt {
  expression: 'expressive';
  dynamicMarks: number;
  wedges: number;
  slurs: number;
  articulations: number;
  marcato: number;
  midiExpressionEvents: number;
  /**
   * Distinct velocities written onto sounding attacks before MIDI export.
   * This is the planned count. It is not the count decoded from the MIDI file.
   * The MIDI writer still scales 1–127 into 1–100, so the exported positive
   * note-on count can be smaller. Velocity 0 note-ons are note-off equivalents
   * and are not part of either count.
   */
  velocityLevels: number;
  /** Same number as `velocityLevels`. Named so a receipt cannot be read as an exported MIDI count. */
  plannedVelocityLevels: number;
  identicalConsecutiveLong: number;
  breathingWarnings: string[];
  byFamily: Record<string, { slurs: number; articulations: number; wedges: number; dynamicMarks: number; marcato: number }>;
  decisions: ExpressionDecision[];
}

interface Attack {
  note: NoteEvent;
  bar: number;
  beat: number;
  onset: number;
  end: number;
  voice: number;
  staff: number;
  barStart: number;
  barSpan: number;
}

/** Existing useful-span rule for a lyrical hairpin: three attacks whose onsets cover at least two quarters. */
const USEFUL_HAIRPIN_ATTACKS = 3;
const USEFUL_HAIRPIN_ONSET_QUARTERS = 2;
const SOUNDING_GAP_QUARTERS = 0.02;

type Contour = ExpressionDecision['contour'];
type Role = ExpressionDecision['role'];
type WedgeShape = ExpressionDecision['wedge'];

const LADDER: DynamicMark[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
const VELOCITY: Record<string, number> = { pp: 36, p: 52, mp: 68, mf: 84, f: 100, ff: 116 };

const BREATH_QUARTERS: Record<string, number> = {
  picc: 6, fl1: 6, fl2: 6, ob1: 6, ob2: 6, ca: 6,
  cl1: 8, cl2: 8, bcl: 7, bn1: 8, bn2: 8, cbn: 8,
  hn1: 8, hn2: 8, hn3: 8, hn4: 8,
  tp1: 6, tp2: 6, tp3: 6,
  tbn1: 6, tbn2: 6, tbn3: 6, tba: 8,
};

function familyOf(partId: string): string {
  return SYMPHONIC_SLOTS.find((slot) => slot.partId === partId)?.family ?? 'strings';
}

function noteIdentity(note: NoteEvent): string {
  return JSON.stringify({
    pitch: note.pitch,
    pitches: note.pitches,
    startBeat: note.startBeat,
    duration: note.duration,
    tie: note.notation?.tie ?? null,
    onset: note.pianoExact?.onsetQ ?? null,
    exactDuration: note.pianoExact?.durationQ ?? null,
  });
}

function attacksOf(score: ScoreModel, partId: string): { attacks: Attack[]; spans: Map<number, number> } {
  const part = score.parts.find((item) => item.id === partId);
  const spans = new Map<number, number>();
  if (!part) return { attacks: [], spans };
  const attacks: Attack[] = [];
  let origin = 0;
  for (const measure of [...part.measures].sort((a, b) => a.index - b.index)) {
    const span = measure.measureBeatSpanQuarters ?? 4;
    spans.set(measure.index, span);
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const beat = event.startBeat;
      const staff = typeof (event as { staff?: number }).staff === 'number' ? (event as { staff?: number }).staff! : 1;
      attacks.push({
        note: event,
        bar: measure.index,
        beat,
        onset: origin + beat,
        end: origin + beat + event.duration,
        voice: event.voice ?? 1,
        staff,
        barStart: origin,
        barSpan: span,
      });
    }
    origin += span;
  }
  attacks.sort((a, b) => a.onset - b.onset || a.note.pitch - b.note.pitch);
  return { attacks, spans };
}

function runs(attacks: Attack[]): Attack[][] {
  const groups: Attack[][] = [];
  let current: Attack[] = [];
  for (const attack of attacks) {
    const previous = current[current.length - 1];
    if (previous && attack.onset - previous.end > 0.02) {
      groups.push(current);
      current = [];
    }
    current.push(attack);
  }
  if (current.length) groups.push(current);
  return groups;
}

function contourOf(attacks: Attack[]): Contour {
  if (attacks.length < 2) return 'static';
  const pitches = attacks.map((attack) => attack.note.pitch);
  const first = pitches[0]!;
  const last = pitches[pitches.length - 1]!;
  let peak = first;
  let peakAt = 0;
  let floor = first;
  let leapCount = 0;
  let leapSum = 0;
  for (let index = 0; index < pitches.length; index += 1) {
    const pitch = pitches[index]!;
    if (pitch > peak) {
      peak = pitch;
      peakAt = index;
    }
    if (pitch < floor) floor = pitch;
    if (index > 0) {
      const leap = Math.abs(pitch - pitches[index - 1]!);
      leapSum += leap;
      if (leap >= 5) leapCount += 1;
    }
  }
  const range = peak - floor;
  if (leapCount >= 2 && range >= 7) return 'leap';
  if (range < 3) return 'static';
  if (peakAt > 0 && peakAt < pitches.length - 1 && peak - first >= 2 && peak - last >= 2) return 'arch';
  if (last - first >= 3) return 'rising';
  if (first - last >= 3) return 'falling';
  if (leapSum / (pitches.length - 1) >= 4) return 'leap';
  return 'static';
}

function tensionOf(attacks: Attack[], kind: SymphonicPhrasePlan['kind'], ending: boolean): number {
  if (attacks.length < 2) return ending ? 0.15 : kind === 'development' ? 0.55 : 0.35;
  let leapSum = 0;
  let shorts = 0;
  for (let index = 0; index < attacks.length; index += 1) {
    const attack = attacks[index]!;
    if (attack.end - attack.onset < 0.5) shorts += 1;
    if (index > 0) leapSum += Math.abs(attack.note.pitch - attacks[index - 1]!.note.pitch);
  }
  const leapAvg = leapSum / (attacks.length - 1);
  const shortRatio = shorts / attacks.length;
  const kindBoost = kind === 'development' ? 0.22 : kind === 'return' ? -0.08 : 0;
  const endBoost = ending ? -0.18 : 0;
  return Math.max(0, Math.min(1, leapAvg / 10 + shortRatio * 0.45 + kindBoost + endBoost));
}

function boundsFor(family: string, tension: number): [number, number] {
  const table: Record<string, [number, number]> = {
    woodwind: [1, 4],
    brass: [2, 5],
    strings: [0, 4],
    harp: [0, 2],
    timpani: [2, 5],
    percussion: [3, 5],
  };
  const [low, high] = table[family] ?? [1, 4];
  const opened = (family === 'strings' || family === 'woodwind') && tension >= 0.72 ? Math.min(5, high + 1) : high;
  return [low, opened];
}

function clampIndex(index: number, family: string, tension: number): number {
  const [low, high] = boundsFor(family, tension);
  return Math.max(low, Math.min(high, index));
}

function markAt(index: number, family: string, tension: number): DynamicMark {
  return LADDER[clampIndex(index, family, tension)] ?? 'mf';
}

function roleOf(plan: SymphonicPhrasePlan, partId: string): Role {
  if (plan.foregroundIds.includes(partId)) return 'foreground';
  if (plan.answerIds.includes(partId)) return 'answer';
  if (plan.bassIds.includes(partId)) return 'bass';
  if (plan.supportIds.includes(partId)) return 'support';
  return 'colour';
}

function baseIndex(kind: SymphonicPhrasePlan['kind'], role: Role, tension: number, ending: boolean, phraseIndex: number): number {
  let index = kind === 'development' ? 3 : kind === 'return' ? 1 : 2;
  if (role === 'answer' || role === 'support' || role === 'bass') index -= 1;
  if (role === 'colour') index -= 2;
  if (tension >= 0.7) index += 1;
  if (tension < 0.25) index -= 1;
  if (ending) index -= 1;
  if (phraseIndex % 3 === 1 && role === 'foreground') index += 1;
  if (phraseIndex % 3 === 2 && role !== 'foreground') index -= 1;
  return index;
}

function slurChunks(run: Attack[], family: string, breath: number | undefined, contour: Contour, tension: number): Attack[][] {
  if (family === 'harp' || family === 'percussion' || family === 'timpani') return [];
  if (run.length < 2) return [];
  if (family === 'brass' && (contour === 'leap' || tension >= 0.75)) return [];
  const meanDuration = run.reduce((sum, attack) => sum + (attack.end - attack.onset), 0) / run.length;
  if (meanDuration < 0.5 && (family === 'brass' || contour === 'leap' || tension >= 0.5)) return [];
  const chunks: Attack[][] = [];
  let current = [run[0]!];
  for (let index = 1; index < run.length; index += 1) {
    const next = run[index]!;
    const previous = current[current.length - 1]!;
    const interval = Math.abs(next.note.pitch - previous.note.pitch);
    const tied = next.note.notation?.tie === 'stop' || next.note.notation?.tie === 'continue';
    const span = next.onset - current[0]!.onset;
    const short = next.end - next.onset < 0.5 && previous.end - previous.onset < 0.5;
    let split = false;
    if (!tied) {
      if (family === 'strings' && interval >= 7) split = true;
      if (family === 'woodwind' && (interval >= 5 || span > (breath ?? 6))) split = true;
      if (family === 'brass' && (interval >= 3 || span > 4 || short)) split = true;
    }
    if (split) {
      if (current.length >= 2) chunks.push(current);
      current = [next];
    } else {
      current.push(next);
    }
  }
  if (current.length >= 2) chunks.push(current);
  return chunks.filter((chunk) => family !== 'brass' || chunk.every((attack) => attack.end - attack.onset >= 0.5));
}

function intervalInto(attacks: Attack[], attack: Attack): number {
  const index = attacks.indexOf(attack);
  if (index <= 0) return 0;
  return Math.abs(attack.note.pitch - attacks[index - 1]!.note.pitch);
}

function tiedContinuation(attack: Attack): boolean {
  const tie = attack.note.notation?.tie;
  return tie === 'stop' || tie === 'continue';
}

function usefulHairpinSpan(attacks: Attack[]): boolean {
  if (attacks.length < USEFUL_HAIRPIN_ATTACKS) return false;
  const first = attacks[0]!;
  const last = attacks[attacks.length - 1]!;
  return last.onset - first.onset >= USEFUL_HAIRPIN_ONSET_QUARTERS;
}

function sameHairpinScope(left: Attack, right: Attack): boolean {
  return left.voice === right.voice && left.staff === right.staff;
}

function positionAt(absolute: number, origin: Attack, spans: Map<number, number>): { bar: number; beat: number } {
  let bar = origin.bar;
  let local = absolute - origin.barStart;
  let guard = 0;
  while (local >= (spans.get(bar) ?? origin.barSpan) - 1e-9 && guard < 64) {
    local -= spans.get(bar) ?? origin.barSpan;
    bar += 1;
    guard += 1;
  }
  while (local < -1e-9 && guard < 64) {
    bar -= 1;
    local += spans.get(bar) ?? origin.barSpan;
    guard += 1;
  }
  if (Math.abs(local) < 1e-6) local = 0;
  return { bar, beat: Math.round(local * 1000) / 1000 };
}

function releaseOf(attack: Attack, spans: Map<number, number>): { bar: number; beat: number; onset: number } {
  const placed = positionAt(attack.end, attack, spans);
  return { ...placed, onset: attack.end };
}

/**
 * Keep a hairpin inside one part, staff, and voice.
 * Tied notes and overlapping chord members stay in the sounding span.
 * A rest in another voice does not end it.
 * At the first gap, stop on the previous note's release. That is the rest's onset
 * when the rest follows immediately, and it does not cross the rest.
 * The original from-mark to to-mark line is sampled at that release.
 * A clipped span that fails the useful-span rule is omitted.
 * The hairpin is not extended into the next sounding phrase.
 */
function clipWedges(wedges: PlannedWedge[], phraseAttacks: Attack[], spans: Map<number, number>): PlannedWedge[] {
  const kept: PlannedWedge[] = [];
  for (const wedge of wedges) {
    const scoped = phraseAttacks
      .filter((attack) => sameHairpinScope(attack, wedge.from) && attack.onset >= wedge.from.onset - 0.001 && attack.onset <= wedge.to.onset + 0.001)
      .sort((a, b) => a.onset - b.onset || a.note.pitch - b.note.pitch);
    const prefix: Attack[] = [];
    let soundingUntil = Number.NEGATIVE_INFINITY;
    let broken = false;
    for (const attack of scoped) {
      if (prefix.length && attack.onset - soundingUntil > SOUNDING_GAP_QUARTERS) {
        broken = true;
        break;
      }
      prefix.push(attack);
      soundingUntil = Math.max(soundingUntil, attack.end);
    }
    const reached = prefix.some((attack) => attack.bar === wedge.to.bar && Math.abs(attack.onset - wedge.to.onset) < 0.001);
    if (!broken && reached) {
      kept.push(wedge);
      continue;
    }
    if (!usefulHairpinSpan(prefix)) continue;
    const last = prefix[prefix.length - 1]!;
    const release = releaseOf(last, spans);
    if (release.onset <= wedge.from.onset + SOUNDING_GAP_QUARTERS) continue;
    const original = wedge.to.onset - wedge.from.onset;
    const fromValue = VELOCITY[wedge.fromMark] ?? 80;
    const toValue = VELOCITY[wedge.toMark] ?? 80;
    const mix = original > 0 ? Math.max(0, Math.min(1, (release.onset - wedge.from.onset) / original)) : 0;
    kept.push({
      ...wedge,
      stopBar: release.bar,
      stopBeat: release.beat,
      stopOnset: release.onset,
      endValue: Math.round(fromValue + (toValue - fromValue) * mix),
    });
  }
  return kept;
}

interface PlannedWedge {
  from: Attack;
  to: Attack;
  type: 'crescendo' | 'diminuendo';
  fromMark: DynamicMark;
  toMark: DynamicMark;
  /** Written stop. Unbroken hairpins stop on the destination attack's onset. */
  stopBar: number;
  stopBeat: number;
  stopOnset: number;
  /**
   * CC11 and note-on target at the written stop.
   * An unbroken hairpin uses the destination dynamic.
   * A hairpin cut at a rest uses the same linear mix on the original onset span,
   * sampled at the release. The full destination dynamic is not squeezed into the shorter span.
   */
  endValue: number;
}

interface Shaped {
  markEvents: PartDynamicEvent[];
  wedges: PlannedWedge[];
  wedge: WedgeShape;
  articulations: Array<{ attack: Attack; name: ArticulationV34 }>;
  marks: DynamicMark[];
  signature: string;
}

function shapePhrase(
  family: string,
  role: Role,
  contour: Contour,
  tension: number,
  phraseAttacks: Attack[],
  phraseIndex: number,
  ending: boolean,
  kind: SymphonicPhrasePlan['kind'],
  breath: number | undefined,
  previousMarcato: boolean,
): Shaped {
  const startIndex = baseIndex(kind, role, tension, ending, phraseIndex);
  const startMark = markAt(startIndex, family, tension);
  const louderMark = markAt(startIndex + 1, family, tension);
  const softerMark = markAt(startIndex - 1, family, tension);
  const peak = phraseAttacks.reduce((best, attack) => attack.note.pitch > best.note.pitch ? attack : best);
  const first = phraseAttacks[0]!;
  const last = phraseAttacks[phraseAttacks.length - 1]!;
  const room = usefulHairpinSpan(phraseAttacks);
  const selective = role === 'foreground' || role === 'answer' || (role === 'support' && phraseIndex % 2 === 1);
  const familyAllows = family === 'woodwind' || family === 'brass' || family === 'strings';
  let wedge: WedgeShape = 'none';
  if (room && selective && familyAllows && contour !== 'static') {
    if (contour === 'arch') wedge = 'arch';
    else if (contour === 'rising' || contour === 'leap') wedge = 'rise';
    else if (contour === 'falling') wedge = 'fall';
  }
  const markEvents: PartDynamicEvent[] = [];
  const marks: DynamicMark[] = [];
  const wedges: PlannedWedge[] = [];
  const pushWedge = (from: Attack, to: Attack, type: PlannedWedge['type'], fromMark: DynamicMark, toMark: DynamicMark) => {
    wedges.push({
      from,
      to,
      type,
      fromMark,
      toMark,
      stopBar: to.bar,
      stopBeat: to.beat,
      stopOnset: to.onset,
      endValue: VELOCITY[toMark] ?? 80,
    });
  };
  const pushMark = (attack: Attack, mark: DynamicMark) => {
    if (marks[marks.length - 1] === mark && markEvents[markEvents.length - 1]?.bar === attack.bar && markEvents[markEvents.length - 1]?.beat === attack.beat) return;
    marks.push(mark);
    markEvents.push({ bar: attack.bar, beat: attack.beat, mark });
  };
  if (contour === 'falling') {
    pushMark(first, louderMark);
    if (last.onset > first.onset + 0.02) pushMark(last, softerMark);
  } else if (contour === 'static' || phraseAttacks.length < 2) {
    pushMark(first, ending ? softerMark : startMark);
  } else {
    pushMark(first, startMark);
    if (peak.onset > first.onset + 0.02 && louderMark !== startMark) pushMark(peak, louderMark);
    if (last.onset > peak.onset + 0.02) pushMark(last, ending || contour === 'arch' ? softerMark : louderMark);
  }
  const canRise = louderMark !== startMark && peak.onset > first.onset + 0.02;
  const canFall = softerMark !== louderMark && last.onset > peak.onset + 0.02;
  if (wedge === 'arch') {
    if (canRise) pushWedge(first, peak, 'crescendo', startMark, louderMark);
    if (canFall) pushWedge(peak, last, 'diminuendo', louderMark, softerMark);
    if (!wedges.length) wedge = 'none';
    else if (wedges.length === 1) wedge = wedges[0]!.type === 'crescendo' ? 'rise' : 'fall';
  } else if (wedge === 'rise' && canRise) {
    pushWedge(first, peak.onset > first.onset + 0.02 ? peak : last, 'crescendo', startMark, louderMark);
  } else if (wedge === 'fall' && last.onset > first.onset + 0.02 && softerMark !== louderMark) {
    pushWedge(first, last, 'diminuendo', louderMark, softerMark);
  } else {
    wedge = 'none';
  }
  if (!wedges.length) wedge = 'none';

  const slurRole = new Map<NoteEvent, 'start' | 'inside' | 'stop'>();
  for (const run of runs(phraseAttacks)) {
    for (const chunk of slurChunks(run, family, breath, contour, tension)) {
      chunk.forEach((attack, index) => {
        slurRole.set(attack.note, index === 0 ? 'start' : index === chunk.length - 1 ? 'stop' : 'inside');
      });
    }
  }
  const articulations: Shaped['articulations'] = [];
  let usedMarcato = false;
  for (const attack of phraseAttacks) {
    if (tiedContinuation(attack)) continue;
    const duration = attack.end - attack.onset;
    const place = slurRole.get(attack.note);
    const phraseStart = attack === first && attack.beat < 0.08;
    const isPeak = attack === peak;
    const leapIn = intervalInto(phraseAttacks, attack);
    let name: ArticulationV34 | undefined;
    const marcatoOk = !previousMarcato
      && !usedMarcato
      && (family === 'brass' || family === 'timpani')
      && isPeak
      && duration < 1
      && !place
      && tension >= 0.85
      && contour === 'leap';
    if (marcatoOk) name = 'marcato';
    else if (family === 'percussion') {
      if (phraseAttacks.length <= 2 || attack.beat < 0.08 || Math.abs(attack.beat - 2) < 0.08) name = 'accent';
      else if (duration < 0.5 && tension >= 0.4) name = 'staccato';
    } else if (family === 'timpani') {
      if (isPeak && attack.beat < 0.08) name = 'accent';
    } else if (family !== 'harp') {
      if (place === 'inside') {
        name = undefined;
      } else if (place === 'stop' && duration >= 1 && (family === 'woodwind' || family === 'strings')) {
        name = 'tenuto';
      } else if (duration < 0.75 && !place && (family === 'woodwind' || family === 'brass' || family === 'strings')) {
        name = 'staccato';
      } else if ((family === 'brass' || family === 'strings') && (phraseStart || leapIn >= 5)) {
        name = 'accent';
      } else if ((family === 'woodwind' || family === 'strings') && duration >= 1.5 && (attack === last || contour === 'static')) {
        name = 'tenuto';
      }
    }
    if (name) {
      articulations.push({ attack, name });
      if (name === 'marcato') usedMarcato = true;
    }
  }
  const signature = `${marks.join(',')}|${wedge}|${articulations.map((item) => item.name).join(',')}`;
  return { markEvents, wedges, wedge, articulations, marks, signature };
}

function retieSignature(shaped: Shaped): Shaped {
  return {
    ...shaped,
    signature: `${shaped.marks.join(',')}|${shaped.wedge}|${shaped.articulations.map((item) => item.name).join(',')}`,
  };
}

function avoidRepeat(shaped: Shaped, previous: string | null, family: string, tension: number, longPhrase: boolean): { shaped: Shaped; repeated: boolean } {
  if (!previous || shaped.signature !== previous || !longPhrase) return { shaped, repeated: false };
  if (shaped.wedge !== 'none') {
    return { shaped: retieSignature({ ...shaped, wedges: [], wedge: 'none' }), repeated: false };
  }
  if (shaped.marks.length) {
    const nextMarks = [...shaped.marks];
    const last = nextMarks[nextMarks.length - 1]!;
    const current = LADDER.indexOf(last);
    const [low, high] = boundsFor(family, tension);
    const nudged = current <= low ? Math.min(high, current + 1) : current - 1;
    const replacement = LADDER[nudged] ?? last;
    if (replacement !== last) {
      nextMarks[nextMarks.length - 1] = replacement;
      const markEvents = shaped.markEvents.map((event, index) => index === shaped.markEvents.length - 1 ? { ...event, mark: replacement } : event);
      const changed = retieSignature({ ...shaped, marks: nextMarks, markEvents });
      if (changed.signature !== previous) return { shaped: changed, repeated: false };
    }
  }
  if (shaped.articulations.length) {
    const articulations = shaped.articulations.slice(0, -1);
    const changed = retieSignature({ ...shaped, articulations });
    if (changed.signature !== previous) return { shaped: changed, repeated: false };
  }
  return { shaped, repeated: true };
}

function bias(velocity: number, family: string, articulation: ArticulationV34 | undefined): number {
  let value = velocity;
  if (family === 'brass') value += 6;
  if (family === 'percussion') value += 8;
  if (articulation === 'accent') value += 6;
  if (articulation === 'marcato') value += 10;
  if (articulation === 'staccato') value -= 4;
  if (family === 'harp') value = Math.min(value, 64);
  return Math.max(1, Math.min(127, value));
}

function velocityAlong(
  onset: number,
  marks: Array<{ at: number; mark: DynamicMark }>,
  wedges: Shaped['wedges'],
): number {
  const wedge = wedges.find((item) => onset >= item.from.onset - 0.001 && onset <= item.stopOnset + 0.001);
  if (wedge && wedge.stopOnset > wedge.from.onset) {
    const span = wedge.stopOnset - wedge.from.onset;
    const mix = Math.max(0, Math.min(1, (onset - wedge.from.onset) / span));
    const from = VELOCITY[wedge.fromMark] ?? 80;
    const to = wedge.endValue;
    return Math.round(from + (to - from) * mix);
  }
  let mark = marks[0]?.mark ?? 'mf';
  for (const item of marks) {
    if (item.at <= onset + 0.001) mark = item.mark;
  }
  return VELOCITY[mark] ?? 80;
}

function locate(attacks: Attack[], absolute: number): { bar: number; beat: number } {
  const first = attacks[0];
  if (!first) return { bar: 1, beat: 0 };
  let best = first;
  for (const attack of attacks) {
    if (Math.abs(attack.onset - absolute) < Math.abs(best.onset - absolute)) best = attack;
  }
  return { bar: best.bar, beat: Math.max(0, best.beat + (absolute - best.onset)) };
}

export function applySymphonicExpression(
  score: ScoreModel,
  plans: readonly SymphonicPhrasePlan[],
): Phase3ExpressionReceipt {
  const before = score.parts.map((part) => part.measures.map((measure) => measure.events.map((event) => event.kind === 'note' ? noteIdentity(event) : 'rest')).join('|')).join('\n');
  const beforeCount = score.parts.reduce((sum, part) => sum + part.measures.reduce((inner, measure) => inner + measure.events.length, 0), 0);
  const dynamics: Record<string, PartDynamicEvent[]> = {};
  const midiExpression: NonNullable<ScoreModel['midiExpression']> = [];
  const breathingWarnings: string[] = [];
  const decisions: ExpressionDecision[] = [];
  const velocities = new Set<number>();
  const byFamily: Phase3ExpressionReceipt['byFamily'] = {};
  let identicalConsecutiveLong = 0;
  let marcato = 0;
  const ensure = (family: string) => {
    byFamily[family] ??= { slurs: 0, articulations: 0, wedges: 0, dynamicMarks: 0, marcato: 0 };
    return byFamily[family]!;
  };
  const orderedPlans = [...plans].sort((a, b) => a.startBar - b.startBar || a.endBar - b.endBar);
  const attacksByPart = new Map<string, Attack[]>();
  const spansByPart = new Map<string, Map<number, number>>();
  for (const part of score.parts) {
    const read = attacksOf(score, part.id);
    attacksByPart.set(part.id, read.attacks);
    spansByPart.set(part.id, read.spans);
  }

  for (const part of score.parts) {
    const family = familyOf(part.id);
    const attacks = attacksByPart.get(part.id) ?? [];
    const spans = spansByPart.get(part.id) ?? new Map<number, number>();
    if (!attacks.length) continue;
    const breath = BREATH_QUARTERS[part.id];
    for (const run of runs(attacks)) {
      const span = run[run.length - 1]!.end - run[0]!.onset;
      if (breath !== undefined && span >= breath - 0.02) {
        const quarters = Math.round(span * 10) / 10;
        breathingWarnings.push(
          `Breathing warning: ${part.name} sounds ${quarters} quarters without a rest. The notes and ties stay on ${part.name}. Expression did not move the line. This is not player approval.`,
        );
      }
    }
    let previousSignature: string | null = null;
    let previousMarcato = false;
    const claimed = new Set<NoteEvent>();
    orderedPlans.forEach((plan, phraseIndex) => {
      const phraseAttacks = attacks.filter((attack) => attack.bar >= plan.startBar && attack.bar <= plan.endBar && !claimed.has(attack.note));
      if (!phraseAttacks.length) return;
      for (const attack of phraseAttacks) claimed.add(attack.note);
      const role = roleOf(plan, part.id);
      const melody = plan.foregroundIds.flatMap((id) => (attacksByPart.get(id) ?? []).filter((attack) => attack.bar >= plan.startBar && attack.bar <= plan.endBar));
      melody.sort((a, b) => a.onset - b.onset || a.note.pitch - b.note.pitch);
      const contour = family === 'percussion' ? 'static' : contourOf(phraseAttacks);
      const ending = plan.endBar === 24;
      const tension = Math.round(((tensionOf(phraseAttacks, plan.kind, ending) + tensionOf(melody.length ? melody : phraseAttacks, plan.kind, ending)) / 2) * 100) / 100;
      const shaped = shapePhrase(family, role, contour, tension, phraseAttacks, phraseIndex, ending, plan.kind, breath, previousMarcato);
      const varied = avoidRepeat(shaped, previousSignature, family, tension, phraseAttacks.length >= 3);
      if (varied.repeated) identicalConsecutiveLong += 1;
      previousSignature = varied.shaped.signature;
      previousMarcato = varied.shaped.articulations.some((item) => item.name === 'marcato');
      const emittedWedges = clipWedges(varied.shaped.wedges, phraseAttacks, spans);
      const emittedWedge: WedgeShape = emittedWedges.length === 0
        ? 'none'
        : emittedWedges.length === 1
          ? (emittedWedges[0]!.type === 'crescendo' ? 'rise' : 'fall')
          : varied.shaped.wedge;
      const list = dynamics[part.id] ?? [];
      list.push(...varied.shaped.markEvents);
      ensure(family).dynamicMarks += varied.shaped.markEvents.length;
      for (const wedge of emittedWedges) {
        list.push({ bar: wedge.from.bar, beat: wedge.from.beat, wedge: wedge.type });
        list.push({ bar: wedge.stopBar, beat: wedge.stopBeat, wedge: 'stop' });
        ensure(family).wedges += 1;
        const unbroken = Math.abs(wedge.stopOnset - wedge.to.onset) < 0.001 && wedge.stopBar === wedge.to.bar;
        const mid = unbroken
          ? locate(phraseAttacks, (wedge.from.onset + wedge.to.onset) / 2)
          : positionAt((wedge.from.onset + wedge.stopOnset) / 2, wedge.from, spans);
        const fromValue = VELOCITY[wedge.fromMark] ?? 80;
        const endValue = wedge.endValue;
        midiExpression.push(
          { partId: part.id, bar: wedge.from.bar, beat: wedge.from.beat, controller: 11, value: Math.max(0, Math.min(127, fromValue)) },
          { partId: part.id, bar: mid.bar, beat: mid.beat, controller: 11, value: Math.max(0, Math.min(127, Math.round((fromValue + endValue) / 2))) },
          { partId: part.id, bar: wedge.stopBar, beat: wedge.stopBeat, controller: 11, value: Math.max(0, Math.min(127, endValue)) },
        );
      }
      dynamics[part.id] = list;
      const slurred = new Set<NoteEvent>();
      for (const run of runs(phraseAttacks)) {
        for (const chunk of slurChunks(run, family, breath, contour, tension)) {
          const first = chunk[0]!.note;
          const last = chunk[chunk.length - 1]!.note;
          if (first === last) continue;
          first.notation = { ...first.notation, slur: 'start' };
          last.notation = { ...last.notation, slur: 'stop' };
          for (const attack of chunk) slurred.add(attack.note);
          ensure(family).slurs += 1;
        }
      }
      const chosen = new Map<NoteEvent, ArticulationV34>();
      for (const item of varied.shaped.articulations) {
        if (item.name === 'staccato' && slurred.has(item.attack.note)) continue;
        item.attack.note.notation = { ...item.attack.note.notation, articulations: [item.name] };
        chosen.set(item.attack.note, item.name);
        ensure(family).articulations += 1;
        if (item.name === 'marcato') {
          marcato += 1;
          ensure(family).marcato += 1;
        }
      }
      const anchors = varied.shaped.markEvents.flatMap((event) => {
        const attack = phraseAttacks.find((item) => item.bar === event.bar && Math.abs(item.beat - event.beat) < 0.001);
        return attack && event.mark ? [{ at: attack.onset, mark: event.mark }] : [];
      });
      for (const attack of phraseAttacks) {
        const articulation = chosen.get(attack.note);
        const velocity = bias(velocityAlong(attack.onset, anchors, emittedWedges), family, articulation);
        attack.note.velocity = velocity;
        velocities.add(velocity);
      }
      decisions.push({
        phraseId: plan.phraseId,
        partId: part.id,
        role,
        contour,
        tension,
        marks: varied.shaped.marks,
        wedge: emittedWedge,
        articulations: [...new Set(chosen.values())],
      });
    });
    const list = dynamics[part.id];
    if (list) {
      list.sort((a, b) => a.bar - b.bar || a.beat - b.beat || (a.wedge === 'stop' ? 0 : a.mark ? 1 : 2) - (b.wedge === 'stop' ? 0 : b.mark ? 1 : 2));
    }
  }

  score.partDynamics = dynamics;
  const seen = new Set<string>();
  const midiEvents = midiExpression.filter((event) => {
    const key = `${event.partId}:${event.bar}:${event.beat.toFixed(3)}:${event.controller}:${event.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (midiEvents.length) score.midiExpression = midiEvents;
  const after = score.parts.map((part) => part.measures.map((measure) => measure.events.map((event) => event.kind === 'note' ? noteIdentity(event) : 'rest')).join('|')).join('\n');
  const afterCount = score.parts.reduce((sum, part) => sum + part.measures.reduce((inner, measure) => inner + measure.events.length, 0), 0);
  if (before !== after || beforeCount !== afterCount) {
    throw new Error('Expressive orchestration changed a pitch, onset, duration, tie, or event count.');
  }
  return {
    expression: 'expressive',
    dynamicMarks: Object.values(byFamily).reduce((sum, row) => sum + row.dynamicMarks, 0),
    wedges: Object.values(byFamily).reduce((sum, row) => sum + row.wedges, 0),
    slurs: Object.values(byFamily).reduce((sum, row) => sum + row.slurs, 0),
    articulations: Object.values(byFamily).reduce((sum, row) => sum + row.articulations, 0),
    marcato,
    midiExpressionEvents: midiEvents.length,
    velocityLevels: velocities.size,
    plannedVelocityLevels: velocities.size,
    identicalConsecutiveLong,
    breathingWarnings,
    byFamily,
    decisions,
  };
}
