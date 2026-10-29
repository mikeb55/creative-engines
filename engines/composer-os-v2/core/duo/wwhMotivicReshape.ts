/**
 * MORPH M2 RESHAPE — opt-in motivic reconstruction on one declared multi-bar guitar window.
 * Root cell via motifFromDiscoveredPattern; development via buildChain; write via writePhraseMeasureEvents.
 * Does not invent form, change bar count, or touch bass/harmony outside note rewrite in-window.
 */

import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { buildChain, type ChainPlanStep } from '../motif-ops/developmentChain';
import {
  motifFromDiscoveredPattern,
  type DiscoveredPattern,
} from '../motif-ops/motifDiscovery';
import type { OperatorParams } from '../motif-ops/operators';
import type { MotifNoteEvent, OperatorId } from '../motif-ops/types';
import { writePhraseMeasureEvents } from './wwhSourceAnchoredHarmonic';

export type ReshapeOpId = 'invert' | 'expand-intervals' | 'sequence-real';

export type MotivicReshapePlanStep = {
  op: ReshapeOpId;
  params?: OperatorParams;
};

export type MotivicReshapeOpts = {
  sourcePath: string;
  /** Inclusive multi-bar guitar reshape window (explicit; no auto-planning). */
  window: { from: number; to: number };
  /** One chain step per window bar (length must match bar count). */
  ops: readonly MotivicReshapePlanStep[];
  /** Explicit source-bound cell (from discovery or hand-declared). */
  pattern: DiscoveredPattern;
  occurrenceIndex?: number;
  /** Guitar bars that must stay untouched (motifs). */
  motifBars?: ReadonlySet<number> | readonly number[];
  /** Extra protected guitar bars. */
  protectedGuitarBars?: ReadonlySet<number> | readonly number[];
  /** Structural anchors that must stay untouched. */
  anchorBars?: ReadonlySet<number> | readonly number[];
  title: string;
  movement: string;
  guitarPartId?: string;
};

export type MotivicReshapeReceipt = {
  patternId: string;
  occurrenceIndex: number;
  rootId: string;
  window: { from: number; to: number };
  bars: number[];
  ops: ReshapeOpId[];
  lineageIds: string[];
  steps: Array<{ op: string; fromId: string; toId: string; params: Record<string, number | string> }>;
};

export type MotivicReshapeResult = {
  xml: string;
  receipt: MotivicReshapeReceipt;
};

const ALLOWED_OPS: ReadonlySet<string> = new Set([
  'invert',
  'expand-intervals',
  'sequence-real',
]);

function toSet(v: ReadonlySet<number> | readonly number[] | undefined): Set<number> {
  if (!v) return new Set();
  return v instanceof Set ? new Set(v) : new Set(v);
}

function elementChildren(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const n = parent.childNodes[i];
    if (n?.nodeType === 1 && (!name || (n as Element).nodeName === name)) {
      out.push(n as Element);
    }
  }
  return out;
}

function textOf(el: Element | undefined, name: string): string {
  if (!el) return '';
  return elementChildren(el, name)[0]?.textContent?.trim() ?? '';
}

function parseMusicXml(xml: string): Document {
  const errors: string[] = [];
  const doc = new DOMParser({
    onError: (level: string, message: string) => {
      if (level !== 'warning') errors.push(message);
    },
  }).parseFromString(xml, 'text/xml') as unknown as Document;
  if (errors.length) throw new Error(`MusicXML parse failed: ${errors[0]}`);
  return doc;
}

function serialize(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

function partById(doc: Document, id: string): Element {
  const parts = doc.getElementsByTagName('part');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p.getAttribute('id') === id) return p;
  }
  throw new Error(`missing part ${id}`);
}

function measuresOf(part: Element): Element[] {
  return elementChildren(part, 'measure');
}

function barNumber(measure: Element): number {
  return Number(measure.getAttribute('number'));
}

function measureSoundingTicks(measure: Element): number {
  let ticks = 0;
  for (const n of elementChildren(measure, 'note')) {
    if (elementChildren(n, 'chord').length) continue;
    ticks += Number(textOf(n, 'duration') || 0);
  }
  return ticks;
}

function soundingNoteCount(measure: Element): number {
  let n = 0;
  for (const note of elementChildren(measure, 'note')) {
    if (elementChildren(note, 'rest').length) continue;
    if (elementChildren(note, 'pitch').length) n += 1;
  }
  return n;
}

function soundingEventCount(events: readonly MotifNoteEvent[]): number {
  return events.filter((e) => e.midi != null).length;
}

function setTitle(doc: Document, title: string, movement: string): void {
  const wt = doc.getElementsByTagName('work-title')[0];
  if (wt) wt.textContent = title;
  const mt = doc.getElementsByTagName('movement-title')[0];
  if (mt) mt.textContent = movement;
}

