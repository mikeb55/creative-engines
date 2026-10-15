/**
 * Hexatonic project file — version 1.
 * Load returns the stored phrase. It does not build a new phrase.
 */

import { sha256Text } from '../pentatonic/practiceFacade';
import { getHexatonicScalar } from './collections';
import { hexatonicScoreMatchesPhrase } from './phraseExport';
import { outsideScalarId } from './phraseGeneration';
import { HEXATONIC_PHRASE_VERSION, type HexatonicAttack, type HexatonicPhrase, type HexatonicPhraseBar } from './phraseTypes';
import { getHexatonicWpsPair } from './triadPairs';

export const HEXATONIC_PROJECT_FORMAT = 'hexatonic-project';
export const HEXATONIC_PROJECT_VERSION = 1;

const ROLES = ['inside', 'inside', 'outside', 'outside', 'return', 'return'] as const;
const METHODS = ['M-DEG', 'M-NEAR'] as const;

export interface HexatonicProjectIdentity {
  id: string;
  referenceSpelling: string[];
  registrySource: string;
  provenance: string;
}

export interface HexatonicProjectSelection {
  family: 'scalar' | 'wps-pair';
  scalarId: string | null;
  wpsId: string | null;
  centre: number;
  seed: number;
  method: 'M-DEG' | 'M-NEAR';
  original: HexatonicProjectIdentity;
}

export interface HexatonicProjectV1 {
  format: typeof HEXATONIC_PROJECT_FORMAT;
  version: typeof HEXATONIC_PROJECT_VERSION;
  id: string;
  title: string;
  savedAt: string;
  notes: string;
  musicXmlSha256: string;
  selection: HexatonicProjectSelection;
  phrase: HexatonicPhrase;
}

export interface HexatonicProjectValidation {
  ok: boolean;
  errors: string[];
  project?: HexatonicProjectV1;
}

export interface HexatonicProjectCapture {
  id: string;
  title?: string;
  notes?: string;
  savedAt?: string;
  family: 'scalar' | 'wps-pair';
  scalarId?: string | null;
  wpsId?: string | null;
  centre: number;
  seed: number;
  method: 'M-DEG' | 'M-NEAR';
  phrase: HexatonicPhrase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clean(value: string): boolean {
  return !value.includes('\0');
}

export function hexatonicEventIdentity(phrase: Pick<HexatonicPhrase, 'bars'>): string {
  return phrase.bars
    .flatMap((bar) =>
      bar.attacks.map(
        (attack) => `${bar.index}:${attack.part}:${attack.startBeat}:${attack.duration}:${attack.pitches.join('.')}:${attack.surface}`
      )
    )
    .join('|');
}

export function captureHexatonicProject(input: HexatonicProjectCapture): HexatonicProjectValidation {
  const id = input.family === 'scalar' ? input.scalarId ?? '' : input.wpsId ?? '';
  const original = identityFor(input.family, id);
  if ('error' in original) return { ok: false, errors: [original.error] };
  return validateHexatonicProject({
    format: HEXATONIC_PROJECT_FORMAT,
    version: HEXATONIC_PROJECT_VERSION,
    id: input.id,
    title: input.title ?? input.id,
    savedAt: input.savedAt ?? new Date().toISOString(),
    notes: input.notes ?? '',
    musicXmlSha256: sha256Text(input.phrase.musicXml),
    selection: {
      family: input.family,
      scalarId: input.family === 'scalar' ? id : null,
      wpsId: input.family === 'wps-pair' ? id : null,
      centre: input.centre,
      seed: input.seed,
      method: input.method,
      original,
    },
    phrase: input.phrase,
  });
}

function identityFor(family: 'scalar' | 'wps-pair', id: string): HexatonicProjectIdentity | { error: string } {
  if (family === 'scalar') {
    const row = getHexatonicScalar(id);
    if (!row) return { error: `unknown hexatonic scalar ${id}` };
    return {
      id,
      referenceSpelling: [...row.referenceSpelling],
      registrySource: row.source,
      provenance: 'h1-scalar',
    };
  }
  const pair = getHexatonicWpsPair(id);
  if (!pair) return { error: `unknown WPS pair ${id}` };
  return {
    id,
    referenceSpelling: [...pair.resolution.spelling, ...pair.tension.spelling],
    registrySource: pair.provenance,
    provenance: pair.provenance,
  };
}

export function validateHexatonicProject(raw: unknown): HexatonicProjectValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['project must be an object'] };
  if (raw.format !== HEXATONIC_PROJECT_FORMAT) errors.push('format must be hexatonic-project');
  if (raw.version !== HEXATONIC_PROJECT_VERSION) errors.push(`version must be ${HEXATONIC_PROJECT_VERSION}`);
  if (typeof raw.id !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(raw.id)) errors.push('project id is unsafe');
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 200 || !clean(raw.title)) errors.push('title is invalid');
  if (typeof raw.savedAt !== 'string' || Number.isNaN(Date.parse(raw.savedAt))) errors.push('savedAt must be a time');
  if (typeof raw.notes !== 'string' || raw.notes.length > 4000 || !clean(raw.notes)) errors.push('notes are invalid');
  if (typeof raw.musicXmlSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.musicXmlSha256)) errors.push('musicXmlSha256 is invalid');
  const selection = readSelection(raw.selection, errors);
  const phrase = readPhrase(raw.phrase, errors);
  if (!selection || !phrase || errors.length) return { ok: false, errors };
  if (sha256Text(phrase.musicXml) !== raw.musicXmlSha256) errors.push('musicXml does not match musicXmlSha256');
  if (phrase.seed !== selection.seed || phrase.centre !== selection.centre) errors.push('phrase seed or centre does not match the selection');
  if (phrase.developmentMethod !== selection.method) errors.push('phrase transformation does not match the selection');
  if (phrase.family !== selection.family) errors.push('phrase family does not match the selection');
  if (phrase.homeId !== selection.original.id) errors.push('phrase collection does not match the original identity');
  if (phrase.provenance !== selection.original.provenance) errors.push('phrase provenance does not match the original identity');
  if (selection.family === 'scalar') {
    if (phrase.outsideId !== outsideScalarId(selection.original.id)) errors.push('scalar outside collection does not match the registry');
  } else if (phrase.outsideId !== `${selection.original.id}:tension`) {
    errors.push('WPS tension identity does not match the registry');
  }
  const stored = getHexatonicWpsPair(selection.original.id);
  if (selection.family === 'wps-pair' && stored) {
    if (phrase.parentSymbol !== stored.parentSymbol || phrase.harrisLabel !== stored.harrisLabel) {
      errors.push('WPS parent identity does not match the registry');
    }
  }
  if (!hexatonicScoreMatchesPhrase(phrase)) errors.push('stored notes do not match the MusicXML');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    project: {
      format: HEXATONIC_PROJECT_FORMAT,
      version: HEXATONIC_PROJECT_VERSION,
      id: raw.id,
      title: raw.title.trim(),
      savedAt: raw.savedAt,
      notes: raw.notes,
      musicXmlSha256: raw.musicXmlSha256,
      selection,
      phrase,
    },
  };
}

