/**
 * HTTP registration for Solo Piano. Calls persistPianoComposition only.
 */

import type { Express, Request, Response } from 'express';
import { persistPianoComposition } from '../engines/composer-os-v2/app-api/pianoCompositionPersist';

export function attachPianoComposeRoute(app: Express, outputDir: string): void {
  app.post('/api/piano/compose', (req: Request, res: Response) => {
    try {
      res.json(persistPianoComposition(req.body, outputDir));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, code: 'validation', error });
    }
  });
}
