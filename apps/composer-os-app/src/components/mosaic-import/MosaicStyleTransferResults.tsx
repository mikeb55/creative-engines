import type { CSSProperties } from 'react';
import type { StyleTransferEcho } from '@composer-os/app-api/appApiTypes';

function formatChordMelodyRungBreakdown(summary: {
  noteCount: number;
  sixthCount: number;
  dim7Count: number;
  borrowedCount: number;
}): string {
  const { noteCount, sixthCount, dim7Count, borrowedCount } = summary;
  if (noteCount <= 0) return '0 events';
  const pct = (n: number) => ((n / noteCount) * 100).toFixed(0);
  return `${noteCount} events: ${sixthCount} sixth (${pct(sixthCount)}%), ${dim7Count} dim7 (${pct(dim7Count)}%), ${borrowedCount} borrowed (${pct(borrowedCount)}%)`;
}

function formatGuitarFeasibilityLine(summary: {
  guitarFeasiblePct?: number;
  maxGuitarFretSpan?: number;
}): string | null {
  if (typeof summary.guitarFeasiblePct !== 'number') return null;
  const pct = (summary.guitarFeasiblePct * 100).toFixed(0);
  const span =
    typeof summary.maxGuitarFretSpan === 'number' && summary.maxGuitarFretSpan > 0
      ? summary.maxGuitarFretSpan
      : null;
  return span != null
    ? `${pct}% playable (max span ${span} frets)`
    : `${pct}% playable`;
}

const rowStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};

const melodyYesStyle: CSSProperties = { color: '#166534', fontWeight: 600 };
const melodyNoStyle: CSSProperties = { color: '#a16207', fontWeight: 600 };

const scaleTagWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem 0.5rem',
  marginTop: '0.35rem',
};

const scaleTagStyle: CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.45rem',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: '0.78rem',
  color: 'var(--text)',
  lineHeight: 1.35,
};

export interface MosaicStyleTransferResultsProps {
  styleTransferEcho: StyleTransferEcho;
  composerLabel?: string;
}

export function MosaicStyleTransferResults({
  styleTransferEcho,
  composerLabel,
}: MosaicStyleTransferResultsProps) {
  const st = styleTransferEcho;
  const composerDisplay = composerLabel?.trim() || st.composerApplied;
  const cm = st.chordMelody;
  const guitarLine = cm ? formatGuitarFeasibilityLine(cm) : null;
  const scaleSections = cm?.scaleOfChordsBySection
    ? Object.entries(cm.scaleOfChordsBySection)
    : [];

  return (
    <div data-testid="mosaic-style-transfer-results" style={{ marginTop: '0.5rem' }}>
      <p style={rowStyle} data-testid="mosaic-style-transfer-composer-applied">
        Style-transfer: {composerDisplay}
      </p>
      <p style={rowStyle} data-testid="mosaic-style-transfer-strength-applied">
        Strength applied: {st.strengthApplied.toFixed(2)}
      </p>
      <p style={rowStyle} data-testid="mosaic-style-transfer-melody-retained">
        Melody retained:{' '}
        <span
          data-testid="mosaic-style-transfer-melody-indicator"
          style={st.melodyRetained ? melodyYesStyle : melodyNoStyle}
        >
          {st.melodyRetained ? 'yes' : 'no'}
        </span>
      </p>
      <p style={rowStyle} data-testid="mosaic-style-transfer-harmony-delta">
        Reharmonised bars: {st.harmonyDeltaBars.length}
      </p>
      <p style={rowStyle} data-testid="mosaic-style-transfer-eval-score">
        Eval score: {st.evalScore.toFixed(2)}
      </p>
      {cm ? (
        <div data-testid="mosaic-style-transfer-chord-melody" style={{ marginTop: '0.35rem' }}>
          <p style={rowStyle} data-testid="mosaic-style-transfer-chord-melody-rungs">
            Rung breakdown: {formatChordMelodyRungBreakdown(cm)}
          </p>
          {typeof cm.avgVoiceLeadingStep === 'number' ? (
            <p style={rowStyle} data-testid="mosaic-style-transfer-chord-melody-vl">
              Avg voice-leading step: {cm.avgVoiceLeadingStep.toFixed(1)} semitones
            </p>
          ) : null}
          {guitarLine ? (
            <p style={rowStyle} data-testid="mosaic-style-transfer-chord-melody-guitar">
              Guitar feasibility: {guitarLine}
            </p>
          ) : null}
          {scaleSections.length > 0 ? (
            <div data-testid="mosaic-style-transfer-scale-of-chords">
              <p style={{ ...rowStyle, marginBottom: '0.15rem' }}>Scale of chords</p>
              <div style={scaleTagWrapStyle}>
                {scaleSections.map(([sectionLabel, pairsLine]) => (
                  <span
                    key={sectionLabel}
                    style={scaleTagStyle}
                    title={sectionLabel}
                    data-testid={`mosaic-style-transfer-scale-${sectionLabel}`}
                  >
                    {sectionLabel !== 'import' && sectionLabel !== 'A' ? (
                      <strong style={{ marginRight: '0.35rem' }}>{sectionLabel}:</strong>
                    ) : null}
                    {pairsLine}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
