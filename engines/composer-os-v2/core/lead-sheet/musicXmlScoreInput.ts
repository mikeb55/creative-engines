/**
 * MuseScore-style MusicXML intake: plain UTF-8 XML or compressed .mxl (ZIP + META-INF/container.xml).
 * Browser-safe (TextDecoder + fflate); no Node-only Buffer in the hot path.
 */

import { unzipSync } from 'fflate';

export type MusicXmlScoreFormat = 'plain-xml' | 'mxl-zip' | 'utf8-text';

export interface ExtractMusicXmlScoreResult {
  ok: boolean;
  /** Normalized score XML (trimmed), only when ok. */
  xml?: string;
  errors: string[];
  format?: MusicXmlScoreFormat;
}

function stripBomText(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function decodeUtf8Lenient(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function isPkZip(bytes: Uint8Array, offset: number): boolean {
  return bytes.length >= offset + 4 && bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b;
}

function latin1StringToUint8Array(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c & 0xff;
  }
  return out;
}

function pickRootfileFullPath(containerXml: string): string | null {
  const m = containerXml.match(/<rootfile[^>]*full-path\s*=\s*"([^"]+)"/i);
  return m?.[1]?.trim() ?? null;
}

function findZipEntry(files: Record<string, Uint8Array>, wanted: string): Uint8Array | undefined {
  const norm = wanted.replace(/\\/g, '/').replace(/^\/+/, '');
  const keys = Object.keys(files);
  const mapped = keys.map((k) => ({ k, n: k.replace(/\\/g, '/') }));
  let hit = mapped.find(({ n }) => n === norm);
  if (hit) return files[hit.k];
  hit = mapped.find(({ n }) => n.toLowerCase() === norm.toLowerCase());
  if (hit) return files[hit.k];
  const tail = norm.split('/').pop() ?? norm;
  hit = mapped.find(({ n }) => n.endsWith('/' + tail) || n === tail);
  return hit ? files[hit.k] : undefined;
}

function extractFromMxlZipBuffer(zipBytes: Uint8Array): ExtractMusicXmlScoreResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBytes);
  } catch {
    return { ok: false, errors: ['Compressed MusicXML (.mxl) could not be opened (invalid or corrupt ZIP archive).'] };
  }
  const keys = Object.keys(files);
  if (keys.length === 0) {
    return { ok: false, errors: ['Compressed MusicXML (.mxl) archive is empty.'] };
  }

  const containerKey = keys.find((k) => /META-INF\/container\.xml$/i.test(k.replace(/\\/g, '/')));
  if (containerKey) {
    const containerXml = decodeUtf8Lenient(files[containerKey]);
    const scorePath = pickRootfileFullPath(containerXml);
    if (!scorePath) {
      return {
        ok: false,
        errors: ['Compressed MusicXML (.mxl): META-INF/container.xml has no usable <rootfile full-path="…"> entry.'],
      };
    }
    const normalized = scorePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const entry = findZipEntry(files, normalized);
    if (!entry) {
      return {
        ok: false,
        errors: [`Compressed MusicXML (.mxl): score file "${scorePath}" was not found inside the archive.`],
      };
    }
    const innerText = decodeUtf8Lenient(entry);
    return classifyPlainScoreXml(innerText, 'mxl-zip');
  }

  const musicXmlKey = keys.find((k) => /\.musicxml$/i.test(k.replace(/\\/g, '/')));
  if (musicXmlKey) {
    const innerText = decodeUtf8Lenient(files[musicXmlKey]);
    return classifyPlainScoreXml(innerText, 'mxl-zip');
  }

  return {
    ok: false,
    errors: [
      'Compressed MusicXML (.mxl): could not locate META-INF/container.xml or a .musicxml entry inside the ZIP.',
    ],
  };
}

function classifyPlainScoreXml(text: string, format: MusicXmlScoreFormat): ExtractMusicXmlScoreResult {
  const t = text.trim();
  if (!t.startsWith('<')) {
    return {
      ok: false,
      errors: ['MusicXML content does not start with an XML tag (expected "<?xml …" or "<score-partwise>").'],
    };
  }
  if (/<score-timewise\b/i.test(t)) {
    return {
      ok: false,
      errors: [
        'LeadSheet MusicXML supports score-partwise scores only; this document uses <score-timewise>. Re-export from MuseScore as uncompressed MusicXML (partwise), or convert timewise → partwise in your notation software.',
      ],
    };
  }
  if (!/<score-partwise\b/i.test(t)) {
    return {
      ok: false,
      errors: [
        'Not a recognized MusicXML score document: expected <score-partwise> as the score root (after unpacking .mxl if applicable).',
      ],
    };
  }
  return { ok: true, xml: t, errors: [], format };
}

/**
 * Bytes: UTF-8/BOM plain score XML, or a ZIP-based .mxl container (MuseScore downloads).
 */
export function extractScoreMusicXmlFromUint8Array(input: Uint8Array): ExtractMusicXmlScoreResult {
  if (!input || input.length === 0) {
    return { ok: false, errors: ['Empty MusicXML input.'] };
  }
  let off = 0;
  if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
    off = 3;
  }
  const body = off > 0 ? input.subarray(off) : input;
  if (isPkZip(body, 0)) {
    return extractFromMxlZipBuffer(body);
  }
  const text = decodeUtf8Lenient(body);
  return classifyPlainScoreXml(text, 'utf8-text');
}

/**
 * Pasted / API string: plain XML text, or rare Latin-1 binary accidentally in a string (ZIP magic).
 */
export function extractScoreMusicXmlFromString(text: string): ExtractMusicXmlScoreResult {
  if (text == null) {
    return { ok: false, errors: ['Empty MusicXML input.'] };
  }
  const trimmed = stripBomText(text).trimStart();
  if (trimmed.startsWith('<')) {
    return classifyPlainScoreXml(trimmed, 'plain-xml');
  }
  const buf = latin1StringToUint8Array(trimmed);
  if (buf.length >= 4 && isPkZip(buf, 0)) {
    return extractFromMxlZipBuffer(buf);
  }
  return {
    ok: false,
    errors: [
      'LeadSheet input is not plain MusicXML text (does not start with "<"). For MuseScore compressed downloads (.mxl), use "Choose file" so the app can unpack the ZIP container — do not paste binary data as text.',
    ],
  };
}
