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
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
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
  const [fidelity, setFidelity] = useState<Fidelity | null>(null);
  const [busy, setBusy] = useState(false);

  function dropStaleArrangement() {
    setMusicXml('');
    setMidiBase64('');
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
    if (!response.ok || !response.musicXml || !response.midiBase64 || !response.fidelity) {
      setError(response.error || 'Arrangement was refused.');
      setMusicXml('');
      setFidelity(null);
      return;
    }
    setMusicXml(response.musicXml);
    setMidiBase64(response.midiBase64);
    setFidelity(response.fidelity);
  }

  const uncertain = proposal?.events.filter((event) => event.confidence === 'low').slice(0, 16) ?? [];

  return (
    <section data-testid="piano-chamber" style={{ display: 'grid', gap: '0.75rem', maxWidth: 920 }}>
      <h2 style={{ margin: 0 }}>Piano to chamber</h2>
      <p style={{ margin: 0 }}>
        Twenty-four bars. One piano part or two selected piano parts. 4/4, 3/4 or 6/8. Developing arrangement is the default. Inferred roles stay proposals until you confirm them.
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
          <p>
            {proposal.beats}/{proposal.beatType}, {proposal.bars} bars.
            Tempo {proposal.tempoSource === 'missing' ? 'missing' : proposal.tempoBpm}. {proposal.motifNote}
          </p>
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
          <div data-testid="piano-chamber-anchors">
            {protectedIds.map((id) => {
              const event = proposal.events.find((item) => item.eventId === id);
              return (
                <label key={id}>
                  <input
                    type="checkbox"
                    aria-label={`anchor ${id}`}
                    checked={anchorOn[id] !== false}
                    onChange={(change) => {
                      setAnchorOn((current) => ({ ...current, [id]: change.target.checked }));
                      invalidateReview();
                    }}
                  />
                  Anchor {id} bar {event?.bar ?? '?'} MIDI {event?.midi ?? '?'}
                </label>
              );
            })}
          </div>
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
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" data-testid="piano-chamber-preview" onClick={() => playPreview(fidelity.preview, fidelity.tempoBpm)}>
              Pitch preview
            </button>
            <button
              type="button"
              data-testid="piano-chamber-xml"
              onClick={() => download('piano-chamber.musicxml', new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' }))}
            >
              MusicXML
            </button>
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
          </div>
        </div>
      ) : null}
    </section>
  );
}
