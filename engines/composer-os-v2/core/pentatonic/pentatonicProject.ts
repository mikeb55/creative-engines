/**
 * Pentatonic project file — versioned compositional state.
 * Same pattern as BHL project files: format, version, validate, reject corrupt input.
 * Does not write BHL projects and does not regenerate a route on load.
 */

import { COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS, colourInstance, type ColourRouteResult } from './colourPath';
import { getPentatonicColourResource } from './colourRegistry';
import type { PentatonicGenerateResult, PentatonicTransformResult } from './dev4cWorkflow';
import { ensureMusicXmlDomParserPolyfill } from '../musicXmlImportDomPolyfill';
import { parseCollectionIdentityMark } from './musicXmlScore';
import { PENTATONIC_NOTE_CHOICES, canonicalPitchSetId } from './pitch';
import { getPentatonicArchetype } from './registry';
import { sha256Text } from './practiceFacade';

export const PENTATONIC_PROJECT_FORMAT = 'pentatonic-project';
export const PENTATONIC_PROJECT_VERSION = 1;
export const PENTATONIC_PROJECT_NONE = 'NONE';

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const WORKFLOW_MODES = ['analyse', 'transform', 'generate', 'auto-color', 'compare', 'export'] as const;
const PURPOSES = ['MOTIF', 'LYRICAL_ANSWER', 'COUNTERLINE', 'COMPING_FRAGMENT', 'DEVELOPMENT', 'NO_PHRASE'] as const;

export interface PentatonicProjectEvent {
  partId: string;
  measure: number;
  voice: number | null;
  kind: 'note' | 'rest';
  chord: boolean;
  grace: boolean;
  startDivisions: number;
  durationDivisions: number;
  divisions: number;
  beats: number;
  beatType: number;
  midi: number | null;
  step: string | null;
  alter: number;
  octave: number | null;
}

export interface PentatonicProjectCollectionMark {
  partId: string;
  measure: number;
  resourceId: string;
  centre: string;
}

export interface PentatonicProjectMusic {
  musicXml: string;
  musicXmlSha256: string;
  events: PentatonicProjectEvent[];
  collectionMarks: PentatonicProjectCollectionMark[];
}

export interface PentatonicProjectCollection {
  resourceId: string;
  centre: string | null;
  displayName: string;
  spelling: string[];
  intervals: number[];
  orderedPitchClasses: number[];
  canonicalId: string;
  canonicalPitchClasses: number[];
}

export interface PentatonicProjectV1 {
  format: typeof PENTATONIC_PROJECT_FORMAT;
  version: typeof PENTATONIC_PROJECT_VERSION;
  id: string;
  title: string;
  savedAt: string;
  notes: string;
  collection: PentatonicProjectCollection;
  route: {
    minSteps: number;
    maxSteps: number;
    ending: 'return' | 'open';
    seed: number;
    retention: { maxConsecutiveRetentions: number };
    selectedCandidateIndex: number;
    selectedCandidateId: string | null;
    generated: ColourRouteResult | null;
  };
  phrase: {
    seed: number;
    purpose: string;
    activity: string;
    method: 'M-DEG' | 'M-NEAR' | null;
    motif: string | null;
    silence: boolean;
    none: boolean;
    noPhrase: boolean;
    generated: PentatonicGenerateResult | null;
    transform: PentatonicTransformResult | null;
    music: PentatonicProjectMusic[];
  } | null;
  source: {
    fileName: string | null;
    xml: string | null;
    xmlSha256: string | null;
    regionIndex: number;
  };
  workflow: {
    mode: (typeof WORKFLOW_MODES)[number];
    resourceMode: 'auto' | 'manual';
    method: 'M-DEG' | 'M-NEAR';
    purpose: string;
    activity: string;
    chosen: string | null;
    colourReference: string;
  };
}

export interface PentatonicProjectValidation {
  ok: boolean;
  errors: string[];
  project?: PentatonicProjectV1;
}

