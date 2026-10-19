/**
 * Sign one already-built Mac candidate in place. Does not install or launch.
 * Usage: tsx install/signMacCandidateCli.ts <Candidate.app>
 */
import { signMacCandidate } from './signMacCandidate';

const appPath = process.argv[2];
if (!appPath) {
  console.error('usage: tsx install/signMacCandidateCli.ts <Candidate.app>');
  process.exit(1);
}

try {
  signMacCandidate(appPath);
  console.log('signed and verified:', pathLabel(appPath));
  console.log('freeze: do not modify this bundle after verification');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function pathLabel(value: string): string {
  return value;
}
