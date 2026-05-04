'use client';

import { useEffect, useRef } from 'react';

export type TabNote = {
  stringIndex: number;
  fret: number;
  duration: 'q' | '8' | '16' | 'h' | 'w';
};

export type TabPanelProps = {
  timeSignature?: { num: number; den: number };
  notes: TabNote[];
  className?: string;
};

function toVexStringIndex(stringIndex: number): number {
  return 6 - stringIndex;
}

export function TabPanel({
  timeSignature: timeSignatureProp,
  notes,
  className,
}: TabPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    el.innerHTML = '';

    void (async () => {
      const { Renderer, TabStave, TabNote, Voice, Formatter } = await import('vexflow');
      if (cancelled || !containerRef.current) return;

      const timeSignature = timeSignatureProp ?? { num: 4, den: 4 };
      const width = 480;
      const height = 160;

      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();

      const stave = new TabStave(10, 10, width - 20);
      stave.setContext(context);
      stave.addTimeSignature(`${timeSignature.num}/${timeSignature.den}`);
      stave.addTabGlyph();
      stave.draw();

      if (notes.length === 0) {
        return;
      }

      const tickables = notes.map(
        (n) =>
          new TabNote({
            positions: [{ str: toVexStringIndex(n.stringIndex), fret: n.fret }],
            duration: n.duration,
          })
      );

      const voice = new Voice({
        numBeats: timeSignature.num,
        beatValue: timeSignature.den,
      })
        .setMode(Voice.Mode.SOFT)
        .addTickables(tickables);

      new Formatter().joinVoices([voice]).formatToStave([voice], stave);

      voice.setContext(context).setStave(stave).drawWithStyle();
    })();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [notes, timeSignatureProp?.num, timeSignatureProp?.den]);

  return <div ref={containerRef} className={className} />;
}
