import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DRUMMER_MODULES, findPattern, getDrummerModule } from '../../engine/drummers/index.js';

const DrumSelectionContext = createContext(null);

export function DrumSelectionProvider({ children }) {
  const [drummerId, setDrummerId] = useState('elvin');
  const [patternName, setPatternName] = useState(() => getDrummerModule('elvin')?.patterns[0]?.name ?? '');
  const [presetId, setPresetId] = useState(null);

  const drummer = useMemo(() => getDrummerModule(drummerId), [drummerId]);

  const activePattern = useMemo(() => {
    if (!drummer) return null;
    return drummer.patterns.find((p) => p.name === patternName) ?? drummer.patterns[0] ?? null;
  }, [drummer, patternName]);

  const selectDrummer = useCallback((id) => {
    setDrummerId(id);
    setPresetId(null);
    const mod = getDrummerModule(id);
    const first = mod?.patterns[0];
    if (first) setPatternName(first.name);
  }, []);

  const selectPattern = useCallback((name) => {
    setPatternName(name);
    setPresetId(null);
  }, []);

  const loadPreset = useCallback((preset) => {
    setDrummerId(preset.drummer);
    setPatternName(preset.patternName);
    setPresetId(preset.id);
  }, []);

  const payloadPattern = useMemo(() => {
    if (!activePattern || !drummer) return null;
    return {
      drummerId,
      drummerName: drummer.name,
      presetId: presetId ?? undefined,
      patternName: activePattern.name,
      feel: activePattern.feel,
      meter: activePattern.meter,
      kicks: [...activePattern.kicks],
      snares: [...activePattern.snares],
      hats: [...activePattern.hats],
      ride: [...activePattern.ride],
      description: activePattern.description,
    };
  }, [activePattern, drummer, drummerId, presetId]);

  const value = useMemo(
    () => ({
      drummerModules: DRUMMER_MODULES,
      drummerId,
      drummer,
      patternName,
      activePattern,
      presetId,
      payloadPattern,
      selectDrummer,
      selectPattern,
      loadPreset,
    }),
    [
      drummerId,
      drummer,
      patternName,
      activePattern,
      presetId,
      payloadPattern,
      selectDrummer,
      selectPattern,
      loadPreset,
    ]
  );

  return <DrumSelectionContext.Provider value={value}>{children}</DrumSelectionContext.Provider>;
}

export function useDrumSelection() {
  const ctx = useContext(DrumSelectionContext);
  if (!ctx) {
    throw new Error('useDrumSelection must be used within DrumSelectionProvider');
  }
  return ctx;
}
