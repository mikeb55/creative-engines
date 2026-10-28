/**
 * Development Studio. Load a cell, transform it, voice it, hand it on.
 * Nothing on this page is musically approved.
 */
import { useMemo, useState } from 'react';
import { buildChain, motifFromDiscoveredPattern } from '@composer-os/core/motif-ops/developmentChain';
import type { DiscoveredPattern } from '@composer-os/core/motif-ops/motifDiscovery';
import { C_MAJOR_FIELD, type Motif, type OperatorId } from '@composer-os/core/motif-ops/types';
import { useLastGenerate } from '@renderer/context/LastGenerateContext';
import { navigateToRoute } from '../router/appRouter';
import { api } from '../services/api';
import { storePracticeHandoff } from '../practice/practiceHandoff';
import { storeEvaluationHandoff } from '../bhl/bhlHexatonicHandoff';
import { play, sequenceFromTimedNotes } from '../playback/playbackEngine';
import { ScorePreview } from '../score/ScorePreview';
import { ScoreAudition } from '../score/ScoreAudition';

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

  function loadText(text: string, name: string) {
    setXml(text);
    setLabel(name);
    setHarmonicOutXml('');
    setHarmonicOutNote('');
    setHarmonicLineage('');
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

  /**
   * Black Aura M1 — harmonic dual-part via /develop/dual-part (lockBass=true).
   * Explicit cell motif bars required; source `xml` never overwritten.
   */
  async function runHarmonicLockBass() {
    const sourceXml = xml.trim();
    if (!sourceXml) {
      setError('Load MusicXML before harmonic transform.');
      return;
    }
    const motifBars = motifBarsFromSelection;
    if (!motifBars?.length) {
      setHarmonicOutXml('');
      setHarmonicOutNote('');
      setHarmonicLineage('');
      setError('Select a cell so motif bars reach the transform. No silent defaults.');
      return;
    }
    const stem = `${(label || 'black-aura-m1').replace(/\.[^.]+$/, '')}-harmonic-lockbass`;
    setHarmonicOutXml('');
    setHarmonicOutNote('');
    setHarmonicLineage('');
    setError('');
    const row = (await api.developDualPart({
      xml: sourceXml,
      motifBars,
      lockBass: true,
      title: label || 'Black Aura M1',
      stem,
      label: label || 'imported',
      selectedCellId: selectedId,
    })) as {
      ok?: boolean;
      error?: string;
      result?: {
        musicXml: string;
        note: string;
        lineage: string;
      };
    };
    if (!row.ok || !row.result?.musicXml) {
      setError(row.error || 'Dual-part harmonic transform did not run.');
      return;
    }
    setHarmonicOutXml(row.result.musicXml);
    setHarmonicOutNote(row.result.note);
    setHarmonicLineage(row.result.lineage);
    setError('');
  }

  function exportXml(text: string, name: string) {
    const blob = new Blob([text], { type: 'application/vnd.recordare.musicxml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /** Prefer separate transform/voicing outputs; never mutate imported `xml`. */
  const handoffXml = harmonicOutXml || voicedXml || xml;

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
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {OPERATORS.map((item) => (
            <button key={item.label} type="button" onClick={() => setPlan((rows) => [...rows, { op: item.op, params: item.params }])}>
              {item.label}
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
        <h3>Black Aura M1 — harmonic (lock bass)</h3>
        <p style={{ margin: 0 }}>
          User-triggered only. Uses imported score and explicitly selected cell bars. Source MusicXML stays immutable; output is separate. Not musically approved.
        </p>
        <p data-testid="develop-m1-motif-bars" style={{ margin: 0 }}>
          Motif bars for lock: {motifBarsFromSelection?.join(', ') ?? 'none selected — select a cell first'}
        </p>
        <button type="button" data-testid="develop-m1-harmonic-run" onClick={() => void runHarmonicLockBass()}>
          Run harmonic transform (lockBass)
        </button>
        <pre data-testid="develop-m1-lineage">{harmonicLineage}</pre>
        {harmonicOutNote ? <p data-testid="develop-m1-note">{harmonicOutNote}</p> : null}
        <ScorePreview musicXml={harmonicOutXml || null} />
        <ScoreAudition musicXml={harmonicOutXml || null} label="M1 harmonic candidate" />
        <button
          type="button"
          data-testid="develop-m1-export"
          disabled={!harmonicOutXml}
          onClick={() => harmonicOutXml && exportXml(harmonicOutXml, `${label || 'black-aura-m1'}-harmonic-lockbass.musicxml`)}
        >
          Export M1 harmonic MusicXML
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
