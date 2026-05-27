import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { bigBandDrumStylesForBand, getBigBandDrumStyle } from '../../engine/bigBandDrums.js';
import { DRUMMER_MODULES, findPattern, getDrummerModule } from '../../engine/drummers/index.js';

const DrumSelectionContext = createContext(null);

const VOICE_KEYS = { kick: 'kicks', snare: 'snares', hat: 'hats', ride: 'ride' };

export function DrumSelectionProvider({ children }) {
  const [drummerId, setDrummerId] = useState('elvin');
  const [patternName, setPatternName] = useState(() => getDrummerModule('elvin')?.patterns[0]?.name ?? '');
  const [presetId, setPresetId] = useState(null);
  const [bigBandDrumStyleId, setBigBandDrumStyleId] = useState(null);
  const [useBigBandDrums, setUseBigBandDrums] = useState(false);
  const [patternOverride, setPatternOverride] = useState(null);

  const drummer = useMemo(() => getDrummerModule(drummerId), [drummerId]);

  const sourcePattern = useMemo(() => {
    if (useBigBandDrums && bigBandDrumStyleId) {
      const bb = getBigBandDrumStyle(bigBandDrumStyleId);
      if (bb) {
        return {
          name: bb.name,
          feel: bb.feel,
          meter: '4/4',
          kicks: bb.patterns.kicks,
          snares: bb.patterns.snares,
          hats: bb.patterns.hats,
          ride: bb.patterns.ride,
          description: bb.description,
        };
      }
    }
    if (!drummer) return null;
    return drummer.patterns.find((p) => p.name === patternName) ?? drummer.patterns[0] ?? null;
  }, [drummer, patternName, useBigBandDrums, bigBandDrumStyleId]);

  const activePattern = useMemo(() => {
    if (!sourcePattern) return null;
    if (!patternOverride) return sourcePattern;
    return {
      ...sourcePattern,
      ...patternOverride,
      kicks: patternOverride.kicks ?? sourcePattern.kicks,
      snares: patternOverride.snares ?? sourcePattern.snares,
      hats: patternOverride.hats ?? sourcePattern.hats,
      ride: patternOverride.ride ?? sourcePattern.ride,
      name: patternOverride.name ?? `${sourcePattern.name} (edited)`,
    };
  }, [sourcePattern, patternOverride]);

  const clearPatternOverride = useCallback(() => setPatternOverride(null), []);

  const selectDrummer = useCallback((id) => {
    setDrummerId(id);
    setPresetId(null);
    setUseBigBandDrums(false);
    setPatternOverride(null);
    const mod = getDrummerModule(id);
    const first = mod?.patterns[0];
    if (first) setPatternName(first.name);
  }, []);

  const selectPattern = useCallback((name) => {
    setPatternName(name);
    setPresetId(null);
    setUseBigBandDrums(false);
    setPatternOverride(null);
  }, []);

  const loadPreset = useCallback((preset) => {
    setDrummerId(preset.drummer);
    setPatternName(preset.patternName);
    setPresetId(preset.id);
    setUseBigBandDrums(false);
    setPatternOverride(null);
  }, []);

  const selectBigBandDrumStyle = useCallback((id) => {
    if (!id) {
      setUseBigBandDrums(false);
      setBigBandDrumStyleId(null);
      return;
    }
    setBigBandDrumStyleId(id);
    setUseBigBandDrums(true);
    setPresetId(null);
    setPatternOverride(null);
  }, []);

  const syncBigBandDrumFromBandStyle = useCallback(
    (bandStyle, preferredId) => {
      if (preferredId && getBigBandDrumStyle(preferredId)?.bandStyle === bandStyle) {
        selectBigBandDrumStyle(preferredId);
        return;
      }
      const first = bigBandDrumStylesForBand(bandStyle)[0];
      if (first) selectBigBandDrumStyle(first.id);
    },
    [selectBigBandDrumStyle]
  );

  const applyToolboxPattern = useCallback((lanes) => {
    setPatternOverride({
      kicks: [...(lanes.kicks ?? [])],
      snares: [...(lanes.snares ?? [])],
      hats: [...(lanes.hats ?? [])],
      ride: [...(lanes.ride ?? [])],
      name: 'Rhythm toolbox',
    });
    setUseBigBandDrums(false);
  }, []);

  const applyToolboxVoiceLane = useCallback((voice, lane16) => {
    const key = VOICE_KEYS[voice];
    if (!key) return;
    const indices = lane16.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    setPatternOverride((prev) => {
      const base = prev ?? {};
      return { ...base, [key]: indices, name: 'Rhythm toolbox' };
    });
    setUseBigBandDrums(false);
  }, []);

  const payloadPattern = useMemo(() => {
    if (!activePattern) return null;
    if (useBigBandDrums && bigBandDrumStyleId) {
      const bb = getBigBandDrumStyle(bigBandDrumStyleId);
      if (!bb) return null;
      return {
        drummerId: 'big_band',
        drummerName: bb.name,
        bigBandDrumStyleId: bb.id,
        bandStyle: bb.bandStyle,
        patternName: activePattern.name,
        feel: activePattern.feel,
        meter: '4/4',
        kicks: [...activePattern.kicks],
        snares: [...activePattern.snares],
        hats: [...activePattern.hats],
        ride: [...activePattern.ride],
        description: activePattern.description,
      };
    }
    if (!drummer) return null;
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
  }, [activePattern, drummer, drummerId, presetId, useBigBandDrums, bigBandDrumStyleId]);

  const value = useMemo(
    () => ({
      drummerModules: DRUMMER_MODULES,
      drummerId,
      drummer,
      patternName,
      activePattern,
      presetId,
      bigBandDrumStyleId,
      useBigBandDrums,
      payloadPattern,
      selectDrummer,
      selectPattern,
      loadPreset,
      selectBigBandDrumStyle,
      syncBigBandDrumFromBandStyle,
      applyToolboxPattern,
      applyToolboxVoiceLane,
      clearPatternOverride,
      findPattern,
    }),
    [
      drummerId,
      drummer,
      patternName,
      activePattern,
      presetId,
      bigBandDrumStyleId,
      useBigBandDrums,
      payloadPattern,
      selectDrummer,
      selectPattern,
      loadPreset,
      selectBigBandDrumStyle,
      syncBigBandDrumFromBandStyle,
      applyToolboxPattern,
      applyToolboxVoiceLane,
      clearPatternOverride,
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
