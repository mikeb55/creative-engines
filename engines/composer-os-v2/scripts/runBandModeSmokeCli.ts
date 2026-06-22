import { runBandModeSmokeTests } from '../tests/bandModeSmoke.test';
for (const r of runBandModeSmokeTests()) {
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  if (!r.ok) process.exitCode = 1;
}
