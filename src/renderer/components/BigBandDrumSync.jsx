import { useEffect } from 'react';
import { useBigBand } from '../context/BigBandContext';
import { useDrumSelection } from '../context/DrumSelectionContext';

/** Keeps Structure-tab drummer selection aligned with Ensemble big-band style. */
export function BigBandDrumSync() {
  const { config } = useBigBand();
  const { syncBigBandDrumFromBandStyle } = useDrumSelection();

  useEffect(() => {
    syncBigBandDrumFromBandStyle(config.bandStyle, config.drumStyleId);
  }, [config.bandStyle, config.drumStyleId, syncBigBandDrumFromBandStyle]);

  return null;
}
