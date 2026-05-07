/**
 * Song Mode — New Orleans second line / brass band rhythm: grid, feel strip, MusicXML export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SECOND_LINE_RHYTHM_PRESET_ID,
  exportSecondLineRhythmToMusicXml,
  getSecondLineRhythmPresetById,
  SECOND_LINE_RHYTHM_EXPORT_ENGINE,
} from '@composer-os/core/rhythm/secondLineRhythmMusicXmlExporter';
import type { SecondLineFeelProfile, SecondLineRhythmPreset } from '@composer-os/core/rhythm/secondLineRhythmTypes';
import { saveRhythmExportFile } from '../lib/saveRhythmExportFile';
import { SaveNoticeRow, type SaveNoticePayload } from './SaveNoticeRow';

const EXPORT_BARS = 2;

const PRESET_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: 'Second Line',
    ids: [
      'second-line-basic',
      'second-line-slow',
      'second-line-fast',
      'second-line-shuffle',
      'second-line-big-band',
    ],
  },
  { label: 'Mardi Gras', ids: ['mardi-gras-indian'] },
  { label: 'Brass Band', ids: ['brass-band-6-8'] },
  { label: 'New Orleans Funk', ids: ['new-orleans-funk'] },
];

function tempoMid(feel: SecondLineFeelProfile): number {
  const [a, b] = feel.tempoBPMRange;
  return Math.round((a + b) / 2);
}

export function SecondLineRhythmControls(props: {
  activePresetId: string;
  onPresetChange: (id: string) => void;
  feel?: Partial<SecondLineFeelProfile>;
  onFeelChange?: (feel: Partial<SecondLineFeelProfile>) => void;
  playbackStep?: number;
  disabled?: boolean;
}) {
  const preset = useMemo(
    () =>
      getSecondLineRhythmPresetById(props.activePresetId) ??
      getSecondLineRhythmPresetById(DEFAULT_SECOND_LINE_RHYTHM_PRESET_ID)!,
    [props.activePresetId]
  );

  const mergedFeel = useMemo(() => ({ ...preset.feel, ...props.feel }), [preset.feel, props.feel]);
  const [tempoBpm, setTempoBpm] = useState(() => tempoMid(preset.feel));
  useEffect(() => {
    setTempoBpm(tempoMid({ ...preset.feel, ...props.feel }));
  }, [preset.id, preset.feel, props.feel]);

  const [exportError, setExportError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<SaveNoticePayload | null>(null);
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveNotice = useCallback((notice: SaveNoticePayload) => {
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice(notice);
    saveNoticeTimer.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimer.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    };
  }, []);

  const showOpenFolder = useMemo(
    () => typeof window !== 'undefined' && !!window.composerOsDesktop?.openExportFolder,
    []
  );

  const handleOpenExportFolder = useCallback(() => {
    void window.composerOsDesktop?.openExportFolder?.('second-line');
  }, []);

  const onDownload = async () => {
    setExportError(null);
    try {
      const xml = exportSecondLineRhythmToMusicXml(preset, EXPORT_BARS, tempoBpm);
      const fn = `${preset.id}.musicxml`;
      const res = await saveRhythmExportFile(SECOND_LINE_RHYTHM_EXPORT_ENGINE, fn, xml);
      if (!res.ok) {
        setExportError(res.error);
        return;
      }
      flashSaveNotice({
        message: `Saved to ${res.displayPath}`,
        copyText: res.displayPath,
        variant: 'success',
      });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const meterLabel = `${preset.meter.signature} · ${preset.meter.gridSteps} steps`;

  const emitFeel = useCallback(
    (patch: Partial<SecondLineFeelProfile>) => {
      props.onFeelChange?.({ ...props.feel, ...patch });
    },
    [props]
  );

  return (
    <div
      style={{
        marginBottom: '0.65rem',
        padding: '0.55rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 720,
      }}
    >
      <span style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        New Orleans second line — brass band, Mardi Gras Indian, NOLA funk
      </span>
      <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        <strong style={{ color: 'var(--text)' }}>{meterLabel}</strong>. Export writes {EXPORT_BARS} bars of GM unpitched
        percussion (voices + backup). Folder: Documents/Composer OS Exports/Second Line/
      </p>

      <label htmlFor="co-sl-preset" style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Preset
      </label>
      <select
        id="co-sl-preset"
        disabled={props.disabled}
        value={preset.id}
        onChange={(e) => props.onPresetChange(e.target.value)}
        style={{
          marginBottom: '0.55rem',
          fontSize: '0.82rem',
          padding: '0.25rem 0.4rem',
          borderRadius: 4,
          border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
          background: 'var(--bg-elevated, #1a1a1e)',
          color: 'var(--text)',
          maxWidth: '100%',
        }}
      >
        {PRESET_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.ids.map((id) => {
              const p = getSecondLineRhythmPresetById(id);
              if (!p) return null;
              return (
                <option key={id} value={id}>
                  {p.id.replace(/-/g, ' ')}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <SecondLineFeelStrip
            feel={mergedFeel}
            tempoBpm={tempoBpm}
            tempoRange={preset.feel.tempoBPMRange}
            disabled={props.disabled}
            onFeelPatch={(patch) => emitFeel(patch)}
            onTempoBpm={(n) => {
              setTempoBpm(n);
            }}
          />
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={props.disabled}
              onClick={onDownload}
              style={{
                padding: '0.35rem 0.55rem',
                fontSize: '0.78rem',
                borderRadius: 4,
                border: '1px solid var(--accent, #6366f1)',
                background: 'rgba(99,102,241,0.12)',
                color: 'var(--text)',
                cursor: props.disabled ? 'default' : 'pointer',
              }}
            >
              Export MusicXML
            </button>
            {showOpenFolder ? (
              <button
                type="button"
                disabled={props.disabled}
                onClick={handleOpenExportFolder}
                style={{
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.78rem',
                  borderRadius: 4,
                  border: '1px solid var(--border-subtle, rgba(128,128,128,0.45))',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: props.disabled ? 'default' : 'pointer',
                }}
              >
                Open Folder
              </button>
            ) : null}
          </div>
          {saveNotice ? <SaveNoticeRow {...saveNotice} /> : null}
          {exportError && (
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.75rem', color: 'var(--error, #f87171)' }}>{exportError}</p>
          )}
        </div>
        <SecondLineRhythmGridSidebar preset={preset} playbackStep={props.playbackStep} mergedFeel={mergedFeel} />
      </div>
    </div>
  );
}

function SecondLineFeelStrip(props: {
  feel: SecondLineFeelProfile;
  tempoBpm: number;
  tempoRange: [number, number];
  disabled?: boolean;
  onFeelPatch: (patch: Partial<SecondLineFeelProfile>) => void;
  onTempoBpm: (n: number) => void;
}) {
  const sliders: {
    key: keyof SecondLineFeelProfile;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: 'snareDensity', label: 'Snare density', min: 0, max: 1, step: 0.01 },
    { key: 'bigFourWeight', label: 'Big Four weight', min: 0, max: 1, step: 0.01 },
    { key: 'subdivisionWarp', label: 'Subdivision warp', min: -0.12, max: 0.12, step: 0.005 },
  ];

  return (
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
      <div style={{ marginBottom: 6 }}>Feel</div>
      {sliders.map((s) => (
        <details key={s.key} style={{ marginBottom: 6 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text)' }}>{s.label}</summary>
          <input
            type="range"
            disabled={props.disabled}
            min={s.min}
            max={s.max}
            step={s.step}
            value={Number(props.feel[s.key])}
            onChange={(e) => props.onFeelPatch({ [s.key]: Number(e.target.value) } as Partial<SecondLineFeelProfile>)}
            style={{ width: '100%', maxWidth: 280 }}
          />
        </details>
      ))}
      <details style={{ marginBottom: 4 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--text)' }}>Tempo BPM</summary>
        <input
          type="range"
          disabled={props.disabled}
          min={props.tempoRange[0]}
          max={props.tempoRange[1]}
          step={1}
          value={props.tempoBpm}
          onChange={(e) => props.onTempoBpm(Number(e.target.value))}
          style={{ width: '100%', maxWidth: 280 }}
        />
        <span style={{ marginLeft: 6 }}>{props.tempoBpm} bpm</span>
      </details>
    </div>
  );
}

function SecondLineRhythmGridSidebar(props: {
  preset: SecondLineRhythmPreset;
  playbackStep?: number;
  mergedFeel: SecondLineFeelProfile;
}) {
  const { preset, mergedFeel } = props;
  const n = preset.meter.gridSteps;
  const snare = mergedFeel.snareDensity;
  const big4 = mergedFeel.bigFourWeight;
  const warp = mergedFeel.subdivisionWarp;
  const jingleC = mergedFeel.jingleContinuity;

  const rows: { id: keyof SecondLineRhythmPreset['lanes']; label: string }[] = [
    { id: 'low', label: 'low' },
    { id: 'high', label: 'high' },
    { id: 'jingle', label: 'jingle' },
    { id: 'ghost', label: 'ghost' },
  ];

  return (
    <div
      style={{
        flex: '0 0 280px',
        width: 280,
        marginTop: 0,
        padding: '0.35rem 0.4rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
        borderRadius: 4,
        background: 'var(--bg-elevated, rgba(0,0,0,0.2))',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Velocity grid (read-only)</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `52px repeat(${n}, minmax(0, 1fr))`,
          gap: '2px 2px',
          alignItems: 'center',
        }}
      >
        <span />
        {Array.from({ length: n }, (_, i) => (
          <span key={`h-${i}`} style={{ textAlign: 'center', fontSize: '0.52rem', color: 'var(--text-muted)' }}>
            {i + 1}
          </span>
        ))}
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'contents' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.label}</span>
            {(preset.lanes[r.id] ?? []).map((vel, i) => {
              let shade = vel / 127;
              if (r.id === 'high' || r.id === 'ghost') shade *= 0.65 + snare * 0.35;
              if (r.id === 'low') shade *= 0.55 + big4 * 0.45;
              if (r.id === 'jingle') shade *= 0.6 + jingleC * 0.35 + (warp + 0.12) * 0.15;
              const active = props.playbackStep != null && (props.playbackStep % n) === i;
              return (
                <div
                  key={`${r.id}-${i}`}
                  title={`${r.id} step ${i + 1} vel ${vel}`}
                  style={{
                    height: 13,
                    borderRadius: 2,
                    boxSizing: 'border-box',
                    border: active ? '1px solid var(--accent, #6366f1)' : '1px solid transparent',
                    background:
                      vel > 0 ? `rgba(99,102,241,${0.12 + shade * 0.85})` : 'rgba(128,128,128,0.12)',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