export interface PentatonicProjectCapture {
  id: string;
  title?: string;
  notes?: string;
  savedAt?: string;
  resourceId: string;
  centre: string | null;
  routeMinSteps: number;
  routeMaxSteps: number;
  routeEnding: 'return' | 'open';
  routeSeed: number;
  routePick: number;
  colourRoute: ColourRouteResult | null;
  phraseSeed: number;
  motif: string | null;
  purpose: string;
  activity: string;
  method: 'M-DEG' | 'M-NEAR';
  silence: boolean;
  noPhrase: boolean;
  generated: PentatonicGenerateResult | null;
  transform: PentatonicTransformResult | null;
  chosen: string | null;
  importFileName: string | null;
  importXml: string | null;
  regionIndex: number;
  mode: (typeof WORKFLOW_MODES)[number];
  resourceMode: 'auto' | 'manual';
  colourReference: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function localName(el: Element): string {
  return el.localName || el.tagName.replace(/^.*:/, '');
}

function elements(node: ParentNode): Element[] {
  const found: Element[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes[index];
    if (child && child.nodeType === 1) found.push(child as Element);
  }
  return found;
}

function childText(el: Element, name: string): string | null {
  const match = elements(el).find((child) => localName(child) === name);
  const text = match?.textContent?.trim() ?? '';
  return text ? text : null;
}

function hasChild(el: Element, name: string): boolean {
  return elements(el).some((child) => localName(child) === name);
}

function midiOf(step: string, alter: number, octave: number): number | null {
  const pc = STEP_PC[step];
  if (pc === undefined) return null;
  return (octave + 1) * 12 + pc + alter;
}

export function extractPentatonicProjectMusic(xml: string): { ok: true; music: PentatonicProjectMusic } | { ok: false; error: string } {
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    return { ok: false, error: 'MusicXML is missing a score-partwise or score-timewise root' };
  }
  ensureMusicXmlDomParserPolyfill();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false, error: 'MusicXML did not parse' };
  const root = doc.documentElement;
  if (!root) return { ok: false, error: 'MusicXML has no root' };
  const events: PentatonicProjectEvent[] = [];
  const collectionMarks: PentatonicProjectCollectionMark[] = [];
  const parts = elements(root).filter((el) => localName(el) === 'part');
  const partNodes = parts.length > 0 ? parts : [root];
  partNodes.forEach((part, partIndex) => {
    const partId = part.getAttribute('id') || `part-${partIndex + 1}`;
    let divisions = 1;
    let beats = 4;
    let beatType = 4;
    const measures = elements(part).filter((el) => localName(el) === 'measure');
    measures.forEach((measure, measureIndex) => {
      const measureNumber = Number(measure.getAttribute('number'));
      const measureLabel = Number.isInteger(measureNumber) && measureNumber > 0 ? measureNumber : measureIndex + 1;
      let cursor = 0;
      let lastStart = 0;
      elements(measure).forEach((item) => {
        const name = localName(item);
        if (name === 'attributes') {
          const nextDivisions = Number(childText(item, 'divisions'));
          if (Number.isInteger(nextDivisions) && nextDivisions > 0) divisions = nextDivisions;
          const time = elements(item).find((child) => localName(child) === 'time');
          if (time) {
            const nextBeats = Number(childText(time, 'beats'));
            const nextBeatType = Number(childText(time, 'beat-type'));
            if (Number.isInteger(nextBeats) && nextBeats > 0) beats = nextBeats;
            if (Number.isInteger(nextBeatType) && nextBeatType > 0) beatType = nextBeatType;
          }
          return;
        }
        if (name === 'direction') {
          elements(item).forEach((directionType) => {
            if (localName(directionType) !== 'direction-type') return;
            elements(directionType).forEach((words) => {
              if (localName(words) !== 'words') return;
              const mark = parseCollectionIdentityMark(words.textContent ?? '');
              if (!mark) return;
              collectionMarks.push({ partId, measure: measureLabel, resourceId: mark.resourceId, centre: mark.centre });
            });
          });
          return;
        }
        if (name === 'backup' || name === 'forward') {
          const shift = Number(childText(item, 'duration'));
          if (!Number.isFinite(shift)) return;
          cursor += name === 'backup' ? -shift : shift;
          if (cursor < 0) cursor = 0;
          return;
        }
        if (name !== 'note') return;
        const chord = hasChild(item, 'chord');
        const grace = hasChild(item, 'grace');
        const rest = hasChild(item, 'rest');
        const duration = Number(childText(item, 'duration'));
        const durationDivisions = Number.isFinite(duration) ? duration : 0;
        const voiceText = childText(item, 'voice');
        const voice = voiceText && Number.isInteger(Number(voiceText)) ? Number(voiceText) : null;
        const startDivisions = chord ? lastStart : cursor;
        const pitch = elements(item).find((child) => localName(child) === 'pitch');
        const step = pitch ? childText(pitch, 'step') : null;
        const alter = pitch ? Number(childText(pitch, 'alter') ?? '0') : 0;
        const octaveText = pitch ? childText(pitch, 'octave') : null;
        const octave = octaveText && Number.isInteger(Number(octaveText)) ? Number(octaveText) : null;
        const midi = step && octave !== null ? midiOf(step, Number.isFinite(alter) ? alter : 0, octave) : null;
        events.push({
          partId,
          measure: measureLabel,
          voice,
          kind: rest || !pitch ? 'rest' : 'note',
          chord,
          grace,
          startDivisions,
          durationDivisions,
          divisions,
          beats,
          beatType,
          midi,
          step,
          alter: Number.isFinite(alter) ? alter : 0,
          octave,
        });
        if (!chord) {
          lastStart = cursor;
          cursor += durationDivisions;
        }
      });
    });
  });
  return {
    ok: true,
    music: {
      musicXml: xml,
      musicXmlSha256: sha256Text(xml),
      events,
      collectionMarks,
    },
  };
}

