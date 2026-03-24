/**
 * Composer OS App — API integration test
 * Proves app can trigger Composer OS generation successfully.
 */

import * as path from 'path';
import { generateComposition } from '@composer-os/app-api/generateComposition';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEST_OUTPUT = path.join(REPO_ROOT, 'outputs', 'composer-os-app-integration-test');

describe('App API integration', () => {
  it('triggers Composer OS generation successfully', () => {
    const result = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 12345,
      },
      TEST_OUTPUT
    );
    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/\.musicxml$/);
    expect(result.validation).toBeDefined();
    expect(typeof result.validation.readiness.release).toBe('number');
  });
});
