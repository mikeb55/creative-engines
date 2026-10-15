import { useState } from 'react';
import {
  analyzePentatonicScore,
  type PentatonicScoreAnalysis,
} from '@composer-os/core/pentatonic';

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function PentatonicScorePanel(props: {
  analyzeFn?: typeof analyzePentatonicScore;
}) {
  const analyzeFn = props.analyzeFn ?? analyzePentatonicScore;
  const [profile, setProfile] = useState<'wwh-duo-1.1' | 'default'>('wwh-duo-1.1');
  const [fileName, setFileName] = useState('');
  const [xml, setXml] = useState('');
  const [analysis, setAnalysis] = useState<PentatonicScoreAnalysis | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentSnapshot = `${fileName}\n${profile}\n${xml.length}`;
  const stale = Boolean(analysis && snapshot !== currentSnapshot);

  const onFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    Promise.resolve(file.text())
      .then((text) => {
        setFileName(file.name);
        setXml(text);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      });
  };

  const onAnalyse = () => {
    if (!xml) {
      setError('Load a MusicXML score first.');
      return;
    }
    setLoading(true);
    setError(null);
    const requested = currentSnapshot;
    Promise.resolve()
      .then(async () => {
        let hash = '';
        try {
          hash = await sha256Hex(xml);
        } catch {
          hash = '';
        }
        return analyzeFn(xml, { profile, sourceFile: fileName, sourceSha256: hash });
      })
      .then((result) => {
        setAnalysis(result);
        setSnapshot(requested);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => setLoading(false));
  };

  return (
    <div data-testid="pentatonic-score" style={{ display: 'grid', gap: '0.75rem' }}>
      <p style={{ margin: 0 }}>
        Whole score. Reads MusicXML in written order and asks the existing path engine for a small number of regions. A new chord is not a new pentatonic.
      </p>
      <label htmlFor="pentatonic-score-file">
        MusicXML
        <input
          id="pentatonic-score-file"
          type="file"
          accept=".musicxml,.xml,application/xml,text/xml"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {fileName ? <p data-testid="pentatonic-score-file-name">File: {fileName}</p> : null}
      <label htmlFor="pentatonic-score-profile">
        Evidence profile
        <select
          id="pentatonic-score-profile"
          value={profile}
          onChange={(event) => setProfile(event.target.value === 'default' ? 'default' : 'wwh-duo-1.1')}
        >
          <option value="wwh-duo-1.1">wwh-duo-1.1</option>
          <option value="default">Dev 1 defaults</option>
        </select>
      </label>
      <button type="button" data-testid="pentatonic-analyse-score" onClick={onAnalyse} disabled={loading || !xml}>
        {loading ? 'Analysing…' : 'Analyse Score'}
      </button>
      {error ? (
        <p role="alert" data-testid="pentatonic-score-error">
          {error}
        </p>
      ) : null}
      {stale ? <p data-testid="pentatonic-score-stale">Score inputs changed. This map is stale.</p> : null}
      {analysis ? <ScoreMap analysis={analysis} /> : null}
    </div>
  );
}