function readSelection(raw: unknown, errors: string[]): HexatonicProjectSelection | null {
  if (!isRecord(raw)) {
    errors.push('selection must be an object');
    return null;
  }
  if (raw.family !== 'scalar' && raw.family !== 'wps-pair') errors.push('selection.family is invalid');
  const family = raw.family === 'wps-pair' ? 'wps-pair' : 'scalar';
  const scalarId = raw.scalarId === null ? null : typeof raw.scalarId === 'string' ? raw.scalarId : undefined;
  const wpsId = raw.wpsId === null ? null : typeof raw.wpsId === 'string' ? raw.wpsId : undefined;
  if (scalarId === undefined || wpsId === undefined) errors.push('selection ids must be strings or null');
  if (!Number.isInteger(raw.centre) || Number(raw.centre) < 0 || Number(raw.centre) > 11) errors.push('centre must be an integer from 0 to 11');
  if (!Number.isInteger(raw.seed)) errors.push('seed must be an integer');
  if (raw.method !== 'M-DEG' && raw.method !== 'M-NEAR') errors.push('method must be M-DEG or M-NEAR');
  if (!isRecord(raw.original)) {
    errors.push('original collection identity is missing');
    return null;
  }
  const originalId = typeof raw.original.id === 'string' ? raw.original.id : '';
  const live = identityFor(family, originalId);
  if ('error' in live) {
    errors.push(live.error);
    return null;
  }
  if ((family === 'scalar' && scalarId !== originalId) || (family === 'wps-pair' && wpsId !== originalId)) {
    errors.push('selected id does not match the original collection');
  }
  if (family === 'scalar' && wpsId !== null) errors.push('a scalar project cannot store a WPS id');
  if (family === 'wps-pair' && scalarId !== null) errors.push('a WPS project cannot store a scalar id');
  if (!Array.isArray(raw.original.referenceSpelling) || raw.original.referenceSpelling.join('|') !== live.referenceSpelling.join('|')) {
    errors.push('original spelling does not match the registry');
  }
  if (raw.original.registrySource !== live.registrySource || raw.original.provenance !== live.provenance) {
    errors.push('original source does not match the registry');
  }
  if (errors.length || scalarId === undefined || wpsId === undefined) return null;
  return {
    family,
    scalarId,
    wpsId,
    centre: raw.centre as number,
    seed: raw.seed as number,
    method: raw.method as (typeof METHODS)[number],
    original: live,
  };
}