function sameEvents(left: readonly PentatonicProjectEvent[], right: readonly PentatonicProjectEvent[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function proofMusic(xml: string, errors: string[], label: string): PentatonicProjectMusic | null {
  const extracted = extractPentatonicProjectMusic(xml);
  if (!extracted.ok) {
    errors.push(`${label}: ${extracted.error}`);
    return null;
  }
  return extracted.music;
}

export function collectionState(resourceId: string, centre: string | null): PentatonicProjectCollection | { error: string } {
  if (resourceId === PENTATONIC_PROJECT_NONE) {
    if (centre !== null && !PENTATONIC_NOTE_CHOICES.includes(centre as (typeof PENTATONIC_NOTE_CHOICES)[number])) {
      return { error: `NONE centre "${centre ?? ''}" is not a pitch name` };
    }
    return {
      resourceId: PENTATONIC_PROJECT_NONE,
      centre,
      displayName: 'NONE',
      spelling: [],
      intervals: [],
      orderedPitchClasses: [],
      canonicalId: PENTATONIC_PROJECT_NONE,
      canonicalPitchClasses: [],
    };
  }
  if (!centre) return { error: 'A colour collection needs a tonal centre' };
  const instance = colourInstance(resourceId, centre);
  if ('error' in instance) return { error: instance.error };
  return {
    resourceId: instance.resourceId,
    centre: instance.centre,
    displayName: instance.displayName,
    spelling: [...instance.spelling],
    intervals: [...instance.intervals],
    orderedPitchClasses: [...instance.orderedPitchClasses],
    canonicalId: instance.canonicalId,
    canonicalPitchClasses: [...instance.canonicalPitchClasses],
  };
}

function routesOf(generated: ColourRouteResult): { id: string }[] {
  if (!generated.ok) return [];
  return [generated.route, ...generated.alternatives];
}

export function capturePentatonicProject(input: PentatonicProjectCapture): PentatonicProjectValidation {
  const errors: string[] = [];
  const id = input.id.trim();
  if (!id) errors.push('project.id must be a non-empty string');
  const collection = collectionState(input.resourceId, input.centre);
  if ('error' in collection) errors.push(collection.error);
  if (!Number.isInteger(input.routeMinSteps) || !Number.isInteger(input.routeMaxSteps)) errors.push('route length bounds must be integers');
  if (input.routeEnding !== 'return' && input.routeEnding !== 'open') errors.push('ending must be return or open');
  if (!Number.isInteger(input.routeSeed)) errors.push('route seed must be an integer');
  if (!Number.isInteger(input.phraseSeed)) errors.push('phrase seed must be an integer');
  if (!Number.isInteger(input.routePick) || input.routePick < 0) errors.push('selected candidate index must be a non-negative integer');
  const generated = input.colourRoute;
  let selectedCandidateId: string | null = null;
  if (generated) {
    if (generated.ok) {
      const routes = routesOf(generated);
      if (input.routePick >= routes.length) errors.push('selected candidate is outside the stored path');
      else selectedCandidateId = routes[input.routePick]!.id;
      if (generated.seed !== input.routeSeed) errors.push('stored path seed does not match the route seed');
      if (generated.ending !== input.routeEnding || generated.minSteps !== input.routeMinSteps || generated.maxSteps !== input.routeMaxSteps) {
        errors.push('stored path bounds do not match the route settings');
      }
    } else if (!generated.error.trim()) errors.push('failed path is missing an error');
  }
  const music: PentatonicProjectMusic[] = [];
  input.generated?.candidates.forEach((candidate, index) => {
    const sealed = proofMusic(candidate.musicXml, errors, `phrase.candidates[${index}]`);
    if (sealed) music.push(sealed);
  });
  if (input.transform) {
    const sealed = proofMusic(input.transform.musicXml, errors, 'phrase.transform');
    if (sealed) music.push(sealed);
  }
  let sourceSha: string | null = null;
  if (input.importXml) {
    if (!input.importXml.includes('<score-partwise') && !input.importXml.includes('<score-timewise')) {
      errors.push('import xml is not MusicXML');
    } else sourceSha = sha256Text(input.importXml);
  }
  if (!Number.isInteger(input.regionIndex) || input.regionIndex < 0) errors.push('regionIndex must be a non-negative integer');
  if (errors.length || 'error' in collection) return { ok: false, errors };
  const none = input.resourceId === PENTATONIC_PROJECT_NONE;
  const phrasePresent = Boolean(input.generated || input.transform || input.silence || input.noPhrase || input.motif);
  const project: PentatonicProjectV1 = {
    format: PENTATONIC_PROJECT_FORMAT,
    version: PENTATONIC_PROJECT_VERSION,
    id,
    title: input.title?.trim() || id,
    savedAt: input.savedAt ?? new Date().toISOString(),
    notes: input.notes ?? '',
    collection,
    route: {
      minSteps: input.routeMinSteps,
      maxSteps: input.routeMaxSteps,
      ending: input.routeEnding,
      seed: input.routeSeed,
      retention: { maxConsecutiveRetentions: COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS },
      selectedCandidateIndex: generated?.ok ? input.routePick : 0,
      selectedCandidateId: generated?.ok ? selectedCandidateId : null,
      generated,
    },
    phrase: phrasePresent
      ? {
          seed: input.phraseSeed,
          purpose: input.purpose,
          activity: input.activity,
          method: input.method,
          motif: input.motif,
          silence: input.silence,
          none,
          noPhrase: input.noPhrase,
          generated: input.generated,
          transform: input.transform,
          music,
        }
      : null,
    source: {
      fileName: input.importFileName,
      xml: input.importXml,
      xmlSha256: sourceSha,
      regionIndex: input.regionIndex,
    },
    workflow: {
      mode: input.mode,
      resourceMode: input.resourceMode,
      method: input.method,
      purpose: input.purpose,
      activity: input.activity,
      chosen: input.chosen,
      colourReference: input.colourReference,
    },
  };
  return validatePentatonicProject(project);
}

function requireString(row: Record<string, unknown>, key: string, errors: string[], label: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label}.${key} must be a non-empty string`);
    return '';
  }
  return value;
}

function readMusic(raw: unknown, errors: string[], label: string): PentatonicProjectMusic | null {
  if (!isRecord(raw)) {
    errors.push(`${label} must be an object`);
    return null;
  }
  const musicXml = typeof raw.musicXml === 'string' ? raw.musicXml : '';
  const musicXmlSha256 = typeof raw.musicXmlSha256 === 'string' ? raw.musicXmlSha256 : '';
  if (!musicXml || !musicXmlSha256) {
    errors.push(`${label} needs musicXml and musicXmlSha256`);
    return null;
  }
  if (sha256Text(musicXml) !== musicXmlSha256) errors.push(`${label} musicXml does not match musicXmlSha256`);
  const extracted = extractPentatonicProjectMusic(musicXml);
  if (!extracted.ok) {
    errors.push(`${label}: ${extracted.error}`);
    return null;
  }
  if (!Array.isArray(raw.events) || !sameEvents(raw.events as PentatonicProjectEvent[], extracted.music.events)) {
    errors.push(`${label} events do not match the MusicXML`);
  }
  if (!Array.isArray(raw.collectionMarks) || JSON.stringify(raw.collectionMarks) !== JSON.stringify(extracted.music.collectionMarks)) {
    errors.push(`${label} collection marks do not match the MusicXML`);
  }
  return extracted.music;
}

function collectionMatches(stored: Record<string, unknown>, live: PentatonicProjectCollection, errors: string[]): void {
  if (stored.resourceId !== live.resourceId) errors.push('collection.resourceId does not match the registered colour');
  if ((stored.centre ?? null) !== live.centre) errors.push('collection.centre does not match the registered colour');
  if (JSON.stringify(stored.spelling) !== JSON.stringify(live.spelling)) errors.push('collection spelling does not match the registered colour');
  if (JSON.stringify(stored.intervals) !== JSON.stringify(live.intervals)) errors.push('collection intervals do not match the registered colour');
  if (JSON.stringify(stored.orderedPitchClasses) !== JSON.stringify(live.orderedPitchClasses)) {
    errors.push('collection pitch classes do not match the registered colour');
  }
  if (stored.canonicalId !== live.canonicalId) errors.push('collection identity does not match the registered colour');
  if (JSON.stringify(stored.canonicalPitchClasses) !== JSON.stringify(live.canonicalPitchClasses)) {
    errors.push('collection canonical pitch classes do not match the registered colour');
  }
  const canonical = live.resourceId === PENTATONIC_PROJECT_NONE ? PENTATONIC_PROJECT_NONE : canonicalPitchSetId([...live.canonicalPitchClasses]);
  if (live.canonicalId !== canonical) errors.push('collection canonical id is internally inconsistent');
}

export function validatePentatonicProject(raw: unknown): PentatonicProjectValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['project must be an object'] };
  if (raw.format !== PENTATONIC_PROJECT_FORMAT) errors.push('format must be pentatonic-project');
  if (raw.version !== PENTATONIC_PROJECT_VERSION) errors.push(`version must be ${PENTATONIC_PROJECT_VERSION}`);
  const id = requireString(raw, 'id', errors, 'project');
  const title = requireString(raw, 'title', errors, 'project');
  const savedAt = requireString(raw, 'savedAt', errors, 'project');
  if (!isRecord(raw.collection)) errors.push('collection must be an object');
  else {
    const resourceId = typeof raw.collection.resourceId === 'string' ? raw.collection.resourceId : '';
    const centre = raw.collection.centre === null ? null : typeof raw.collection.centre === 'string' ? raw.collection.centre : undefined;
    if (centre === undefined) errors.push('collection.centre must be a pitch name or null');
    else if (resourceId === PENTATONIC_PROJECT_NONE) {
      const live = collectionState(resourceId, centre);
      if ('error' in live) errors.push(live.error);
      else collectionMatches(raw.collection, live, errors);
    } else if (!getPentatonicColourResource(resourceId)) {
      errors.push(`Pentatonic colour "${resourceId}" is not registered. Refusing to substitute minor pentatonic.`);
    } else {
      const live = collectionState(resourceId, centre);
      if ('error' in live) errors.push(live.error);
      else collectionMatches(raw.collection, live, errors);
      if (resourceId === 'major_pentatonic' || resourceId === 'minor_pentatonic') {
        if (!getPentatonicArchetype(resourceId)) errors.push(`${resourceId} is missing from the Major/Minor archetype registry`);
      }
    }
  }
  if (!isRecord(raw.route)) errors.push('route must be an object');
  else {
    const minSteps = raw.route.minSteps;
    const maxSteps = raw.route.maxSteps;
    if (!Number.isInteger(minSteps) || !Number.isInteger(maxSteps) || Number(minSteps) < 2 || Number(maxSteps) > 8 || Number(minSteps) > Number(maxSteps)) {
      errors.push('route length bounds are invalid');
    }
    if (raw.route.ending !== 'return' && raw.route.ending !== 'open') errors.push('route.ending must be return or open');
    if (!Number.isInteger(raw.route.seed)) errors.push('route.seed must be an integer');
    if (!isRecord(raw.route.retention) || raw.route.retention.maxConsecutiveRetentions !== COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS) {
      errors.push(`retention.maxConsecutiveRetentions must be ${COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS}`);
    }
    if (!Number.isInteger(raw.route.selectedCandidateIndex) || Number(raw.route.selectedCandidateIndex) < 0) {
      errors.push('selected candidate index is invalid');
    }
    if (raw.route.generated !== null && !isRecord(raw.route.generated)) errors.push('route.generated must be an object or null');
    if (isRecord(raw.route.generated)) {
      const generated = raw.route.generated as unknown as ColourRouteResult;
      if (generated.ok !== true && generated.ok !== false) errors.push('route.generated.ok must be boolean');
      if (generated.ok) {
        const routes = routesOf(generated);
        if (Number(raw.route.selectedCandidateIndex) >= routes.length) errors.push('selected candidate is outside the stored path');
        const selected = routes[Number(raw.route.selectedCandidateIndex)];
        if (selected && raw.route.selectedCandidateId !== selected.id) errors.push('selected candidate id does not match the stored path');
        if (generated.seed !== raw.route.seed || generated.ending !== raw.route.ending) errors.push('stored path seed or ending does not match the route');
        if (generated.minSteps !== raw.route.minSteps || generated.maxSteps !== raw.route.maxSteps) {
          errors.push('stored path bounds do not match the route settings');
        }
        for (const route of routes) {
          for (const step of route.steps) {
            const live = colourInstance(step.instance.resourceId, step.instance.centre);
            if ('error' in live) errors.push(live.error);
            else if (live.canonicalId !== step.instance.canonicalId || JSON.stringify(live.spelling) !== JSON.stringify(step.instance.spelling)) {
              errors.push(`stored step ${step.instance.id} does not match the registered colour`);
            }
          }
        }
      }
    }
  }
  let phrase: PentatonicProjectV1['phrase'] = null;
  if (raw.phrase !== null && raw.phrase !== undefined) {
    if (!isRecord(raw.phrase)) errors.push('phrase must be an object or null');
    else {
      if (!Number.isInteger(raw.phrase.seed)) errors.push('phrase.seed must be an integer');
      if (typeof raw.phrase.purpose !== 'string' || !PURPOSES.includes(raw.phrase.purpose as (typeof PURPOSES)[number])) {
        errors.push('phrase.purpose is not a known phrase decision');
      }
      if (typeof raw.phrase.silence !== 'boolean' || typeof raw.phrase.none !== 'boolean' || typeof raw.phrase.noPhrase !== 'boolean') {
        errors.push('phrase silence, NONE and NO_PHRASE flags must be boolean');
      }
      if (raw.phrase.noPhrase === true && raw.phrase.purpose !== 'NO_PHRASE' && raw.phrase.silence !== true) {
        errors.push('NO_PHRASE must be explicit silence or purpose NO_PHRASE');
      }
      if (raw.phrase.none === true && isRecord(raw.collection) && raw.collection.resourceId !== PENTATONIC_PROJECT_NONE) {
        errors.push('NONE phrase does not match the stored collection');
      }
      const music: PentatonicProjectMusic[] = [];
      if (!Array.isArray(raw.phrase.music)) errors.push('phrase.music must be a list');
      else {
        raw.phrase.music.forEach((item, index) => {
          const sealed = readMusic(item, errors, `phrase.music[${index}]`);
          if (sealed) music.push(sealed);
        });
      }
      if (isRecord(raw.phrase.generated)) {
        const candidates = raw.phrase.generated.candidates;
        if (!Array.isArray(candidates)) errors.push('phrase.generated.candidates must be a list');
        else if (Array.isArray(raw.phrase.music)) {
          candidates.forEach((candidate, index) => {
            if (!isRecord(candidate) || typeof candidate.musicXml !== 'string') {
              errors.push(`phrase.generated.candidates[${index}] is missing MusicXML`);
              return;
            }
            const stored = raw.phrase && isRecord(raw.phrase) && Array.isArray(raw.phrase.music) ? raw.phrase.music[index] : null;
            if (!isRecord(stored) || stored.musicXml !== candidate.musicXml) {
              errors.push(`phrase.generated.candidates[${index}] MusicXML is not the stored musical document`);
            }
          });
        }
      }
      if (raw.phrase.transform !== null && raw.phrase.transform !== undefined) {
        if (!isRecord(raw.phrase.transform) || typeof raw.phrase.transform.musicXml !== 'string') errors.push('phrase.transform is missing MusicXML');
        else if (Array.isArray(raw.phrase.music)) {
          const transformXml = raw.phrase.transform.musicXml;
          const found = raw.phrase.music.some((item) => isRecord(item) && item.musicXml === transformXml);
          if (!found) errors.push('phrase.transform MusicXML is not the stored musical document');
        }
      }
      if (errors.length === 0 && isRecord(raw.phrase)) {
        phrase = {
          seed: raw.phrase.seed as number,
          purpose: raw.phrase.purpose as string,
          activity: typeof raw.phrase.activity === 'string' ? raw.phrase.activity : '',
          method: raw.phrase.method === 'M-DEG' || raw.phrase.method === 'M-NEAR' ? raw.phrase.method : null,
          motif: typeof raw.phrase.motif === 'string' ? raw.phrase.motif : null,
          silence: raw.phrase.silence as boolean,
          none: raw.phrase.none as boolean,
          noPhrase: raw.phrase.noPhrase as boolean,
          generated: (raw.phrase.generated as PentatonicGenerateResult | null) ?? null,
          transform: (raw.phrase.transform as PentatonicTransformResult | null) ?? null,
          music,
        };
      }
    }
  }
  if (!isRecord(raw.source)) errors.push('source must be an object');
  else if (typeof raw.source.xml === 'string') {
    if (typeof raw.source.xmlSha256 !== 'string' || sha256Text(raw.source.xml) !== raw.source.xmlSha256) {
      errors.push('source xml does not match xmlSha256');
    }
  }
  if (!isRecord(raw.workflow)) errors.push('workflow must be an object');
  else if (!WORKFLOW_MODES.includes(raw.workflow.mode as (typeof WORKFLOW_MODES)[number])) errors.push('workflow.mode is unsupported');
  if (errors.length || !isRecord(raw.collection) || !isRecord(raw.route) || !isRecord(raw.source) || !isRecord(raw.workflow)) {
    return { ok: false, errors };
  }
  const liveCollection = collectionState(
    raw.collection.resourceId as string,
    (raw.collection.centre as string | null) ?? null
  );
  if ('error' in liveCollection) return { ok: false, errors: [...errors, liveCollection.error] };
  const project: PentatonicProjectV1 = {
    format: PENTATONIC_PROJECT_FORMAT,
    version: PENTATONIC_PROJECT_VERSION,
    id,
    title,
    savedAt,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    collection: liveCollection,
    route: {
      minSteps: raw.route.minSteps as number,
      maxSteps: raw.route.maxSteps as number,
      ending: raw.route.ending as 'return' | 'open',
      seed: raw.route.seed as number,
      retention: { maxConsecutiveRetentions: COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS },
      selectedCandidateIndex: raw.route.selectedCandidateIndex as number,
      selectedCandidateId: typeof raw.route.selectedCandidateId === 'string' ? raw.route.selectedCandidateId : null,
      generated: (raw.route.generated as ColourRouteResult | null) ?? null,
    },
    phrase,
    source: {
      fileName: typeof raw.source.fileName === 'string' ? raw.source.fileName : null,
      xml: typeof raw.source.xml === 'string' ? raw.source.xml : null,
      xmlSha256: typeof raw.source.xmlSha256 === 'string' ? raw.source.xmlSha256 : null,
      regionIndex: Number.isInteger(raw.source.regionIndex) ? (raw.source.regionIndex as number) : 0,
    },
    workflow: {
      mode: raw.workflow.mode as PentatonicProjectV1['workflow']['mode'],
      resourceMode: raw.workflow.resourceMode === 'manual' ? 'manual' : 'auto',
      method: raw.workflow.method === 'M-NEAR' ? 'M-NEAR' : 'M-DEG',
      purpose: typeof raw.workflow.purpose === 'string' ? raw.workflow.purpose : 'MOTIF',
      activity: typeof raw.workflow.activity === 'string' ? raw.workflow.activity : 'SPARSE',
      chosen: typeof raw.workflow.chosen === 'string' ? raw.workflow.chosen : null,
      colourReference: typeof raw.workflow.colourReference === 'string' ? raw.workflow.colourReference : liveCollection.centre ?? 'C',
    },
  };
  return { ok: true, errors: [], project };
}
