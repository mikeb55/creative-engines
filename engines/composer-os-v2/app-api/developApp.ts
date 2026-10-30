/**
 * Development Studio API. Analysis and opt-in voicing. No generator rewrite.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isBhlWorldId } from '../core/bhl/bhlWorlds';
import { voiceRadicalChordMelody, type ChordMelodyRequest } from '../core/chord-melody/radicalChordMelody';
import { parseProtectedGuitarBarSpec } from '../core/duo/parseProtectedGuitarBars';
import {
  countBars,
  runDualPartTransform,
  sha256Text,
  type DualPartTransformOptions,
  type IdentityKernelValidationReceipt,
  type IdentityReimagineReceipt,
  type IdentityReimagineRequest,
  type MotivicReshapeRequest,
} from '../core/duo/wwhDualPartTransform';
import type { IdentityKernel } from '../core/duo/wwhIdentityKernel';
import { discoverMotifs } from '../core/motif-ops/motifDiscovery';
import { buildCoherenceReport } from '../core/musical-evaluation/coherenceReport';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';

export function apiDevelopDiscover(body: unknown): { ok: true; discovery: ReturnType<typeof discoverMotifs> } | { ok: false; error: string } {
  const xml = body && typeof body === 'object' && typeof (body as { xml?: unknown }).xml === 'string' ? (body as { xml: string }).xml : '';
  if (!xml.trim()) return { ok: false, error: 'MusicXML is empty.' };
  const ingested = ingestCanonicalScore(xml);
  if (!ingested.score) return { ok: false, error: ingested.parseError ?? 'MusicXML did not parse.' };
  return { ok: true, discovery: discoverMotifs(ingested.score) };
}

export function apiDevelopVoice(body: unknown): { ok: true; result: ReturnType<typeof voiceRadicalChordMelody> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Chord-melody request is empty.' };
  const request = body as ChordMelodyRequest;
  if (!Array.isArray(request.melody) || !request.source || !request.tuningId) {
    return { ok: false, error: 'Chord-melody request needs a melody, a source, and a tuning.' };
  }
  return { ok: true, result: voiceRadicalChordMelody(request) };
}

export function apiDevelopCoherence(body: unknown): { ok: true; coherence: ReturnType<typeof buildCoherenceReport> } | { ok: false; error: string } {
  const xml = body && typeof body === 'object' && typeof (body as { xml?: unknown }).xml === 'string' ? (body as { xml: string }).xml : '';
  if (!xml.trim()) return { ok: false, error: 'MusicXML is empty.' };
  return { ok: true, coherence: buildCoherenceReport({ xml }) };
}

/** MORPH dual-part API mode. Omitted → M1 (legacy). */
export type DevelopDualPartMode = 'M1' | 'M2' | 'M3';

/** Request body for apiDevelopDualPart (JSON / IPC). */
export type DevelopDualPartRequest = {
  xml: string;
  /** Optional. Omit or 'M1' → existing harmonic lockBass path. */
  mode?: DevelopDualPartMode;
  /** Required for M1. Optional for M2/M3 (engine default [1, 2] if omitted). */
  motifBars?: number[];
  protectedGuitarBars?: number[] | string;
  /** M1 requires true when present. */
  lockBass?: boolean;
  /** M2 RESHAPE — forwarded unchanged to runDualPartTransform. */
  motivicReshape?: MotivicReshapeRequest;
  /** M3 IdentityKernel — forwarded unchanged. */
  identityKernel?: IdentityKernel;
  /** M3 REIMAGINE — forwarded unchanged; requires identityKernel. */
  identityReimagine?: IdentityReimagineRequest;
  title?: string;
  stem?: string;
  label?: string;
  selectedCellId?: string;
  seed?: number;
  bhlWorld?: string;
};

export type DevelopDualPartSuccess = {
  ok: true;
  result: {
    musicXml: string;
    note: string;
    sourceSha256: string;
    outputSha256: string;
    barCount: number;
    motifBars: number[];
    protectedGuitarBars: number[];
    lockBass: boolean;
    lineage: string;
    validation: string[];
    motifOk: boolean;
    file: string;
    mode: DevelopDualPartMode;
    /** Present when engine validated identityKernel (M3). */
    identityKernel?: IdentityKernelValidationReceipt;
    /** Present when identityReimagine ran (M3). */
    identityReimagine?: IdentityReimagineReceipt;
  };
};

