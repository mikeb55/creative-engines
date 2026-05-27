import React from 'react';
import { SectionEditor } from '../components/SectionEditor';
import { MeterEditor } from '../components/MeterEditor';
import { TuningPanel } from '../components/TuningPanel';
import { DrummerPanel } from '../components/DrummerPanel';
import { RhythmToolboxPanel } from '../components/RhythmToolboxPanel';
import { FillSchedulerPanel } from '../components/FillSchedulerPanel';
import { FzReceiptsPanel } from '../components/FzReceiptsPanel';
import { VrbPanel } from '../components/VrbPanel';

const scrollStyle = {
  maxHeight: 'calc(100vh - 12rem)',
  overflowY: 'auto',
  paddingRight: 4,
};

export function StructureWorkspace() {
  return (
    <div style={scrollStyle}>
      <p style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
        Section architecture for the current composition. Edits persist to the Song model and flow into
        Generate when supported.
      </p>
      <SectionEditor />
      <MeterEditor />
      <TuningPanel />
      <DrummerPanel />
      <RhythmToolboxPanel />
      <FillSchedulerPanel />
      <FzReceiptsPanel />
      <VrbPanel />
    </div>
  );
}
