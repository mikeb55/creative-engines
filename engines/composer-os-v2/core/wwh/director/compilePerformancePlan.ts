/**
 * Deterministic timeline compiler.
 * Copies source measures, writes rests, and schedules open windows. No new pitches.
 */

import type { WwhImportedMeasure } from '../wwhDuoImport';
import type { WwhAtom } from '../wwhPerformanceTypes';
import type { WwhTempoMark } from '../wwhTiming';
import { barQuarters, wwhAdd, wwhReduce, type WwhRational } from '../wwhTiming';
import { regionAtoms, resolveWindow, type WindowSchedule } from './cueSchedule';
import type {
  CompiledSection,
  ExecutionReceipt,
  PlanSection,
  Player,
  Point,
  SectionSchedule,
} from './performancePlanTypes';
import { DIRECTOR_COMPILER_VERSION, DIRECTOR_COMPILER_VERSION_73B } from './performancePlanTypes';
import { expandSpan, type SourceIndex, type SourceMeasure } from './sourceIndexAdapter';
import type { BoundPlan } from './validatePerformancePlan';

export interface CompiledLane {
  kind: 'source' | 'rest' | 'open' | 'chord_melody' | 'split';
  status: ExecutionReceipt['materials'][number]['status'];
  lines: string[];
  sourceMeasureId: string | null;
  arrangementMeasureId: string | null;
  use: 'primary' | 'quotation' | 'none' | 'chord_melody';
  measure: WwhImportedMeasure | null;
  atoms: WwhAtom[] | null;
  barNotation: 'source' | 'chord_melody' | 'rest' | 'open' | 'rest_then_open';
}

export interface CompiledBar {
  sectionId: string;
  outputBar: number;
  guitar: CompiledLane;
  bass: CompiledLane;
  beats: number;
  beatType: number;
  divisions: number;
  fifths: number;
  mode: string;
  guitarTranspose: number;
  bassTranspose: number;
  tempo: WwhTempoMark;
}

export interface CompiledPerformance {
  bars: CompiledBar[];
  receipt: ExecutionReceipt;
}

interface Attr {
  beats: number;
  beatType: number;
  divisions: number;
  fifths: number;
  mode: string;
  guitarTranspose: number;
  bassTranspose: number;
  tempo: WwhTempoMark;
}

function attrsFrom(measure: SourceMeasure): Attr {
  return {
    beats: measure.guitar.beats,
    beatType: measure.guitar.beatType,
    divisions: measure.guitar.divisions,
    fifths: measure.guitar.fifths,
    mode: measure.guitar.mode,
    guitarTranspose: measure.guitar.transposeOctave,
    bassTranspose: measure.bass.transposeOctave,
    tempo: { ...measure.guitar.tempo },
  };
}

function beatUnit(denominator: number): string {
  if (denominator === 1) return 'whole';
  if (denominator === 2) return 'half';
  if (denominator === 8) return 'eighth';
  if (denominator === 16) return '16th';
  return 'quarter';
}

function laneLines(section: PlanSection, player: Player, kind: CompiledLane['kind'], first: boolean): string[] {
  if (kind === 'chord_melody' || !first) return [];
  if (kind === 'source') return [section.id];
  const voice = section.voices[player];
  const lines = [section.id];
  if (voice.role === 'lead' && voice.material.kind === 'performer') {
    lines.push(player === 'guitar' ? 'GUITAR LEADS' : 'BASS LEADS');
  }
  if (voice.material.kind === 'performer') lines.push(voice.material.instruction);
  if (kind === 'rest') {
    const reason = voice.material.kind === 'tacet' ? voice.material.reason : 'yield';
    lines.push(`TACET — ${reason}`);
    return lines;
  }
  lines.push('OPEN IMPROVISATION');
  return lines;
}

function laneFor(
  bound: BoundPlan,
  section: PlanSection,
  player: Player,
  measure: SourceMeasure | null,
  first: boolean
): CompiledLane {
  const material = section.voices[player].material;
  if (material.kind === 'chord_melody') {
    if (!measure) throw new Error(`missing duo measure for chord melody ${section.id}`);
    const arranged = bound.arrangementByDuoId.get(measure.id);
    if (!arranged) throw new Error(`no verified chord-melody bar for duo ${measure.id}`);
    return {
      kind: 'chord_melody',
      status: 'CHORD_MELODY_REALIZED',
      lines: laneLines(section, player, 'chord_melody', first),
      sourceMeasureId: measure.id,
      arrangementMeasureId: arranged.id,
      use: 'chord_melody',
      measure: arranged.guitar,
      atoms: null,
      barNotation: 'chord_melody',
    };
  }
  if (material.kind === 'source') {
    const part = player === 'guitar' ? measure?.guitar : measure?.bass;
    if (!measure || !part) throw new Error(`missing source measure for ${section.id} ${player}`);
    return {
      kind: 'source',
      status: 'SOURCE_REALIZED',
      lines: laneLines(section, player, 'source', first),
      sourceMeasureId: measure.id,
      arrangementMeasureId: null,
      use: section.primarySourceSpan ? 'primary' : 'quotation',
      measure: part,
      atoms: null,
      barNotation: 'source',
    };
  }
  if (material.kind === 'tacet') {
    return {
      kind: 'rest',
      status: 'REST_REALIZED',
      lines: laneLines(section, player, 'rest', first),
      sourceMeasureId: null,
      arrangementMeasureId: null,
      use: 'none',
      measure: null,
      atoms: null,
      barNotation: 'rest',
    };
  }
  return {
    kind: 'open',
    status: 'PERFORMER_UNREALIZED',
    lines: laneLines(section, player, 'open', first),
    sourceMeasureId: null,
    arrangementMeasureId: null,
    use: 'none',
    measure: null,
    atoms: null,
    barNotation: 'open',
  };
}

