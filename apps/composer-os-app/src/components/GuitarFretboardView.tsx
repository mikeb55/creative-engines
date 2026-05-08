/**
 * Phase 6+7 — lightweight fretboard preview (no donor imports).
 */

import type { GuitarVoicing } from '@composer-os/core/composer/guitarVoicingEngine';

const STRING_COUNT = 6;
const FRETS_SHOWN = 5;

export function GuitarFretboardView(props: { voicings: GuitarVoicing[]; title?: string }) {
  const { voicings, title = 'Voicing preview' } = props;
  if (!voicings.length) return null;

  const nutW = 10;
  const fretW = 36;
  const stringGap = 14;
  const topPad = 28;
  const width = nutW + FRETS_SHOWN * fretW + 24;
  const height = topPad + STRING_COUNT * stringGap + 36;

  return (
    <div className="guitarFretboardWrap" style={{ marginTop: '0.75rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {voicings.map((v, idx) => (
          <div key={`${v.chordId}-${idx}`}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{v.chordId}</div>
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              style={{ maxWidth: '100%', height: 'auto' }}
              aria-label={`Fretboard for ${v.chordId}`}
            >
              <rect x={0} y={topPad - 8} width={width} height={height - topPad + 40} fill="var(--bg-elevated, #1a1d24)" rx={6} />
              {/* Nut */}
              <rect x={8} y={topPad} width={nutW} height={(STRING_COUNT - 1) * stringGap} fill="#d4c4a8" rx={2} />
              {/* Frets */}
              {Array.from({ length: FRETS_SHOWN + 1 }).map((_, fi) => (
                <line
                  key={`fret-${fi}`}
                  x1={8 + nutW + fi * fretW}
                  y1={topPad}
                  x2={8 + nutW + fi * fretW}
                  y2={topPad + (STRING_COUNT - 1) * stringGap}
                  stroke="#8b7355"
                  strokeWidth={fi === 0 ? 3 : 1.5}
                />
              ))}
              {/* Strings */}
              {Array.from({ length: STRING_COUNT }).map((_, si) => (
                <line
                  key={`str-${si}`}
                  x1={8}
                  y1={topPad + si * stringGap}
                  x2={width - 16}
                  y2={topPad + si * stringGap}
                  stroke="#c0c0c0"
                  strokeWidth={1.2}
                />
              ))}
              {/* Fret markers (dots at 3 & 5) */}
              {[3, 5].map((fr) => (
                <circle
                  key={`dot-${fr}`}
                  cx={8 + nutW + (fr - 0.5) * fretW}
                  cy={topPad + ((STRING_COUNT - 1) * stringGap) / 2}
                  r={3}
                  fill="rgba(255,255,255,0.15)"
                />
              ))}
              {/* Barre */}
              {v.barreAt != null && v.barreAt >= 1 && v.barreAt <= FRETS_SHOWN && (
                <rect
                  x={8 + nutW + (v.barreAt - 0.85) * fretW}
                  y={topPad - 4}
                  width={fretW * 0.75}
                  height={(STRING_COUNT - 1) * stringGap + 8}
                  fill="rgba(99,102,241,0.25)"
                  rx={4}
                />
              )}
              {/* Notes */}
              {v.frets.map((fret, si) => {
                if (fret < 0) return null;
                const rowFromTop = STRING_COUNT - 1 - si;
                const cxDot =
                  fret === 0
                    ? 8 + nutW / 2
                    : 8 + nutW + (fret - 0.5) * fretW;
                const cyDot = topPad + rowFromTop * stringGap;
                const fg = v.fingers[si] ?? 0;
                return (
                  <g key={`n-${si}-${fret}`}>
                    <circle cx={cxDot} cy={cyDot} r={9} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />
                    {fg > 0 ? (
                      <text
                        x={cxDot}
                        y={cyDot + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                        fontWeight={700}
                      >
                        {fg}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
