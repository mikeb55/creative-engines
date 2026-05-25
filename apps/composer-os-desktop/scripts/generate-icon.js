/**
 * Generate Composer OS Desktop icons.
 * Creates:
 * - resources/icon.png for BrowserWindow/taskbar runtime hints
 * - resources/icon.ico for electron-builder Windows executable resources
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'resources');
const outPngFile = path.join(outDir, 'icon.png');
const outIcoFile = path.join(outDir, 'icon.ico');

fs.mkdirSync(outDir, { recursive: true });

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

const chunk = (type, data) => {
  const buf = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(Buffer.concat([Buffer.from(type), data]));
  return Buffer.concat([Buffer.from([0, 0, 0, 0]), buf, Buffer.from([(crc >> 24) & 255, (crc >> 16) & 255, (crc >> 8) & 255, crc & 255])]);
};

function pixelFor(size, x, y) {
  const pad = Math.max(2, Math.round(size * 0.08));
  const rx = x / (size - 1);
  const ry = y / (size - 1);
  const border = x < pad || y < pad || x >= size - pad || y >= size - pad;
  const stripe = Math.abs(x - y) < Math.max(1, size * 0.045);
  const cStroke =
    x > size * 0.22 &&
    x < size * 0.72 &&
    y > size * 0.22 &&
    y < size * 0.78 &&
    (x < size * 0.34 || y < size * 0.34 || y > size * 0.66);
  const dot = Math.hypot(rx - 0.66, ry - 0.58) < 0.12;
  if (cStroke || dot) return [255, 255, 255, 255];
  if (border) return [38, 39, 101, 255];
  if (stripe) return [129, 140, 248, 255];
  return [99, 102, 241, 255];
}

function pngBuffer(size) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      raw.push(...pixelFor(size, x, y));
    }
  }
  const rawBuf = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
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

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function icoBuffer(sizes) {
  const images = sizes.map((size) => ({ size, data: pngBuffer(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((image, index) => {
    const i = index * 16;
    dir.writeUInt8(image.size === 256 ? 0 : image.size, i);
    dir.writeUInt8(image.size === 256 ? 0 : image.size, i + 1);
    dir.writeUInt8(0, i + 2);
    dir.writeUInt8(0, i + 3);
    dir.writeUInt16LE(1, i + 4);
    dir.writeUInt16LE(32, i + 6);
    dir.writeUInt32LE(image.data.length, i + 8);
    dir.writeUInt32LE(offset, i + 12);
    offset += image.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((image) => image.data)]);
}

fs.writeFileSync(outPngFile, pngBuffer(256));
fs.writeFileSync(outIcoFile, icoBuffer([16, 32, 48, 64, 128, 256]));
console.log('Generated:', outPngFile);
console.log('Generated:', outIcoFile);
