import { useEffect, useState, type CSSProperties } from 'react';
import { api, isDesktopIpc } from '../services/api';

type Span = { from: number; to: number };

type FieldChoice = { id: string; label: string; source: 'bass' | 'vault' };

type Region = {
  id: string;
  from: number;
  to: number;
  bars: number[];
  role: string;
  vaultChordType: string;
  pitchClasses: number[];
  pitchTransform: string;
  rhythmTransform: string;
  dialogue: string;
  density: string;
};

type Plan = { seed: number; span: Span; motif: { pitchClasses: number[] }; regions: Region[] };

type Inspect = {
  ok: true;
  sourcePath: string;
  sourceSha256: string;
  guitarPartId: string;
  bassPartId: string;
  guitarName: string;
  bassName: string;
  barCount: number;
  span: Span;
  metres: Array<{ partId: string; bar: number; beats: number; beatType: number }>;
  tempo: { beatUnit: string | null; perMinute: string | null; statedAtBar: number | null } | null;
  rehearsal: Array<{ bar: number; text: string; partId: string }>;
  bassEventCount: number;
  protectedGuitarBars: number[];
  plan: Plan;
  fieldChoices: Record<string, FieldChoice[]>;
};

type Compose = Inspect & {
  seed: number;
  events: Array<{ bar: number; onsetQuarters: number; quarters: number; midis: number[]; regionId: string }>;
  predicates: Array<{ id: string; ok: boolean; detail: string }>;
  feasibility: Array<{ bar: number; onsetQuarters: number; midis: number[]; feasible: boolean; fretSpan: number }>;
  harmony: Array<{ bar: number; label?: string; action?: string }>;
  verification: { ok: boolean; errors: string[]; reimports: boolean };
  outsideIdentical: boolean;
  guitarChanged: boolean;
  sourceUnchanged: boolean;
  xml: string;
  gce: {
    framework: string;
    technicalLabel: string;
    musicalLabel: string;
    musicallyApproved: false;
    candidateForAudition: false;
    notes: string[];
  };
};

type RegionEdit = {
  fieldChoiceId: string;
  density: string;
  dialogue: string;
  pitchTransform: string;
};

const PITCHES = [
  'neighbor-statement',
  'invert-into-field',
  'reproject-neighbor',
  'recall-cell',
  'retain-and-admit-bass',
];

const panel: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  borderRadius: 8,
  padding: '0.75rem',
  display: 'grid',
  gap: '0.5rem',
};

function editsFrom(plan: Plan): Record<string, RegionEdit> {
  const out: Record<string, RegionEdit> = {};
  for (const region of plan.regions) {
    out[region.id] = {
      fieldChoiceId: 'bass-field',
      density: region.density,
      dialogue: region.dialogue,
      pitchTransform: region.pitchTransform,
    };
  }
  return out;
}

