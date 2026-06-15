// Build composerCoverageManifest.json from repo sources (read-only parse).
// Run from repo root: node scripts/buildComposerRegistryManifest.mjs [--write]
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'composerCoverageManifest.json');
const HOME_GENERATE = path.join(ROOT, 'apps/composer-os-app/src/pages/HomeGenerate.tsx');
const DISPATCH_TS = path.join(ROOT, 'engines/composer-os-v2/core/mosaic-mode/mosaicComposerDispatch.ts');
const RUN_SMOKE = path.join(ROOT, 'engines/composer-os-v2/tests/runSmokeTests.ts');
const SMOKE_DIR = path.join(ROOT, 'engines/composer-os-v2/tests');
const CORE_DIR = path.join(ROOT, 'engines/composer-os-v2/core');

const ARRANGEMENT_PATH_NOTES = {
  debussy: 'Auditions on Song Mode duo path; no dedicated native ensemble surface.',
  messiaen: 'Auditions on Song Mode duo path; no dedicated native ensemble surface.',
  steve_reich: 'Auditions on Song Mode duo path; no dedicated native ensemble surface.',
};

function extractStringArray(source, constName) {
  const re = new RegExp(`const ${constName}(?:\\:[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = source.match(re);
  if (!m) throw new Error(`buildComposerRegistryManifest: missing ${constName}`);
  const ids = [];
  for (const q of m[1].matchAll(/'([^']+)'/g)) ids.push(q[1]);
  return ids;
}

function parseSongwriterOptions(source) {
  const re = /const SONGWRITER_OPTIONS[^=]*=\s*\[([\s\S]*?)\n\];/;
  const m = source.match(re);
  if (!m) throw new Error('buildComposerRegistryManifest: missing SONGWRITER_OPTIONS');
  const options = [];
  for (const row of m[1].matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']*)'\s*\}/g)) {
    options.push({ id: row[1], label: row[2] });
  }
  return options;
}

function parseSliceRows(source) {
  const start = source.indexOf('const SLICE_ROWS: SliceRow[] = [');
  const end = source.indexOf('];', start);
  if (start < 0 || end < 0) throw new Error('buildComposerRegistryManifest: missing SLICE_ROWS');
  const block = source.slice(start, end);
  const rows = new Map();
  const rowRe =
    /\{\s*composerId:\s*'([^']+)',\s*mod:\s*'([^']+)',\s*precompute:\s*'([^']*)',\s*accumulate:\s*(null|'[^']*'),\s*createAcc:\s*(null|'[^']*'),\s*finalize:\s*(null|'[^']*'|__\w+__),\s*apply:\s*(null|'[^']*'|__\w+__)/g;
  for (const m of block.matchAll(rowRe)) {
    const val = (v) => (v === 'null' || v.startsWith('__') ? null : v.replace(/^'|'$/g, ''));
    rows.set(m[1], {
      mod: m[2],
      precompute: m[3] || null,
      accumulate: val(m[4]),
      finalize: val(m[6]),
      apply: val(m[7]),
    });
  }
  return rows;
}

function parseAliasMap(source, mapName) {
  const re = new RegExp(`const ${mapName}[^=]*=\\s*\\{([\\s\\S]*?)\\};`);
  const m = source.match(re);
  if (!m) return {};
  const out = {};
  for (const pair of m[1].matchAll(/(\w+):\s*'([^']+)'/g)) out[pair[1]] = pair[2];
  return out;
}

function resolveCanonicalSliceId(composerId, sliceRows, sliceRowAliasIds, dispatchStubAliases, composerIdAliases) {
  let id = composerId.trim();
  if (!id) return undefined;
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (sliceRows.has(id)) return id;
    const next =
      sliceRowAliasIds[id] ?? dispatchStubAliases[id] ?? composerIdAliases[id];
    if (!next || next === id) return undefined;
    id = next;
  }
  return undefined;
}

function parseSmokeAllowlist(runSmokeSource) {
  const imported = new Set();
  for (const m of runSmokeSource.matchAll(/from '\.\/([^']+SliceSmoke\.test)'/g)) {
    imported.add(m[1]);
  }
  return imported;
}

function mapSmokeTestsToComposerIds() {
  const byFile = new Map();
  for (const name of fs.readdirSync(SMOKE_DIR)) {
    if (!name.endsWith('SliceSmoke.test.ts')) continue;
    const fileBase = name.replace(/\.ts$/, '');
    const content = fs.readFileSync(path.join(SMOKE_DIR, name), 'utf8');
    const ids = new Set();
    for (const m of content.matchAll(/primarySongwriterStyle:\s*'([^']+)'/g)) ids.add(m[1]);
    byFile.set(fileBase, ids);
  }
  return byFile;
}

function gitLastTouchIso(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${relPath.replace(/\\/g, '/')}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function composerStatus({ shipped, smoke, partial }) {
  if (partial) return 'Partial wiring';
  if (shipped && !smoke) return 'Ready, smoke gap';
  if (shipped && smoke) return 'Ready';
  return 'Library only';
}

function sliceFileRel(modPath) {
  return path.join('engines/composer-os-v2/core', `${modPath}.ts`).replace(/\\/g, '/');
}

export function buildComposerCoverageManifest() {
  const homeSource = fs.readFileSync(HOME_GENERATE, 'utf8');
  const dispatchSource = fs.readFileSync(DISPATCH_TS, 'utf8');
  const runSmokeSource = fs.readFileSync(RUN_SMOKE, 'utf8');

  const songwriterOptions = parseSongwriterOptions(homeSource);
  const shippedOrder = extractStringArray(homeSource, 'SONGWRITER_GROUP_SHIPPED_ORDER');
  const shippedSinger = extractStringArray(homeSource, 'SONGWRITER_GROUP_SHIPPED_SINGER_SONGWRITER_ORDER');
  const shippedPrimarySet = new Set(shippedOrder);
  const shippedSingerSet = new Set(shippedSinger);
  const shippedIds = new Set([...shippedOrder, ...shippedSinger]);

  const sliceRows = parseSliceRows(dispatchSource);
  const sliceRowAliasIds = parseAliasMap(dispatchSource, 'SLICE_ROW_ALIAS_IDS');
  const dispatchStubAliases = parseAliasMap(dispatchSource, 'DISPATCH_STUB_ALIASES');

  let composerIdAliases = {};
  const aliasesPath = path.join(CORE_DIR, 'groups/composerGroupDefinitions.ts');
  if (fs.existsSync(aliasesPath)) {
    const aliasBlock = fs.readFileSync(aliasesPath, 'utf8');
    const exportMatch = aliasBlock.match(/export const COMPOSER_ID_ALIASES[^=]*=\s*\{([\s\S]*?)\};/);
    if (exportMatch) {
      for (const pair of exportMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)) {
        composerIdAliases[pair[1]] = pair[2];
      }
    }
  }

  const smokeAllowlist = parseSmokeAllowlist(runSmokeSource);
  const smokeByFile = mapSmokeTestsToComposerIds();

  const smokeByComposer = new Map();
  for (const [fileBase, ids] of smokeByFile) {
    if (!smokeAllowlist.has(fileBase)) continue;
    for (const id of ids) smokeByComposer.set(id, true);
  }

  function isWired(id) {
    return Boolean(
      resolveCanonicalSliceId(id, sliceRows, sliceRowAliasIds, dispatchStubAliases, composerIdAliases)
    );
  }

  function isPartial(id) {
    const canonical = resolveCanonicalSliceId(
      id,
      sliceRows,
      sliceRowAliasIds,
      dispatchStubAliases,
      composerIdAliases
    );
    if (!canonical) return false;
    const row = sliceRows.get(canonical);
    if (!row?.precompute) return false;
    return row.accumulate == null && row.finalize == null;
  }

  function sliceFileFor(id) {
    const canonical = resolveCanonicalSliceId(
      id,
      sliceRows,
      sliceRowAliasIds,
      dispatchStubAliases,
      composerIdAliases
    );
    if (!canonical) return null;
    const row = sliceRows.get(canonical);
    return row ? sliceFileRel(row.mod) : null;
  }

  let sourceCommit = 'unknown';
  try {
    sourceCommit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    // ignore
  }

  const composers = songwriterOptions.map(({ id, label }) => {
    const sliceFile = sliceFileFor(id);
    const shipped = shippedIds.has(id);
    const smoke = smokeByComposer.get(id) === true;
    const partial = isPartial(id);
    const entry = {
      id,
      displayName: label,
      shipped,
      shippedGroup: shippedPrimarySet.has(id)
        ? 'primary'
        : shippedSingerSet.has(id)
          ? 'singer_songwriter'
          : null,
      wired: isWired(id),
      smoke,
      partial,
      arrangementPath: ARRANGEMENT_PATH_NOTES[id] ?? null,
      sliceFile,
      lastVerified: sliceFile ? gitLastTouchIso(sliceFile) : null,
      quality: null,
    };
    entry.status = composerStatus(entry);
    return entry;
  });

  composers.sort((a, b) => a.id.localeCompare(b.id));

  return {
    sourceCommit,
    generatedAt: new Date().toISOString(),
    shippedSummary: {
      primaryOrderCount: shippedOrder.length,
      singerSongwriterOrderCount: shippedSinger.length,
      totalShippedIds: shippedIds.size,
      sources: [
        'SONGWRITER_GROUP_SHIPPED_ORDER',
        'SONGWRITER_GROUP_SHIPPED_SINGER_SONGWRITER_ORDER',
      ],
    },
    composers,
    _meta: {
      shippedIds: [...shippedIds].sort(),
      sliceRowIds: [...sliceRows.keys()].sort(),
      sliceRowAliasIds,
      dispatchStubAliases,
      composerIdAliases,
    },
  };
}

export function manifestPayloadForCompare(manifest) {
  return JSON.stringify({ composers: manifest.composers }, null, 2);
}

export function writeManifest(manifest) {
  const out = {
    sourceCommit: manifest.sourceCommit,
    generatedAt: manifest.generatedAt,
    shippedSummary: manifest.shippedSummary,
    composers: manifest.composers,
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return MANIFEST_PATH;
}

function main() {
  const write = process.argv.includes('--write');
  const manifest = buildComposerCoverageManifest();
  if (write) {
    const outPath = writeManifest(manifest);
    const shipped = manifest.composers.filter((c) => c.shipped).length;
    console.log(`Wrote ${outPath} (${manifest.composers.length} composers, ${shipped} shipped)`);
  } else {
    console.log(manifestPayloadForCompare(manifest));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
