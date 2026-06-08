import type { CSSProperties } from 'react';
import type { StyleTransferEcho } from '@composer-os/app-api/appApiTypes';

const rowStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};

const melodyYesStyle: CSSProperties = { color: '#166534', fontWeight: 600 };
const melodyNoStyle: CSSProperties = { color: '#a16207', fontWeight: 600 };

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
    </div>
  );
}
