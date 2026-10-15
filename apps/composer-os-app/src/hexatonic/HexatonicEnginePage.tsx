import React, { useMemo, useState } from 'react';
import {
  captureHexatonicProject,
  generateHexatonicPhrase,
  hexatonicEventIdentity,
  type HexatonicPhrase,
  type HexatonicProjectV1,
} from '@composer-os/core/hexatonic';
import type { MotifMapMethod } from '@composer-os/core/pentatonic/motifTransform';
import { api } from '../services/api';
import { exportHexatonicMusicXml } from './exportHexatonicMusicXml';
import {
  describeHexatonicPhrase,
  describeHexatonicSelection,
  hexatonicCentreName,
  listHexatonicWorkspacePairs,
  listHexatonicWorkspaceScalars,
} from './hexatonicWorkspaceModel';

const CENTRES = Array.from({ length: 12 }, (_, centre) => ({ centre, name: hexatonicCentreName(centre) }));

function downloadMusicXml(filename: string, xml: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HexatonicEnginePage() {
  const scalars = useMemo(() => listHexatonicWorkspaceScalars(), []);
  const pairs = useMemo(() => listHexatonicWorkspacePairs(), []);
  const [family, setFamily] = useState<'scalar' | 'wps-pair'>('scalar');
  const [scalarId, setScalarId] = useState('hex_major_omit_seventh');
  const [wpsId, setWpsId] = useState('maj9');
  const [centre, setCentre] = useState(0);
  const [seed, setSeed] = useState(1);
  const [method, setMethod] = useState<MotifMapMethod>('M-DEG');
  const [phrase, setPhrase] = useState<HexatonicPhrase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState('hexatonic-project');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  const selection = describeHexatonicSelection({ family, scalarId, wpsId, centre });
  const preview = phrase ? describeHexatonicPhrase(phrase) : null;

  const onGenerate = () => {
    setError(null);
    setExportStatus(null);
    try {
      const generated = generateHexatonicPhrase({
        seed,
        centre,
        method,
        ...(family === 'scalar' ? { scalarId } : { wpsId }),
      });
      setPhrase(generated);
    } catch (caught) {
      setPhrase(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const applyProject = (project: HexatonicProjectV1) => {
    setFamily(project.selection.family);
    setScalarId(project.selection.scalarId ?? scalarId);
    setWpsId(project.selection.wpsId ?? wpsId);
    setCentre(project.selection.centre);
    setSeed(project.selection.seed);
    setMethod(project.selection.method);
    setPhrase(project.phrase);
    setProjectId(project.id);
    setProjectNotes(project.notes);
    setProjectStatus(`Restored ${project.id}`);
  };

  const onSaveProject = () => {
    if (!phrase) return;
    const captured = captureHexatonicProject({
      id: projectId,
      notes: projectNotes,
      family,
      scalarId,
      wpsId,
      centre,
      seed,
      method,
      phrase,
    });
    if (!captured.ok || !captured.project) {
      setError(captured.errors.join('; ') || 'Could not save this project.');
      return;
    }
    setBusy(true);
    setError(null);
    void api
      .hexatonicSaveProject({
        project: captured.project,
        path: projectPath || undefined,
        overwrite,
      })
      .then((raw) => {
        const row = raw as { ok: true; path: string } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        setProjectPath(row.path);
        setProjectStatus(`Saved ${row.path}`);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onOpenProject = () => {
    if (!projectPath.trim()) return;
    setBusy(true);
    setError(null);
    void api
      .hexatonicOpenProject({ path: projectPath })
      .then((raw) => {
        const row = raw as { ok: true; path: string; project: HexatonicProjectV1 } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        applyProject(row.project);
        setProjectPath(row.path);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onExport = () => {
    if (!phrase) return;
    setBusy(true);
    setError(null);
    const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
    Promise.resolve()
      .then(() =>
        exportHexatonicMusicXml({
          xml: phrase.musicXml,
          label: phrase.homeId,
          fileName: `hexatonic-${phrase.homeId}`,
          invokeApi: bridge?.invokeApi ?? null,
          download: downloadMusicXml,
        })
      )
      .then((saved) => {
        if (saved.mode === 'desktop') {
          setExportPath(saved.fullPath);
          setExportStatus(saved.fullPath);
        } else {
          setExportPath(null);
          setExportStatus(`Browser download: ${saved.filename}`);
        }
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onOpenScore = (channel: 'composer-os-api:hexatonic-open-musescore' | 'composer-os-api:hexatonic-reveal') => {
    if (!exportPath) return;
    const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
    if (!bridge?.invokeApi) {
      setError('Open MusicXML runs in the Composer OS desktop app.');
      return;
    }
    void bridge
      .invokeApi(channel, { path: exportPath })
      .then((raw) => {
        const opened = raw as { ok?: boolean; error?: string };
        if (!opened.ok) throw new Error(opened.error || 'Could not open the MusicXML.');
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  };

  return (
    <section aria-labelledby="hexatonic-heading" data-testid="hexatonic-workspace" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 id="hexatonic-heading" style={{ marginBottom: 0 }}>
        Hexatonic Engine
      </h2>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>
        Six-note collections and WPS resolution/tension pairs. Generated notes are a phrase preview. They are not an artistic approval.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'end' }}>
        <label htmlFor="hexatonic-family">
          Family
          <select
            id="hexatonic-family"
            data-testid="hexatonic-family"
            value={family}
            onChange={(event) => setFamily(event.target.value as 'scalar' | 'wps-pair')}
          >
            <option value="scalar">Scalar collection</option>
            <option value="wps-pair">WPS triad pair</option>
          </select>
        </label>
        <label htmlFor="hexatonic-scalar">
          Scalar collection
          <select
            id="hexatonic-scalar"
            data-testid="hexatonic-scalar"
            value={scalarId}
            disabled={family !== 'scalar'}
            onChange={(event) => setScalarId(event.target.value)}
          >
            {scalars.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="hexatonic-wps">
          WPS pair
          <select
            id="hexatonic-wps"
            data-testid="hexatonic-wps"
            value={wpsId}
            disabled={family !== 'wps-pair'}
            onChange={(event) => setWpsId(event.target.value)}
          >
            {pairs.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="hexatonic-centre">
          Tonal centre
          <select
            id="hexatonic-centre"
            data-testid="hexatonic-centre"
            value={centre}
            onChange={(event) => setCentre(Number(event.target.value))}
          >
            {CENTRES.map((row) => (
              <option key={row.centre} value={row.centre}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="hexatonic-seed">
          Seed
          <input
            id="hexatonic-seed"
            data-testid="hexatonic-seed"
            type="number"
            step={1}
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
          />
        </label>
        <label htmlFor="hexatonic-method">
          Transformation
          <select
            id="hexatonic-method"
            data-testid="hexatonic-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as MotifMapMethod)}
          >
            <option value="M-DEG">M-DEG</option>
            <option value="M-NEAR">M-NEAR</option>
          </select>
        </label>
        <button type="button" data-testid="hexatonic-generate" onClick={onGenerate}>
          Generate INSIDE / OUTSIDE / RETURN
        </button>
        <button type="button" data-testid="hexatonic-export" onClick={onExport} disabled={!phrase || busy}>
          Export MusicXML
        </button>
        <button type="button" data-testid="hexatonic-open-musescore" onClick={() => onOpenScore('composer-os-api:hexatonic-open-musescore')} disabled={!exportPath}>
          Open in MuseScore 4
        </button>
      </div>
      <section data-testid="hexatonic-selection" style={{ display: 'grid', gap: '0.25rem' }}>
        <h3 style={{ margin: 0 }}>Selection</h3>
        <p data-testid="hexatonic-collection-name" style={{ margin: 0 }}>
          {selection.name} · {selection.id}
        </p>
        <p data-testid="hexatonic-pitches" style={{ margin: 0 }}>
          Pitches: {selection.pitches}
        </p>
        <p data-testid="hexatonic-triads" style={{ margin: 0 }}>
          Triads: {selection.triads}
        </p>
        <p data-testid="hexatonic-source" style={{ margin: 0 }}>
          Source: {selection.source}
        </p>
        <p data-testid="hexatonic-outside-target" style={{ margin: 0 }}>
          Outside target: {selection.outside}
        </p>
      </section>
      {error && (
        <p data-testid="hexatonic-error" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}
      {preview && phrase && (
        <>
          <section data-testid="hexatonic-musical-output" style={{ display: 'grid', gap: '0.25rem' }}>
            <h3 style={{ margin: 0 }}>Phrase preview</h3>
            <p style={{ margin: 0 }}>
              Generated music. Not artistically approved. Human playability is not verified.
            </p>
            <p data-testid="hexatonic-sequence" style={{ margin: 0 }}>
              Sequence: {preview.sequence}
            </p>
            <p data-testid="hexatonic-event-identity" style={{ margin: 0 }}>
              Events: {hexatonicEventIdentity(phrase)}
            </p>
            <p data-testid="hexatonic-stored-note" style={{ margin: 0 }}>
              Stored diagnostic note: {phrase.bmef.note}
            </p>
            <p data-testid="hexatonic-provenance" style={{ margin: 0 }}>
              Provenance: {preview.provenance}
            </p>
            <p data-testid="hexatonic-transforms" style={{ margin: 0 }}>
              Motif transformations: {preview.transformations}
            </p>
            <div data-testid="hexatonic-guitar">
              {preview.guitar.map((row) => (
                <p key={row} style={{ margin: 0 }}>
                  Guitar {row}
                </p>
              ))}
            </div>
            <div data-testid="hexatonic-bass">
              {preview.bass.map((row) => (
                <p key={row} style={{ margin: 0 }}>
                  Bass {row}
                </p>
              ))}
            </div>
          </section>
          <section data-testid="hexatonic-technical-validation" style={{ display: 'grid', gap: '0.25rem' }}>
            <h3 style={{ margin: 0 }}>Technical diagnostics</h3>
            <p style={{ margin: 0 }}>These numbers describe the phrase. They do not approve it.</p>
            {preview.diagnostics.map((row) => (
              <p key={row} style={{ margin: 0 }}>
                {row}
              </p>
            ))}
          </section>
        </>
      )}
      {exportStatus && (
        <p data-testid="hexatonic-export-status" style={{ margin: 0 }}>
          {exportStatus}
        </p>
      )}
      <section data-testid="hexatonic-project" style={{ display: 'grid', gap: '0.35rem' }}>
        <h3 style={{ margin: 0 }}>Project</h3>
        <p style={{ margin: 0 }}>Save keeps this phrase. Open restores it. Open does not generate a new phrase.</p>
        <label htmlFor="hexatonic-project-id">
          Project id
          <input id="hexatonic-project-id" data-testid="hexatonic-project-id" value={projectId} onChange={(event) => setProjectId(event.target.value)} />
        </label>
        <label htmlFor="hexatonic-project-notes">
          Notes
          <textarea id="hexatonic-project-notes" data-testid="hexatonic-project-notes" value={projectNotes} rows={2} onChange={(event) => setProjectNotes(event.target.value)} />
        </label>
        <label htmlFor="hexatonic-project-path">
          Project path
          <input id="hexatonic-project-path" data-testid="hexatonic-project-path" value={projectPath} onChange={(event) => setProjectPath(event.target.value)} />
        </label>
        <label htmlFor="hexatonic-overwrite">
          <input id="hexatonic-overwrite" data-testid="hexatonic-overwrite" type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
          Replace an existing project file
        </label>
        <button type="button" data-testid="hexatonic-save-project" onClick={onSaveProject} disabled={!phrase || busy}>
          Save project
        </button>
        <button type="button" data-testid="hexatonic-open-project" onClick={onOpenProject} disabled={!projectPath.trim() || busy}>
          Open project
        </button>
        {projectStatus && (
          <p data-testid="hexatonic-project-status" style={{ margin: 0 }}>
            {projectStatus}
          </p>
        )}
      </section>
    </section>
  );
}
