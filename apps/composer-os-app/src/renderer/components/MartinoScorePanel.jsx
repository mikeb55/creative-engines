import { useEffect, useRef, useState } from 'react';
import { VexFlow } from 'vexflow';
import { DEFAULT_CONFIG, renderMusicXML } from '@stringsync/vexml';

let fontsReady = false;
let fontsPromise = null;

function ensureVexFlowFonts() {
  if (fontsReady) return Promise.resolve();
  if (!fontsPromise) {
    fontsPromise = VexFlow.loadFonts('Bravura', 'Academico').then(() => {
      VexFlow.setFonts('Bravura', 'Academico');
      fontsReady = true;
    });
  }
  return fontsPromise;
}

export default function MartinoScorePanel({ xmlString, showTab = true }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    if (!xmlString || !String(xmlString).trim()) {
      el.innerHTML = '';
      setError(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        await ensureVexFlowFonts();
        if (cancelled) return;

        el.innerHTML = '';
        const width = Math.max(280, el.clientWidth || 520);
        const config = {
          ...DEFAULT_CONFIG,
          WIDTH: width,
          SHOW_STANDARD_NOTATION: true,
          SHOW_TABS: showTab,
        };
        // TODO: TAB requires string/fret in MusicXML — defer to V87 engine work when showTab is true
        // but Martino engine exports pitch-only notes today.
        renderMusicXML(xmlString, el, { config });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          el.innerHTML = '';
        }
      }
    })();

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [xmlString, showTab]);

  if (!xmlString || !String(xmlString).trim()) {
    return (
      <p style={{ margin: '0.65rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Score unavailable
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="score-error"
        style={{ margin: '0.65rem 0 0', color: '#e88', fontSize: '0.85rem' }}
      >
        Score render failed: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '0.65rem',
        width: '100%',
        maxHeight: 420,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--bg)',
      }}
    >
      <div ref={containerRef} data-testid="martino-score-container" style={{ width: '100%' }} />
    </div>
  );
}
