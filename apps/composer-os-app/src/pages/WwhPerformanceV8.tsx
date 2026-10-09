/**
 * Performance Composer (engine version V8). Project: While We're Here.
 * Desktop IPC only. The renderer does not touch the filesystem.
 */
import { useEffect, useState } from 'react';

const V8C_SEED = 80083;
const V8B_BASELINE_SEED = 80082;

type Approach = 'lyrical' | 'liquid' | 'adventurous';

interface SessionRun {
  ok: true;
  runId: string;
  timestamp: string;
  piece: string;
  approach: Approach;
  pairLabel: string | null;
  seed: number;
  musicXmlPath: string;
  sourcePreservation: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  sourcePreservationDetail: string;
  guitarFeasibility: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  guitarFeasibilityDetail: string;
  bassBehaviour: string;
  bassDetail: string;
}
const PIECES = [
  'Black Aura',
  'Palace Gates',
  'The Mirror',
  "Meet Me at Hobo's",
  'Orbit',
  'Wrong Turning',
  'Impossible Metaphysics',
  'Small Testimony',
  'After Everything',
] as const;

const QUALITIES = ['major', 'minor', 'augmented', 'diminished'] as const;
type Quality = (typeof QUALITIES)[number];

interface ParentFields {
  rootSpelling: string;
  quality: Quality;
}

interface AdviceLine {
  advice: string[];
  identicalCommonTones: string[];
  movingCandidates: Array<{ from: string; to: string; semitones: number }>;
  retainedCandidates: string[];
  melody: string[];
  bass: string[];
}

interface RespondAlternative {
  character: string;
  label: string;
  musicXmlPath: string;
  answers: number;
  windows: number;
  notes: number;
  devices: string[];
  checks: { locks: string; barFill: string; playable: string; stampReadBack: string };
}

interface RespondRun {
  ok: true;
  runId: string;
  clickedAt: string;
  sourceFile: string;
  sourceSha256: string;
  bars: string;
  seed: number;
  build: { buildCommit: string; ipcBundleSha256: string; stampMatchesLiveIpc: string };
  folder: string;
  alternatives: RespondAlternative[];
  musicalAcceptance: string;
  latestFolder?: string;
}

const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem', fontSize: 13 };
const inputStyle = { padding: '0.3rem' };

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const bridge = window.composerOsDesktop;
  if (!bridge?.invokeApi) throw new Error('Open this panel in the Composer OS desktop app.');
  return (await bridge.invokeApi(channel, payload)) as T;
}

