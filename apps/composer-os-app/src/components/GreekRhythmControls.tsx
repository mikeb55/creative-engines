/**
 * Song Mode — Greek rebetiko rhythm preset preview + MusicXML export (client-side).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_GREEK_RHYTHM_PRESET_ID,
  GREEK_REBETIKO_RHYTHM_PRESETS,
  exportGreekRhythmToMusicXml,
  getGreekRebetikoPresetById,
  GREEK_RHYTHM_EXPORT_ENGINE,
} from '@composer-os/core/rhythm/greekRhythmMusicXmlExporter';
import type { RhythmPreset } from '@composer-os/core/rhythm/greekRebetikoRhythmTypes';
import { saveRhythmExportFile } from '../lib/saveRhythmExportFile';

const EXPORT_BARS = 2;

export function GreekRhythmControls(props: {
  selectedPresetId: string;
  onPresetIdChange: (id: string) => void;
  disabled?: boolean;
}) {
  const preset = useMemo(
    () => getGreekRebetikoPresetById(props.selectedPresetId) ?? getGreekRebetikoPresetById(DEFAULT_GREEK_RHYTHM_PRESET_ID)!,
    [props.selectedPresetId]
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveNotice = useCallback((text: string) => {
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice(text);
    saveNoticeTimer.current = setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimer.current = null;
    }, 3000);
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
    void window.composerOsDesktop?.openExportFolder?.('greek');
  }, []);

  const onDownload = async () => {
    setExportError(null);
    try {
      const xml = exportGreekRhythmToMusicXml(preset, EXPORT_BARS);
      const fn = `greek-rebetiko-${preset.id}.musicxml`;
      const res = await saveRhythmExportFile(GREEK_RHYTHM_EXPORT_ENGINE, fn, xml);
      if (!res.ok) {
        setExportError(res.error);
        return;
      }
      flashSaveNotice(`Saved to ${res.displayPath}`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <div
      style={{
        marginBottom: '0.65rem',
        padding: '0.55rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 560,
      }}
    >
      <span style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Greek Rebetiko — rhythm grid
      </span>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Pick a preset; <strong style={{ color: 'var(--text)' }}>Download MusicXML</strong> writes a {EXPORT_BARS}-bar GM
        unpitched percussion staff (Sibelius-style treble glyph range).
      </p>
      <label htmlFor="co-greek-rhythm-preset" style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Preset
      </label>
      <select
        id="co-greek-rhythm-preset"
        disabled={props.disabled}
        value={preset.id}
        onChange={(e) => props.onPresetIdChange(e.target.value)}
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
        {GREEK_REBETIKO_RHYTHM_PRESETS.map((p: RhythmPreset) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
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
        Download MusicXML
      </button>
      {showOpenFolder ? (
        <button
          type="button"
          disabled={props.disabled}
          onClick={handleOpenExportFolder}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '0.35rem',
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
      {saveNotice && (
        <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: 'var(--success, #86efac)' }} role="status">
          {saveNotice}
        </p>
      )}
      {exportError && (
        <p style={{ margin: '0.45rem 0 0', fontSize: '0.75rem', color: 'var(--error, #f87171)' }}>{exportError}</p>
      )}
      <GreekRhythmGridPreview preset={preset} />
    </div>
  );
}

function GreekRhythmGridPreview({ preset }: { preset: RhythmPreset }) {
  const n = preset.stepsPerBar;
  return (
    <div style={{ marginTop: '0.55rem' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Layer preview ({n} steps)</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `64px repeat(${n}, minmax(0, 1fr))`,
          gap: '3px 3px',
          alignItems: 'center',
        }}
      >
        <span />
        {Array.from({ length: n }, (_, i) => (
          <span key={`h-${i}`} style={{ textAlign: 'center', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
            {i + 1}
          </span>
        ))}
        {preset.layers.map((L) => (
          <div key={L.layerId} style={{ display: 'contents' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{L.layerId}</span>
            {L.pattern.map((cell, i) => (
              <div
                key={`${L.layerId}-${i}`}
                title={`${L.layerId} step ${i + 1}`}
                style={{
                  height: 14,
                  borderRadius: 2,
                  background: cell ? 'var(--accent, #6366f1)' : 'rgba(128,128,128,0.15)',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
