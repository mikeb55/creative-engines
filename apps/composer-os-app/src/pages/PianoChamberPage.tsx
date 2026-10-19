import { useRef, useState } from 'react';
import { api } from '../services/api';

type Role = 'melody' | 'bass' | 'countermelody' | 'harmonic_support' | 'rhythmic_figure' | 'unassigned';

interface ProposalEvent {
  eventId: string;
  bar: number;
  midi: number;
  proposedRole: Role;
  confidence: 'low' | 'medium';
  needsConfirmation: true;
  reason: string;
}

interface ProposalPhrase {
  id: string;
  startBar: number;
  endBar: number;
  reason: string;
}

interface Proposal {
  bars: number;
  beats: number;
  beatType: number;
  metres?: Array<{ bar: number; throughBar: number; beats: number; beatType: number; groups: number[] | null }>;
  tempoBpm: number | null;
  tempoSource: string;
  uncertain: string[];
  events: ProposalEvent[];
  phrases: ProposalPhrase[];
  motifNote: string;
  parts?: Array<{ partId: string; name: string }>;
  protectedEventIds?: string[];
}

interface Fidelity {
  mode: string;
  tempoBpm: number;
  phrases: Array<{ id: string; startBar: number; endBar: number; role: string; foreground: string; answer: string | null; answerOperator: string | null }>;
  derivedAnswers: Array<{ phraseId: string; operator: string; partId: string; notes: number }>;
  silence: Array<{ bar: number; reason: string }>;
  warnings: string[];
  listeningQuestions: string[];
  preview: Array<{ partId: string; midi: number; onset: number; duration: number }>;
  musicalQualityScore: null;
  musicallyApproved: false;
  harmonicDevelopment?: {
    protectedEventIds: string[];
    notes: Array<{ control: string; partId: string; onset: number; duration: number; midi: number; reason: string }>;
  };
  symphonic?: { distribution?: { allocation: 'phase-2' } };
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function noteNameFromMidi(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PITCH_NAMES[pitchClass]}${octave}`;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function metreLine(proposal: Proposal): string {
  const runs = proposal.metres;
  if (!runs?.length) return `${proposal.beats}/${proposal.beatType}, ${proposal.bars} bars.`;
  return runs.map((run) => {
    const groups = run.groups && run.groups.length > 1 ? ` (${run.groups.join('+')})` : '';
    return `${run.beats}/${run.beatType}${groups} in bars ${run.bar}–${run.throughBar}`;
  }).join('; ');
}

function playPreview(notes: Fidelity['preview'], tempo: number) {
  const audio = new AudioContext();
  const start = audio.currentTime + 0.05;
  const beat = 60 / tempo;
  for (const note of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440 * 2 ** ((note.midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, start + note.onset * beat);
    gain.gain.exponentialRampToValueAtTime(0.04, start + note.onset * beat + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (note.onset + note.duration) * beat);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start + note.onset * beat);
    osc.stop(start + (note.onset + note.duration) * beat + 0.02);
  }
  window.setTimeout(() => void audio.close(), ((notes.reduce((end, note) => Math.max(end, note.onset + note.duration), 0) * beat) + 1) * 1000);
}

export function PianoChamberPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [xml, setXml] = useState('');
  const [fileName, setFileName] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [phrases, setPhrases] = useState<ProposalPhrase[]>([]);
  const [mode, setMode] = useState<'developing' | 'faithful'>('developing');
  const [tempo, setTempo] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [protectedIds, setProtectedIds] = useState<string[]>([]);
  const [anchorOn, setAnchorOn] = useState<Record<string, boolean>>({});
  const [partIds, setPartIds] = useState<string[]>([]);
  const anchorRefresh = useRef(0);
  const [error, setError] = useState('');
  const [musicXml, setMusicXml] = useState('');
  const [midiBase64, setMidiBase64] = useState('');
  const [midiSetBase64, setMidiSetBase64] = useState('');
  const [ensemble, setEnsemble] = useState<'chamber' | 'symphonic'>('chamber');
  const [activity, setActivity] = useState<'sparse' | 'moderate' | 'full'>('moderate');
  const [foregroundPref, setForegroundPref] = useState<'source-register' | 'strings' | 'woodwind' | 'brass'>('source-register');
  const [counterline, setCounterline] = useState<'off' | 'when-source-allows'>('when-source-allows');
  const [allocation, setAllocation] = useState<'phase-1' | 'phase-2'>('phase-1');
  const [familyActivity, setFamilyActivity] = useState<Record<string, 'off' | 'limited' | 'open'>>({
    woodwind: 'open', brass: 'open', strings: 'open', harp: 'limited', percussion: 'limited',
  });
  const [fidelity, setFidelity] = useState<Fidelity | null>(null);
  const [busy, setBusy] = useState(false);
  const [bhlOn, setBhlOn] = useState(false);
  const [bhlStart, setBhlStart] = useState(5);
  const [bhlEnd, setBhlEnd] = useState(8);
  const [bhlTarget, setBhlTarget] = useState('harmonic_support');
  const [bhlDeparture, setBhlDeparture] = useState<'mild' | 'strong'>('mild');
  const [bhlPlace, setBhlPlace] = useState<'early' | 'mid' | 'late'>('early');
  const [bhlResolve, setBhlResolve] = useState<'next-beat' | 'bar-end' | 'phrase-end'>('next-beat');
  const [pairOn, setPairOn] = useState(false);
  const [pairStart, setPairStart] = useState(13);
  const [pairEnd, setPairEnd] = useState(16);
  const [parentANotes, setParentANotes] = useState('C E G');
  const [parentAVoices, setParentAVoices] = useState('C4 E4 G4');
  const [parentAQuality, setParentAQuality] = useState<'major' | 'minor'>('major');
  const [parentBNotes, setParentBNotes] = useState('D F A');
  const [parentBVoices, setParentBVoices] = useState('D4 F4 A4');
  const [parentBQuality, setParentBQuality] = useState<'major' | 'minor'>('minor');
  const [relation, setRelation] = useState<'alternation' | 'interlocking'>('alternation');
  const [groupA, setGroupA] = useState('vn2 va');
  const [groupB, setGroupB] = useState('cl hn');
  const [registerMin, setRegisterMin] = useState(55);
  const [registerMax, setRegisterMax] = useState(76);
  const [maxAttacks, setMaxAttacks] = useState(6);

  function triadTokens(text: string): [string, string, string] | null {
    const parts = text.trim().split(/\s+/);
    if (parts.length !== 3) return null;
    return [parts[0]!, parts[1]!, parts[2]!];
  }

  function dropStaleArrangement() {
    setMusicXml('');
    setMidiBase64('');
    setMidiSetBase64('');
    setFidelity(null);
  }

  function invalidateReview() {
    setConfirmed(false);
    dropStaleArrangement();
  }

  function applyProposal(next: Proposal) {
    const anchors = next.protectedEventIds ?? [];
    setProposal(next);
    setPhrases(next.phrases);
    setRoles(Object.fromEntries(next.events.map((event) => [event.eventId, event.proposedRole])));
    setProtectedIds(anchors);
    setAnchorOn(Object.fromEntries(anchors.map((id) => [id, true])));
    setTempo(next.tempoBpm ? String(next.tempoBpm) : '');
    const available = next.parts ?? [];
    setPartIds(available.length > 1 ? available.map((part) => part.partId).slice(0, 2) : []);
  }

  async function readFile(file: File) {
    const text = await file.text();
    setXml(text);
    setFileName(file.name);
    setProposal(null);
    invalidateReview();
    setError('');
    setBusy(true);
    try {
      const response = await api.pianoChamber({ enabled: true, pianoChamber: { action: 'propose', sourceMusicXml: text } });
      setBusy(false);
      if (!response.ok || !response.proposal) {
        setError(response.error || 'The piano score was refused.');
        return;
      }
      applyProposal(response.proposal);
    } catch (error) {
      setBusy(false);
      setProposal(null);
      setError(error instanceof Error ? error.message : 'The piano score was refused.');
    }
  }

  async function refreshAnchors(nextRoles: Record<string, Role>, nextPhrases: ProposalPhrase[], nextParts: string[]) {
    if (!xml) return;
    const generation = anchorRefresh.current + 1;
    anchorRefresh.current = generation;
    const response = await api.pianoChamber({
      enabled: true,
      pianoChamber: {
        action: 'propose',
        sourceMusicXml: xml,
        correction: {
          roles: nextRoles,
          phrases: nextPhrases,
          ...(nextParts.length ? { partIds: nextParts } : {}),
        },
      },
    });
    if (generation !== anchorRefresh.current) return;
    if (!response.ok || !response.proposal) return;
    const anchors = response.proposal.protectedEventIds ?? [];
    setProtectedIds(anchors);
    setAnchorOn(Object.fromEntries(anchors.map((id) => [id, true])));
  }

  async function realise() {
    if (!xml || !confirmed) return;
    setBusy(true);
    setError('');
    const locks = Object.entries(anchorOn).filter(([id, on]) => on && !protectedIds.includes(id)).map(([id]) => id);
    const unlocks = protectedIds.filter((id) => anchorOn[id] === false);
    const notesA = triadTokens(parentANotes);
    const voicesA = triadTokens(parentAVoices);
    const notesB = triadTokens(parentBNotes);
    const voicesB = triadTokens(parentBVoices);
    if ((bhlOn || pairOn) && pairOn && (!notesA || !voicesA || !notesB || !voicesB)) {
      setBusy(false);
      setError('Each triad parent needs three note names and three octave spellings.');
      return;
    }
    const harmonicDevelopment = bhlOn || pairOn ? {
      ...(bhlOn ? {
        bhl: {
          enabled: true,
          startBar: bhlStart,
          endBar: bhlEnd,
          target: bhlTarget,
          departure: bhlDeparture,
          tensionPlacement: bhlPlace,
          resolutionTiming: bhlResolve,
        },
      } : {}),
      ...(pairOn ? {
        triadPair: {
          enabled: true,
          parentA: { id: 'parent-a', quality: parentAQuality, notes: notesA!, voices: voicesA! },
          parentB: { id: 'parent-b', quality: parentBQuality, notes: notesB!, voices: voicesB! },
          startBar: pairStart,
          endBar: pairEnd,
          groups: [groupA.trim().split(/\s+/), groupB.trim().split(/\s+/)] as [string[], string[]],
          relation,
          registerMin,
          registerMax,
          maxAttacks,
        },
      } : {}),
    } : undefined;
    let response;
    try {
      response = await api.pianoChamber({
        enabled: true,
        seed: 11,
        pianoChamber: {
          action: 'realise',
          sourceMusicXml: xml,
          correction: {
            mode,
            reviewConfirmed: true,
            tempoBpm: tempo ? Number(tempo) : undefined,
            roles,
            phrases,
            ...(locks.length ? { locks } : {}),
            ...(unlocks.length ? { unlocks } : {}),
            ...(partIds.length ? { partIds } : {}),
            ...(harmonicDevelopment ? { harmonicDevelopment } : {}),
            ...(ensemble === 'symphonic' ? {
              ensemble,
              symphonic: {
                activity,
                families: familyActivity,
                foreground: foregroundPref,
                counterline,
                ...(allocation === 'phase-2' ? { allocation } : {}),
              },
            } : {}),
          },
        },
      });
    } catch (error) {
      setBusy(false);
      setMusicXml('');
      setFidelity(null);
      setError(error instanceof Error ? error.message : 'Arrangement was refused.');
      return;
    }
    setBusy(false);
    if (!response.ok || !response.musicXml || !response.fidelity || (ensemble === 'chamber' ? !response.midiBase64 : !response.midiSetBase64)) {
      setError(response.error || 'Arrangement was refused.');
      setMusicXml('');
      setFidelity(null);
      return;
    }
    setMusicXml(response.musicXml);
    setMidiBase64(response.midiBase64 ?? '');
    setMidiSetBase64(response.midiSetBase64 ?? '');
    setFidelity(response.fidelity);
  }

  const uncertain = proposal?.events.filter((event) => event.confidence === 'low').slice(0, 16) ?? [];
  const protectedCount = protectedIds.filter((id) => anchorOn[id] !== false).length;
  const availableCount = protectedIds.length;
  const anchorsByBar = new Map<number, string[]>();
  if (proposal) {
    for (const id of protectedIds) {
      const event = proposal.events.find((item) => item.eventId === id);
      const bar = event?.bar ?? Number.POSITIVE_INFINITY;
      const row = anchorsByBar.get(bar);
      if (row) row.push(id);
      else anchorsByBar.set(bar, [id]);
    }
  }
  const anchorBars = [...anchorsByBar.keys()].sort((a, b) => a - b);

  return (
    <section data-testid="piano-chamber" style={{ display: 'grid', gap: '0.75rem', maxWidth: 920 }}>
      <h2 style={{ margin: 0 }}>Piano orchestration</h2>
      <p style={{ margin: 0 }}>
        Twenty-four bars. One piano part or two selected piano parts. Quarter metres 2/4, 3/4, 4/4, 5/4, 6/4 and 7/4. Eighth metres 3/8, 5/8, 6/8, 7/8, 9/8 and 12/8. A bar may change to another of these. Any other signature is refused. Developing arrangement is the default. Inferred roles stay proposals until you confirm them.
      </p>
      <input
        data-testid="piano-chamber-file"
        ref={fileRef}
        type="file"
        accept=".musicxml,.xml"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readFile(file);
        }}
      />
      {fileName ? <p data-testid="piano-chamber-filename">{fileName}</p> : null}
      {error ? <p role="alert" data-testid="piano-chamber-error">{error}</p> : null}
      {proposal ? (
        <div data-testid="piano-chamber-review" style={{ display: 'grid', gap: '0.5rem' }}>
          <p data-testid="piano-chamber-metre">
            {metreLine(proposal)}.
            Tempo {proposal.tempoSource === 'missing' ? 'missing' : proposal.tempoBpm}. {proposal.motifNote}
          </p>
          <label>
            Ensemble
            <select data-testid="piano-chamber-ensemble" value={ensemble} onChange={(event) => { setEnsemble(event.target.value as 'chamber' | 'symphonic'); invalidateReview(); }}>
              <option value="chamber">Chamber</option>
              <option value="symphonic">Symphonic</option>
            </select>
          </label>
          {ensemble === 'symphonic' ? (
            <details data-testid="piano-chamber-symphonic" open>
              <summary>Symphonic limits</summary>
              <p>Family activity is a permission or a limit, not a quota. Empty parts stay in the score.</p>
              <p>Playback limit: General MIDI has no bass-clarinet or contrabassoon program. Those parts use the clarinet and bassoon programs. The sine preview is not orchestral playback.</p>
              <label>
                Allocation
                <select aria-label="symphonic allocation" data-testid="piano-chamber-allocation" value={allocation} onChange={(event) => { setAllocation(event.target.value as 'phase-1' | 'phase-2'); invalidateReview(); }}>
                  <option value="phase-1">Phase 1 allocation</option>
                  <option value="phase-2">Phase 2 distribution</option>
                </select>
              </label>
              <label>
                Activity
                <select aria-label="symphonic activity" value={activity} onChange={(event) => { setActivity(event.target.value as 'sparse' | 'moderate' | 'full'); dropStaleArrangement(); }}>
                  <option value="sparse">sparse</option>
                  <option value="moderate">moderate</option>
                  <option value="full">full</option>
                </select>
              </label>
              <label>
                Foreground
                <select aria-label="foreground preference" value={foregroundPref} onChange={(event) => { setForegroundPref(event.target.value as 'source-register' | 'strings' | 'woodwind' | 'brass'); dropStaleArrangement(); }}>
                  <option value="source-register">source register</option>
                  <option value="strings">strings</option>
                  <option value="woodwind">woodwind</option>
                  <option value="brass">brass</option>
                </select>
              </label>
              <label>
                Counterline
                <select aria-label="counterline" value={counterline} onChange={(event) => { setCounterline(event.target.value as 'off' | 'when-source-allows'); dropStaleArrangement(); }}>
                  <option value="when-source-allows">when the source allows</option>
                  <option value="off">off</option>
                </select>
              </label>
              {(['woodwind', 'brass', 'strings', 'harp', 'percussion'] as const).map((family) => (
                <label key={family}>
                  {family}
                  <select aria-label={`${family} activity`} value={familyActivity[family]} onChange={(event) => { setFamilyActivity({ ...familyActivity, [family]: event.target.value as 'off' | 'limited' | 'open' }); dropStaleArrangement(); }}>
                    <option value="off">off</option>
                    <option value="limited">limited</option>
                    <option value="open">open</option>
                  </select>
                </label>
              ))}
            </details>
          ) : null}
          <label>
            Mode
            <select data-testid="piano-chamber-mode" value={mode} onChange={(event) => { setMode(event.target.value as 'developing' | 'faithful'); dropStaleArrangement(); }}>
              <option value="developing">Developing</option>
              <option value="faithful">Faithful</option>
            </select>
          </label>
          <label>
            Tempo
            <input data-testid="piano-chamber-tempo" value={tempo} onChange={(event) => { setTempo(event.target.value); dropStaleArrangement(); }} />
          </label>
          <div>
            {(proposal.parts ?? []).length > 1 ? (
              <div data-testid="piano-chamber-parts">
                {(proposal.parts ?? []).map((part) => (
                  <label key={part.partId}>
                    <input
                      type="checkbox"
                      aria-label={`part ${part.partId}`}
                      checked={partIds.includes(part.partId)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...partIds, part.partId].slice(0, 2)
                          : partIds.filter((id) => id !== part.partId);
                        setPartIds(next);
                        invalidateReview();
                        void refreshAnchors(roles, phrases, next);
                      }}
                    />
                    {part.name}
                  </label>
                ))}
              </div>
            ) : null}
            {phrases.map((phrase, index) => (
              <div key={phrase.id} style={{ display: 'flex', gap: '0.4rem' }}>
                <span>{phrase.id}</span>
                <input
                  aria-label={`${phrase.id} start`}
                  type="number"
                  value={phrase.startBar}
                  onChange={(event) => {
                    const next = phrases.map((item, itemIndex) => itemIndex === index ? { ...item, startBar: Number(event.target.value) } : item);
                    setPhrases(next);
                    invalidateReview();
                    void refreshAnchors(roles, next, partIds);
                  }}
                />
                <input
                  aria-label={`${phrase.id} end`}
                  type="number"
                  value={phrase.endBar}
                  onChange={(event) => {
                    const next = phrases.map((item, itemIndex) => itemIndex === index ? { ...item, endBar: Number(event.target.value) } : item);
                    setPhrases(next);
                    invalidateReview();
                    void refreshAnchors(roles, next, partIds);
                  }}
                />
                <span>{phrase.reason}</span>
              </div>
            ))}
          </div>
          <div data-testid="piano-chamber-roles">
            {uncertain.map((event) => (
              <label key={event.eventId} style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.4rem' }}>
                <span>Bar {event.bar} MIDI {event.midi}</span>
                <select
                  aria-label={event.eventId}
                  value={roles[event.eventId] ?? event.proposedRole}
                  onChange={(change) => {
                    const next = { ...roles, [event.eventId]: change.target.value as Role };
                    setRoles(next);
                    invalidateReview();
                    void refreshAnchors(next, phrases, partIds);
                  }}
                >
                  {(['melody', 'bass', 'countermelody', 'harmonic_support', 'rhythmic_figure', 'unassigned'] as Role[]).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <details data-testid="piano-chamber-anchors" style={{ border: '1px solid #c8c8c8', borderRadius: 6, padding: '0.45rem 0.65rem' }}>
            <summary style={{ cursor: 'pointer' }}>
              <strong>Protected Source Anchors</strong>
              <span data-testid="piano-chamber-anchor-summary" style={{ display: 'block', marginTop: '0.15rem' }}>
                {protectedCount} protected. {availableCount} available. Source material is protected.
              </span>
            </summary>
            <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.55rem' }}>
              {anchorBars.map((bar) => (
                <div key={bar}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{Number.isFinite(bar) ? `Bar ${bar}` : 'Bar unknown'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(7.5rem, 1fr))', gap: '0.15rem 0.45rem' }}>
                    {(anchorsByBar.get(bar) ?? []).map((id, index) => {
                      const event = proposal.events.find((item) => item.eventId === id);
                      const noteName = event ? noteNameFromMidi(event.midi) : 'Unknown pitch';
                      const barLabel = event ? String(event.bar) : 'unknown';
                      const describedBy = `piano-chamber-anchor-id-${Number.isFinite(bar) ? bar : 'unknown'}-${index}`;
                      return (
                        <label key={id} title={id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            aria-label={`Protect ${noteName} in bar ${barLabel}`}
                            aria-describedby={describedBy}
                            checked={anchorOn[id] !== false}
                            onChange={(change) => {
                              setAnchorOn((current) => ({ ...current, [id]: change.target.checked }));
                              invalidateReview();
                            }}
                          />
                          <span>{noteName}</span>
                          <span id={describedBy} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                            {id}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
          <fieldset data-testid="piano-chamber-harmonic" style={{ display: 'grid', gap: '0.35rem' }}>
            <legend>Harmonic development</legend>
            <p style={{ margin: 0 }}>Both controls start off. Off keeps the Phase 1 arrangement. Anchors above stay protected.</p>
            <label>
              <input data-testid="piano-chamber-bhl" type="checkbox" checked={bhlOn} onChange={(event) => { setBhlOn(event.target.checked); dropStaleArrangement(); }} />
              BHL quadratonic tension and release
            </label>
            {bhlOn ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label>Bars <input data-testid="piano-chamber-bhl-start" type="number" value={bhlStart} onChange={(event) => { setBhlStart(Number(event.target.value)); dropStaleArrangement(); }} /></label>
                <label>to <input aria-label="bhl end" type="number" value={bhlEnd} onChange={(event) => { setBhlEnd(Number(event.target.value)); dropStaleArrangement(); }} /></label>
                <label>
                  Voice
                  <select aria-label="bhl target" value={bhlTarget} onChange={(event) => { setBhlTarget(event.target.value); dropStaleArrangement(); }}>
                    <option value="harmonic_support">harmonic support</option>
                    <option value="countermelody">countermelody</option>
                    <option value="inner">any inner voice</option>
                    <option value="va">viola</option>
                    <option value="hn">horn</option>
                    <option value="cl">clarinet</option>
                    <option value="vn2">violin II</option>
                  </select>
                </label>
                <label>
                  Departure
                  <select aria-label="bhl departure" value={bhlDeparture} onChange={(event) => { setBhlDeparture(event.target.value as 'mild' | 'strong'); dropStaleArrangement(); }}>
                    <option value="mild">mild</option>
                    <option value="strong">strong</option>
                  </select>
                </label>
                <label>
                  Tension
                  <select aria-label="bhl placement" value={bhlPlace} onChange={(event) => { setBhlPlace(event.target.value as 'early' | 'mid' | 'late'); dropStaleArrangement(); }}>
                    <option value="early">early</option>
                    <option value="mid">middle</option>
                    <option value="late">late</option>
                  </select>
                </label>
                <label>
                  Resolution
                  <select aria-label="bhl resolution" value={bhlResolve} onChange={(event) => { setBhlResolve(event.target.value as 'next-beat' | 'bar-end' | 'phrase-end'); dropStaleArrangement(); }}>
                    <option value="next-beat">next beat</option>
                    <option value="bar-end">next bar</option>
                    <option value="phrase-end">phrase end</option>
                  </select>
                </label>
              </div>
            ) : null}
            <label>
              <input data-testid="piano-chamber-pair" type="checkbox" checked={pairOn} onChange={(event) => { setPairOn(event.target.checked); dropStaleArrangement(); }} />
              Triad-pair dialogue
            </label>
            {pairOn ? (
              <div style={{ display: 'grid', gap: '0.3rem' }}>
                <label>Bars <input aria-label="pair start" type="number" value={pairStart} onChange={(event) => { setPairStart(Number(event.target.value)); dropStaleArrangement(); }} /> to <input aria-label="pair end" type="number" value={pairEnd} onChange={(event) => { setPairEnd(Number(event.target.value)); dropStaleArrangement(); }} /></label>
                <label>Parent A notes <input aria-label="parent a notes" value={parentANotes} onChange={(event) => { setParentANotes(event.target.value); dropStaleArrangement(); }} /></label>
                <label>Parent A octaves <input aria-label="parent a voices" value={parentAVoices} onChange={(event) => { setParentAVoices(event.target.value); dropStaleArrangement(); }} /></label>
                <label>
                  Parent A
                  <select aria-label="parent a quality" value={parentAQuality} onChange={(event) => { setParentAQuality(event.target.value as 'major' | 'minor'); dropStaleArrangement(); }}>
                    <option value="major">major</option>
                    <option value="minor">minor</option>
                  </select>
                </label>
                <label>Parent B notes <input aria-label="parent b notes" value={parentBNotes} onChange={(event) => { setParentBNotes(event.target.value); dropStaleArrangement(); }} /></label>
                <label>Parent B octaves <input aria-label="parent b voices" value={parentBVoices} onChange={(event) => { setParentBVoices(event.target.value); dropStaleArrangement(); }} /></label>
                <label>
                  Parent B
                  <select aria-label="parent b quality" value={parentBQuality} onChange={(event) => { setParentBQuality(event.target.value as 'major' | 'minor'); dropStaleArrangement(); }}>
                    <option value="minor">minor</option>
                    <option value="major">major</option>
                  </select>
                </label>
                <label>
                  Exchange
                  <select aria-label="pair relation" value={relation} onChange={(event) => { setRelation(event.target.value as 'alternation' | 'interlocking'); dropStaleArrangement(); }}>
                    <option value="alternation">alternation</option>
                    <option value="interlocking">interlocking</option>
                  </select>
                </label>
                <label>Group A <input aria-label="group a" value={groupA} onChange={(event) => { setGroupA(event.target.value); dropStaleArrangement(); }} /></label>
                <label>Group B <input aria-label="group b" value={groupB} onChange={(event) => { setGroupB(event.target.value); dropStaleArrangement(); }} /></label>
                <label>Register <input aria-label="register min" type="number" value={registerMin} onChange={(event) => { setRegisterMin(Number(event.target.value)); dropStaleArrangement(); }} /> to <input aria-label="register max" type="number" value={registerMax} onChange={(event) => { setRegisterMax(Number(event.target.value)); dropStaleArrangement(); }} /></label>
                <label>Max attacks <input aria-label="max attacks" type="number" value={maxAttacks} onChange={(event) => { setMaxAttacks(Number(event.target.value)); dropStaleArrangement(); }} /></label>
              </div>
            ) : null}
          </fieldset>
          <p>{proposal.uncertain.length} uncertain inferences. Confirming them does not make them facts. It records your review.</p>
          <label>
            <input data-testid="piano-chamber-confirm" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I have checked the roles and phrase boundaries
          </label>
          <button data-testid="piano-chamber-generate" type="button" disabled={!confirmed || busy} onClick={() => void realise()}>
            Arrange
          </button>
        </div>
      ) : null}
      {fidelity && musicXml ? (
        <div data-testid="piano-chamber-result" style={{ display: 'grid', gap: '0.4rem' }}>
          <p>Mode {fidelity.mode}. Tempo {fidelity.tempoBpm}. Musical approval: not given.</p>
          {fidelity.harmonicDevelopment ? (
            <div data-testid="piano-chamber-harmonic-result">
              <p>Protected source events kept: {fidelity.harmonicDevelopment.protectedEventIds.length}.</p>
              <ul>
                {fidelity.harmonicDevelopment.notes.map((note) => (
                  <li key={`${note.control}-${note.partId}-${note.onset}`}>
                    {note.control} {note.partId} onset {note.onset} MIDI {note.midi} for {note.duration}. {note.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p data-testid="piano-chamber-harmonic-off">
              {fidelity.symphonic?.distribution?.allocation === 'phase-2'
                ? 'Harmonic development off. Phase 2 distribution.'
                : 'Harmonic development off. Phase 1 arrangement.'}
            </p>
          )}
          <ul>
            {fidelity.phrases.map((phrase) => (
              <li key={phrase.id}>
                {phrase.id} bars {phrase.startBar}–{phrase.endBar} {phrase.role}, foreground {phrase.foreground}
                {phrase.answer ? `, answer ${phrase.answer} (${phrase.answerOperator})` : ''}
              </li>
            ))}
          </ul>
          {fidelity.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          <div>
            {fidelity.listeningQuestions.map((question) => <p key={question}>{question}</p>)}
          </div>
          {midiSetBase64 ? <p data-testid="piano-chamber-midi-label">Synchronized MIDI set. Not one full-orchestra MIDI file. The sine preview does not play the orchestra.</p> : null}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" data-testid="piano-chamber-preview" onClick={() => playPreview(fidelity.preview, fidelity.tempoBpm)}>
              Sine preview, not orchestral playback
            </button>
            <button
              type="button"
              data-testid="piano-chamber-xml"
              onClick={() => download('piano-chamber.musicxml', new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' }))}
            >
              MusicXML
            </button>
            {midiSetBase64 ? (
              <button
                type="button"
                data-testid="piano-chamber-midi-set"
                onClick={() => {
                  const binary = Uint8Array.from(atob(midiSetBase64), (char) => char.charCodeAt(0));
                  download('symphony-midi-set.zip', new Blob([binary], { type: 'application/zip' }));
                }}
              >
                Synchronized MIDI set
              </button>
            ) : (
              <button
                type="button"
                data-testid="piano-chamber-midi"
                onClick={() => {
                  const binary = Uint8Array.from(atob(midiBase64), (char) => char.charCodeAt(0));
                  download('piano-chamber.mid', new Blob([binary], { type: 'audio/midi' }));
                }}
              >
                MIDI
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
