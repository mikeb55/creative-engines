import { useState } from 'react';
import type { HarmonicVoiceId, RhythmEngineId, StyleProfile } from '../types/styleProfile';
import type { EtudeTechnicalFocus } from '@composer-os/core/composer/etudeGenerator';
import './StylePanel.css';

export type UiInstrumentGroup = 'big_band' | 'string_quartet' | 'guitar' | 'etude';

export type StylePanelProps = {
  value: StyleProfile;
  onChange: (next: StyleProfile) => void;
  harmonicVoiceGroups: Array<{ label: string; voices: Array<{ id: HarmonicVoiceId; label: string }> }>;
  rhythmEngines: Array<{ id: RhythmEngineId; label: string }>;
  /** Song Mode primary harmonic select — stable id for tests / a11y */
  harmonicSelectId?: string;
  rhythmSelectId?: string;
  /** Phase 6+7 — output family (echoed in generate metadata). */
  instrumentGroup?: UiInstrumentGroup;
  onInstrumentGroupChange?: (next: UiInstrumentGroup) => void;
  guitarOutputMode?: 'notation' | 'tab' | 'both';
  onGuitarOutputModeChange?: (next: 'notation' | 'tab' | 'both') => void;
  etudeInstrument?: string;
  onEtudeInstrumentChange?: (next: string) => void;
  etudeTechnicalFocus?: EtudeTechnicalFocus;
  onEtudeTechnicalFocusChange?: (next: EtudeTechnicalFocus) => void;
  /** Phase 8 — post-pass improv + optional stochastic layer (metadata / future routing). */
  improvMode?: boolean;
  onImprovModeChange?: (next: boolean) => void;
  stochasticVariance?: number;
  onStochasticVarianceChange?: (next: number) => void;
};

export function StylePanel(props: StylePanelProps) {
  const {
    value,
    onChange,
    harmonicVoiceGroups,
    rhythmEngines,
    instrumentGroup = 'big_band',
    onInstrumentGroupChange,
    guitarOutputMode = 'both',
    onGuitarOutputModeChange,
    etudeInstrument = 'violin_I',
    onEtudeInstrumentChange,
    etudeTechnicalFocus = 'scales',
    onEtudeTechnicalFocusChange,
    improvMode = false,
    onImprovModeChange,
    stochasticVariance = 0,
    onStochasticVarianceChange,
  } = props;
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

      {onInstrumentGroupChange ? (
        <div className="fieldGroup">
          <label htmlFor="co-style-instrument-group">Instrument group</label>
          <select
            id="co-style-instrument-group"
            value={instrumentGroup}
            onChange={(e) => onInstrumentGroupChange(e.target.value as UiInstrumentGroup)}
          >
            <option value="big_band">Big Band</option>
            <option value="string_quartet">String Quartet</option>
            <option value="guitar">Guitar</option>
            <option value="etude">Étude</option>
          </select>
        </div>
      ) : null}

      {onInstrumentGroupChange && instrumentGroup === 'guitar' && onGuitarOutputModeChange ? (
        <div className="fieldGroup">
          <label htmlFor="co-style-guitar-output">Guitar output</label>
          <select
            id="co-style-guitar-output"
            value={guitarOutputMode}
            onChange={(e) => onGuitarOutputModeChange(e.target.value as 'notation' | 'tab' | 'both')}
          >
            <option value="notation">Standard notation</option>
            <option value="tab">Tab</option>
            <option value="both">Both</option>
          </select>
        </div>
      ) : null}

      {onInstrumentGroupChange && instrumentGroup === 'etude' && onEtudeInstrumentChange && onEtudeTechnicalFocusChange ? (
        <>
          <div className="fieldGroup">
            <label htmlFor="co-style-etude-inst">Étude instrument</label>
            <select
              id="co-style-etude-inst"
              value={etudeInstrument}
              onChange={(e) => onEtudeInstrumentChange(e.target.value)}
            >
              <option value="violin_I">Violin</option>
              <option value="cello">Cello</option>
              <option value="guitar">Guitar</option>
              <option value="flute">Flute</option>
            </select>
          </div>
          <div className="fieldGroup">
            <label htmlFor="co-style-etude-focus">Technical focus</label>
            <select
              id="co-style-etude-focus"
              value={etudeTechnicalFocus}
              onChange={(e) => onEtudeTechnicalFocusChange(e.target.value as EtudeTechnicalFocus)}
            >
              <option value="scales">Scales</option>
              <option value="arpeggios">Arpeggios</option>
              <option value="interval-skips">Interval skips</option>
              <option value="chromatic">Chromatic</option>
              <option value="position-shifts">Position shifts</option>
            </select>
          </div>
        </>
      ) : null}

      {onImprovModeChange ? (
        <div className="fieldGroup">
          <label htmlFor="co-style-improv-mode">Improv mode</label>
          <select
            id="co-style-improv-mode"
            value={improvMode ? 'on' : 'off'}
            onChange={(e) => onImprovModeChange(e.target.value === 'on')}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </div>
      ) : null}

      {onStochasticVarianceChange && improvMode ? (
        <div className="fieldGroup">
          <label htmlFor="co-style-variance">Variance</label>
          <input
            id="co-style-variance"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={stochasticVariance}
            onChange={(e) => onStochasticVarianceChange(Number(e.target.value))}
          />
          <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {stochasticVariance.toFixed(2)}
          </span>
        </div>
      ) : null}

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
