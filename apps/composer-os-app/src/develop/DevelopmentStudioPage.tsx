/**
 * Development Studio. Load a cell, transform it, voice it, hand it on.
 * Nothing on this page is musically approved.
 */
import { useEffect, useMemo, useState } from 'react';
import type { IdentityKernel } from '@composer-os/core/duo/wwhIdentityKernel';
import type { MotivicReshapePlanStep, ReshapeOpId } from '@composer-os/core/duo/wwhMotivicReshape';
import { parseProtectedGuitarBarSpec } from '@composer-os/core/duo/parseProtectedGuitarBars';
import { buildChain, motifFromDiscoveredPattern } from '@composer-os/core/motif-ops/developmentChain';
import type { DiscoveredPattern } from '@composer-os/core/motif-ops/motifDiscovery';
import { C_MAJOR_FIELD, type Motif, type OperatorId } from '@composer-os/core/motif-ops/types';
import { useLastGenerate } from '@renderer/context/LastGenerateContext';
import { navigateToRoute } from '../router/appRouter';
import {
  api,
  type DevelopDualPartMode,
  type DevelopDualPartClientRequest,
  type DevelopDualPartResult,
} from '../services/api';
import { storePracticeHandoff } from '../practice/practiceHandoff';
import { storeEvaluationHandoff } from '../bhl/bhlHexatonicHandoff';
import { play, sequenceFromTimedNotes } from '../playback/playbackEngine';
import { ScorePreview } from '../score/ScorePreview';
import { ScoreAudition } from '../score/ScoreAudition';

