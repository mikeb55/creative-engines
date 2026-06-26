/**
 * Mosaic Mode - 8-bar block arranger (Generate UI, duo preset only).
 * UI shell only; no generate payload wiring in Step 3.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { DUO_COMPOSER_REGISTRY } from '@composer-os/core/mosaic-mode/mosaicComposerDispatch';
import {
  BARS_PER_MOSAIC_BLOCK,
  parseBlockChords,
  reindexMosaicSectionPlan,
} from '@composer-os/core/mosaic-mode/stitchMosaicBlocks';

export type BlockCardState = {
  chords: string;
  composerId: string;
};

const MAX_MOSAIC_BLOCKS = 8;

const FEATURED_COMPOSER_IDS = ['verlaine', 'marr', 'fripp'] as const;

const DUO_COMPOSER_IDS = DUO_COMPOSER_REGISTRY.map((entry) => entry.composerId);

const FEATURED_IN_REGISTRY = FEATURED_COMPOSER_IDS.filter((id) => DUO_COMPOSER_IDS.includes(id));

function formatComposerLabel(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function defaultBlockComposer(index: number): string {
  const featured = FEATURED_IN_REGISTRY[index % FEATURED_IN_REGISTRY.length];
  if (featured) return featured;
  return DUO_COMPOSER_IDS[0] ?? '';
}

function createDefaultBlock(index: number): BlockCardState {
  return { chords: '', composerId: defaultBlockComposer(index) };
}

function computePanelWarnings(cards: BlockCardState[]): string[] {
  const warnings: string[] = [];
  if (cards.some((c) => !c.composerId.trim())) {
    warnings.push('Each section needs a composer voice.');
  }
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    const trimmed = card.chords.trim();
    if (!trimmed) {
      warnings.push(`Section ${String.fromCharCode(65 + i)}: enter ${BARS_PER_MOSAIC_BLOCK} chords.`);
      continue;
    }
    const count = parseBlockChords(trimmed).length;
    if (count !== BARS_PER_MOSAIC_BLOCK) {
      warnings.push(
        `Section ${String.fromCharCode(65 + i)}: needs exactly ${BARS_PER_MOSAIC_BLOCK} chords (found ${count}).`,
      );
    }
  }
  return warnings;
}

const panelStyle: CSSProperties = {
  marginBottom: '1rem',
  border: '1px solid var(--border, #333)',
  borderRadius: 6,
  padding: '0.75rem 1rem',
  background: 'var(--panel-bg, rgba(255,255,255,0.02))',
};

const cardStyle: CSSProperties = {
  border: '1px solid var(--border, #444)',
  borderRadius: 6,
  padding: '0.75rem',
  marginBottom: '0.75rem',
  background: 'var(--surface, rgba(0,0,0,0.15))',
};

const chipStyle = (selected: boolean): CSSProperties => ({
  padding: '0.25rem 0.55rem',
  fontSize: '0.78rem',
  borderRadius: 999,
  border: selected ? '1px solid var(--accent, #6cf)' : '1px solid var(--border, #555)',
  background: selected ? 'rgba(100, 180, 255, 0.15)' : 'transparent',
  cursor: 'pointer',
});

const iconBtnStyle: CSSProperties = {
  padding: '0.2rem 0.45rem',
  fontSize: '0.85rem',
  lineHeight: 1,
};

export function MosaicBlocksPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockCards: BlockCardState[];
  onBlockCardsChange: (cards: BlockCardState[]) => void;
  disabled?: boolean;
}) {
  const { open, onOpenChange, blockCards, onBlockCardsChange, disabled } = props;

  const sectionPlan = useMemo(
    () =>
      reindexMosaicSectionPlan(
        blockCards.map((b) => ({ songwriterStyleId: b.composerId || 'default' })),
      ),
    [blockCards],
  );

  const warnings = useMemo(() => computePanelWarnings(blockCards), [blockCards]);
  const totalBars = blockCards.length * BARS_PER_MOSAIC_BLOCK;

  const moreComposerIds = DUO_COMPOSER_IDS.filter(
    (id) => !(FEATURED_IN_REGISTRY as readonly string[]).includes(id),
  );

  function updateCard(index: number, patch: Partial<BlockCardState>) {
    onBlockCardsChange(blockCards.map((card, i) => (i === index ? { ...card, ...patch } : card)));
  }

  function duplicateBlock(index: number) {
    if (blockCards.length >= MAX_MOSAIC_BLOCKS) return;
    const source = blockCards[index];
    if (!source) return;
    const next = [...blockCards];
    next.splice(index + 1, 0, { chords: source.chords, composerId: source.composerId });
    onBlockCardsChange(next);
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= blockCards.length) return;
    const next = [...blockCards];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    onBlockCardsChange(next);
  }

  function deleteBlock(index: number) {
    if (blockCards.length <= 2) return;
    onBlockCardsChange(blockCards.filter((_, i) => i !== index));
  }

  function addBlockSection() {
    if (blockCards.length >= MAX_MOSAIC_BLOCKS) return;
    onBlockCardsChange([...blockCards, createDefaultBlock(blockCards.length)]);
  }

  return (
    <div className="panel mosaic-blocks-panel" style={panelStyle} data-testid="mosaic-blocks-panel">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="mosaic-blocks-panel-body"
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          fontWeight: 600,
          fontSize: '0.95rem',
          cursor: disabled ? 'default' : 'pointer',
          textAlign: 'left',
        }}
      >
        <span aria-hidden>{open ? '\u25BE' : '\u25B8'}</span>
        Arrange in blocks
      </button>

      {open ? (
        <div id="mosaic-blocks-panel-body" style={{ marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
            8-bar sections - one composer voice each.{' '}
            <span data-testid="mosaic-blocks-length-hint">
              {totalBars} bars · {blockCards.length} sections
            </span>
          </p>

          {warnings.length > 0 ? (
            <div
              role="status"
              data-testid="mosaic-blocks-warnings"
              style={{
                fontSize: '0.78rem',
                color: 'var(--warning, #c90)',
                marginBottom: '0.75rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 4,
                border: '1px solid rgba(200, 150, 0, 0.35)',
                background: 'rgba(200, 150, 0, 0.08)',
              }}
            >
              {warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ) : null}

          <div style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={addBlockSection}
              disabled={disabled || blockCards.length >= MAX_MOSAIC_BLOCKS}
              data-testid="mosaic-blocks-add-section"
            >
              Add section
            </button>
          </div>

          {blockCards.map((card, index) => {
            const section = sectionPlan[index]!;
            const onFeatured = (FEATURED_IN_REGISTRY as readonly string[]).includes(card.composerId);

            return (
              <article
                key={index}
                className="mosaic-block-card"
                style={cardStyle}
                data-testid={`mosaic-block-card-${index}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <strong style={{ fontSize: '0.85rem' }}>{section.sectionLabel}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      bars {section.startBar}-{section.endBar}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Duplicate"
                      aria-label="Duplicate section"
                      style={iconBtnStyle}
                      disabled={disabled || blockCards.length >= MAX_MOSAIC_BLOCKS}
                      onClick={() => duplicateBlock(index)}
                    >
                      {'\u29C9'}
                    </button>
                    <button
                      type="button"
                      title="Move left"
                      aria-label="Move section left"
                      style={iconBtnStyle}
                      disabled={disabled || index === 0}
                      onClick={() => moveBlock(index, -1)}
                    >
                      {'\u2190'}
                    </button>
                    <button
                      type="button"
                      title="Move right"
                      aria-label="Move section right"
                      style={iconBtnStyle}
                      disabled={disabled || index === blockCards.length - 1}
                      onClick={() => moveBlock(index, 1)}
                    >
                      {'\u2192'}
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete section"
                      style={{ ...iconBtnStyle, color: 'var(--danger, #e66)' }}
                      disabled={disabled || blockCards.length <= 2}
                      onClick={() => deleteBlock(index)}
                    >
                      {'\u00D7'}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    Chords ({BARS_PER_MOSAIC_BLOCK} - separate with | or newlines)
                  </span>
                  <textarea
                    value={card.chords}
                    rows={4}
                    spellCheck={false}
                    disabled={disabled}
                    placeholder="8 chords - e.g. Cmaj7 | Dm7 | G7 | Cmaj7"
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.82rem' }}
                    onChange={(e) => updateCard(index, { chords: e.target.value })}
                  />
                </label>

                <fieldset disabled={disabled} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <legend style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Composer voice
                  </legend>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {FEATURED_IN_REGISTRY.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={card.composerId === id}
                        style={chipStyle(card.composerId === id)}
                        onClick={() => updateCard(index, { composerId: id })}
                      >
                        {formatComposerLabel(id)}
                      </button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    More
                    <select
                      value={onFeatured ? '' : card.composerId}
                      disabled={disabled}
                      onChange={(e) => {
                        if (e.target.value) updateCard(index, { composerId: e.target.value });
                      }}
                    >
                      <option value="">{onFeatured ? 'More...' : 'Select...'}</option>
                      {moreComposerIds.map((id) => (
                        <option key={id} value={id}>
                          {formatComposerLabel(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
