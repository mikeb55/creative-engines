import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { bigBandDrumStylesForBand, getBigBandDrumStyle } from '../../engine/bigBandDrums.js';

import { DRUMMER_MODULES, findPattern, getDrummerModule } from '../../engine/drummers/index.js';



const DrumSelectionContext = createContext(null);



export function DrumSelectionProvider({ children }) {

  const [drummerId, setDrummerId] = useState('elvin');

  const [patternName, setPatternName] = useState(() => getDrummerModule('elvin')?.patterns[0]?.name ?? '');

  const [presetId, setPresetId] = useState(null);

  const [bigBandDrumStyleId, setBigBandDrumStyleId] = useState(null);

  const [useBigBandDrums, setUseBigBandDrums] = useState(false);



  const drummer = useMemo(() => getDrummerModule(drummerId), [drummerId]);



  const activePattern = useMemo(() => {

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



  const selectDrummer = useCallback((id) => {

    setDrummerId(id);

    setPresetId(null);

    setUseBigBandDrums(false);

    const mod = getDrummerModule(id);

    const first = mod?.patterns[0];

    if (first) setPatternName(first.name);

  }, []);



  const selectPattern = useCallback((name) => {

    setPatternName(name);

    setPresetId(null);

    setUseBigBandDrums(false);

  }, []);



  const loadPreset = useCallback((preset) => {

    setDrummerId(preset.drummer);

    setPatternName(preset.patternName);

    setPresetId(preset.id);

    setUseBigBandDrums(false);

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

  }, []);



  const syncBigBandDrumFromBandStyle = useCallback((bandStyle, preferredId) => {

    if (preferredId && getBigBandDrumStyle(preferredId)?.bandStyle === bandStyle) {

      selectBigBandDrumStyle(preferredId);

      return;

    }

    const first = bigBandDrumStylesForBand(bandStyle)[0];

    if (first) selectBigBandDrumStyle(first.id);

  }, [selectBigBandDrumStyle]);



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

        patternName: bb.name,

        feel: bb.feel,

        meter: '4/4',

        kicks: [...bb.patterns.kicks],

        snares: [...bb.patterns.snares],

        hats: [...bb.patterns.hats],

        ride: [...bb.patterns.ride],

        description: bb.description,

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


