/**
 * V105p8 — VaultMicroscope + FretboardPanel on Generate (MusicContext-driven).
 */

import type { CSSProperties } from 'react';
import type { MusicContext } from '../../../../../engines/composer-os-v2/core/music-context/musicContextTypes';
import {
  buildFretboardViewFromMusicContext,
  buildVaultHarmonicDetailFromMusicContext,
  buildVaultMicroscopePropsFromMusicContext,
  shouldShowFretboardPanel,
  shouldShowVaultMicroscope,
} from '../../../../../engines/composer-os-v2/core/music-context/musicContextGeneratePanels';
import { FretboardPanel } from './FretboardPanel';
import { VaultMicroscope } from './VaultMicroscope';

const DETAILS_STYLE: CSSProperties = {
  marginBottom: '1rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
};

const SUMMARY_STYLE: CSSProperties = {
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.95rem',
  color: 'var(--text)',
};

export type MusicContextGeneratePanelsProps = {
  musicContext: MusicContext | null | undefined;
  className?: string;
};

export function MusicContextGeneratePanels({ musicContext, className }: MusicContextGeneratePanelsProps) {
  if (!musicContext?.harmony?.bars?.length) return null;

  const showVault = shouldShowVaultMicroscope(musicContext);
  const showFretboard = shouldShowFretboardPanel(musicContext);
  if (!showVault && !showFretboard) return null;

  const vaultProps = showVault ? buildVaultMicroscopePropsFromMusicContext(musicContext) : null;
  const vaultDetail = showVault ? buildVaultHarmonicDetailFromMusicContext(musicContext) : null;
  const fretboardView = showFretboard ? buildFretboardViewFromMusicContext(musicContext) : null;

  return (
    <div className={className} style={{ maxWidth: 960 }}>
      {showVault && vaultProps && vaultDetail ? (
        <details style={DETAILS_STYLE}>
          <summary style={SUMMARY_STYLE}>VaultMicroscope — harmonic detail</summary>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.75rem' }}>
            Chord layers, vault tension map, reharm decisions, and tuning — from MusicContext (
            {musicContext.provenance?.sourceEngineId ?? 'unknown'}).
          </p>
          {vaultDetail.tuningLabel ? (
            <p style={{ fontSize: '0.82rem', margin: '0 0 0.5rem' }}>
              <strong>Tuning:</strong> {vaultDetail.tuningLabel}
              {vaultDetail.tuningOffsetSummary ? ` · ${vaultDetail.tuningOffsetSummary}` : null}
            </p>
          ) : null}
          <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
            <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }}>Bar</th>
                  <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }}>Chord</th>
                  <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }}>Vault type</th>
                  <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }}>Tension</th>
                  <th style={{ textAlign: 'left', padding: 4, borderBottom: '1px solid var(--border)' }}>Layers</th>
                </tr>
              </thead>
              <tbody>
                {vaultDetail.barDetails.map((row) => (
                  <tr key={row.barIndex}>
                    <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>{row.barIndex + 1}</td>
                    <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>{row.symbol}</td>
                    <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                      {row.vaultChordTypeId ?? '—'}
                    </td>
                    <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>{row.tensionState}</td>
                    <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                      {row.layers.length ? row.layers.map((l) => `L${l}`).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vaultDetail.reharmDecisions.length > 0 ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Reharm suggestions</strong>
              <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontSize: '0.82rem' }}>
                {vaultDetail.reharmDecisions.map((row) => (
                  <li key={row.originalSymbol}>
                    {row.originalSymbol} →{' '}
                    {row.alternatives.map((a) => a.symbol).join(' · ') || '—'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <VaultMicroscope
            scoreNotes={vaultProps.scoreNotes}
            totalBars={vaultProps.totalBars}
            chordTypeId={vaultProps.chordTypeId}
            rootPc={vaultProps.rootPc}
          />
        </details>
      ) : null}

      {showFretboard && fretboardView ? (
        <details style={DETAILS_STYLE}>
          <summary style={SUMMARY_STYLE}>Fretboard — voicing map</summary>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.75rem' }}>
            Guide tones highlighted (3rd / 7th family). Tritonic float notes marked in pink (
            {fretboardView.tritonicFloatCount}).
          </p>
          <FretboardPanel
            notes={fretboardView.notes}
            tuning={fretboardView.tuning}
            frets={fretboardView.frets}
            darkMode
            showBeatLegality
          />
        </details>
      ) : null}
    </div>
  );
}
