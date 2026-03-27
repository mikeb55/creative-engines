/**
 * After `npm run build`, production JS must include Riff Generator strings (desktop copies dist).
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('Vite dist exposes Riff Generator', () => {
  it('includes riff_generator and Riff Generator in bundled JS', () => {
    const assetsDir = path.join(__dirname, '..', 'dist', 'assets');
    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    let found = false;
    for (const f of files) {
      const s = fs.readFileSync(path.join(assetsDir, f), 'utf-8');
      if (s.includes('riff_generator') && s.includes('Riff Generator')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
