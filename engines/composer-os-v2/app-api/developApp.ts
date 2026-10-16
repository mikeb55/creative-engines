/**
 * Development Studio API. Analysis and opt-in voicing. No generator rewrite.
 */

import { discoverMotifs } from '../core/motif-ops/motifDiscovery';
import { voiceRadicalChordMelody, type ChordMelodyRequest } from '../core/chord-melody/radicalChordMelody';
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
