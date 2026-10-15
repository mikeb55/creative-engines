import { VexFlow } from 'vexflow';

let fontsReady = false;
let fontsPromise: Promise<void> | null = null;

/** VexFlow 5 draws nothing useful until Bravura and Academico are loaded. */
export function ensureVexFlowFonts(): Promise<void> {
  if (fontsReady) return Promise.resolve();
  if (!fontsPromise) {
    fontsPromise = VexFlow.loadFonts('Bravura', 'Academico').then(() => {
      VexFlow.setFonts('Bravura', 'Academico');
      fontsReady = true;
    });
  }
  return fontsPromise;
}