function ScoreMap(props: { analysis: PentatonicScoreAnalysis }) {
  const analysis = props.analysis;
  const summary = analysis.summary;
  return (
    <div data-testid="pentatonic-score-map" style={{ display: 'grid', gap: '0.75rem' }}>
      <h3 style={{ marginBottom: 0 }}>{analysis.song || 'Score'}</h3>
      <p style={{ margin: 0 }}>
        {analysis.sourceFile} · {analysis.profile} · {analysis.orderPolicy}
      </p>
      <p style={{ margin: 0 }} data-testid="pentatonic-path-config">
        {analysis.path.configVersion}
      </p>
      <p style={{ margin: 0 }} data-testid="pentatonic-home">
        {analysis.homeReading}
      </p>
      <p style={{ margin: 0 }} data-testid="pentatonic-fields">
        Fields {analysis.fields.length}. Raw switches {summary.collectionChanges}.
      </p>
      {analysis.fields.map((field) => (
        <p key={field.measureRangeLabel} style={{ margin: 0 }} data-testid="pentatonic-field">
          {field.measureRangeLabel} — {field.name}. Inflections {field.inflectionLabels.join(', ')}.
        </p>
      ))}
      {analysis.homeCandidates.length > 0 ? (
        <div data-testid="pentatonic-home-candidates">
          {analysis.homeCandidates.map((candidate) => (
            <p key={`${candidate.source}-${candidate.centre}-${candidate.mode}`} style={{ margin: 0 }}>
              {candidate.source} {candidate.centre} {candidate.mode} membership {candidate.membership}
            </p>
          ))}
        </div>
      ) : null}
      {analysis.homeEvidence.map((line, index) => (
        <p key={`${index}:${line}`} style={{ margin: 0 }}>
          {line}
        </p>
      ))}
      <p style={{ margin: 0 }}>
        Parts:{' '}
        {analysis.score.parts.map((part) => `${part.name} (${part.role})`).join(', ') || 'none identified'}
      </p>
      <p style={{ margin: 0 }}>
        Measures: {analysis.score.events.length}. Pitch: {analysis.score.pitchPolicy}. Order: {analysis.orderPolicy}.
      </p>
      <p style={{ margin: 0 }}>
        Structure:{' '}
        {analysis.score.events
          .filter((event) => event.sectionMarks.length > 0)
          .map((event) => `${event.sourceLabel} ${event.sectionMarks.join(' / ')}`)
          .join(' · ') || 'none'}
      </p>
      <p style={{ margin: 0 }}>
        Regions {summary.totalRegions}. Pentatonic {summary.pentatonicRegions}. NONE {summary.noneRegions}. Changes{' '}
        {summary.collectionChanges}. Distinct collections {summary.distinctCollections}. NONE events {summary.noneEventCount} of{' '}
        {summary.eventCount}.
      </p>
      <div data-testid="pentatonic-region-strip" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {analysis.regions.map((region) => (
          <span
            key={`${region.firstSourceLabel}-${region.lastSourceLabel}-${region.collectionName}`}
            style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.25rem 0.45rem' }}
          >
            {region.measureRangeLabel} {region.collectionName}
            {region.homeRelationshipLabel ? ` ${region.homeRelationshipLabel}` : ''}
          </span>
        ))}
      </div>
      {analysis.regions.map((region) => (
        <article key={`${region.firstSourceLabel}-${region.collectionName}-${region.boundaryKind}`} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
          <h4 style={{ margin: '0 0 0.25rem' }}>
            {region.measureRangeLabel} — {region.collectionName}
            {region.homeRelationshipLabel ? ` — ${region.homeRelationshipLabel}` : ''}
          </h4>
          <p style={{ margin: '0.2rem 0' }}>{region.notes.join(' ') || 'No pitch classes'}</p>
          <p style={{ margin: '0.2rem 0' }}>Mean local fit {region.meanLocalFit ?? 'none'}.</p>
          {region.geometricRelation ? <p style={{ margin: '0.2rem 0' }}>{region.geometricRelation}</p> : null}
          <p style={{ margin: '0.2rem 0' }}>{region.boundaryReason}</p>
          <p style={{ margin: '0.2rem 0' }}>{region.explanation}</p>
          <details>
            <summary>Evidence</summary>
            <p>Common tones: {region.commonTones.join(' ') || 'none'}.</p>
            <p>
              Retained {region.retainedPitchClasses.join(' ') || 'none'}. Removed {region.removedPitchClasses.join(' ') || 'none'}.
              Introduced {region.introducedPitchClasses.join(' ') || 'none'}.
            </p>
            {region.pitchClassDisplacement.length > 0 ? (
              <p>
                Pitch-class displacement:{' '}
                {region.pitchClassDisplacement.map((item) => `${item.from} to ${item.to} (${item.semitones})`).join(', ')}. Not voice-leading.
              </p>
            ) : null}
          </details>
        </article>
      ))}
      <div data-testid="pentatonic-friction">
        <h4 style={{ marginBottom: '0.25rem' }}>Chromatic friction</h4>
        <p style={{ margin: 0 }}>Scored colour/tension cost. Same measure as the evaluator. Not an avoid-note rule.</p>
        {analysis.friction.length === 0 ? <p style={{ margin: 0 }}>None.</p> : null}
        {analysis.friction.map((region) => (
          <p key={`${region.measureRangeLabel}-${region.collectionName}`} style={{ margin: '0.2rem 0' }}>
            {region.measureRangeLabel} {region.collectionName}: {region.totalDurationBeats} beats.{' '}
            {region.hits
              .slice(0, 8)
              .map((hit) => `m.${hit.sourceLabel} ${hit.role} ${hit.spelling} near ${hit.nearest.join('/')}`)
              .join('; ')}
          </p>
        ))}
      </div>
      <details>
        <summary>Diagnostics</summary>
        <ul>
          {analysis.diagnostics.map((line, index) => (
            <li key={`diagnostic-${index}`}>{line}</li>
          ))}
          {analysis.warnings.map((line, index) => (
            <li key={`warning-${index}`}>Warning: {line}</li>
          ))}
          {analysis.inferredBoundaries.map((item) => (
            <li key={`${item.sourceLabel}-${item.reason}`}>
              m. {item.sourceLabel}: {item.reason}
            </li>
          ))}
          {analysis.noneObservations.map((item) => (
            <li key={`${item.sourceLabel}-${item.flag}`}>
              m. {item.sourceLabel}: {item.flag}. {item.note}
            </li>
          ))}
        </ul>
        <p>
          Parse {analysis.timingsMs.parse.toFixed(1)} ms. Extract {analysis.timingsMs.extract.toFixed(1)} ms. Path{' '}
          {analysis.timingsMs.path.toFixed(1)} ms. Total {analysis.timingsMs.total.toFixed(1)} ms.
        </p>
        {analysis.sourceSha256 ? <p>SHA-256 {analysis.sourceSha256}</p> : null}
      </details>
    </div>
  );
}
