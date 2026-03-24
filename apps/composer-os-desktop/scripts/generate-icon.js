/**
 * Generate a minimal placeholder icon for Composer OS Desktop.
 * Run: node scripts/generate-icon.js
 * Creates resources/icon.png (256x256, accent color).
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'resources');
const outFile = path.join(outDir, 'icon.png');

fs.mkdirSync(outDir, { recursive: true });

// Minimal valid 256x256 PNG (purple accent #6366f1)
const width = 256;
const height = 256;
const crc32 = (data) => {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const adler32 = (data) => {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return (b << 16) | a;
};

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const chunk = (type, data) => {
  const buf = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  return Buffer.concat([Buffer.from([0, 0, 0, 0]), buf, Buffer.from([(crc >> 24) & 255, (crc >> 16) & 255, (crc >> 8) & 255, crc & 255])]);
};

const raw = [];
for (let y = 0; y < height; y++) {
  raw.push(0);
  for (let x = 0; x < width; x++) {
    raw.push(99, 102, 241, 255); // #6366f1 RGBA
  }
}
const rawBuf = Buffer.from(raw);
const zlib = require('zlib');
const compressed = zlib.deflateSync(rawBuf, { level: 9 });
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr.writeUInt8(8, 8);
ihdr.writeUInt8(6, 9);
ihdr.writeUInt8(0, 10);
ihdr.writeUInt8(0, 11);
ihdr.writeUInt8(0, 12);

const ihdrChunk = chunk('IHDR', ihdr);
ihdrChunk.writeUInt32BE(13, 0);
const idatChunk = chunk('IDAT', compressed);
idatChunk.writeUInt32BE(compressed.length, 0);
const iendChunk = chunk('IEND', Buffer.alloc(0));
iendChunk.writeUInt32BE(0, 0);

const out = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
fs.writeFileSync(outFile, out);
console.log('Generated:', outFile);
