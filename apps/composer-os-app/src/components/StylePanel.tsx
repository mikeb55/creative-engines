import { useState } from 'react';
import type { HarmonicVoiceId, RhythmEngineId, StyleProfile } from '../types/styleProfile';
import './StylePanel.css';

export type StylePanelProps = {
  value: StyleProfile;
  onChange: (next: StyleProfile) => void;
  harmonicVoiceGroups: Array<{ label: string; voices: Array<{ id: HarmonicVoiceId; label: string }> }>;
  rhythmEngines: Array<{ id: RhythmEngineId; label: string }>;
  /** Song Mode primary harmonic select — stable id for tests / a11y */
  harmonicSelectId?: string;
  rhythmSelectId?: string;
};

export function StylePanel(props: StylePanelProps) {
  const { value, onChange, harmonicVoiceGroups, rhythmEngines } = props;
  const harmonicSelectId = props.harmonicSelectId ?? 'co-style-harmonic-voice';
  const rhythmSelectId = props.rhythmSelectId ?? 'co-style-rhythm-engine';
  const [pairOpen, setPairOpen] = useState(false);

  const harmonicLabel =
    value.harmonic.voiceId != null
      ? harmonicVoiceGroups
          .flatMap((g) => g.voices)
          .find((h) => h.id === value.harmonic.voiceId)?.label
      : null;
  const rhythmLabel =
    value.rhythm.engineId != null
      ? rhythmEngines.find((r) => r.id === value.rhythm.engineId)?.label
      : null;
  const showSummary = harmonicLabel != null || rhythmLabel != null;

  function applyPair(harmonicId: HarmonicVoiceId, engineId: RhythmEngineId, presetId: string | null, pairId: string) {
    onChange({
      harmonic: { voiceId: harmonicId },
      rhythm: { engineId, presetId, contextKeys: [] },
      pairPresetId: pairId,
    });
  }

  return (
    <section className="stylePanel" aria-label="Style">
      <div className="stylePanelHeader">
        <h3>Style</h3>
        <p>Choose harmony and groove independently</p>
      </div>

      <div className="fieldGroup">
        <label htmlFor={harmonicSelectId}>Harmonic Voice</label>
        <select
          id={harmonicSelectId}
          aria-describedby={`${harmonicSelectId}-hint`}
          value={value.harmonic.voiceId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...value,
              harmonic: { voiceId: v ? (v as HarmonicVoiceId) : null },
              pairPresetId: null,
            });
          }}
        >
          <option value="">None</option>
          {harmonicVoiceGroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.voices.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span id={`${harmonicSelectId}-hint`} style={{ display: 'none' }}>
          Harmonic / melodic planning voice
        </span>
      </div>

      <div className="fieldGroup">
        <label htmlFor={rhythmSelectId}>Rhythm Engine</label>
        <select
          id={rhythmSelectId}
          value={value.rhythm.engineId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...value,
              rhythm: {
                engineId: v ? (v as RhythmEngineId) : null,
                presetId: null,
                contextKeys: [],
              },
              pairPresetId: null,
            });
          }}
        >
          <option value="">None</option>
          {rhythmEngines.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {showSummary ? (
        <div className="summaryRow" aria-live="polite">
          {harmonicLabel ? <span className="summaryChip">{harmonicLabel}</span> : null}
          {harmonicLabel && rhythmLabel ? <span className="summaryPlus">+</span> : null}
          {rhythmLabel ? <span className="summaryChip">{rhythmLabel}</span> : null}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className="pairPresetsToggle"
          aria-expanded={pairOpen}
          onClick={() => setPairOpen((o) => !o)}
        >
          Pair presets {pairOpen ? '▴' : '▾'}
        </button>
        {pairOpen ? (
          <div className="pairPresets" role="group" aria-label="Pair presets">
            <button
              type="button"
              onClick={() =>
                applyPair('bill_evans', 'brazilian', 'bossa-nova-basic', 'evans-bossa')
              }
            >
              Bill Evans + Bossa Nova
            </button>
            <button
              type="button"
              onClick={() =>
                applyPair('debussy', 'greek_rebetiko', 'zeibekiko_9_8', 'debussy-rebetiko')
              }
            >
              Debussy + Rebetiko
            </button>
            <button
              type="button"
              onClick={() =>
                applyPair(
                  'duke_ellington',
                  'new_orleans_second_line',
                  'second-line-big-band',
                  'duke-second-line'
                )
              }
            >
              Duke Ellington + Second Line
            </button>
            <button
              type="button"
              onClick={() =>
                applyPair('duke_ellington', 'cuban_afro_cuban', 'mambo', 'dizzy-mambo')
              }
            >
              Dizzy + Cuban Mambo
            </button>
            <button
              type="button"
              onClick={() =>
                applyPair('debussy', 'brazilian', 'bossa-nova-basic', 'jobim-bossa')
              }
            >
              Jobim + Bossa Nova
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
