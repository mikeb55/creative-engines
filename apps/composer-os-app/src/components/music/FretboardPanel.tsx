'use client';

import { useEffect, useRef } from 'react';
export type FretboardNote = {
  stringIndex: number;
  fret: number;
  role:
    | 'triadRoot'
    | 'triadThird'
    | 'triadFifth'
    | 'primaryTension'
    | 'secondaryTension'
    | 'triadPairTension'
    | 'bebopPassing'
    | 'chaos';
  isActive?: boolean;
};

export type FretboardPanelProps = {
  tuning?: string[];
  frets?: { from: number; to: number };
  notes: FretboardNote[];
  className?: string;
};

const DEFAULT_TUNING: string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const DEFAULT_FRETS = { from: 0, to: 12 } as const;

const ROLE_COLORS: Record<FretboardNote['role'], string> = {
  triadRoot: '#22c55e',
  triadThird: '#16a34a',
  triadFifth: '#4ade80',
  primaryTension: '#f59e0b',
  secondaryTension: '#f97316',
  triadPairTension: '#ef4444',
  bebopPassing: '#8b5cf6',
  chaos: '#ec4899',
};

function toLibraryString(stringIndex: number): number {
  return 6 - stringIndex;
}

export function FretboardPanel({
  tuning = DEFAULT_TUNING,
  frets,
  notes,
  className,
}: FretboardPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rangeFrom = frets?.from ?? DEFAULT_FRETS.from;
  const rangeTo = frets?.to ?? DEFAULT_FRETS.to;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    el.innerHTML = '';

    void (async () => {
      const { Fretboard } = await import('@moonwave99/fretboard.js');
      if (cancelled || !containerRef.current) return;

      const board = new Fretboard({
        el: containerRef.current,
        tuning,
        stringCount: tuning.length,
        fretCount: rangeTo,
        width: 960,
        height: 320,
      });

      const dots = notes
        .filter(
          (n) =>
            n.stringIndex >= 0 &&
            n.stringIndex < tuning.length &&
            n.fret >= rangeFrom &&
            n.fret <= rangeTo
        )
        .map((n) => ({
          string: toLibraryString(n.stringIndex),
          fret: n.fret,
          role: n.role,
          disabled: n.isActive === false,
        }));

      board.setDots(dots).render();

      (Object.keys(ROLE_COLORS) as FretboardNote['role'][]).forEach((role) => {
        board.style({ filter: { role }, fill: ROLE_COLORS[role] });
      });
    })();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tuning, rangeFrom, rangeTo, notes]);

  return <div ref={containerRef} className={className} />;
}