function barsInWindow(window: { from: number; to: number }): number[] {
  if (!(window.from >= 1) || window.to <= window.from) {
    throw new Error(
      `reshape requires multi-bar window (from < to); got ${window.from}-${window.to}`,
    );
  }
  const out: number[] = [];
  for (let b = window.from; b <= window.to; b++) out.push(b);
  return out;
}

/** Scale motif-ops quarter-length events into MusicXML duration ticks for one bar. */
function scaleEventsToBarTicks(
  events: readonly MotifNoteEvent[],
  totalTicks: number,
): MotifNoteEvent[] {
  if (!(totalTicks > 0)) throw new Error('reshape requires positive measure duration');
  if (!events.length) throw new Error('reshape refuses empty motif events');
  const end = Math.max(...events.map((e) => e.onset + Math.max(0, e.duration)), 0);
  if (!(end > 0)) throw new Error('reshape motif has zero span');
  const scale = totalTicks / end;
  const scaled = events.map((e) => ({
    onset: Math.max(0, e.onset * scale),
    duration: Math.max(1, Math.round(Math.max(0, e.duration) * scale)),
    midi: e.midi,
  }));
  // Ensure at least one tick of sound remains after rounding.
  if (!soundingEventCount(scaled)) {
    throw new Error('reshape refuses fully liquidated (rest-only) events');
  }
  return scaled;
}

function validatePlan(ops: readonly MotivicReshapePlanStep[]): ChainPlanStep[] {
  if (!ops.length) throw new Error('reshape requires at least one op');
  return ops.map((step, i) => {
    if (!ALLOWED_OPS.has(step.op)) {
      throw new Error(`reshape op not allowed at ${i}: ${step.op}`);
    }
    return { op: step.op as OperatorId, params: step.params };
  });
}

/**
 * Opt-in M2 RESHAPE: rewrite one declared guitar window from a source-bound cell chain.
 * Preserves bass, harmony elements, motifs/anchors outside the window, and measure durations.
 */
export function transformMotivicReshape(opts: MotivicReshapeOpts): MotivicReshapeResult {
  const bars = barsInWindow(opts.window);
  if (opts.ops.length !== bars.length) {
    throw new Error(
      `reshape ops length ${opts.ops.length} must equal window bars ${bars.length}`,
    );
  }

  const locked = new Set<number>([
    ...toSet(opts.motifBars),
    ...toSet(opts.protectedGuitarBars),
    ...toSet(opts.anchorBars),
  ]);
  for (const bar of bars) {
    if (locked.has(bar)) {
      throw new Error(`reshape window bar ${bar} overlaps protected/motif/anchor lock`);
    }
  }

  const plan = validatePlan(opts.ops);
  const occurrenceIndex = opts.occurrenceIndex ?? 0;
  const root = motifFromDiscoveredPattern(opts.pattern, occurrenceIndex);
  if (soundingEventCount(root.events) < 1) {
    throw new Error('reshape root cell has no sounding events');
  }

  const chain = buildChain(root, plan);
  if (chain.results.length !== bars.length) {
    throw new Error('reshape chain result count mismatch');
  }

  const sourceXml = fs.readFileSync(opts.sourcePath, 'utf8');
  const doc = parseMusicXml(sourceXml);
  setTitle(doc, opts.title, opts.movement);
  const gtr = measuresOf(partById(doc, opts.guitarPartId ?? 'P1'));
  const written: number[] = [];
  const appliedOps: ReshapeOpId[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const developed = chain.results[i]!;
    if (soundingEventCount(developed.events) < 1) {
      throw new Error(`reshape refuses fully liquidated output at bar ${bar}`);
    }
    const measure = gtr.find((m) => barNumber(m) === bar);
    if (!measure) throw new Error(`reshape missing guitar measure ${bar}`);
    const totalTicks = measureSoundingTicks(measure);
    const scaled = scaleEventsToBarTicks(developed.events, totalTicks);
    writePhraseMeasureEvents(measure, scaled);
    if (soundingNoteCount(measure) < 1) {
      throw new Error(`reshape wrote rest-only measure at bar ${bar}`);
    }
    written.push(bar);
    appliedOps.push(opts.ops[i]!.op);
  }

  return {
    xml: serialize(doc),
    receipt: {
      patternId: opts.pattern.id || root.id,
      occurrenceIndex,
      rootId: chain.rootId,
      window: { from: opts.window.from, to: opts.window.to },
      bars: written,
      ops: appliedOps,
      lineageIds: [...chain.lineageIds],
      steps: chain.steps.map((s) => ({
        op: s.op,
        fromId: s.fromId,
        toId: s.toId,
        params: { ...s.params },
      })),
    },
  };
}
