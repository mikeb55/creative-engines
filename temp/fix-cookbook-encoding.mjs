import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = path.join(root, 'docs', 'TRITONIC_BB_COOKBOOK.md');

let text = fs.readFileSync(mdPath, 'utf8');
text = text
  .replace(/â€"/g, '\u2014')
  .replace(/â€“/g, '\u2013')
  .replace(/\uFFFD/g, '\u2014');

fs.writeFileSync(mdPath, text, 'utf8');
const count = (text.match(/\u2014/g) ?? []).length;
console.log(`Fixed ${mdPath}: ${count} em dashes`);