export function BhlComposerPage() {
  const [sourcePath, setSourcePath] = useState('');
  const [spanFrom, setSpanFrom] = useState(33);
  const [spanTo, setSpanTo] = useState(40);
  const [seed, setSeed] = useState(3340);
  const [protectedText, setProtectedText] = useState('');
  const [exportDir, setExportDir] = useState('');
  const [status, setStatus] = useState('Ready. Wrong Turning is the regression example.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<Inspect | null>(null);
  const [edits, setEdits] = useState<Record<string, RegionEdit>>({});
  const [result, setResult] = useState<Compose | null>(null);
  const [stale, setStale] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  useEffect(() => {
    void api.bhlDefaults().then((raw) => {
      const row = raw as { ok?: boolean; sourcePath?: string; exportDir?: string; span?: Span; error?: string };
      if (!row.ok || !row.sourcePath) {
        setError(row.error || 'BHL defaults failed');
        return;
      }
      setSourcePath(row.sourcePath);
      setExportDir(row.exportDir || '');
      if (row.span) {
        setSpanFrom(row.span.from);
        setSpanTo(row.span.to);
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  function markDirty() {
    setStale(true);
  }

  function patchRegion(id: string, patch: Partial<RegionEdit>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
    markDirty();
  }

  async function chooseFile() {
    if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) return;
    const picked = (await window.composerOsDesktop.invokeApi('composer-os-api:pick-leadsheet-file', {
      defaultPath: sourcePath,
    })) as { ok?: boolean; filepath?: string };
    if (picked.ok && picked.filepath) {
      setSourcePath(picked.filepath);
      setLocked(null);
      setResult(null);
      setOutputPath('');
    }
  }

  async function onImport() {
    setBusy(true);
    setError('');
    setStatus('Importing and locking…');
    setResult(null);
    setOutputPath('');
    try {
      const raw = await api.bhlInspect({
        sourcePath,
        span: { from: spanFrom, to: spanTo },
        protectedGuitarBars: protectedText,
        seed,
      });
      const row = raw as Inspect | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setLocked(row);
      setEdits(editsFrom(row.plan));
      setSourcePath(row.sourcePath);
      setStale(false);
      setStatus(`Locked ${row.bassName} and ${row.guitarName}. Source file was not written.`);
    } catch (err) {
      setLocked(null);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Import failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onGenerate() {
    if (!locked) return;
    setBusy(true);
    setError('');
    setStatus('Generating guitar with the BHL composer…');
    setOutputPath('');
    try {
      const regions = locked.plan.regions.map((region) => ({
        id: region.id,
        ...(edits[region.id] ?? {}),
      }));
      const raw = await api.bhlCompose({
        sourcePath: locked.sourcePath,
        span: { from: spanFrom, to: spanTo },
        seed,
        protectedGuitarBars: protectedText,
        regions,
      });
      const row = raw as Compose | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setResult(row);
      setStale(false);
      setStatus(row.verification.ok ? 'Generated. Locks passed. Export writes a new file.' : 'Generated. Locks failed.');
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Generate failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!result) return;
    setBusy(true);
    setError('');
    setStatus('Exporting MusicXML…');
    try {
      const raw = await api.bhlExport({
        sourcePath: result.sourcePath,
        span: result.span,
        seed: result.seed,
        protectedGuitarBars: result.protectedGuitarBars,
        sourceSha256: result.sourceSha256,
        xml: result.xml,
      });
      const row = raw as { ok: true; outputPath: string; bytes: number } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setOutputPath(row.outputPath);
      const blob = new Blob([result.xml], { type: 'application/vnd.recordare.musicxml+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.outputPath.split(/[/\\]/).pop() || 'bhl.musicxml';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${row.bytes} bytes. Source file unchanged.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onOpen() {
    if (!outputPath) return;
    setError('');
    try {
      const raw = await api.bhlOpen({ outputPath });
      const row = raw as { ok: true; openedWith: string } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setStatus(`Asked ${row.openedWith} to open the export.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const protectedKey = protectedText
    .split(/[^0-9]+/)
    .filter(Boolean)
    .join(',');
  const lockInputsDiffer = Boolean(
    locked &&
      (locked.sourcePath !== sourcePath ||
        locked.span.from !== spanFrom ||
        locked.span.to !== spanTo ||
        locked.protectedGuitarBars.join(',') !== protectedKey),
  );
  const guitarMetres = locked?.metres.filter((metre) => metre.partId === locked.guitarPartId) ?? [];
  const warnings = result?.feasibility.filter((note) => !note.feasible) ?? [];
  const failedPredicates = result?.predicates.filter((item) => !item.ok) ?? [];

  return (
    <div data-testid="bhl-page" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 style={{ margin: 0 }}>BHL Composer</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)' }} data-testid="bhl-status">
        {status}
      </p>
      {error ? (
        <p data-testid="bhl-error" style={{ margin: 0, color: 'var(--error)' }}>
          {error}
        </p>
      ) : null}

      <section style={panel} data-testid="bhl-import">
        <h3 style={{ margin: 0 }}>Import and lock</h3>
        <label htmlFor="bhl-source">
          MusicXML path
          <input
            id="bhl-source"
            data-testid="bhl-source"
            value={sourcePath}
            onChange={(event) => {
              setSourcePath(event.target.value);
              setLocked(null);
              setResult(null);
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </label>
        {isDesktopIpc() ? (
          <button type="button" className="secondary" onClick={() => void chooseFile()}>
            Choose MusicXML
          </button>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="bhl-from">
            From bar
            <input
              id="bhl-from"
              data-testid="bhl-from"
              type="number"
              min={1}
              value={spanFrom}
              onChange={(event) => {
                setSpanFrom(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '5rem', marginLeft: '0.35rem' }}
            />
          </label>
          <label htmlFor="bhl-to">
            To bar
            <input
              id="bhl-to"
              data-testid="bhl-to"
              type="number"
              min={1}
              value={spanTo}
              onChange={(event) => {
                setSpanTo(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '5rem', marginLeft: '0.35rem' }}
            />
          </label>
          <label htmlFor="bhl-seed">
            Seed
            <input
              id="bhl-seed"
              data-testid="bhl-seed"
              type="number"
              value={seed}
              onChange={(event) => {
                setSeed(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '6rem', marginLeft: '0.35rem' }}
            />
          </label>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          The seed is stored with the plan. This planner repeats one guitar for the same locked passage and the same controls.
        </p>
        <label htmlFor="bhl-protected">
          Protected guitar bars
          <input
            id="bhl-protected"
            data-testid="bhl-protected"
            value={protectedText}
            placeholder="empty, or 33, 36"
            onChange={(event) => {
              setProtectedText(event.target.value);
              markDirty();
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </label>
        <button type="button" data-testid="bhl-import-lock" onClick={() => void onImport()} disabled={busy || !sourcePath}>
          Import and lock
        </button>
        {locked ? (
          <div data-testid="bhl-lock" style={{ display: 'grid', gap: '0.25rem' }}>
            <p style={{ margin: 0 }}>
              Guitar {locked.guitarName} ({locked.guitarPartId}). Bass {locked.bassName} ({locked.bassPartId}).
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-tempo">
              Tempo {locked.tempo?.perMinute ?? '—'} {locked.tempo?.beatUnit ?? ''}
              {locked.tempo?.statedAtBar ? `, stated at bar ${locked.tempo.statedAtBar}` : ''}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-metre">
              Metre{' '}
              {guitarMetres.map((metre) => `${metre.bar}:${metre.beats}/${metre.beatType}`).join(' · ')}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-rehearsal">
              Rehearsal {locked.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).join(', ') || 'none in this span'}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-sha">
              Source SHA-256 {locked.sourceSha256}
            </p>
            <p style={{ margin: 0 }}>Bass events in the span: {locked.bassEventCount}. Those events stay locked.</p>
          </div>
        ) : null}
      </section>

      {locked ? (
        <section style={panel} data-testid="bhl-configure">
          <h3 style={{ margin: 0 }}>Phrase and field</h3>
          {locked.plan.regions.map((region) => {
            const edit = edits[region.id];
            const choices = locked.fieldChoices[region.id] ?? [];
            if (!edit) return null;
            return (
              <div key={region.id} data-testid="bhl-region" style={{ display: 'grid', gap: '0.35rem' }}>
                <strong>
                  {region.role} · bars {region.bars.join(', ')} · rhythm {region.rhythmTransform}
                </strong>
                <label htmlFor={`bhl-field-${region.id}`}>
                  Harmonic field
                  <select
                    id={`bhl-field-${region.id}`}
                    data-testid="bhl-field"
                    value={edit.fieldChoiceId}
                    onChange={(event) => patchRegion(region.id, { fieldChoiceId: event.target.value })}
                    style={{ width: '100%', marginTop: '0.25rem' }}
                  >
                    {choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`bhl-pitch-${region.id}`}>
                  Motivic development
                  <select
                    id={`bhl-pitch-${region.id}`}
                    data-testid="bhl-pitch"
                    value={edit.pitchTransform}
                    onChange={(event) => patchRegion(region.id, { pitchTransform: event.target.value })}
                    style={{ width: '100%', marginTop: '0.25rem' }}
                  >
                    {PITCHES.map((pitch) => (
                      <option key={pitch} value={pitch}>
                        {pitch}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`bhl-density-${region.id}`}>
                  Rhythmic density
                  <select
                    id={`bhl-density-${region.id}`}
                    data-testid="bhl-density"
                    value={edit.density}
                    onChange={(event) => patchRegion(region.id, { density: event.target.value })}
                    style={{ marginLeft: '0.35rem' }}
                  >
                    <option value="dyad">dyad</option>
                    <option value="single">single</option>
                    <option value="alternate">alternate</option>
                  </select>
                </label>
                <label htmlFor={`bhl-dialogue-${region.id}`}>
                  Bass dialogue
                  <select
                    id={`bhl-dialogue-${region.id}`}
                    data-testid="bhl-dialogue"
                    value={edit.dialogue}
                    onChange={(event) => patchRegion(region.id, { dialogue: event.target.value })}
                    style={{ marginLeft: '0.35rem' }}
                  >
                    <option value="answer-after-bass">answer after bass</option>
                    <option value="leave-space">leave space</option>
                    {region.dialogue !== 'answer-after-bass' && region.dialogue !== 'leave-space' ? (
                      <option value={region.dialogue}>{region.dialogue} (from the bass)</option>
                    ) : null}
                  </select>
                </label>
              </div>
            );
          })}
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Leave space holds the last beat. Answer after bass is the other duration the rhythm planner changes. A derived
            counter-motion or handoff label stays available when the bass plan already chose it.
          </p>
          {lockInputsDiffer ? (
            <p data-testid="bhl-relock">Bar span, path, or protected bars changed. Import and lock again before generating.</p>
          ) : null}
          <button type="button" data-testid="bhl-generate" onClick={() => void onGenerate()} disabled={busy || lockInputsDiffer}>
            Generate guitar
          </button>
        </section>
      ) : null}

      {result ? (
        <section style={panel} data-testid="bhl-result">
          <h3 style={{ margin: 0 }}>Candidate</h3>
          {stale ? <p data-testid="bhl-stale">Controls changed. This candidate is stale.</p> : null}
          <p style={{ margin: 0 }} data-testid="bhl-guitar-changed">
            Guitar {result.guitarChanged ? 'differs from the source in the writable bars' : 'matches the source guitar'}.
            Source SHA {result.sourceUnchanged ? 'unchanged' : 'CHANGED'}.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {result.events.map((event) => (
              <li key={`${event.bar}-${event.onsetQuarters}-${event.regionId}`}>
                Bar {event.bar} at {event.onsetQuarters} for {event.quarters} · MIDI {event.midis.join(', ')} · {event.regionId}
              </li>
            ))}
          </ul>
          {result.harmony.length ? (
            <p style={{ margin: 0 }}>
              Harmony {result.harmony.map((item) => `${item.bar}:${item.label ?? ''} ${item.action ?? ''}`).join(' · ')}
            </p>
          ) : null}
          <h3 style={{ margin: '0.5rem 0 0' }}>Technical validation</h3>
          <p style={{ margin: 0 }} data-testid="bhl-locks">
            Locks {result.verification.ok ? 'passed' : 'failed'}. Reimport {result.verification.reimports ? 'passed' : 'failed'}.
            Outside the span {result.outsideIdentical ? 'matches the source' : 'differs'}.
          </p>
          {result.verification.errors.length ? (
            <ul data-testid="bhl-lock-errors">
              {result.verification.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p style={{ margin: 0 }} data-testid="bhl-predicates">
            Phrase and rhythm {failedPredicates.length ? `${failedPredicates.length} failed` : 'passed'}.
          </p>
          {failedPredicates.map((item) => (
            <p key={item.id} style={{ margin: 0 }}>
              {item.id}: {item.detail}
            </p>
          ))}
          <p style={{ margin: 0 }} data-testid="bhl-feasibility">
            Guitar feasibility {warnings.length ? `${warnings.length} warning(s)` : 'clear'}.
          </p>
          {warnings.map((note) => (
            <p key={`${note.bar}-${note.onsetQuarters}`} style={{ margin: 0 }}>
              Bar {note.bar} at {note.onsetQuarters} MIDI {note.midis.join(',')} fret span {note.fretSpan}
            </p>
          ))}
          <h3 style={{ margin: '0.5rem 0 0' }}>Musical review · {result.gce.framework}</h3>
          <div data-testid="bhl-gce">
            <p style={{ margin: 0 }}>{result.gce.technicalLabel}</p>
            <p style={{ margin: 0 }}>{result.gce.musicalLabel}</p>
            {result.gce.notes.map((note) => (
              <p key={note} style={{ margin: 0, color: 'var(--text-muted)' }}>
                {note}
              </p>
            ))}
          </div>
          <button type="button" data-testid="bhl-export" onClick={() => void onExport()} disabled={busy || !result.verification.ok}>
            Export MusicXML
          </button>
          {outputPath ? (
            <p style={{ margin: 0 }} data-testid="bhl-output">
              {outputPath}
            </p>
          ) : null}
          <button type="button" className="secondary" data-testid="bhl-open" onClick={() => void onOpen()} disabled={!outputPath || busy}>
            Open in Sibelius
          </button>
          {exportDir ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Exports go to {exportDir}. The source file stays where it is.
            </p>
          ) : null}
        </section>
      ) : null}

      <section style={panel} data-testid="bhl-later">
        <h3 style={{ margin: 0 }}>Later</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          These stay off this screen until the engine can do them: all six BHL harmonic worlds, artist and style profiles,
          riff and motif generators, several candidates side by side, session save and load, a piece from scratch, more
          instruments.
        </p>
      </section>
    </div>
  );
}
