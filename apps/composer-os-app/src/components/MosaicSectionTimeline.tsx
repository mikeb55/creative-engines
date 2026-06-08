/**
 * Read-only colour timeline for Mosaic section planner.
 */

import type { MosaicTimelineBlock } from './mosaicSectionPlannerUtils';

export function MosaicSectionTimeline(props: {
  blocks: MosaicTimelineBlock[];
  totalBars: number;
  highlightedIndex: number | null;
  onBlockClick: (sectionIndex: number) => void;
}) {
  const { blocks, totalBars, highlightedIndex, onBlockClick } = props;

  if (blocks.length === 0) return null;

  return (
    <div
      aria-label="Section timeline"
      data-testid="mosaic-section-timeline"
      style={{
        display: 'flex',
        width: '100%',
        minHeight: 52,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.3))',
        marginBottom: '0.65rem',
      }}
    >
      {blocks.map((block) => {
        const isHighlighted = highlightedIndex === block.sectionIndex;
        const label = `${block.sectionLabel}  ${block.startBar}–${block.endBar}`;
        return (
          <button
            key={`timeline-block-${block.sectionIndex}-${block.startBar}`}
            type="button"
            title={label}
            data-testid={`mosaic-timeline-block-${block.sectionIndex}`}
            data-preset-role={block.presetRole}
            data-width-percent={block.widthPercent.toFixed(2)}
            onClick={() => onBlockClick(block.sectionIndex)}
            style={{
              flex: `0 0 ${block.widthPercent}%`,
              minWidth: block.widthPercent < 8 ? '2.5rem' : undefined,
              border: 'none',
              borderRight: '1px solid rgba(0,0,0,0.12)',
              background: block.color,
              color: '#fff',
              cursor: 'pointer',
              padding: '0.35rem 0.4rem',
              textAlign: 'left',
              position: 'relative',
              outline: isHighlighted ? '2px solid var(--text, #111)' : 'none',
              outlineOffset: -2,
              boxShadow: isHighlighted ? 'inset 0 0 0 1px rgba(255,255,255,0.35)' : 'none',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {block.sectionLabel}
            </span>
            <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.92, marginTop: 2 }}>
              {block.startBar}–{block.endBar}
            </span>
            <span
              aria-label={`${block.partCount} parts`}
              data-testid={`mosaic-timeline-parts-${block.sectionIndex}`}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                fontSize: '0.6rem',
                fontWeight: 700,
                background: 'rgba(0,0,0,0.28)',
                borderRadius: 999,
                padding: '1px 5px',
                lineHeight: 1.3,
              }}
            >
              {block.partCount}
            </span>
          </button>
        );
      })}
      {totalBars > 0 ? (
        <span className="visually-hidden" data-testid="mosaic-timeline-total-bars">
          {totalBars}
        </span>
      ) : null}
    </div>
  );
}
