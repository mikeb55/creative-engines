/**
 * Patch-level semver bump for Composer OS Desktop (package.json version).
 */

export function bumpPatchSemver(version: string): string {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    throw new Error(`Expected semver x.y.z, got: ${version}`);
  }
  const major = m[1];
  const minor = m[2];
  const patch = Number(m[3]) + 1;
  return `${major}.${minor}.${patch}`;
}
