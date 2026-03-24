/**
 * Run golden path demo
 */
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import * as fs from 'fs';
import * as path from 'path';

const result = runGoldenPath(42);
console.log('Success:', result.success);
console.log('Integrity passed:', result.integrityPassed);
console.log('Behaviour gates passed:', result.behaviourGatesPassed);
console.log('MX validation passed:', result.mxValidationPassed);
console.log('Sibelius safe:', result.sibeliusSafe);
console.log('Errors:', result.errors);
if (result.xml) {
  console.log('XML length:', result.xml.length);
  const outDir = path.join(__dirname, '..', '..', '..', 'outputs', 'composer-os-v2');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'golden_path_demo.musicxml');
  fs.writeFileSync(outPath, result.xml, 'utf-8');
  console.log('Written:', outPath);
}
