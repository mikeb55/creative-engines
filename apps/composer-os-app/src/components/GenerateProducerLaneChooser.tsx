import type { CSSProperties } from 'react';
import {
  GENERATE_PRODUCER_LANES,
  getGenerateProducerLaneId,
  type GenerateProducerId,
} from '../constants/generateProducerLanes';

const tileBase: CSSProperties = {
  padding: '0.45rem 0.65rem',
  borderRadius: 6,
  border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
  background: 'transparent',
  color: 'var(--text)',
  font: 'inherit',
  fontSize: '0.82rem',
  lineHeight: 1.35,
  cursor: 'pointer',
  textAlign: 'left',
};

const tileSelected: CSSProperties = {
  border: '1px solid var(--accent, #6ae)',
  background: 'rgba(100,160,255,0.12)',
  fontWeight: 600,
};

export function GenerateProducerLaneChooser(props: {
  producerId: GenerateProducerId;
  onSelectProducer: (id: GenerateProducerId) => void;
  isPresetSupported: (presetId: string) => boolean;
  disabled?: boolean;
}) {
  const activeLaneId = getGenerateProducerLaneId(props.producerId);

  return (
    <div
      role="group"
      aria-label="Generate producers"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}
    >
      {GENERATE_PRODUCER_LANES.map((lane) => {
        const laneActive = lane.id === activeLaneId;
        const selectedInLane = lane.producers.find((p) => p.id === props.producerId);
        const laneBlurb = selectedInLane?.selectionBlurb ?? lane.purpose;

        return (
          <section
            key={lane.id}
            aria-labelledby={`co-producer-lane-${lane.id}`}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 8,
              border: `1px solid ${laneActive ? 'var(--accent, #6ae)' : 'var(--border)'}`,
              background: 'var(--bg-panel)',
            }}
          >
            <div style={{ marginBottom: '0.55rem' }}>
              <h3
                id={`co-producer-lane-${lane.id}`}
                style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}
              >
                {lane.title}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lane.purpose}
              </p>
            </div>

            <div
              role="listbox"
              aria-label={`${lane.title} producers`}
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.55rem' }}
            >
              {lane.producers.map((p) => {
                const selected = props.producerId === p.id;
                const supported = props.isPresetSupported(p.presetId);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={props.disabled || !supported}
                    title={!supported ? 'Coming soon in this build' : p.tagline}
                    onClick={() => props.onSelectProducer(p.id)}
                    style={{
                      ...tileBase,
                      ...(selected ? tileSelected : {}),
                      opacity: supported ? 1 : 0.55,
                      cursor: props.disabled || !supported ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span style={{ display: 'block' }}>{p.label}</span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 400,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {p.tagline}
                    </span>
                  </button>
                );
              })}
            </div>

            <p
              role="status"
              style={{
                margin: 0,
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
                maxWidth: 640,
              }}
            >
              {laneBlurb}
            </p>
          </section>
        );
      })}
    </div>
  );
}
