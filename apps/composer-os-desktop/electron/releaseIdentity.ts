/**
 * User-facing Composer OS release names.
 * Package semver (package.json / CFBundleShortVersionString) is a separate installer number.
 * Authoritative strings live in releaseIdentity.json next to this module.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DesktopChannel } from './desktopChannel';

export type ReleaseChannelIdentity = {
  releaseLabel: string;
  windowTitle: string;
};

export type ReleaseIdentityFile = {
  stable: ReleaseChannelIdentity;
  dev: ReleaseChannelIdentity;
};

function isChannelIdentity(value: unknown): value is ReleaseChannelIdentity {
  if (!value || typeof value !== 'object') return false;
  const row = value as { releaseLabel?: unknown; windowTitle?: unknown };
  return typeof row.releaseLabel === 'string' && row.releaseLabel.trim().length > 0
    && typeof row.windowTitle === 'string' && row.windowTitle.trim().length > 0;
}

export function parseReleaseIdentity(raw: string): ReleaseIdentityFile {
  const parsed = JSON.parse(raw) as { stable?: unknown; dev?: unknown };
  if (!isChannelIdentity(parsed.stable) || !isChannelIdentity(parsed.dev)) {
    throw new Error('releaseIdentity.json must define stable and dev releaseLabel and windowTitle');
  }
  return {
    stable: { releaseLabel: parsed.stable.releaseLabel.trim(), windowTitle: parsed.stable.windowTitle.trim() },
    dev: { releaseLabel: parsed.dev.releaseLabel.trim(), windowTitle: parsed.dev.windowTitle.trim() },
  };
}

export function readReleaseIdentityFile(filePath: string): ReleaseIdentityFile {
  return parseReleaseIdentity(fs.readFileSync(filePath, 'utf8'));
}

export function releaseIdentityCandidates(): string[] {
  const candidates: string[] = [];
  if (typeof process.resourcesPath === 'string' && process.resourcesPath.length > 0) {
    candidates.push(path.join(process.resourcesPath, 'releaseIdentity.json'));
  }
  candidates.push(path.join(__dirname, 'releaseIdentity.json'));
  candidates.push(path.join(__dirname, '..', 'electron', 'releaseIdentity.json'));
  return candidates;
}

export function resolveReleaseIdentityPath(): string | null {
  for (const candidate of releaseIdentityCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function loadReleaseIdentity(): ReleaseIdentityFile {
  const filePath = resolveReleaseIdentityPath();
  if (!filePath) {
    throw new Error('releaseIdentity.json not found');
  }
  return readReleaseIdentityFile(filePath);
}

export function releaseDisplayForChannel(channel: DesktopChannel): ReleaseChannelIdentity {
  const identity = loadReleaseIdentity();
  return channel === 'dev' ? identity.dev : identity.stable;
}
