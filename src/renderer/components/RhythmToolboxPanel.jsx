import React, { useMemo, useState } from 'react';
import { DRUM_PRESETS } from '../../engine/drumPresets.js';
import {
  analysePattern,
  bool16ToLane,
  comparePatterns,
  patternToEuclidean,
  suggestVariation,
} from '../../engine/rhythmToolbox.js';
import { useDrumSelection } from '../context/DrumSelectionContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const ROW_LABELS = ['kick', 'snare', 'hat', 'ride'];
const LANE_KEYS = ['kicks', 'snares', 'hats', 'ride'];

function MetricBar({ label, value }) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  return (
    <div style={{ marginBottom: '0.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
        <span>{label}</span>
        <span>{v.toFixed(2)}</span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--border-subtle, rgba(128,128,128,0.2))',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${v * 100}%`,
            height: '100%',
            background: 'var(--accent, #6b8cff)',
          }}
        />
      </div>
    </div>
  );
}

function PatternGrid({ pattern, highlightSteps = null, title }) {
  if (!pattern) return null;
  const lanes = LANE_KEYS.map((k) => pattern[k] ?? []);
  return (
    <div style={{ marginTop: '0.5rem' }}>
      {title && (
        <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>{title}</div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px repeat(16, 1fr)',
          gap: 2,
          fontSize: '0.65rem',
        }}
      >
        <div />
        {Array.from({ length: 16 }, (_, i) => (
          <div key={`h-${i}`} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {i + 1}
          </div>
        ))}
        {lanes.map((hits, li) => (
          <React.Fragment key={ROW_LABELS[li]}>
            <div style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {ROW_LABELS[li]}
            </div>
            {Array.from({ length: 16 }, (_, col) => {
              const on = hits.includes(col);
              const diff = highlightSteps?.includes(col);
              return (
                <div
                  key={`${ROW_LABELS[li]}-${col}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    maxWidth: 18,
                    borderRadius: 3,
                    background: on
                      ? diff
                        ? '#e8a838'
                        : 'var(--accent, #6b8cff)'
                      : diff
                        ? 'rgba(232, 168, 56, 0.25)'
                        : 'var(--border-subtle, rgba(128,128,128,0.2))',
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function RhythmToolboxPanel() {
  const {
    activePattern,
    applyToolboxPattern,
    applyToolboxVoiceLane,
    findPattern,
  } = useDrumSelection();

  const [metrics, setMetrics] = useState(null);
  const [comparePresetId, setComparePresetId] = useState(DRUM_PRESETS[0]?.id ?? '');
  const [compareResult, setCompareResult] = useState(null);
  const [intensity, setIntensity] = useState(0.35);
  const [previewPattern, setPreviewPattern] = useState(null);
  const [euSteps, setEuSteps] = useState(16);
  const [euHits, setEuHits] = useState(4);
  const [euVoice, setEuVoice] = useState('kick');
  const [euPreview, setEuPreview] = useState(null);

  const comparePattern = useMemo(() => {
    const preset = DRUM_PRESETS.find((p) => p.id === comparePresetId);
    if (!preset) return null;
    return findPattern(preset.drummer, preset.patternName) ?? null;
  }, [comparePresetId, findPattern]);

  const onAnalyse = () => {
    if (!activePattern) return;
    setMetrics(analysePattern(activePattern));
  };

  const onCompare = () => {
    if (!activePattern || !comparePattern) return;
    setCompareResult(comparePatterns(activePattern, comparePattern));
  };

  const onSuggest = () => {
    if (!activePattern) return;
    const lanes = suggestVariation(activePattern, intensity);
    setPreviewPattern({
      ...activePattern,
      ...lanes,
      name: 'Suggested variation',
    });
  };

  const onApplyVariation = () => {
    if (!previewPattern) return;
    applyToolboxPattern(previewPattern);
    setPreviewPattern(null);
  };

  const onGenerateEuclidean = () => {
    const lane = patternToEuclidean(euSteps, euHits, euVoice);
    setEuPreview(lane);
  };

  const onApplyEuclidean = () => {
    if (!euPreview) return;
    applyToolboxVoiceLane(euVoice, euPreview);
    setEuPreview(null);
  };

  if (!activePattern) {
    return (
      <section style={panelStyle} aria-label="Rhythm toolbox">
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Rhythm toolbox</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select a drum pattern first.</p>
      </section>
    );
  }

  return (
    <section style={panelStyle} aria-label="Rhythm toolbox">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Rhythm toolbox</h3>

      <button type="button" onClick={onAnalyse} style={{ marginBottom: '0.5rem' }}>
        Analyse
      </button>
      {metrics && (
        <div style={{ marginBottom: '0.65rem' }}>
          <MetricBar label="Syncopation" value={metrics.syncopationScore} />
          <MetricBar label="Density" value={metrics.densityScore} />
          <MetricBar label="Balance" value={metrics.balanceScore} />
          <MetricBar label="Polyrhythm index" value={metrics.polyrhythmIndex} />
          <MetricBar label="Evenness (IOI)" value={metrics.evenness} />
          <MetricBar label="Centre of gravity" value={metrics.centreOfGravity} />
          <p style={{ fontSize: '0.72rem', margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
            Hits: {metrics.hitCount} · Rests: {metrics.voidCount}
          </p>
        </div>
      )}

      <h4 style={{ margin: '0.5rem 0 0.35rem', fontSize: '0.85rem' }}>Compare</h4>
      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>
        Preset B
        <select
          value={comparePresetId}
          onChange={(e) => setComparePresetId(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {DRUM_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="secondary" onClick={onCompare}>
        Compare
      </button>
      {compareResult && (
        <div style={{ marginTop: '0.5rem' }}>
          <MetricBar label="Similarity" value={compareResult.similarityScore} />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Shared hits: {compareResult.sharedHits} · Differing steps highlighted
          </p>
          <PatternGrid
            pattern={activePattern}
            highlightSteps={compareResult.differingPositions}
            title="Active pattern"
          />
        </div>
      )}

      <h4 style={{ margin: '0.65rem 0 0.35rem', fontSize: '0.85rem' }}>Variation</h4>
      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: 6 }}>
        Intensity {intensity.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          style={{ width: '100%', display: 'block', marginTop: 4 }}
        />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <button type="button" className="secondary" onClick={onSuggest}>
          Suggest
        </button>
        <button type="button" onClick={onApplyVariation} disabled={!previewPattern}>
          Apply
        </button>
      </div>
      {previewPattern && (
        <PatternGrid pattern={previewPattern} title="Variation preview" />
      )}

      <h4 style={{ margin: '0.65rem 0 0.35rem', fontSize: '0.85rem' }}>Euclidean</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 6 }}>
        <label style={{ fontSize: '0.75rem' }}>
          Steps
          <select
            value={euSteps}
            onChange={(e) => setEuSteps(Number(e.target.value))}
            style={{ display: 'block', marginTop: 2 }}
          >
            {[8, 12, 16].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>
          Hits
          <input
            type="number"
            min={1}
            max={16}
            value={euHits}
            onChange={(e) => setEuHits(Number(e.target.value))}
            style={{ display: 'block', width: 56, marginTop: 2 }}
          />
        </label>
        <label style={{ fontSize: '0.75rem' }}>
          Voice
          <select
            value={euVoice}
            onChange={(e) => setEuVoice(e.target.value)}
            style={{ display: 'block', marginTop: 2 }}
          >
            {ROW_LABELS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary" onClick={onGenerateEuclidean}>
          Generate
        </button>
        <button type="button" onClick={onApplyEuclidean} disabled={!euPreview}>
          Apply
        </button>
      </div>
      {euPreview && (
        <PatternGrid
          pattern={{
            kicks: euVoice === 'kick' ? bool16ToLane(euPreview) : [],
            snares: euVoice === 'snare' ? bool16ToLane(euPreview) : [],
            hats: euVoice === 'hat' ? bool16ToLane(euPreview) : [],
            ride: euVoice === 'ride' ? bool16ToLane(euPreview) : [],
          }}
          title={`Euclidean preview (${euVoice})`}
        />
      )}
    </section>
  );
}
