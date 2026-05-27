import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ContrapuntalContext = createContext(null);

export const CONTRAPUNTAL_SPECIES = [
  { id: 'first', label: 'First species', hint: 'note against note' },
  { id: 'second', label: 'Second species', hint: 'two notes per cantus note' },
  { id: 'third', label: 'Third species', hint: 'four notes per cantus note' },
  { id: 'fourth', label: 'Fourth species', hint: 'syncopation / suspensions' },
  { id: 'fifth', label: 'Fifth species', hint: 'florid (mixed)' },
  { id: 'free', label: 'Free', hint: 'no strict species constraint' },
];

export const CONTRAPUNTAL_STYLE_PRESETS = [
  { id: 'palestrina', label: 'Palestrina' },
  { id: 'bach', label: 'Bach' },
  { id: 'fux', label: 'Fux' },
  { id: 'hindemith', label: 'Hindemith' },
  { id: 'free_atonal', label: 'Free Atonal' },
];

const DEFAULT_RULES = {
  avoidParallelFifths: true,
  avoidParallelOctaves: true,
  contraryMotionPreference: true,
  noVoiceCrossing: true,
  resolveLeadingTone: true,
  dissonanceWeakBeatsOnly: true,
};

function buildSpeciesPairs(voiceCount) {
  const pairs = [];
  for (let i = 0; i < voiceCount - 1; i++) {
    pairs.push({
      pairKey: `${i + 1}-${i + 2}`,
      voiceA: i + 1,
      voiceB: i + 2,
      species: 'fifth',
    });
  }
  return pairs;
}

function buildDefault() {
  const voiceCount = 4;
  return {
    voiceCount,
    speciesPairs: buildSpeciesPairs(voiceCount),
    cantusSource: 'active_section',
    cantusCustom: '',
    directionBias: 'free',
    rules: { ...DEFAULT_RULES },
    stylePreset: 'palestrina',
  };
}

export function ContrapuntalProvider({ children }) {
  const [state, setState] = useState(buildDefault);

  const setVoiceCount = useCallback((voiceCount) => {
    const n = Math.max(2, Math.min(6, Math.round(voiceCount)));
    setState((prev) => ({
      ...prev,
      voiceCount: n,
      speciesPairs: buildSpeciesPairs(n),
    }));
  }, []);

  const setSpeciesForPair = useCallback((pairKey, species) => {
    setState((prev) => ({
      ...prev,
      speciesPairs: prev.speciesPairs.map((p) => (p.pairKey === pairKey ? { ...p, species } : p)),
    }));
  }, []);

  const setRule = useCallback((ruleKey, enabled) => {
    setState((prev) => ({
      ...prev,
      rules: { ...prev.rules, [ruleKey]: enabled },
    }));
  }, []);

  const contrapuntalConfig = useMemo(
    () => ({
      voiceCount: state.voiceCount,
      speciesPairs: state.speciesPairs.map((p) => ({ ...p })),
      cantusFirmus: {
        source: state.cantusSource,
        customEntry: state.cantusCustom.trim(),
        directionBias: state.directionBias,
      },
      rules: { ...state.rules },
      stylePreset: state.stylePreset,
    }),
    [state]
  );

  const value = useMemo(
    () => ({
      state,
      contrapuntalConfig,
      setVoiceCount,
      setSpeciesForPair,
      setRule,
      setCantusSource: (cantusSource) => setState((p) => ({ ...p, cantusSource })),
      setCantusCustom: (cantusCustom) => setState((p) => ({ ...p, cantusCustom })),
      setDirectionBias: (directionBias) => setState((p) => ({ ...p, directionBias })),
      setStylePreset: (stylePreset) => setState((p) => ({ ...p, stylePreset })),
    }),
    [state, contrapuntalConfig, setVoiceCount, setSpeciesForPair, setRule]
  );

  return <ContrapuntalContext.Provider value={value}>{children}</ContrapuntalContext.Provider>;
}

export function useContrapuntal() {
  const ctx = useContext(ContrapuntalContext);
  if (!ctx) throw new Error('useContrapuntal must be used within ContrapuntalProvider');
  return ctx;
}
