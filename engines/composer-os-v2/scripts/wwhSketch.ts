/**
 * npm run wwh:sketch -- <sketch.json>
 * Validates a hand-authored sketch, writes one MusicXML, opens MuseScore 4.
 */
import { runWwhSketch } from '../core/wwh/wwhSketch';

const file = process.argv[2];
if (!file) {
  console.error('usage: npm run wwh:sketch -- <sketch.json>');
  process.exit(1);
}
try {
  runWwhSketch(file);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
