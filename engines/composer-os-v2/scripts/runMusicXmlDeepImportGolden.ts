import { runMusicXmlDeepImportV65P3GoldenTests } from '../tests/musicXmlImport.test';

const rows = runMusicXmlDeepImportV65P3GoldenTests();
let failed = 0;

for (const row of rows) {
  if (row.ok) {
    console.log(`PASS ${row.name}`);
  } else {
    failed++;
    console.error(`FAIL ${row.name}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
