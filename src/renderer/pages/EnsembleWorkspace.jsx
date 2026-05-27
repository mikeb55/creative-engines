import React, { useState } from 'react';
import { BigBandPanel } from '../components/BigBandPanel';
import { StringQuartetPanel } from '../components/StringQuartetPanel';
import { ContrapuntalPanel } from '../components/ContrapuntalPanel';

const scrollStyle = {
  maxHeight: 'calc(100vh - 12rem)',
  overflowY: 'auto',
  paddingRight: 4,
};

function CollapsiblePanel({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.4rem 0.5rem',
          border: '1px solid var(--border-subtle, #333)',
          borderRadius: 6,
          background: 'var(--surface-raised, rgba(128,128,128,0.08))',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '0.88rem',
          fontWeight: 600,
        }}
      >
        {open ? '▼' : '▶'} {title}
      </button>
      {open && <div style={{ marginTop: '0.35rem' }}>{children}</div>}
    </div>
  );
}

export function EnsembleWorkspace() {
  return (
    <div style={scrollStyle}>
      <p style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
        Ensemble and counterpoint controls. Settings flow into Generate as config payloads.
      </p>
      <CollapsiblePanel title="Big Band" defaultOpen={false}>
        <BigBandPanel />
      </CollapsiblePanel>
      <CollapsiblePanel title="String Quartet" defaultOpen={false}>
        <StringQuartetPanel />
      </CollapsiblePanel>
      <CollapsiblePanel title="Contrapuntal" defaultOpen={false}>
        <ContrapuntalPanel />
      </CollapsiblePanel>
    </div>
  );
}
