import type { CSSProperties } from 'react';
import type { VariationEcho } from '@composer-os/app-api/appApiTypes';

const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.35rem 0.75rem',
  marginTop: '0.35rem',
  padding: '0.35rem 0.5rem',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: '0.85rem',
};

export interface MosaicVariationResultsProps {
  variationEcho: VariationEcho;
  selectedVariationIndex: number | null;
  generateBusy?: boolean;
  onUseVariation: (variationIndex: number) => void;
}

export function MosaicVariationResults({
  variationEcho,
  selectedVariationIndex,
  generateBusy = false,
  onUseVariation,
}: MosaicVariationResultsProps) {
  const activeIndex = selectedVariationIndex ?? variationEcho.autoSelected;

  return (
    <div data-testid="mosaic-variation-results" style={{ marginTop: '0.5rem' }}>
      <p
        data-testid="mosaic-variation-baseline"
        style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}
      >
        Original — score {variationEcho.baselineScore.toFixed(2)}
      </p>

      {variationEcho.candidates.map((c) => {
        const isAuto = c.variationIndex === variationEcho.autoSelected;
        const isSelected = c.variationIndex === activeIndex;
        return (
          <div
            key={c.variationIndex}
            data-testid={`mosaic-variation-candidate-${c.variationIndex}`}
            style={{
              ...rowStyle,
              borderColor: isSelected ? 'var(--accent, #5b8def)' : 'var(--border)',
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            <span>
              {isAuto ? '★ ' : ''}
              Variation #{c.variationIndex} — {c.mode} — score {c.evalScore.toFixed(2)}
              {isSelected ? ' (selected)' : ''}
            </span>
            <button
              type="button"
              className="secondary"
              data-testid={`mosaic-variation-use-${c.variationIndex}`}
              disabled={generateBusy}
              onClick={() => onUseVariation(c.variationIndex)}
            >
              Use this
            </button>
          </div>
        );
      })}
    </div>
  );
}