/** P1 measure count from loaded MusicXML (browser DOMParser). */
function scoreBarCountFromXml(xml: string): number {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return 0;
  const parts = Array.from(doc.getElementsByTagName('part'));
  const p1 = parts.find((p) => p.getAttribute('id') === 'P1') ?? parts[0];
  if (!p1) return 0;
  return p1.getElementsByTagName('measure').length;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const RESHAPE_OP_IDS: ReadonlySet<string> = new Set(['invert', 'expand-intervals', 'sequence-real']);

const OPERATORS: Array<{ op: OperatorId; label: string; params?: Record<string, number | string> }> = [
  { op: 'invert', label: 'Turn upside down', params: { axis: 60 } },
  { op: 'retrograde', label: 'Backwards' },
  { op: 'augment', label: 'Stretch', params: { factor: 2 } },
  { op: 'diminish', label: 'Squeeze', params: { factor: 2 } },
  { op: 'fragment-head', label: 'Take the start', params: { count: 2 } },
  { op: 'fragment-tail', label: 'Take the end', params: { count: 2 } },
  { op: 'sequence-real', label: 'Step it up', params: { steps: 2, count: 1 } },
  { op: 'expand-intervals', label: 'Widen', params: { amount: 1, mode: 'field' } },
  { op: 'contract-intervals', label: 'Narrow', params: { amount: 1, mode: 'field' } },
  { op: 'displace', label: 'Shift the beat', params: { beats: 0.5 } },
  { op: 'insert-rest', label: 'Add a breath', params: { duration: 1, index: 1 } },
  { op: 'register-lift', label: 'Lift', params: { octaves: 1 } },
  { op: 'liquidate', label: 'Wind down', params: { n: 1, count: 3 } },
];

const SOURCES = [
  ['barry-harris', 'Barry Harris'],
  ['triad-pair', 'Triad pair'],
  ['unrelated-triads', 'Unrelated triads'],
  ['shell-dyads', 'Shells'],
  ['upper-structure', 'Upper structures'],
] as const;

const MODE_OPTIONS: Array<{ id: DevelopDualPartMode; label: string }> = [
  { id: 'M1', label: 'M1 DEVELOP' },
  { id: 'M2', label: 'M2 RESHAPE' },
  { id: 'M3', label: 'M3 REIMAGINE' },
];

function emptyMotif(): Motif {
  return {
    id: 'm1',
    field: C_MAJOR_FIELD,
    events: [
      { onset: 0, duration: 1, midi: 60 },
      { onset: 1, duration: 0.5, midi: 62 },
      { onset: 1.5, duration: 0.5, midi: 64 },
      { onset: 2, duration: 2, midi: 67 },
    ],
  };
}

function motifFromChain(root: Motif, plan: Array<{ op: OperatorId; params?: Record<string, number | string> }>): Motif {
  if (!plan.length) return root;
  const chain = buildChain(root, plan);
  return chain.results[chain.results.length - 1] ?? root;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Display-only: MIDI number → pitch name. Not analysis. */
function midiToPitchName(midi: number): string {
  const pc = ((Math.trunc(midi) % 12) + 12) % 12;
  const octave = Math.floor(Math.trunc(midi) / 12) - 1;
  return `${PITCH_NAMES[pc]!}${octave}`;
}

/** Unique source bars from discovery occurrences only. */
function discoveredBars(pattern: DiscoveredPattern): number[] {
  return [...new Set(pattern.occurrences.map((o) => o.bar))].sort((a, b) => a - b);
}

/** Prototype absolute MIDI from anchorMidi + relative points. */
function discoveredAbsoluteMidis(pattern: DiscoveredPattern): number[] {
  if (!Number.isFinite(pattern.anchorMidi) || !pattern.points.length) return [];
  return pattern.points.map((point) => pattern.anchorMidi + point.midi);
}

function discoveredPatternButtonLabel(pattern: DiscoveredPattern): string {
  const parts: string[] = [pattern.id];
  const bars = discoveredBars(pattern);
  if (bars.length) parts.push(`bars ${bars.join(', ')}`);
  const midis = discoveredAbsoluteMidis(pattern);
  if (midis.length) {
    parts.push(midis.map(midiToPitchName).join(' '));
  }
  return parts.join(' · ');
}

function discoveredPatternDetailLines(pattern: DiscoveredPattern): string[] {
  const lines: string[] = [`ID: ${pattern.id}`];
  const bars = discoveredBars(pattern);
  if (bars.length) lines.push(`Source bars: ${bars.join(', ')}`);
  const midis = discoveredAbsoluteMidis(pattern);
  if (midis.length) {
    lines.push(`Pitches: ${midis.map(midiToPitchName).join(' ')}`);
    lines.push(`MIDI: ${midis.join(' ')}`);
  }
  return lines;
}

/** Reshape-legal steps only — never invent ops to fill a window. */
function reshapeOpsFromPlan(
  plan: Array<{ op: OperatorId; params?: Record<string, number | string> }>,
): MotivicReshapePlanStep[] {
  const out: MotivicReshapePlanStep[] = [];
  for (const step of plan) {
    if (!RESHAPE_OP_IDS.has(step.op)) continue;
    out.push({
      op: step.op as ReshapeOpId,
      ...(step.params ? { params: step.params } : {}),
    });
  }
  return out;
}

/**
 * Validate user-pasted IdentityKernel. Refuses empty/partial objects — does not invent fields.
 */
function parseDeclaredIdentityKernel(raw: string): { ok: true; kernel: IdentityKernel } | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: false, error: 'Paste a declared IdentityKernel JSON. Studio will not invent one.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'IdentityKernel JSON did not parse.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'IdentityKernel must be a JSON object.' };
  }
  const k = parsed as Record<string, unknown>;
  if (k.mode !== 'M3') {
    return { ok: false, error: "IdentityKernel.mode must be 'M3'." };
  }
  if (typeof k.sourcePath !== 'string' || !k.sourcePath.trim()) {
    return { ok: false, error: 'IdentityKernel.sourcePath required (declared path string).' };
  }
  if (typeof k.sourceSha !== 'string' || !k.sourceSha.trim()) {
    return { ok: false, error: 'IdentityKernel.sourceSha required — must match loaded score SHA.' };
  }
  if (!Array.isArray(k.cells) || k.cells.length < 1 || k.cells.length > 5) {
    return { ok: false, error: 'IdentityKernel.cells must have 1–5 declared cells.' };
  }
  if (!Array.isArray(k.anchorBars)) {
    return { ok: false, error: 'IdentityKernel.anchorBars required (array; may be empty only if declared).' };
  }
  if (!Array.isArray(k.recognitionWindows) || k.recognitionWindows.length < 1) {
    return { ok: false, error: 'IdentityKernel.recognitionWindows need ≥1 declared window.' };
  }
  if (!Array.isArray(k.returnBars) || k.returnBars.length < 1) {
    return { ok: false, error: 'IdentityKernel.returnBars need ≥1 declared bar.' };
  }
  if (!Array.isArray(k.protectedGuitarBars)) {
    return { ok: false, error: 'IdentityKernel.protectedGuitarBars required (do not omit locks).' };
  }
  return { ok: true, kernel: parsed as IdentityKernel };
}

