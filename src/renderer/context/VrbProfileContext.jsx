import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ECM_VRB_PRESETS, getEcmVrbPresetById, presetToVrbProfile } from '../../engine/ecmVrb.js';

const VrbProfileContext = createContext(null);

const DEFAULT_PRESET_ID = 'nordic_studio';

export function VrbProfileProvider({ children }) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [locked, setLocked] = useState(true);
  const [sliders, setSliders] = useState(() => {
    const p = getEcmVrbPresetById(DEFAULT_PRESET_ID);
    return p ? presetToVrbProfile(p) : null;
  });

  const applyPreset = useCallback(
    (id, forcePresetValues = false) => {
      const preset = getEcmVrbPresetById(id);
      if (!preset) return;
      setPresetId(id);
      if (locked || forcePresetValues) {
        setSliders(presetToVrbProfile(preset));
      }
    },
    [locked]
  );

  const updateSlider = useCallback((key, value) => {
    setSliders((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const resetToPreset = useCallback(() => {
    const preset = getEcmVrbPresetById(presetId);
    if (preset) setSliders(presetToVrbProfile(preset));
  }, [presetId]);

  const vrbProfile = sliders;

  const value = useMemo(
    () => ({
      presets: ECM_VRB_PRESETS,
      presetId,
      locked,
      setLocked,
      sliders,
      vrbProfile,
      applyPreset,
      updateSlider,
      resetToPreset,
    }),
    [presetId, locked, sliders, vrbProfile, applyPreset, updateSlider, resetToPreset]
  );

  return <VrbProfileContext.Provider value={value}>{children}</VrbProfileContext.Provider>;
}

export function useVrbProfile() {
  const ctx = useContext(VrbProfileContext);
  if (!ctx) throw new Error('useVrbProfile must be used within VrbProfileProvider');
  return ctx;
}