function readPhrase(raw: unknown, errors: string[]): HexatonicPhrase | null {
  if (!isRecord(raw)) {
    errors.push('phrase must be an object');
    return null;
  }
  if (raw.version !== HEXATONIC_PHRASE_VERSION) errors.push('phrase version is not the H3 phrase');
  if (typeof raw.musicXml !== 'string' || raw.musicXml.length < 40 || raw.musicXml.length > 1_500_000 || !clean(raw.musicXml)) {
    errors.push('phrase MusicXML is missing or unsafe');
  }
  if (!isRecord(raw.bmef) || raw.bmef.artisticApproval !== false || raw.bmef.humanPlayability !== 'NOT VERIFIED') {
    errors.push('technical diagnostics must stay unapproved');
  }
  if (raw.developmentMethod !== 'M-DEG' && raw.developmentMethod !== 'M-NEAR') errors.push('development method is invalid');
  if (!Array.isArray(raw.bars) || raw.bars.length !== 6) errors.push('phrase must contain six bars');
  const bars: HexatonicPhraseBar[] = [];
  if (Array.isArray(raw.bars)) {
    raw.bars.forEach((bar, index) => {
      const read = readBar(bar, index, errors);
      if (read) bars.push(read);
    });
  }
  if (errors.length || bars.length !== 6) return null;
  const phrase = raw as unknown as HexatonicPhrase;
  const guitar = bars.some((bar) => bar.attacks.some((attack) => attack.part === 'guitar'));
  const bass = bars.some((bar) => bar.attacks.some((attack) => attack.part === 'bass'));
  if (!guitar || !bass) errors.push('phrase needs guitar and bass events');
  return { ...phrase, bars };
}

function readBar(raw: unknown, index: number, errors: string[]): HexatonicPhraseBar | null {
  if (!isRecord(raw)) {
    errors.push(`bar ${index + 1} is missing`);
    return null;
  }
  if (raw.role !== ROLES[index]) errors.push(`bar ${index + 1} role must be ${ROLES[index]}`);
  if (raw.index !== index + 1) errors.push(`bar ${index + 1} index is wrong`);
  if (typeof raw.collectionId !== 'string' || !raw.collectionId) errors.push(`bar ${index + 1} collection is missing`);
  if (typeof raw.direction !== 'string' || !clean(raw.direction)) errors.push(`bar ${index + 1} direction is invalid`);
  if (index === 0 && raw.direction !== 'INSIDE') errors.push('bar 1 must say INSIDE');
  if (index === 2 && raw.direction !== 'OUTSIDE') errors.push('bar 3 must say OUTSIDE');
  if (index === 4 && raw.direction !== 'RETURN') errors.push('bar 5 must say RETURN');
  if (!Array.isArray(raw.attacks) || raw.attacks.length === 0) errors.push(`bar ${index + 1} has no events`);
  const attacks: HexatonicAttack[] = [];
  if (Array.isArray(raw.attacks)) {
    raw.attacks.forEach((attack) => {
      const read = readAttack(attack, errors, index + 1);
      if (read) attacks.push(read);
    });
  }
  if (errors.length || !Array.isArray(raw.attacks) || attacks.length !== raw.attacks.length) return null;
  return {
    index: index + 1,
    role: ROLES[index],
    collectionId: raw.collectionId as string,
    direction: raw.direction as string,
    attacks,
  };
}

function readAttack(raw: unknown, errors: string[], bar: number): HexatonicAttack | null {
  if (!isRecord(raw)) {
    errors.push(`bar ${bar} has a broken event`);
    return null;
  }
  if (raw.part !== 'guitar' && raw.part !== 'bass') errors.push(`bar ${bar} event part is invalid`);
  if (typeof raw.startBeat !== 'number' || typeof raw.duration !== 'number' || raw.duration <= 0) {
    errors.push(`bar ${bar} event timing is invalid`);
  }
  if (!Array.isArray(raw.pitches) || !raw.pitches.every((pitch) => Number.isInteger(pitch))) {
    errors.push(`bar ${bar} pitches are invalid`);
  }
  if (!Array.isArray(raw.spellings) || raw.spellings.length !== (Array.isArray(raw.pitches) ? raw.pitches.length : -1)) {
    errors.push(`bar ${bar} spellings do not match the pitches`);
  }
  if (!Array.isArray(raw.pitchClasses)) errors.push(`bar ${bar} pitch classes are missing`);
  if (raw.surface !== 'melody' && raw.surface !== 'dyad' && raw.surface !== 'triad' && raw.surface !== 'rest' && raw.surface !== 'bass') {
    errors.push(`bar ${bar} surface is invalid`);
  }
  if (Array.isArray(raw.pitches) && raw.pitches.length === 0 && raw.surface !== 'rest') errors.push(`bar ${bar} rest is mislabelled`);
  if (Array.isArray(raw.pitches) && raw.pitches.length > 3 && raw.part === 'guitar') errors.push(`bar ${bar} guitar has more than three notes`);
  if (errors.length) return null;
  return raw as unknown as HexatonicAttack;
}