function parseWindowSpec(
  fromText: string,
  toText: string,
  barCount: number,
): { ok: true; window: { from: number; to: number }; barList: number[] } | { ok: false; error: string } {
  const from = Number(fromText);
  const to = Number(toText);
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return { ok: false, error: 'Reshape/reimagine window from/to must be integers.' };
  }
  if (from < 1 || to < 1 || from > barCount || to > barCount) {
    return { ok: false, error: `Window must sit inside score bars 1–${barCount}.` };
  }
  if (!(from < to)) {
    return { ok: false, error: 'Window must be multi-bar (from < to).' };
  }
  const barList: number[] = [];
  for (let b = from; b <= to; b++) barList.push(b);
  return { ok: true, window: { from, to }, barList };
}

export function DevelopmentStudioPage() {
  const last = useLastGenerate() as { musicXml?: string | null };
  const [xml, setXml] = useState('');
  const [label, setLabel] = useState('Development cell');
  const [root, setRoot] = useState<Motif>(emptyMotif);
  const [plan, setPlan] = useState<Array<{ op: OperatorId; params?: Record<string, number | string> }>>([]);
  const [source, setSource] = useState<(typeof SOURCES)[number][0]>('triad-pair');
  const [tuningId, setTuningId] = useState('standard');
  const [triads, setTriads] = useState('C D');
  const [symbol, setSymbol] = useState('Cmaj7');
  const [voicedXml, setVoicedXml] = useState('');
  const [gripText, setGripText] = useState('');
  const [patterns, setPatterns] = useState<DiscoveredPattern[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  /** Separate from imported source `xml` — never overwrites source. */
  const [harmonicOutXml, setHarmonicOutXml] = useState('');
  const [harmonicOutNote, setHarmonicOutNote] = useState('');
  const [harmonicLineage, setHarmonicLineage] = useState('');
  const [identityReceiptText, setIdentityReceiptText] = useState('');
  /** Optional extra guitar locks — e.g. "28-29, 33, 36-39". Empty = none. */
  const [protectGuitarBarsText, setProtectGuitarBarsText] = useState('');
  const [morphMode, setMorphMode] = useState<DevelopDualPartMode>('M1');
  const [windowFromText, setWindowFromText] = useState('');
  const [windowToText, setWindowToText] = useState('');
  /** User-declared M3 kernel JSON only — never auto-built. */
  const [identityKernelJson, setIdentityKernelJson] = useState('');
  const [sourceSha, setSourceSha] = useState('');
  const current = useMemo(() => motifFromChain(root, plan), [root, plan]);
  const chain = useMemo(() => buildChain(root, plan), [root, plan]);
  const selectedPattern = useMemo(
    () => (selectedId ? patterns.find((p) => p.id === selectedId) ?? null : null),
    [patterns, selectedId],
  );
  /** Motif bars from explicit user cell selection only — never auto-picked. */
  const motifBarsFromSelection = useMemo(() => {
    if (!selectedPattern) return null;
    const bars = [...new Set(selectedPattern.occurrences.map((o) => o.bar))].sort((a, b) => a - b);
    return bars.length ? bars : null;
  }, [selectedPattern]);

  const reshapeOps = useMemo(() => reshapeOpsFromPlan(plan), [plan]);

  useEffect(() => {
    let cancelled = false;
    const text = xml.trim();
    if (!text) {
      setSourceSha('');
      return;
    }
    void sha256Hex(text).then((hex) => {
      if (!cancelled) setSourceSha(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [xml]);

  const morphBlockers = useMemo(() => {
    const blockers: string[] = [];
    const sourceXml = xml.trim();
    if (!sourceXml) blockers.push('Load MusicXML first.');

    const barCount = sourceXml ? scoreBarCountFromXml(sourceXml) : 0;
    if (sourceXml && barCount < 1) blockers.push('Could not read score bar count from MusicXML.');

    if (morphMode === 'M1') {
      if (!motifBarsFromSelection?.length) {
        blockers.push('Select a cell so motif bars reach the transform. No silent defaults.');
      }
      if (barCount >= 1) {
        const protectedParsed = parseProtectedGuitarBarSpec(protectGuitarBarsText, barCount);
        if (!protectedParsed.ok) blockers.push(protectedParsed.error);
      }
      return blockers;
    }

    if (!selectedPattern) blockers.push('Select a discovered cell for the reshape/reimagine pattern.');
    if (!motifBarsFromSelection?.length) {
      blockers.push('Select a cell with motif bars (locks). No silent defaults.');
    }

    if (barCount >= 1) {
      const protectedParsed = parseProtectedGuitarBarSpec(protectGuitarBarsText, barCount);
      if (!protectedParsed.ok) blockers.push(protectedParsed.error);

      const windowParsed = parseWindowSpec(windowFromText, windowToText, barCount);
      if (!windowParsed.ok) {
        blockers.push(windowParsed.error);
      } else {
        const need = windowParsed.barList.length;
        if (reshapeOps.length !== need) {
          blockers.push(
            `Need ${need} reshape ops (invert / expand-intervals / sequence-real) for window ${windowParsed.window.from}–${windowParsed.window.to}; plan has ${reshapeOps.length}. Add ops in Develop — Studio will not invent them.`,
          );
        }
        if (motifBarsFromSelection?.length) {
          const locked = new Set(motifBarsFromSelection);
          if (barCount >= 1 && protectedParsed.ok) {
            for (const b of protectedParsed.bars) locked.add(b);
          }
          const overlap = windowParsed.barList.filter((b) => locked.has(b));
          if (overlap.length) {
            blockers.push(`Window overlaps motif/protect locks at bars ${overlap.join(', ')}.`);
          }
        }
      }
    } else if (!windowFromText.trim() || !windowToText.trim()) {
      blockers.push('Set an explicit multi-bar window (from < to).');
    }

    if (morphMode === 'M3') {
      const kernelParsed = parseDeclaredIdentityKernel(identityKernelJson);
      if (!kernelParsed.ok) {
        blockers.push(kernelParsed.error);
      } else if (sourceSha && kernelParsed.kernel.sourceSha !== sourceSha) {
        blockers.push('IdentityKernel.sourceSha does not match loaded score SHA. Fix the declared kernel — Studio will not rewrite it.');
      }
    }

    return blockers;
  }, [
    xml,
    morphMode,
    motifBarsFromSelection,
    protectGuitarBarsText,
    selectedPattern,
    windowFromText,
    windowToText,
    reshapeOps,
    identityKernelJson,
    sourceSha,
  ]);

  function loadText(text: string, name: string) {
    setXml(text);
    setLabel(name);
    setHarmonicOutXml('');
    setHarmonicOutNote('');
    setHarmonicLineage('');
    setIdentityReceiptText('');
    setProtectGuitarBarsText('');
    setWindowFromText('');
    setWindowToText('');
    setIdentityKernelJson('');
    setError('');
  }

  async function playMotif(motif: Motif) {
    await play(sequenceFromTimedNotes(motif.events, 96, 4), () => undefined);
  }

  async function findCells() {
    const sourceXml = xml || last.musicXml || '';
    if (!sourceXml.trim()) {
      setError('Load MusicXML before asking for cells.');
      return;
    }
    const result = await api.developDiscover({ xml: sourceXml });
    const row = result as {
      ok?: boolean;
      error?: string;
      discovery?: { patterns?: DiscoveredPattern[] };
    };
    if (!row.ok) {
      setError(row.error || 'Discovery did not run.');
      return;
    }
    const foundPatterns = row.discovery?.patterns ?? [];
    setPatterns(foundPatterns);
    setSelectedId(null);
    setError('');
  }

  function selectDiscoveredCell(pattern: DiscoveredPattern) {
    setSelectedId(pattern.id);
    setRoot(motifFromDiscoveredPattern(pattern));
    setPlan([]);
    setError('');
  }

  async function harmonise() {
    const result = await api.developVoice({
      melody: current.events,
      harmony: [{ onset: 0, symbol, triads: triads.split(/\s+/).filter(Boolean) }],
      source,
      tuningId,
      maxVoices: 3,
      voiceEvery: 'each-note',
    });
    const row = result as {
      ok?: boolean;
      error?: string;
      result?: { musicXml: string; grips: Array<{ onset: number; midis: number[]; span: number; stretch: boolean }>; unvoiced: Array<{ onset: number; reason: string }>; rejected: Array<{ onset: number; reason: string }> };
    };
    if (!row.ok || !row.result) {
      setError(row.error || 'Voicing did not run.');
      return;
    }
    setVoicedXml(row.result.musicXml);
    const lines = [
      ...row.result.grips.map((grip) => `onset ${grip.onset}: ${grip.midis.join(' ')} span ${grip.span}${grip.stretch ? ' stretch' : ''}`),
      ...row.result.unvoiced.map((item) => `unvoiced onset ${item.onset}: ${item.reason}`),
      ...row.result.rejected.map((item) => `rejected onset ${item.onset}: ${item.reason}`),
    ];
    setGripText(lines.join('\n'));
    setError('');
  }

  function clearMorphOutputs() {
    setHarmonicOutXml('');
    setHarmonicOutNote('');
    setHarmonicLineage('');
    setIdentityReceiptText('');
  }

  function applyMorphResult(row: DevelopDualPartResult) {
    if (!row.ok || !row.result?.musicXml) {
      setError(!row.ok ? row.error : 'Dual-part transform did not run.');
      return;
    }
    setHarmonicOutXml(row.result.musicXml);
    setHarmonicOutNote(row.result.note);
    setHarmonicLineage(row.result.lineage);
    if (row.result.identityKernel || row.result.identityReimagine) {
      setIdentityReceiptText(
        JSON.stringify(
          {
            ...(row.result.identityKernel ? { identityKernel: row.result.identityKernel } : {}),
            ...(row.result.identityReimagine ? { identityReimagine: row.result.identityReimagine } : {}),
          },
          null,
          2,
        ),
      );
    } else {
      setIdentityReceiptText('');
    }
    setError('');
  }

  /**
   * Black Aura M1 — harmonic dual-part via /develop/dual-part (lockBass=true).
   * Explicit cell motif bars required; source `xml` never overwritten.
   * Behaviour preserved when morphMode is M1.
   */
  async function runHarmonicLockBass() {
    const sourceXml = xml.trim();
    if (!sourceXml) {
      setError('Load MusicXML before harmonic transform.');
      return;
    }
    const motifBars = motifBarsFromSelection;
    if (!motifBars?.length) {
      clearMorphOutputs();
      setError('Select a cell so motif bars reach the transform. No silent defaults.');
      return;
    }
    const barCount = scoreBarCountFromXml(sourceXml);
    if (barCount < 1) {
      setError('Could not read score bar count from MusicXML.');
      return;
    }
    const protectedParsed = parseProtectedGuitarBarSpec(protectGuitarBarsText, barCount);
    if (!protectedParsed.ok) {
      clearMorphOutputs();
      setError(protectedParsed.error);
      return;
    }
    const protectedGuitarBars = protectedParsed.bars;
    const stem = `${(label || 'black-aura-m1').replace(/\.[^.]+$/, '')}-harmonic-lockbass`;
    clearMorphOutputs();
    setError('');
    const row = await api.developDualPart({
      xml: sourceXml,
      mode: 'M1',
      motifBars,
      ...(protectedGuitarBars.length ? { protectedGuitarBars } : {}),
      lockBass: true,
      title: label || 'Black Aura M1',
      stem,
      label: label || 'imported',
      selectedCellId: selectedId,
    });
    applyMorphResult(row);
  }

  async function runMorphDualPart() {
    if (morphBlockers.length) {
      setError(morphBlockers[0]!);
      return;
    }
    if (morphMode === 'M1') {
      await runHarmonicLockBass();
      return;
    }

    const sourceXml = xml.trim();
    const barCount = scoreBarCountFromXml(sourceXml);
    const motifBars = motifBarsFromSelection!;
    const protectedParsed = parseProtectedGuitarBarSpec(protectGuitarBarsText, barCount);
    if (!protectedParsed.ok) {
      setError(protectedParsed.error);
      return;
    }
    const windowParsed = parseWindowSpec(windowFromText, windowToText, barCount);
    if (!windowParsed.ok) {
      setError(windowParsed.error);
      return;
    }
    if (!selectedPattern) {
      setError('Select a discovered cell for the reshape/reimagine pattern.');
      return;
    }
    if (reshapeOps.length !== windowParsed.barList.length) {
      setError('Reshape ops count must match window bars. Studio will not invent ops.');
      return;
    }

    clearMorphOutputs();
    setError('');

    const body: DevelopDualPartClientRequest = {
      xml: sourceXml,
      mode: morphMode,
      motifBars,
      ...(protectedParsed.bars.length ? { protectedGuitarBars: protectedParsed.bars } : {}),
      title: label || (morphMode === 'M2' ? 'Black Aura M2' : 'Black Aura M3'),
      stem: `${(label || 'black-aura').replace(/\.[^.]+$/, '')}-${morphMode === 'M2' ? 'reshape' : 'reimagine'}`,
      label: label || 'imported',
      selectedCellId: selectedId,
    };

    if (morphMode === 'M2') {
      body.motivicReshape = {
        window: windowParsed.window,
        ops: reshapeOps,
        pattern: selectedPattern,
      };
    } else {
      const kernelParsed = parseDeclaredIdentityKernel(identityKernelJson);
      if (!kernelParsed.ok) {
        setError(kernelParsed.error);
        return;
      }
      if (sourceSha && kernelParsed.kernel.sourceSha !== sourceSha) {
        setError('IdentityKernel.sourceSha does not match loaded score SHA.');
        return;
      }
      body.identityKernel = kernelParsed.kernel;
      body.identityReimagine = {
        window: windowParsed.window,
        ops: reshapeOps,
        pattern: selectedPattern,
      };
      if (kernelParsed.kernel.lockBass === true) body.lockBass = true;
    }

    const row = await api.developDualPart(body);
    applyMorphResult(row);
  }

  function exportXml(text: string, name: string) {
    const blob = new Blob([text], { type: 'application/vnd.recordare.musicxml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /** Export name — MusicXML bytes unchanged. Strip trailing .musicxml/.xml once. */
  function morphExportFilename(compositionLabel: string, motifId: string | null, mode: DevelopDualPartMode): string {
    const base = (compositionLabel || 'black-aura').replace(/\.(musicxml|xml)$/i, '');
    const tag = mode === 'M1' ? 'M1-Harmonic' : mode === 'M2' ? 'M2-Reshape' : 'M3-Reimagine';
    if (!motifId) {
      return mode === 'M1' ? `${base}-harmonic-lockbass.musicxml` : `${base}-${tag}.musicxml`;
    }
    return `${motifId}-${base}-${tag}.musicxml`;
  }

  /** Prefer separate transform/voicing outputs; never mutate imported `xml`. */
  const handoffXml = harmonicOutXml || voicedXml || xml;
  const runDisabled = morphBlockers.length > 0;
  const runLabel =
    morphMode === 'M1'
      ? 'Run harmonic transform (lockBass)'
      : morphMode === 'M2'
        ? 'Run M2 RESHAPE'
        : 'Run M3 REIMAGINE';

  return (
    <section data-testid="develop-page" style={{ display: 'grid', gap: '0.8rem', maxWidth: '54rem' }}>
      <h2 style={{ margin: 0 }}>Development Studio</h2>
      <p data-testid="develop-not-approved" style={{ margin: 0 }}>Not musically approved</p>
      <p style={{ margin: 0 }}>Load, select a cell, develop it, harmonise it, then send or export. The melody note stays the top note.</p>
      {error ? <p data-testid="develop-error">{error}</p> : null}

      <section>
        <h3>Load</h3>
        <button type="button" data-testid="develop-load-generate" onClick={() => loadText(last.musicXml || '', 'Latest Generate')}>
          Latest Generate
        </button>
        <label htmlFor="develop-file">
          Open MusicXML
          <input id="develop-file" data-testid="develop-file" type="file" accept=".musicxml,.xml" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((text) => loadText(text, file.name));
          }} />
        </label>
        <textarea data-testid="develop-xml" value={xml} rows={4} onChange={(event) => setXml(event.target.value)} />
        <ScoreAudition musicXml={xml} label={label || 'Imported score'} />
      </section>

      <section>
        <h3>Cell</h3>
        <button type="button" onClick={() => void findCells()}>Found in this score</button>
        <div data-testid="develop-found" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'flex-start' }}>
          {patterns.length
            ? patterns.map((pattern) => (
              <button
                key={pattern.id}
                type="button"
                data-testid={`develop-cell-${pattern.id}`}
                aria-pressed={selectedId === pattern.id}
                onClick={() => selectDiscoveredCell(pattern)}
                title={discoveredPatternDetailLines(pattern).join(' · ')}
              >
                {discoveredPatternButtonLabel(pattern)}
              </button>
            ))
            : 'No discovered cell yet.'}
        </div>
        <div data-testid="develop-selected-cell" style={{ display: 'grid', gap: '0.25rem' }}>
          {selectedPattern ? (
            <>
              <p style={{ margin: 0 }}>Selected cell</p>
              {discoveredPatternDetailLines(selectedPattern).map((line) => (
                <p key={line} style={{ margin: 0 }}>{line}</p>
              ))}
            </>
          ) : (
            <p style={{ margin: 0 }}>Selected cell: none — example cell until you pick one</p>
          )}
        </div>
        <p>Working cell: {current.events.map((event) => event.midi ?? 'rest').join(' ')}</p>
      </section>

      <section>
        <h3>Develop</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          M2/M3 use only invert / expand-intervals / sequence-real — one op per window bar. Other ops stay for local preview only.
        </p>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {OPERATORS.map((item) => (
            <button key={item.label} type="button" onClick={() => setPlan((rows) => [...rows, { op: item.op, params: item.params }])}>
              {item.label}{RESHAPE_OP_IDS.has(item.op) ? ' · reshape' : ''}
            </button>
          ))}
          <button type="button" className="secondary" onClick={() => { setPlan([]); setRoot(emptyMotif()); setSelectedId(null); }}>Make another</button>
        </div>
        <div data-testid="develop-lineage" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {chain.lineageIds.map((id, index) => (
            <button
              key={id}
              type="button"
              onClick={() => void playMotif(index === 0 ? root : chain.results[index - 1]!)}
            >
              {id} Play
            </button>
          ))}
        </div>
        <p>{chain.steps.map((step) => step.op).join(' → ') || 'No step yet.'}</p>
        <p data-testid="develop-reshape-ops" style={{ margin: 0 }}>
          Reshape ops queued: {reshapeOps.map((s) => s.op).join(' → ') || 'none'}
        </p>
      </section>

      <section>
        <h3>Harmonise</h3>
        <label htmlFor="develop-source">
          Source
          <select id="develop-source" value={source} onChange={(event) => setSource(event.target.value as (typeof SOURCES)[number][0])}>
            {SOURCES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label htmlFor="develop-tuning">
          Tuning
          <input id="develop-tuning" value={tuningId} onChange={(event) => setTuningId(event.target.value)} />
        </label>
        <label htmlFor="develop-triads">
          Triads
          <input id="develop-triads" value={triads} onChange={(event) => setTriads(event.target.value)} />
        </label>
        <label htmlFor="develop-symbol">
          Symbol
          <input id="develop-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} />
        </label>
        <button type="button" data-testid="develop-harmonise" onClick={() => void harmonise()}>Harmonise</button>
        <pre data-testid="develop-grips">{gripText}</pre>
        <ScorePreview musicXml={voicedXml || null} />
        <ScoreAudition musicXml={voicedXml || null} label="Chord melody" />
      </section>

      <section data-testid="develop-m1-harmonic">
        <h3>MORPH dual-part</h3>
        <p style={{ margin: 0 }}>
          User-triggered only. Uses imported score and explicitly selected cell. Source MusicXML stays immutable; output is separate. Not musically approved.
        </p>
        <label htmlFor="develop-morph-mode">
          Mode
          <select
            id="develop-morph-mode"
            data-testid="develop-morph-mode"
            value={morphMode}
            onChange={(event) => {
              setMorphMode(event.target.value as DevelopDualPartMode);
              clearMorphOutputs();
              setError('');
            }}
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </label>
        <p data-testid="develop-m1-motif-bars" style={{ margin: 0 }}>
          Motif bars for lock: {motifBarsFromSelection?.join(', ') ?? 'none selected — select a cell first'}
        </p>
        <label htmlFor="develop-m1-protect-guitar-bars">
          Protect guitar bars
          <input
            id="develop-m1-protect-guitar-bars"
            data-testid="develop-m1-protect-guitar-bars"
            value={protectGuitarBarsText}
            placeholder="e.g. 28-29, 33, 36-39"
            onChange={(event) => setProtectGuitarBarsText(event.target.value)}
          />
        </label>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Optional extra locks. Empty = no extra protection (motif / IdentityKernel locks still apply). Never removes declared locks.
        </p>

        {morphMode !== 'M1' ? (
          <div data-testid="develop-morph-window" style={{ display: 'grid', gap: '0.35rem' }}>
            <p style={{ margin: 0 }}>Reshape / reimagine window (multi-bar, from &lt; to)</p>
            <label htmlFor="develop-morph-window-from">
              From
              <input
                id="develop-morph-window-from"
                data-testid="develop-morph-window-from"
                value={windowFromText}
                onChange={(event) => setWindowFromText(event.target.value)}
              />
            </label>
            <label htmlFor="develop-morph-window-to">
              To
              <input
                id="develop-morph-window-to"
                data-testid="develop-morph-window-to"
                value={windowToText}
                onChange={(event) => setWindowToText(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {morphMode === 'M3' ? (
          <div data-testid="develop-morph-kernel" style={{ display: 'grid', gap: '0.35rem' }}>
            <p style={{ margin: 0 }}>
              Declared IdentityKernel JSON (required). Studio will not invent cells, anchors, returns, or protected bars.
            </p>
            {sourceSha ? (
              <p data-testid="develop-morph-source-sha" style={{ margin: 0, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                Loaded score SHA-256 (paste into kernel.sourceSha if needed): {sourceSha}
              </p>
            ) : null}
            <label htmlFor="develop-morph-kernel-json">
              IdentityKernel
              <textarea
                id="develop-morph-kernel-json"
                data-testid="develop-morph-kernel-json"
                value={identityKernelJson}
                rows={8}
                placeholder='{"sourcePath":"...","sourceSha":"...","mode":"M3","cells":[...],"anchorBars":[...],"recognitionWindows":[...],"returnBars":[...],"protectedGuitarBars":[...]}'
                onChange={(event) => setIdentityKernelJson(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {runDisabled ? (
          <ul data-testid="develop-morph-blockers" style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {morphBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          data-testid="develop-m1-harmonic-run"
          disabled={runDisabled}
          title={runDisabled ? morphBlockers.join(' ') : runLabel}
          onClick={() => void runMorphDualPart()}
        >
          {runLabel}
        </button>
        <pre data-testid="develop-m1-lineage">{harmonicLineage}</pre>
        {harmonicOutNote ? <p data-testid="develop-m1-note">{harmonicOutNote}</p> : null}
        {identityReceiptText ? (
          <pre data-testid="develop-morph-identity-receipts">{identityReceiptText}</pre>
        ) : null}
        <ScorePreview musicXml={harmonicOutXml || null} />
        <ScoreAudition
          musicXml={harmonicOutXml || null}
          label={
            morphMode === 'M1'
              ? 'M1 harmonic candidate'
              : morphMode === 'M2'
                ? 'M2 reshape candidate'
                : 'M3 reimagine candidate'
          }
        />
        <button
          type="button"
          data-testid="develop-m1-export"
          disabled={!harmonicOutXml}
          onClick={() =>
            harmonicOutXml &&
            exportXml(harmonicOutXml, morphExportFilename(label, selectedId, morphMode))
          }
        >
          Export {morphMode} MusicXML
        </button>
      </section>

      <section>
        <h3>Send</h3>
        <button type="button" onClick={() => {
          storePracticeHandoff({ source: 'develop', label, musicXml: handoffXml || null, collectionId: null, registry: null, referencePc: null, status: 'Not musically approved', seed: null, mask: null, tuningId });
          navigateToRoute('practice');
        }}>Practice this</button>
        <button type="button" onClick={() => {
          if (handoffXml) exportXml(handoffXml, `${label}.musicxml`);
          sessionStorage.setItem('develop-bhl-handoff', JSON.stringify({ label, xml: handoffXml }));
          navigateToRoute('bhl');
        }}>Open in BHL</button>
        <button type="button" onClick={() => {
          if (!handoffXml) return;
          storeEvaluationHandoff({ label, xml: handoffXml, fieldLabel: '', fieldFamily: 'other', fieldPcs: '', provisional: true, status: 'Not musically approved', view: 'coherence' });
          navigateToRoute('evaluation');
        }}>Evaluate</button>
        <button type="button" data-testid="develop-export" onClick={() => handoffXml && exportXml(handoffXml, `${label}.musicxml`)}>Export MusicXML</button>
      </section>
    </section>
  );
}
