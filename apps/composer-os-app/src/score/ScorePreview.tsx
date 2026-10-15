import { useEffect, useRef, useState } from 'react';

export type ScorePreviewProps = {
  musicXml: string | null | undefined;
};

/**
 * Read-only standard notation through the installed vexml renderer.
 * The MusicXML string is passed through unchanged. TAB is not shown.
 * vexml is loaded on demand so a test or a failed font load cannot take down the page.
 */
export function ScorePreview({ musicXml }: ScorePreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = typeof musicXml === 'string' ? musicXml.trim() : '';

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !source) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [{ DEFAULT_CONFIG, renderMusicXML }, { ensureVexFlowFonts }] = await Promise.all([
          import('@stringsync/vexml'),
          import('./vexmlFonts'),
        ]);
        await ensureVexFlowFonts();
        if (cancelled) return;
        if (typeof el.replaceChildren === 'function') el.replaceChildren();
        const width = Math.max(320, el.clientWidth || 640);
        renderMusicXML(source, el, {
          config: {
            ...DEFAULT_CONFIG,
            WIDTH: width,
            SHOW_STANDARD_NOTATION: true,
            SHOW_TABS: false,
          },
        });
      } catch (caught) {
        if (cancelled) return;
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message || 'This notation is not supported by the in-app preview.');
        if (typeof el.replaceChildren === 'function') el.replaceChildren();
      }
    })();
    return () => {
      cancelled = true;
      if (typeof el.replaceChildren === 'function') el.replaceChildren();
    };
  }, [source]);

  if (!source) {
    return (
      <p data-testid="score-preview-empty" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No score to preview.
      </p>
    );
  }

  return (
    <div data-testid="score-preview" style={{ display: 'grid', gap: '0.35rem' }}>
      {error ? (
        <div className="score-error" data-testid="score-preview-error" style={{ color: '#e88', fontSize: '0.85rem' }}>
          Score preview failed: {error}. The notes were not changed.
        </div>
      ) : null}
      <div
        data-testid="score-preview-scroll"
        style={{
          width: '100%',
          maxHeight: '70vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: '#fff',
        }}
      >
        <div ref={containerRef} data-testid="score-preview-canvas" style={{ width: '100%' }} />
      </div>
    </div>
  );
}
