import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { scheduleFills, FILL_TYPES } from '../../engine/fillScheduler.js';
import { useDrumSelection } from './DrumSelectionContext';
import { useCompositionSong } from './CompositionSongContext';

const FillSchedulerContext = createContext(null);

export function FillSchedulerProvider({ children }) {
  const { activePattern } = useDrumSelection();
  const { song } = useCompositionSong();
  const [fillDensity, setFillDensity] = useState(0.5);
  const [fillTypeId, setFillTypeId] = useState('standard_4');
  const [lockFills, setLockFills] = useState(false);
  const [lockedFillPositions, setLockedFillPositions] = useState(null);

  const sectionBars = song?.totalBars ?? 32;

  const schedule = useMemo(() => {
    if (!activePattern) return null;
    return scheduleFills(activePattern, sectionBars, fillDensity, {
      fillTypeId,
      lockedFillPositions: lockFills ? lockedFillPositions ?? undefined : undefined,
    });
  }, [activePattern, sectionBars, fillDensity, fillTypeId, lockFills, lockedFillPositions]);

  const setLockFillsOn = useCallback(
    (on) => {
      setLockFills(on);
      if (on && schedule?.fillPositions) {
        setLockedFillPositions([...schedule.fillPositions]);
      }
      if (!on) setLockedFillPositions(null);
    },
    [schedule]
  );

  const fillSchedulerConfig = useMemo(() => {
    if (!activePattern || fillDensity <= 0) return null;
    return {
      fillDensity,
      fillTypeId,
      lockFills,
      sectionBars,
      fillPositions: schedule?.fillPositions ?? [],
      lockedFillPositions: lockFills ? lockedFillPositions ?? schedule?.fillPositions : undefined,
    };
  }, [activePattern, fillDensity, fillTypeId, lockFills, sectionBars, schedule, lockedFillPositions]);

  const value = useMemo(
    () => ({
      fillTypes: FILL_TYPES,
      fillDensity,
      setFillDensity,
      fillTypeId,
      setFillTypeId,
      lockFills,
      setLockFills: setLockFillsOn,
      schedule,
      sectionBars,
      fillSchedulerConfig,
    }),
    [
      fillDensity,
      fillTypeId,
      lockFills,
      setLockFillsOn,
      schedule,
      sectionBars,
      fillSchedulerConfig,
    ]
  );

  return <FillSchedulerContext.Provider value={value}>{children}</FillSchedulerContext.Provider>;
}

export function useFillScheduler() {
  const ctx = useContext(FillSchedulerContext);
  if (!ctx) throw new Error('useFillScheduler must be used within FillSchedulerProvider');
  return ctx;
}
