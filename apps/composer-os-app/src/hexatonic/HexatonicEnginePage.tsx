import React, { useMemo, useState } from 'react';
import { generateHexatonicPhrase, type HexatonicPhrase } from '@composer-os/core/hexatonic';
import type { MotifMapMethod } from '@composer-os/core/pentatonic/motifTransform';
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
  const [busy, setBusy] = useState(false);

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
        setExportStatus(saved.mode === 'desktop' ? saved.fullPath : `Browser download: ${saved.filename}`);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
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
    </section>
  );
}
