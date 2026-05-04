'use client';

import type { NoteLayer } from './FretboardPanel';

export type LayerToggleBarProps = {
  activeLayers: NoteLayer[];
  onLayerToggle: (layer: NoteLayer) => void;
};

const LAYER_META: { layer: NoteLayer; label: string }[] = [
  { layer: 0, label: 'Triad (L0)' },
  { layer: 1, label: 'Primary (L1)' },
  { layer: 2, label: 'Tension (L2)' },
  { layer: 3, label: 'Outside (L3)' },
];

export function LayerToggleBar({ activeLayers, onLayerToggle }: LayerToggleBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Fretboard layers"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
        alignItems: 'center',
      }}
    >
      {LAYER_META.map(({ layer, label }) => {
        const on = activeLayers.includes(layer);
        return (
          <button
            key={layer}
            type="button"
            className={on ? undefined : 'secondary'}
            aria-pressed={on}
            onClick={() => onLayerToggle(layer)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
