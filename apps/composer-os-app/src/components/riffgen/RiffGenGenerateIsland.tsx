import { useEffect, useState } from 'react';
import { RiffGeneratorPanel } from '@composer-os/ui/components/RiffGeneratorPanel';
import { clampRiffBarCount } from '../../types/riffGeneratorUi';
import { api, isDesktopIpc } from '../../services/api';
import { RiffChordLoopDisclosureBanner } from './RiffChordLoopDisclosureBanner';
import { RiffChordLoopTokenStrip } from './RiffChordLoopTokenStrip';
import { useRiffGenGenerateState } from './useRiffGenGenerateState';

const inputStyle = {
  padding: '0.45rem 0.6rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-input, var(--bg))',
  color: 'var(--text)',
} as const;

function dirnameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(0, li) : p;
}

/**
 * Phase 1.5 S3 — generate island on RiffGen tab.
 * Reuses RiffGeneratorPanel; presetId riff_generator; no phrase conditioning.
 */
export function RiffGenGenerateIsland() {
  const s = useRiffGenGenerateState();
  const [gpExportMsg, setGpExportMsg] = useState<string | null>(null);
  /** Match Home GenerateSharedContextStrip: numeric seed hidden on desktop IPC. */
  const hideSeed = isDesktopIpc();
  const outputPath =
    typeof s.result?.filepath === 'string' && s.result.filepath.trim()
      ? s.result.filepath.trim()
      : undefined;

  useEffect(() => {
    setGpExportMsg(null);
  }, [outputPath]);

  return (
    <section
      style={{
        marginTop: '1.5rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>Generate island</h3>
      <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Same engine path as Home → Riff Generator (<code>presetId: riff_generator</code>). Optional
        phrase-seeded motif toggle appears when the selected voice has a proven pairing
        (default off).
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label
          style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}
        >
          Variation
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <code
            style={{
              fontSize: '0.95rem',
              padding: '0.35rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            {s.variationId.trim() || '(none)'}
          </code>
          <button
            type="button"
            className="secondary"
            disabled={s.loading}
            onClick={s.onNewVariation}
          >
            New Variation
          </button>
          <button
            type="button"
            className="secondary"
            disabled={s.loading}
            onClick={s.onNextVariation}
          >
            Next Variation
          </button>
        </div>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            margin: '0.65rem 0 0',
            maxWidth: 520,
          }}
        >
          <strong style={{ color: 'var(--text)' }}>New Variation</strong> picks a fresh id;{' '}
          <strong style={{ color: 'var(--text)' }}>Next Variation</strong> steps the id (then
          Generate).
        </p>
      </div>

      {/* Match Home GenerateSharedContextStrip: numeric seed visible only when not desktop IPC. */}
      {!hideSeed ? (
        <div style={{ marginBottom: '0.85rem' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            Seed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <code
              style={{
                fontSize: '0.82rem',
                padding: '0.15rem 0.35rem',
                borderRadius: 4,
                border: '1px solid var(--border)',
              }}
            >
              {s.baseSeed}
            </code>
            <button
              type="button"
              className="secondary"
              disabled={s.loading}
              onClick={() => s.setBaseSeed(Math.floor(Math.random() * 1e9))}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem' }}
            >
              Reroll
            </button>
          </span>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem 1rem',
          marginBottom: '0.85rem',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ fontSize: '0.85rem' }}>
          BPM{' '}
          <input
            type="number"
            value={s.bpm}
            onChange={(e) => s.setBpm(parseInt(e.target.value, 10) || 0)}
            disabled={s.loading}
            style={{ ...inputStyle, width: 80, display: 'block' }}
          />
        </label>
        <label style={{ fontSize: '0.85rem', flex: '1 1 280px' }}>
          Chord loop (optional){' '}
          <input
            type="text"
            value={s.chordProgressionText}
            onChange={(e) => s.setChordProgressionText(e.target.value)}
            disabled={s.loading}
            placeholder="Am7 | Dm7 | G7 | Cmaj7"
            style={{ ...inputStyle, width: '100%', display: 'block' }}
          />
          <RiffChordLoopTokenStrip value={s.chordProgressionText} disabled={s.loading} />
        </label>
        <button type="button" style={inputStyle} disabled={s.loading} onClick={s.generate}>
          {s.loading ? 'Generating…' : 'Generate riff'}
        </button>
      </div>

      <RiffGeneratorPanel
        loading={s.loading}
        family={s.family}
        vrbId={s.vrbId}
        bars={clampRiffBarCount(s.bars)}
        oddMeterPreset={s.oddMeterPreset}
        density={s.density}
        riffGrid={s.riffGrid}
        riffLineMode={s.riffLineMode}
        riffBass={s.riffBass}
        riffSolo={s.riffSolo}
        riffPhraseMotifSeed={s.riffPhraseMotifSeed}
        onRiffPhraseMotifSeedChange={s.setRiffPhraseMotifSeed}
        barLocks={s.barLocks}
        gateMessages={s.gateMessages}
        canRegenerateMutate={s.carryForward != null}
        zappaAdvancedOpen={s.zappaAdvancedOpen}
        zappaStyleMode={s.zappaStyleMode}
        zappaEraPreset={s.zappaEraPreset}
        zappaPhraseCharacter={s.zappaPhraseCharacter}
        zappaSymmetryBias={s.zappaSymmetryBias}
        zappaChainDepth={s.zappaChainDepth}
        onZappaAdvancedOpenChange={s.setZappaAdvancedOpen}
        onZappaStyleModeChange={s.setZappaStyleMode}
        onZappaEraPresetChange={s.setZappaEraPreset}
        onZappaPhraseCharacterChange={s.setZappaPhraseCharacter}
        onZappaSymmetryBiasChange={s.setZappaSymmetryBias}
        onZappaChainDepthChange={s.setZappaChainDepth}
        onFamilyChange={s.onFamilyChange}
        onVrbIdChange={s.setVrbId}
        onBarsChange={s.onBarsChange}
        onOddMeterPresetChange={s.setOddMeterPreset}
        onDensityChange={s.setDensity}
        onRiffGridChange={s.setRiffGrid}
        onRiffLineModeChange={s.setRiffLineMode}
        onRiffBassChange={s.setRiffBass}
        onRiffSoloChange={s.setRiffSolo}
        onBarLockChange={s.onBarLockChange}
        onRegenerate={s.regenerate}
        onMutate={s.mutate}
      />

      {s.error ? (
        <p role="alert" style={{ color: 'salmon', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {s.error}
        </p>
      ) : null}

      {s.result?.success ? (
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <RiffChordLoopDisclosureBanner disclosure={s.result.chordLoopDisclosure} />
          {s.result.filename ? (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-muted)' }}>File:</span> {s.result.filename}
            </p>
          ) : null}
          {outputPath ? (
            <p
              style={{
                margin: '0.5rem 0 0',
                wordBreak: 'break-word',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>
                <span style={{ color: 'var(--text-muted)' }}>Output:</span> {outputPath}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => void s.openFolder(dirnameOnly(outputPath))}
              >
                Open folder
              </button>
              <button
                type="button"
                className="secondary"
                disabled={s.loading}
                onClick={() => {
                  void (async () => {
                    setGpExportMsg(null);
                    const outputGp = outputPath
                      .replace(/\.musicxml$/i, '.gp')
                      .replace(/\.xml$/i, '.gp');
                    const r = await api.exportGuitarPro({
                      musicXmlPath: outputPath,
                      outputPath: outputGp,
                    });
                    setGpExportMsg(
                      r.success
                        ? `Guitar Pro exported: ${r.path}`
                        : (r.error ?? 'Guitar Pro export failed.')
                    );
                  })();
                }}
              >
                Export Guitar Pro
              </button>
            </p>
          ) : null}
          {gpExportMsg ? (
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.82rem',
                color: gpExportMsg.includes('exported:')
                  ? 'var(--text-muted)'
                  : 'var(--error, #ef4444)',
              }}
            >
              {gpExportMsg}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
