// CI drift check for composerCoverageManifest.json
// Run from repo root: node scripts/checkComposerRegistryManifest.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildComposerCoverageManifest,
  manifestPayloadForCompare,
} from './buildComposerRegistryManifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'composerCoverageManifest.json');

function resolveCanonicalSliceId(composerId, meta) {
  const { sliceRowIds, sliceRowAliasIds, dispatchStubAliases, composerIdAliases } = meta;
  const sliceSet = new Set(sliceRowIds);
  let id = composerId.trim();
  if (!id) return undefined;
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (sliceSet.has(id)) return id;
    const next =
      sliceRowAliasIds[id] ?? dispatchStubAliases[id] ?? composerIdAliases[id];
    if (!next || next === id) return undefined;
    id = next;
  }
  return undefined;
}

function main() {
  const errors = [];
  const fresh = buildComposerCoverageManifest();

  for (const shippedId of fresh._meta.shippedIds) {
    const canonical = resolveCanonicalSliceId(shippedId, fresh._meta);
    if (!canonical) {
      errors.push(`shipped composer "${shippedId}" has no SLICE_ROWS / dispatch entry`);
    }
  }

  if (!fs.existsSync(MANIFEST_PATH)) {
    errors.push(`missing committed manifest: ${path.relative(ROOT, MANIFEST_PATH)} (run npm run composer:manifest)`);
  } else {
    let committed;
    try {
      committed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      errors.push(`invalid JSON in composerCoverageManifest.json: ${e.message}`);
      committed = null;
    }
    if (committed) {
      const freshPayload = manifestPayloadForCompare(fresh);
      const committedPayload = JSON.stringify({ composers: committed.composers }, null, 2);
      if (freshPayload !== committedPayload) {
        errors.push(
          'composerCoverageManifest.json is stale versus repo sources (run npm run composer:manifest)'
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('composer registry manifest drift check FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const shipped = fresh.composers.filter((c) => c.shipped).length;
  console.log(`composer registry manifest drift check PASSED (${shipped} shipped composers)`);
}

main();
