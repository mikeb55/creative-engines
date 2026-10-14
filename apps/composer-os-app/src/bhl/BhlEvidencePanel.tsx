import { useState } from 'react';

type Rational = { n: number; d: number };

export type BhlEvidenceView = {
  awaitingComposerVerification: true;
  musicalQualityScore: null;
  events: Array<{
    partId: string;
    partName: string;
    voice: string;
    bar: number;
    onsetInBar: Rational;
    duration: Rational;
    rest: boolean;
    midi: number | null;
    attack: boolean;
    tieSustained: boolean;
  }>;
  motions: Array<{
    bar: number;
    onsetInBar: Rational;
    kind: string;
    voiceA: string;
    voiceB: string;
    previousA: number;
    pitchA: number;
    previousB: number;
    pitchB: number;
  }>;
  entries: Array<{ bar: number; onsetInBar: Rational; kind: string; entering: string }>;
  crossings: Array<{ bar: number; onsetInBar: Rational }>;
  silences: Array<{ bar: number; voice: string; kind: string; onsetInBar: Rational; duration: Rational }>;
  questions: string[];
  barMetres: Array<{ bar: number; beats: number; beatType: number }>;
};

export type BhlIntentView = {
  regionId: string;
  role: string;
  intention: string;
  status: 'VERIFIED' | 'NOT OBSERVED' | 'INDETERMINATE' | string;
  evidence: string;
};

export type BhlComparisonView = {
  provisional: true;
  notice: string;
  notes: string[];
};

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MARKS = ['Accept', 'Revise', 'Intentionally retain', 'Not relevant'] as const;

function rat(value: Rational): string {
  return value.d === 1 ? String(value.n) : `${value.n}/${value.d}`;
}

