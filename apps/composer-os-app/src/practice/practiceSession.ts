/**
 * practice-session version 1.
 * A saved exercise. It does not replace a composition, a BHL project, or a WWH file.
 */

import { CHROMATIC_SET_MASK } from './scaleExplorer';

export const PRACTICE_SESSION_FORMAT = 'practice-session';
export const PRACTICE_SESSION_VERSION = 1;

export interface PracticeSessionV1 {
  format: typeof PRACTICE_SESSION_FORMAT;
  version: typeof PRACTICE_SESSION_VERSION;
  id: string;
  title: string;
  savedAt: string;
  notes: string;
  /** Hash of a handed-off source, when one exists. The source file is not stored here. */
  sourceSha256: string | null;
  scale: {
    mask: number;
    rootPc: number;
    status: string;
    name: string;
  };
  guitar: {
    tuningId: string;
    openMidi: number[];
    fretFrom: number;
    fretTo: number;
  };
  exercise: {
    family: string;
    difficulty: string;
    seed: number;
    bars: number;
    metreId: string;
    tempoBpm: number;
    loop: boolean;
    repeat: number;
    metronome: boolean;
  };
  musicXml: string;
  musicXmlSha256: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sealPracticeSession(session: Omit<PracticeSessionV1, 'format' | 'version' | 'musicXmlSha256'> & { musicXml: string }): Promise<PracticeSessionV1> {
  return {
    ...session,
    format: PRACTICE_SESSION_FORMAT,
    version: PRACTICE_SESSION_VERSION,
    musicXmlSha256: await sha256Hex(session.musicXml),
  };
}

export async function readPracticeSession(raw: string): Promise<PracticeSessionV1> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Practice session is not JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Practice session is empty.');
  const record = parsed as Partial<PracticeSessionV1>;
  if (record.format !== PRACTICE_SESSION_FORMAT) throw new Error('This file is not a practice session.');
  if (record.version !== PRACTICE_SESSION_VERSION) throw new Error('This practice session version is not supported.');
  if (typeof record.musicXml !== 'string' || !record.musicXml.includes('<score-partwise')) {
    throw new Error('Practice session has no MusicXML score.');
  }
  if (typeof record.musicXmlSha256 !== 'string') throw new Error('Practice session has no score hash.');
  const actual = await sha256Hex(record.musicXml);
  if (actual !== record.musicXmlSha256) throw new Error('Practice session score hash does not match. The file was not opened.');
  const mask = record.scale?.mask;
  if (!Number.isInteger(mask) || mask! < 0 || mask! > CHROMATIC_SET_MASK) throw new Error('Practice session scale mask is out of range.');
  if (!record.exercise || !Number.isFinite(record.exercise.tempoBpm)) throw new Error('Practice session exercise is incomplete.');
  return record as PracticeSessionV1;
}
