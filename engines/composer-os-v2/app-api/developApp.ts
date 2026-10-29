/**
 * Development Studio API. Analysis and opt-in voicing. No generator rewrite.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isBhlWorldId } from '../core/bhl/bhlWorlds';
import { voiceRadicalChordMelody, type ChordMelodyRequest } from '../core/chord-melody/radicalChordMelody';
import { parseProtectedGuitarBarSpec } from '../core/duo/parseProtectedGuitarBars';
import { countBars, runDualPartTransform, sha256Text } from '../core/duo/wwhDualPartTransform';
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
    lockBass: true;
    lineage: string;
    validation: string[];
    motifOk: boolean;
    file: string;
  };
};

/**
 * M1 harmonic dual-part (lockBass=true). Writes temp source only — caller XML untouched.
 * motifBars required; no silent [1, 2] default.
 */
export function apiDevelopDualPart(body: unknown): DevelopDualPartSuccess | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Dual-part request is empty.' };
  const o = body as Record<string, unknown>;
  const xml = typeof o.xml === 'string' ? o.xml : '';
  if (!xml.trim()) return { ok: false, error: 'MusicXML is empty.' };

  if (!Array.isArray(o.motifBars) || o.motifBars.length === 0) {
    return { ok: false, error: 'Select a cell so motif bars reach the transform. No silent defaults.' };
  }
  const motifBars: number[] = [];
  for (const raw of o.motifBars) {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      return { ok: false, error: 'motifBars must be positive integers from an explicit cell selection.' };
    }
    motifBars.push(raw);
  }

  if (o.lockBass !== undefined && o.lockBass !== true) {
    return { ok: false, error: 'M1 dual-part requires lockBass=true.' };
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

  const title =
    typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Black Aura M1';
  const stem =
    typeof o.stem === 'string' && o.stem.trim()
      ? o.stem.trim()
      : 'harmonic-lockbass';
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
    const result = runDualPartTransform({
      sourcePath,
      outDir,
      profiles: ['harmonic'],
      lockBass: true,
      motifBars,
      ...(protectedGuitarBars.length ? { protectedGuitarBars } : {}),
      title,
      stem,
      expectedSha256,
      ...(seed !== undefined ? { seed } : {}),
      ...(bhlWorld !== undefined ? { bhlWorld } : {}),
    });
    const out = result.outputs[0];
    if (!out) return { ok: false, error: 'Dual-part transform produced no output.' };
    if (result.sourceSha256 !== expectedSha256) {
      return { ok: false, error: 'Source SHA changed during dual-part transform.' };
    }

    const lineage = [
      `source: ${label} (immutable; SHA ${result.sourceSha256})`,
      `mode: M1 harmonic`,
      `lockBass: true`,
      `motifBars: ${motifBars.join(', ')}`,
      `protectedGuitarBars: ${protectedGuitarBars.length ? protectedGuitarBars.join(', ') : '(none)'}`,
      `selected cell: ${selectedCellId}`,
      `barCount: ${result.barCount}`,
      `profiles: harmonic`,
      `stem: ${stem}`,
      `output: ${out.file} sha256 ${out.sha256}`,
      `note: ${out.note}`,
      `motifOk: ${String(result.motifOk)}`,
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
        motifBars,
        protectedGuitarBars,
        lockBass: true,
        lineage,
        validation: result.validation,
        motifOk: result.motifOk,
        file: out.file,
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