function parseMotifBars(raw: unknown): { ok: true; bars: number[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Select a cell so motif bars reach the transform. No silent defaults.' };
  }
  const bars: number[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 1) {
      return { ok: false, error: 'motifBars must be positive integers from an explicit cell selection.' };
    }
    bars.push(entry);
  }
  return { ok: true, bars };
}

/**
 * Dual-part develop API. Default / mode M1 = harmonic lockBass (legacy).
 * M2 forwards motivicReshape; M3 forwards identityKernel + identityReimagine.
 * Writes temp source only — caller XML untouched.
 */
export function apiDevelopDualPart(body: unknown): DevelopDualPartSuccess | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Dual-part request is empty.' };
  const o = body as Record<string, unknown>;
  const xml = typeof o.xml === 'string' ? o.xml : '';
  if (!xml.trim()) return { ok: false, error: 'MusicXML is empty.' };

  const modeRaw = o.mode;
  let mode: DevelopDualPartMode = 'M1';
  if (modeRaw !== undefined && modeRaw !== null && modeRaw !== '') {
    if (modeRaw !== 'M1' && modeRaw !== 'M2' && modeRaw !== 'M3') {
      return { ok: false, error: "mode must be 'M1' | 'M2' | 'M3' when provided." };
    }
    mode = modeRaw;
  }

  let motifBars: number[] = [];
  if (mode === 'M1') {
    const parsedMotif = parseMotifBars(o.motifBars);
    if (!parsedMotif.ok) return parsedMotif;
    motifBars = parsedMotif.bars;
    if (o.lockBass !== undefined && o.lockBass !== true) {
      return { ok: false, error: 'M1 dual-part requires lockBass=true.' };
    }
  } else if (o.motifBars !== undefined && o.motifBars !== null) {
    const parsedMotif = parseMotifBars(o.motifBars);
    if (!parsedMotif.ok) return parsedMotif;
    motifBars = parsedMotif.bars;
  }

  if (mode === 'M2') {
    if (!o.motivicReshape || typeof o.motivicReshape !== 'object') {
      return { ok: false, error: 'M2 dual-part requires motivicReshape.' };
    }
  }
  if (mode === 'M3') {
    if (!o.identityKernel || typeof o.identityKernel !== 'object') {
      return { ok: false, error: 'M3 dual-part requires identityKernel.' };
    }
    if (!o.identityReimagine || typeof o.identityReimagine !== 'object') {
      return { ok: false, error: 'M3 dual-part requires identityReimagine.' };
    }
  }

  let barCount: number;
  try {
    barCount = countBars(xml);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not read score bar count from MusicXML.',
    };
  }
  if (!Number.isInteger(barCount) || barCount < 1) {
    return { ok: false, error: 'Could not read score bar count from MusicXML.' };
  }

  let protectedGuitarBars: number[] = [];
  if (o.protectedGuitarBars !== undefined && o.protectedGuitarBars !== null && o.protectedGuitarBars !== '') {
    if (Array.isArray(o.protectedGuitarBars)) {
      for (const raw of o.protectedGuitarBars) {
        if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > barCount) {
          return {
            ok: false,
            error: `protectedGuitarBars entry ${String(raw)} must be an integer in 1–${barCount}.`,
          };
        }
        if (!protectedGuitarBars.includes(raw)) protectedGuitarBars.push(raw);
      }
      protectedGuitarBars.sort((a, b) => a - b);
    } else if (typeof o.protectedGuitarBars === 'string') {
      const parsed = parseProtectedGuitarBarSpec(o.protectedGuitarBars, barCount);
      if (!parsed.ok) return parsed;
      protectedGuitarBars = parsed.bars;
    } else {
      return { ok: false, error: 'protectedGuitarBars must be a string spec or number[].' };
    }
  }

  const defaultTitle =
    mode === 'M2' ? 'Black Aura M2' : mode === 'M3' ? 'Black Aura M3' : 'Black Aura M1';
  const defaultStem =
    mode === 'M2' ? 'motivic-reshape' : mode === 'M3' ? 'identity-reimagine' : 'harmonic-lockbass';
  const title =
    typeof o.title === 'string' && o.title.trim() ? o.title.trim() : defaultTitle;
  const stem =
    typeof o.stem === 'string' && o.stem.trim() ? o.stem.trim() : defaultStem;
  const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : 'imported';
  const selectedCellId =
    typeof o.selectedCellId === 'string' && o.selectedCellId.trim()
      ? o.selectedCellId.trim()
      : 'none';
  const seed = typeof o.seed === 'number' && Number.isFinite(o.seed) ? Math.trunc(o.seed) : undefined;
  const bhlWorld = isBhlWorldId(o.bhlWorld) ? o.bhlWorld : undefined;

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'develop-dual-part-'));
  const sourcePath = path.join(workDir, 'source.musicxml');
  const outDir = path.join(workDir, 'out');
  try {
    fs.writeFileSync(sourcePath, xml, 'utf8');
    const expectedSha256 = sha256Text(xml);

    const transformOpts: DualPartTransformOptions = {
      sourcePath,
      outDir,
      title,
      stem,
      expectedSha256,
      ...(seed !== undefined ? { seed } : {}),
      ...(bhlWorld !== undefined ? { bhlWorld } : {}),
      ...(protectedGuitarBars.length ? { protectedGuitarBars } : {}),
    };

    if (mode === 'M1') {
      transformOpts.profiles = ['harmonic'];
      transformOpts.lockBass = true;
      transformOpts.motifBars = motifBars;
    } else if (mode === 'M2') {
      transformOpts.profiles = [];
      transformOpts.motivicReshape = o.motivicReshape as MotivicReshapeRequest;
      if (motifBars.length) transformOpts.motifBars = motifBars;
    } else {
      transformOpts.profiles = [];
      transformOpts.identityKernel = o.identityKernel as IdentityKernel;
      transformOpts.identityReimagine = o.identityReimagine as IdentityReimagineRequest;
      if (motifBars.length) transformOpts.motifBars = motifBars;
      if (o.lockBass === true) transformOpts.lockBass = true;
    }

    const result = runDualPartTransform(transformOpts);

    const out =
      mode === 'M1'
        ? result.outputs[0]
        : mode === 'M2'
          ? result.outputs.find((row) => row.id === 'M2-Reshape') ?? result.outputs[0]
          : result.outputs.find((row) => row.id === 'M3-Reimagine') ?? result.outputs[0];
    if (!out) return { ok: false, error: 'Dual-part transform produced no output.' };
    if (result.sourceSha256 !== expectedSha256) {
      return { ok: false, error: 'Source SHA changed during dual-part transform.' };
    }

    const lockBass = mode === 'M1' ? true : o.lockBass === true;
    const effectiveMotifBars = motifBars.length > 0 ? motifBars : [1, 2];

    const modeLine =
      mode === 'M1'
        ? 'mode: M1 harmonic'
        : mode === 'M2'
          ? 'mode: M2 reshape'
          : 'mode: M3 reimagine';
    const lineage = [
      `source: ${label} (immutable; SHA ${result.sourceSha256})`,
      modeLine,
      `lockBass: ${String(lockBass)}`,
      `motifBars: ${effectiveMotifBars.join(', ')}`,
      `protectedGuitarBars: ${protectedGuitarBars.length ? protectedGuitarBars.join(', ') : '(none)'}`,
      `selected cell: ${selectedCellId}`,
      `barCount: ${result.barCount}`,
      mode === 'M1' ? 'profiles: harmonic' : mode === 'M2' ? 'profiles: reshape' : 'profiles: reimagine',
      `stem: ${stem}`,
      `output: ${out.file} sha256 ${out.sha256}`,
      `note: ${out.note}`,
      `motifOk: ${String(result.motifOk)}`,
      ...(result.identityKernel
        ? [`identityKernel: ok mode=${result.identityKernel.mode}`]
        : []),
      ...(result.identityReimagine
        ? [
            `identityReimagine: transformOk=${String(result.identityReimagine.transformOk)} identityPreserved=${String(result.identityReimagine.identityPreserved)} lineage ${result.identityReimagine.lineageIds.join('→')}`,
          ]
        : []),
      ...(result.validation.length ? [`validation: ${result.validation.join('; ')}`] : []),
      'status: Not musically approved',
    ].join('\n');

    return {
      ok: true,
      result: {
        musicXml: out.xml,
        note: out.note,
        sourceSha256: result.sourceSha256,
        outputSha256: out.sha256,
        barCount: result.barCount,
        motifBars: effectiveMotifBars,
        protectedGuitarBars,
        lockBass,
        lineage,
        validation: result.validation,
        motifOk: result.motifOk,
        file: out.file,
        mode,
        ...(result.identityKernel ? { identityKernel: result.identityKernel } : {}),
        ...(result.identityReimagine ? { identityReimagine: result.identityReimagine } : {}),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* temp cleanup best-effort */
    }
  }
}