function windowLane(
  section: PlanSection,
  player: Player,
  window: WindowSchedule,
  offset: number,
  divisions: number,
  first: boolean
): CompiledLane {
  const span = player === 'guitar' ? window.guitar : window.bass;
  const barQ = window.barQ;
  const barStart = wwhReduce(offset * barQ.n, barQ.d);
  const barEnd = wwhAdd(barStart, barQ);
  const sounding = section.voices[player].material.kind === 'performer';
  const built = regionAtoms(barStart, barEnd, span.entryQ, span.exitQ, divisions, sounding);
  if (!built) throw new Error(`cue grid does not fit ${section.id} ${player} bar ${offset + 1}`);
  const open = built.notation !== 'rest';
  const lines = laneLines(section, player, open ? 'open' : 'rest', first);
  if (span.causeCueId && offset === span.entry.bar) {
    const beat = span.entry.offsetQ.n === 0 ? '' : ` +${span.entry.offsetQ.n}/${span.entry.offsetQ.d}`;
    lines.push(`${player === 'guitar' ? 'GUITAR' : 'BASS'} ENTERS${beat}`);
  }
  return {
    kind: built.notation === 'rest_then_open' ? 'split' : open ? 'open' : 'rest',
    status: open ? 'PERFORMER_UNREALIZED' : 'REST_REALIZED',
    lines,
    sourceMeasureId: null,
    arrangementMeasureId: null,
    use: 'none',
    measure: null,
    atoms: built.notation === 'rest_then_open' ? built.atoms : null,
    barNotation: built.notation,
  };
}

