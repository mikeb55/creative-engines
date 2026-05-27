import React from 'react';
import { GridView } from '../components/GridView';

const scrollStyle = {
  maxHeight: 'calc(100vh - 12rem)',
  overflowY: 'auto',
  paddingRight: 4,
};

export function GridWorkspace() {
  return (
    <div style={scrollStyle}>
      <p style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
        Piano-roll view of the last successful generate. Updates automatically when a new score is produced.
      </p>
      <GridView />
    </div>
  );
}