function pitch(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

type ComposerQuestion = {
  id: string;
  source: 'original' | 'candidate';
  index: number;
  text: string;
};

/** One row per question occurrence. The same wording can appear on the original and the candidate. */
export function composerQuestions(
  original: BhlEvidenceView | null,
  candidate: BhlEvidenceView | null,
  provisional: boolean,
): ComposerQuestion[] {
  const rows: ComposerQuestion[] = [];
  (original?.questions ?? []).forEach((text, index) => {
    rows.push({ id: `original:${index}`, source: 'original', index, text });
  });
  if (provisional) {
    (candidate?.questions ?? []).forEach((text, index) => {
      rows.push({ id: `candidate:${index}`, source: 'candidate', index, text });
    });
  }
  return rows;
}

function Lanes({ evidence }: { evidence: BhlEvidenceView }) {
  const voices = [...new Set(evidence.events.map((event) => `${event.partId}:${event.voice}`))];
  return (
    <div data-testid="bhl-voice-lanes">
      {voices.map((key) => {
        const rows = evidence.events.filter((event) => `${event.partId}:${event.voice}` === key);
        const sample = rows[0];
        if (!sample) return null;
        return (
          <div key={key}>
            <strong>
              {sample.partName} voice {sample.voice}
            </strong>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {rows.map((event, index) => (
                <li key={`${key}-${event.bar}-${index}`}>
                  Bar {event.bar} at {rat(event.onsetInBar)} ·{' '}
                  {event.rest ? `rest ${rat(event.duration)}` : `${pitch(event.midi!)} ${rat(event.duration)}`}
                  {event.tieSustained ? ' · tied sustain' : ''}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {evidence.motions.map((motion, index) => (
        <p key={`motion-${index}`} style={{ margin: 0 }}>
          {motion.kind} · bar {motion.bar} at {rat(motion.onsetInBar)} · {motion.voiceA} {pitch(motion.previousA)}→
          {pitch(motion.pitchA)} · {motion.voiceB} {pitch(motion.previousB)}→{pitch(motion.pitchB)}
        </p>
      ))}
      {evidence.entries
        .filter((entry) => entry.kind === 'handoff' || entry.kind === 'against-sustain' || entry.kind === 'shared-attack')
        .slice(0, 12)
        .map((entry, index) => (
          <p key={`entry-${index}`} style={{ margin: 0 }}>
            {entry.kind} · bar {entry.bar} at {rat(entry.onsetInBar)} · {entry.entering}
          </p>
        ))}
      {evidence.crossings.map((crossing, index) => (
        <p key={`cross-${index}`} style={{ margin: 0 }}>
          Voice crossing · bar {crossing.bar} at {rat(crossing.onsetInBar)}
        </p>
      ))}
      {evidence.silences
        .filter((silence) => silence.kind === 'whole-bar' || silence.kind === 'inner-bar')
        .slice(0, 16)
        .map((silence, index) => (
          <p key={`silence-${index}`} style={{ margin: 0 }}>
            {silence.kind} · {silence.voice} · bar {silence.bar} at {rat(silence.onsetInBar)} for {rat(silence.duration)}
          </p>
        ))}
    </div>
  );
}

export function BhlEvidencePanel({
  original,
  candidate,
  intentions,
  limitations,
  fieldNotes,
  comparison,
  provisional,
}: {
  original: BhlEvidenceView | null;
  candidate: BhlEvidenceView | null;
  intentions: BhlIntentView[];
  limitations?: Array<{ regionId: string; intention: string; reason: string }>;
  fieldNotes?: Array<{ bar: number; onsetQuarters: number; pitchClass: number; status: 'in-field' | 'outside-permitted' }>;
  comparison: BhlComparisonView | null;
  provisional: boolean;
}) {
  const outside = (fieldNotes ?? []).filter((note) => note.status === 'outside-permitted');
  const inField = (fieldNotes ?? []).filter((note) => note.status === 'in-field').length;
  const [marks, setMarks] = useState<Record<string, string>>({});
  const questions = composerQuestions(original, candidate, provisional);
  const showQuestionSource = Boolean(original?.questions.length && provisional && candidate?.questions.length);
  return (
    <section
      data-testid="bhl-evidence"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-panel)', borderRadius: 8, padding: '0.75rem', display: 'grid', gap: '0.5rem' }}
    >
      <h3 style={{ margin: 0 }}>Musical Evidence</h3>
      <p style={{ margin: 0 }}>
        AWAITING COMPOSER VERIFICATION. This panel describes events and declared intentions. It does not decide whether the music is good.
      </p>
      {provisional ? (
        <p data-testid="bhl-evidence-provisional" style={{ margin: 0 }}>
          Generated-candidate analysis is provisional until the original-score evidence has been reviewed.
        </p>
      ) : null}
      <h4 style={{ margin: 0 }}>Voice Relationships</h4>
      {original ? (
        <>
          <p style={{ margin: 0 }}>Original passage</p>
          <Lanes evidence={original} />
        </>
      ) : (
        <p style={{ margin: 0 }}>Import a score to read the original lanes.</p>
      )}
      {candidate ? (
        <>
          <p style={{ margin: 0 }}>Generated candidate</p>
          <Lanes evidence={candidate} />
        </>
      ) : null}
      <h4 style={{ margin: 0 }}>Intention Audit</h4>
      {intentions.length ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }} data-testid="bhl-intent-audit">
          {intentions.map((item) => (
            <li key={`${item.regionId}-${item.intention}`}>
              {item.regionId} · {item.role} · {item.intention} · {item.status}. {item.evidence}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0 }}>Generate a candidate to audit its declared intentions. This is separate from source-lock validation.</p>
      )}
      <h4 style={{ margin: 0 }}>Harmonic field</h4>
      <p style={{ margin: 0 }} data-testid="bhl-field-compliance">
        {fieldNotes?.length ? `${inField} generated pitch classes sit in the selected field.` : 'Generate a candidate to read field compliance.'}
      </p>
      {outside.length ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }} data-testid="bhl-outside-notes">
          {outside.map((note) => (
            <li key={`${note.bar}-${note.onsetQuarters}-${note.pitchClass}`}>
              Bar {note.bar} at {note.onsetQuarters}: pitch class {note.pitchClass} is an intentional outside colour.
            </li>
          ))}
        </ul>
      ) : fieldNotes?.length ? (
        <p style={{ margin: 0 }}>No intentional outside-field notes.</p>
      ) : null}
      {limitations?.length ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }} data-testid="bhl-intention-limits">
          {limitations.map((item) => (
            <li key={`${item.regionId}-${item.intention}`}>
              {item.regionId}: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
      <h4 style={{ margin: 0 }}>Questions for the Composer</h4>
      {questions.map((question) => (
        <div key={question.id}>
          {showQuestionSource ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {question.source === 'original' ? 'Original score' : 'Generated candidate'}
            </p>
          ) : null}
          <p style={{ margin: 0 }}>{question.text}</p>
          <select
            data-testid="bhl-composer-question"
            data-question-id={question.id}
            aria-label={`${question.source} ${question.index + 1}: ${question.text}`}
            value={marks[question.id] ?? ''}
            onChange={(event) => setMarks((current) => ({ ...current, [question.id]: event.target.value }))}
          >
            <option value="">Mark…</option>
            {MARKS.map((mark) => (
              <option key={mark} value={mark}>
                {mark}
              </option>
            ))}
          </select>
        </div>
      ))}
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        Marks stay in this page session. They are not written into the MusicXML, and this build does not save a sidecar file.
      </p>
      {comparison ? (
        <>
          <h4 style={{ margin: 0 }}>Comparison</h4>
          <p style={{ margin: 0 }}>{comparison.notice}</p>
          {comparison.notes.map((note) => (
            <p key={note} style={{ margin: 0 }}>
              {note}
            </p>
          ))}
        </>
      ) : null}
    </section>
  );
}
