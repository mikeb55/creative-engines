/**
 * Browser ESM bundle for generateFullSongMusicXml (TunePainter offline probe recipe).
 *
 * Reuses desktop esbuild plugins + build-time Node/asset/@napi-rs stubs and a
 * minimal process.env banner. Does not modify composition engines.
 *
 *   node engines/composer-os-v2/scripts/buildFullSongBrowserBundle.cjs
 *
 * Output: .tmp-full-song-browser-bundle/full-song.browser.js
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../../..');
const desktopScripts = path.join(repoRoot, 'apps/composer-os-desktop/scripts');

const { composerOsExcludeTestFilesPlugin } = require(
  path.join(desktopScripts, 'esbuild-exclude-test-files-plugin.js')
);
const { composerOsMdStubPlugin } = require(
  path.join(desktopScripts, 'esbuild-md-stub-plugin.js')
);
const { composerOsMosaicSliceRequirePlugin } = require(
  path.join(desktopScripts, 'esbuild-mosaic-slice-require-plugin.js')
);

const entryPoint = path.join(
  repoRoot,
  'engines/composer-os-v2/core/song-mode/fullSongBrowserApi.ts'
);
const outDir = path.join(repoRoot, '.tmp-full-song-browser-bundle');
const outfile = path.join(outDir, 'full-song.browser.js');

const PROCESS_BANNER =
  'var process = globalThis.process || { env: {} }; if (!process.env) process.env = {}; globalThis.process = process;';

const composerOsExcludeWpsBaselineWinPlugin = {
  name: 'composer-os-exclude-wps-baseline-win',
  setup(build) {
    const isBaseline = (p) => (p || '').replace(/\\/g, '/').includes('/wps/baseline/');
    build.onResolve({ filter: /.*/ }, (args) => {
      if (isBaseline(args.path) || isBaseline(args.importer)) {
        return { path: args.path, namespace: 'composer-os-wps-baseline-stub' };
      }
    });
    build.onLoad({ filter: /.*/, namespace: 'composer-os-wps-baseline-stub' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

/** Sync SHA-256 for musical-evaluation receipts (node:crypto is stubbed in browser). */
const CRYPTO_BROWSER_STUB = `
function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
function sha256(bytes) {
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]);
  const H = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
  ]);
  const bitLen = bytes.length * 8;
  const withPad = bytes.length + 1 + 8;
  const total = ((withPad + 63) & ~63);
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 4, bitLen >>> 0, false);
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
  const w = new Uint32Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, w[t-15]) ^ rotr(18, w[t-15]) ^ (w[t-15] >>> 3);
      const s1 = rotr(17, w[t-2]) ^ rotr(19, w[t-2]) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h=g; g=f; f=e; e=(d + t1) >>> 0; d=c; c=b; b=a; a=(t1 + t2) >>> 0;
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
  }
  let out = '';
  for (let i = 0; i < 8; i++) out += H[i].toString(16).padStart(8, '0');
  return out;
}
function toBytes(data, enc) {
  if (typeof data === 'string') {
    if (enc === 'hex') {
      const clean = data.replace(/[^0-9a-f]/gi, '');
      const out = new Uint8Array(clean.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
      return out;
    }
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(data);
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data.charCodeAt(i) & 0xff;
    return out;
  }
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data || []);
}
function createHash(alg) {
  if (String(alg).toLowerCase() !== 'sha256') throw new Error('browser crypto stub supports sha256 only');
  const chunks = [];
  return {
    update(data, enc) { chunks.push(toBytes(data, enc)); return this; },
    digest(enc) {
      let len = 0; for (const c of chunks) len += c.length;
      const all = new Uint8Array(len);
      let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      const hex = sha256(all);
      if (enc === 'hex' || enc == null) return hex;
      const out = new Uint8Array(hex.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
      return out;
    },
  };
}
module.exports = { createHash, createHmac() { throw new Error('hmac not available in browser stub'); } };
`;

const nodeBuiltinStubPlugin = {
  name: 'node-builtin-stub',
  setup(build) {
    const builtins =
      /^(fs|path|crypto|os|util|stream|buffer|events|child_process|worker_threads|http|https|net|tls|zlib|url|assert|module|vm|tty|constants|querystring|string_decoder|perf_hooks|readline|dns|dgram|cluster|inspector|async_hooks|v8|trace_events|punycode|domain|fs\/promises|path\/posix|path\/win32)(\/.*)?$|^node:/;
    build.onResolve({ filter: builtins }, (args) => ({
      path: args.path,
      namespace: 'node-builtin-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'node-builtin-stub' }, (args) => {
      const id = String(args.path || '').replace(/^node:/, '');
      if (id === 'crypto' || id.startsWith('crypto/')) {
        return { contents: CRYPTO_BROWSER_STUB, loader: 'js' };
      }
      return {
        contents: 'module.exports = {};',
        loader: 'js',
      };
    });
  },
};

const assetStubPlugin = {
  name: 'asset-stub',
  setup(build) {
    build.onLoad(
      {
        filter:
          /\.(musicxml|xml|mid|midi|wav|mp3|png|jpg|jpeg|gif|pdf|json\.gz|DS_Store|node)$/,
      },
      () => ({
        contents: 'module.exports = {};',
        loader: 'js',
      })
    );
  },
};

const napiCanvasStubPlugin = {
  name: 'napi-canvas-stub',
  setup(build) {
    build.onResolve({ filter: /^@napi-rs\/canvas/ }, (args) => ({
      path: args.path,
      namespace: 'napi-canvas-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'napi-canvas-stub' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

fs.mkdirSync(outDir, { recursive: true });

esbuild
  .build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    outfile,
    target: ['es2020'],
    logLevel: 'warning',
    write: true,
    banner: { js: PROCESS_BANNER },
    define: {
      'process.env.NODE_ENV': '"production"',
      global: 'globalThis',
    },
    plugins: [
      composerOsExcludeWpsBaselineWinPlugin,
      composerOsExcludeTestFilesPlugin,
      composerOsMdStubPlugin,
      composerOsMosaicSliceRequirePlugin,
      nodeBuiltinStubPlugin,
      assetStubPlugin,
      napiCanvasStubPlugin,
    ],
  })
  .then(() => {
    const bytes = fs.statSync(outfile).size;
    console.log(
      JSON.stringify(
        {
          ok: true,
          entry: path.relative(repoRoot, entryPoint),
          outfile: path.relative(repoRoot, outfile),
          bytes,
          banner: 'globalThis.process={env:{}}',
        },
        null,
        2
      )
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