export function WwhPerformanceV8() {
  const [piece, setPiece] = useState('Black Aura');
  const [approach, setApproach] = useState<Approach>('liquid');
  const [seed, setSeed] = useState(String(V8C_SEED));
  const [parentA, setParentA] = useState<ParentFields>({ rootSpelling: 'D', quality: 'minor' });
  const [parentB, setParentB] = useState<ParentFields>({ rootSpelling: 'Ab', quality: 'major' });
  const [advice, setAdvice] = useState<AdviceLine | null>(null);
  const [adviceError, setAdviceError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openError, setOpenError] = useState('');
  const [runs, setRuns] = useState<SessionRun[]>([]);
  const [respondRuns, setRespondRuns] = useState<RespondRun[]>([]);
  const [respondError, setRespondError] = useState('');

  const pairEnabled = approach === 'liquid' && piece === 'Black Aura';

  useEffect(() => {
    if (!pairEnabled) {
      setAdvice(null);
      setAdviceError('');
      return;
    }
    let cancel = false;
    void invoke<{ ok: boolean; advice?: AdviceLine; error?: string }>('composer-os-api:wwh-v8-advise', {
      resolution: parentA,
      tension: parentB,
    }).then((result) => {
      if (cancel) return;
      if (result.ok && result.advice) {
        setAdvice(result.advice);
        setAdviceError('');
      } else {
        setAdvice(null);
        setAdviceError(result.error ?? 'Pair advice failed.');
      }
    });
    return () => {
      cancel = true;
    };
  }, [pairEnabled, parentA, parentB]);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError('');
    setOpenError('');
    try {
      const parsedSeed = Number(seed);
      const result = await invoke<SessionRun | { ok: false; error: string }>('composer-os-api:wwh-v8-generate', {
        piece: piece === 'Black Aura' ? 'black-aura' : piece,
        approach,
        seed: parsedSeed,
        pair: pairEnabled ? { resolution: parentA, tension: parentB } : undefined,
      });
      if (!result || result.ok !== true) {
        setError('error' in result ? result.error : 'Generation failed.');
        return;
      }
      setRuns((current) => [result, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function respond() {
    if (busy) return;
    setBusy(true);
    setRespondError('');
    setOpenError('');
    try {
      const result = await invoke<RespondRun | { ok: false; canceled?: true; error?: string }>('composer-os-api:pc-respond');
      if (!result || result.ok !== true) {
        if (!('canceled' in result && result.canceled)) setRespondError(('error' in result && result.error) || 'Respond failed.');
        return;
      }
      setRespondRuns((current) => [result, ...current]);
    } catch (caught) {
      setRespondError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function openScore(filePath: string, channel: 'composer-os-api:wwh-v8-open-musescore' | 'composer-os-api:wwh-v8-reveal') {
    setOpenError('');
    const result = await invoke<{ ok: boolean; error?: string }>(channel, { path: filePath });
    if (!result.ok) setOpenError(result.error ?? 'Could not open that file.');
  }

  return (
    <section aria-busy={busy} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <h2 style={{ margin: 0 }}>Performance Composer</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>Version V8 · Project: While We&apos;re Here</p>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
        Black Aura inserts four bars after printed bar 16 and returns at bar 17. Bass in the insert stays the printed bar 16 part.
      </p>

      <label style={fieldStyle}>
        Composition
        <select value={piece} onChange={(event) => setPiece(event.target.value)} style={inputStyle}>
          {PIECES.map((title) => (
            <option key={title} value={title} disabled={title !== 'Black Aura'}>
              {title === 'Black Aura' ? title : `${title} — Not yet supported`}
            </option>
          ))}
        </select>
      </label>

      <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
        <legend>Musical approach</legend>
        {(
          [
            ['lyrical', 'Lyrical', `V8C. Seed ${V8C_SEED}.`],
            ['liquid', 'Liquid Harmony', `V8C D minor / Ab major at seed ${V8C_SEED}. Other pairs use V8B.1. Approved V8B notes stay at seed ${V8B_BASELINE_SEED}.`],
            ['adventurous', 'Adventurous', `V8C. Seed ${V8C_SEED}.`],
          ] as const
        ).map(([id, label, note]) => (
          <label key={id} style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
            <input type="radio" name="wwh-v8-approach" checked={approach === id} onChange={() => setApproach(id)} /> {label}
            <span style={{ color: 'var(--text-muted)' }}> — {note}</span>
          </label>
        ))}
      </fieldset>

      <fieldset disabled={!pairEnabled} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
        <legend>Triad pair {pairEnabled ? '' : '(not used by this approach)'}</legend>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <button type="button" className="secondary" onClick={() => { setParentA({ rootSpelling: 'D', quality: 'minor' }); setParentB({ rootSpelling: 'Ab', quality: 'major' }); }}>
            D minor / Ab major
          </button>
          <button type="button" className="secondary" onClick={() => { setParentA({ rootSpelling: 'C', quality: 'major' }); setParentB({ rootSpelling: 'A', quality: 'minor' }); }}>
            C major / A minor
          </button>
        </div>
        <ParentEditor label="Parent A" value={parentA} onChange={setParentA} />
        <ParentEditor label="Parent B" value={parentB} onChange={setParentB} />
        {pairEnabled && adviceError ? <p style={{ color: 'var(--danger, #a33)', fontSize: 13 }}>{adviceError}</p> : null}
        {pairEnabled && advice ? <AdviceBlock advice={advice} /> : null}
      </fieldset>

      <label style={fieldStyle}>
        Seed
        <input value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" style={{ ...inputStyle, maxWidth: 160 }} />
      </label>

      <button type="button" disabled={busy || piece !== 'Black Aura'} onClick={() => void generate()}>
        {busy ? 'Generating…' : 'Generate'}
      </button>
      {error ? <p role="alert" style={{ color: 'var(--danger, #a33)', margin: 0 }}>{error}</p> : null}
      {openError ? <p role="alert" style={{ color: 'var(--danger, #a33)', margin: 0 }}>{openError}</p> : null}

      <button type="button" disabled={busy} onClick={() => void respond()}>
        {busy ? 'Working…' : 'Respond…'}
      </button>
      {respondError ? <p role="alert" style={{ color: 'var(--danger, #a33)', margin: 0 }}>{respondError}</p> : null}
      {respondRuns.map((run) => (
        <article key={run.runId} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', fontSize: 13 }}>
          <div><strong>RESPOND</strong> · {run.sourceFile} · bars {run.bars}</div>
          <div>Composer OS provenance: run {run.runId} · clicked {run.clickedAt} · seed {run.seed}</div>
          <div>Build commit: {run.build.buildCommit || 'not available'} · running code {run.build.ipcBundleSha256.slice(0, 12) || 'not available'} · stamp matches running code: {run.build.stampMatchesLiveIpc === '1' ? 'yes' : run.build.stampMatchesLiveIpc === '0' ? 'NO' : 'unknown'}</div>
          <div>Source SHA-256: {run.sourceSha256.slice(0, 16)}…</div>
          <div style={{ color: 'var(--text-muted)' }}>Musical acceptance: {run.musicalAcceptance}</div>
          {run.latestFolder ? <div>Plain-named copies: {run.latestFolder}</div> : null}
          {run.alternatives.map((alt) => (
            <div key={alt.musicXmlPath} style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <div><strong>{alt.label}</strong> · answers {alt.answers} of {alt.windows} gaps · {alt.notes} notes · {alt.devices.join(', ')}</div>
              <div>Locks {alt.checks.locks} · Bar fill {alt.checks.barFill} · Playable {alt.checks.playable} · Stamp {alt.checks.stampReadBack}</div>
              <div>MusicXML: {alt.musicXmlPath}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button type="button" onClick={() => void openScore(alt.musicXmlPath, 'composer-os-api:wwh-v8-open-musescore')}>Open MusicXML</button>
                <button type="button" className="secondary" onClick={() => void openScore(alt.musicXmlPath, 'composer-os-api:wwh-v8-reveal')}>Open Folder</button>
              </div>
            </div>
          ))}
        </article>
      ))}

      <h3 style={{ marginBottom: 0 }}>Session results</h3>
      {runs.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No generation in this session yet.</p> : null}
      {runs.map((run) => (
        <article key={run.runId} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', fontSize: 13 }}>
          <div><strong>{run.runId}</strong> · {run.timestamp}</div>
          <div>{run.piece} · {run.approach}{run.pairLabel ? ` · ${run.pairLabel}` : ''} · seed {run.seed}</div>
          <div>MusicXML: {run.musicXmlPath}</div>
          <div>Source preservation: {run.sourcePreservation}. {run.sourcePreservationDetail}</div>
          <div>Guitar feasibility: {run.guitarFeasibility}. {run.guitarFeasibilityDetail}</div>
          <div>Bass: {run.bassBehaviour}. {run.bassDetail}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => void openScore(run.musicXmlPath, 'composer-os-api:wwh-v8-open-musescore')}>Open MusicXML</button>
            <button type="button" className="secondary" onClick={() => void openScore(run.musicXmlPath, 'composer-os-api:wwh-v8-reveal')}>Open Folder</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function ParentEditor(props: { label: string; value: ParentFields; onChange: (value: ParentFields) => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', marginTop: '0.5rem' }}>
      <label style={fieldStyle}>
        {props.label} root
        <input
          value={props.value.rootSpelling}
          onChange={(event) => props.onChange({ ...props.value, rootSpelling: event.target.value })}
          style={{ ...inputStyle, width: 80 }}
          aria-label={`${props.label} root spelling`}
        />
      </label>
      <label style={fieldStyle}>
        Quality
        <select
          value={props.value.quality}
          onChange={(event) => props.onChange({ ...props.value, quality: event.target.value as Quality })}
          style={inputStyle}
          aria-label={`${props.label} quality`}
        >
          {QUALITIES.map((quality) => (
            <option key={quality} value={quality}>{quality}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function AdviceBlock(props: { advice: AdviceLine }) {
  const semitones = props.advice.movingCandidates.filter((link) => Math.abs(link.semitones) === 1 || Math.abs(link.semitones) === 2);
  return (
    <div style={{ fontSize: 13, marginTop: '0.75rem' }}>
      <div>Shared spellings: {props.advice.identicalCommonTones.join(', ') || 'none'}.</div>
      <div>Retained-voice candidates: {props.advice.retainedCandidates.join(', ') || 'none'}.</div>
      <div>Chromatic links: {semitones.map((link) => `${link.from}→${link.to} (${link.semitones})`).join(', ') || 'none'}.</div>
      <div>Melody: {props.advice.melody.join(' ') || 'none'}.</div>
      <div>Bass: {props.advice.bass.join(' ') || 'none'}.</div>
      {props.advice.advice.map((line) => (
        <p key={line} style={{ margin: '0.4rem 0' }}>{line}</p>
      ))}
    </div>
  );
}