export function compilePerformancePlan(bound: BoundPlan, index: SourceIndex): CompiledPerformance {
  const bars: CompiledBar[] = [];
  const sections: CompiledSection[] = [];
  const schedule: SectionSchedule[] = [];
  let running: Attr = attrsFrom(index.measures[0]!);
  let outputBar = 1;
  const trace = bound.trace ?? { planId: bound.plan.id, decisions: [] };
  for (const section of bound.plan.sections) {
    const firstOutputBar = outputBar;
    let template: SourceMeasure[] = [];
    if (section.length.kind === 'source') template = expandSpan(index, section.length.span);
    else if (section.meter.kind === 'repeat_template' || section.meter.kind === 'source') template = expandSpan(index, section.meter.span);
    let window: WindowSchedule | null = null;
    if (section.length.kind === 'cue_window') {
      const resolved = resolveWindow(section, trace, index);
      if (!resolved.ok) throw new Error(resolved.message);
      window = resolved.schedule;
    }
    const count = window ? window.barCount : section.length.kind === 'fixed' ? section.length.bars : template.length;
    let duration: WwhRational = { n: 0, d: 1 };
    const cueTimes: CompiledSection['cueTimes'] = [];
    for (let offset = 0; offset < count; offset += 1) {
      let attr: Attr;
      if (section.length.kind === 'source') attr = attrsFrom(template[offset]!);
      else if (template.length) attr = { ...attrsFrom(template[offset % template.length]!), tempo: { ...running.tempo } };
      else {
        attr = { ...running };
        if (section.meter.kind === 'explicit') {
          attr.beats = section.meter.beats;
          attr.beatType = section.meter.beatType;
        }
      }
      if (section.tempo.kind === 'explicit' && offset === 0) {
        attr.tempo = {
          beatUnit: beatUnit(section.tempo.unitDenominator),
          dots: section.tempo.dots,
          perMinute: String(section.tempo.bpm),
          soundTempo: null,
        };
      } else if (section.tempo.kind === 'rubato' && offset === 0) {
        attr.tempo = { beatUnit: 'quarter', dots: 0, perMinute: String(section.tempo.previewQuarterBpm), soundTempo: null };
      } else if (section.tempo.kind !== 'source') {
        attr.tempo = { ...running.tempo };
      }
      const sourceMeasure = section.length.kind === 'source' ? template[offset]! : null;
      const bar: CompiledBar = {
        sectionId: section.id,
        outputBar,
        guitar: window ? windowLane(section, 'guitar', window, offset, attr.divisions, offset === 0) : laneFor(bound, section, 'guitar', sourceMeasure, offset === 0),
        bass: window ? windowLane(section, 'bass', window, offset, attr.divisions, offset === 0) : laneFor(bound, section, 'bass', sourceMeasure, offset === 0),
        beats: attr.beats,
        beatType: attr.beatType,
        divisions: attr.divisions,
        fifths: attr.fifths,
        mode: attr.mode,
        guitarTranspose: attr.guitarTranspose,
        bassTranspose: attr.bassTranspose,
        tempo: attr.tempo,
      };
      bars.push(bar);
      duration = wwhAdd(duration, barQuarters(attr.beats, attr.beatType));
      running = attr;
      outputBar += 1;
    }
    if (window) {
      for (const cue of window.cues) cueTimes.push({ cueId: cue.cue.id, at: cue.at });
      schedule.push({
        sectionId: section.id,
        barCount: window.barCount,
        durationQ: window.durationQ,
        plannedBarCount: window.plannedBarCount,
        firstOutputBar,
        leadership: window.leadership,
        cues: window.cues.map((cue) => ({
          cueId: cue.cue.id,
          owner: cue.cue.owner,
          at: cue.at,
          behaviour: cue.cue.interruption?.behaviour ?? 'none',
        })),
        guitar: { entry: window.guitar.entry, exit: window.guitar.exit, causeCueId: window.guitar.causeCueId, exitCueId: window.guitar.exitCueId },
        bass: { entry: window.bass.entry, exit: window.bass.exit, causeCueId: window.bass.causeCueId, exitCueId: window.bass.exitCueId },
      });
    } else {
      for (const cue of section.cues) {
        if (cue.trigger.kind === 'at') cueTimes.push({ cueId: cue.id, at: cue.trigger.point });
      }
    }
    sections.push({ id: section.id, firstOutputBar, barCount: count, durationQ: duration, cueTimes });
  }

  const materials = bound.plan.sections.flatMap((section) =>
    (['guitar', 'bass'] as const).map((player) => ({
      sectionId: section.id,
      player,
      status: (section.voices[player].material.kind === 'source'
        ? 'SOURCE_REALIZED'
        : section.voices[player].material.kind === 'chord_melody'
          ? 'CHORD_MELODY_REALIZED'
          : section.voices[player].material.kind === 'tacet'
            ? 'REST_REALIZED'
            : 'PERFORMER_UNREALIZED') as ExecutionReceipt['materials'][number]['status'],
    }))
  );
  const warnings = materials
    .filter((row) => row.status === 'PERFORMER_UNREALIZED')
    .map((row) => ({
      code: 'REQUESTED_NOT_REALIZED',
      sectionId: row.sectionId,
      message: `${row.player} in ${row.sectionId} is performer-directed. Mode and density are printed, not realised.`,
    }));
  const sourceMap = bars.flatMap((bar) =>
    (['guitar', 'bass'] as const).map((player) => ({
      sectionId: bar.sectionId,
      player,
      outputBar: bar.outputBar,
      sourceMeasureId: bar[player].sourceMeasureId,
      arrangementMeasureId: bar[player].arrangementMeasureId,
      use: bar[player].use,
      notation: bar[player].barNotation,
    }))
  );
  const unrealized = materials.some((row) => row.status === 'PERFORMER_UNREALIZED') || bars.some((bar) => bar.guitar.barNotation === 'open' || bar.guitar.barNotation === 'rest_then_open' || bar.bass.barNotation === 'open' || bar.bass.barNotation === 'rest_then_open');
  return {
    bars,
    receipt: {
      sourceSha256: index.sha256,
      planSha256: bound.planSha256,
      compilerVersion: bound.plan.engineEdition === '7.3b' ? DIRECTOR_COMPILER_VERSION_73B : DIRECTOR_COMPILER_VERSION,
      schedule,
      sections,
      materials,
      warnings,
      sourceMap,
      playbackStatus: unrealized ? 'SOURCE_AND_RESTS_ONLY' : 'ALL_NOTATED',
      products: {
        performance: { bars: bars.length, sectionIds: bound.plan.sections.map((section) => section.id) },
        leadsheet: { bars: index.measures.length, sectionIds: bound.plan.sections.map((section) => section.id) },
        guitar_study: { bars: bars.length, sectionIds: bound.plan.practiceViews.find((view) => view.product === 'guitar_study')?.sectionIds ?? [] },
        bass_partner: { bars: bars.length, sectionIds: bound.plan.practiceViews.find((view) => view.product === 'bass_partner')?.sectionIds ?? [] },
      },
    },
  };
}

export function cuePointKey(point: Point): string {
  return `${point.bar}:${point.offsetQ.n}/${point.offsetQ.d}`;
}
