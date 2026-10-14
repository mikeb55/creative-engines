/**
 * Batch D audition examples. Writes only under ~/Downloads/BHL-Composer/Batch-D-Complete.
 * Does not modify the album.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCompose, apiBhlSaveProject } from '../app-api/bhlApp';
import { sha256File } from '../core/bhl/bhlIngest';

const SOURCE = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const SPAN = { from: 33, to: 40 };
const OUT = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Batch-D-Complete');
const MARK = 'CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED';

function stamp(xml: string, title: string): string {
  const safe = `${title} — ${MARK}`.replace(/&/g, '&amp;');
  if (xml.includes('<movement-title>')) {
    return xml.replace(/<movement-title>[\s\S]*?<\/movement-title>/, `<movement-title>${safe}</movement-title>`);
  }
  return xml.replace(/<score-partwise[^>]*>/, (open) => `${open}\n  <movement-title>${safe}</movement-title>`);
}

function writeExample(name: string, body: Record<string, unknown>): string {
  const row = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: 3340, ...body });
  if (!row.ok) throw new Error(`${name}: ${row.error}`);
  const file = path.join(OUT, `${name}.musicxml`);
  if (fs.existsSync(file)) throw new Error(`refusing to overwrite ${file}`);
  fs.writeFileSync(file, stamp(row.xml, name));
  fs.writeFileSync(path.join(OUT, `${name}.notes.txt`), [
    MARK,
    `world ${row.world ?? ''}`,
    row.colourConstraint ?? '',
    ...(row.rhythmNotes ?? []),
    ...(row.resourceLimitations ?? []),
    `verification ${row.verification.ok}`,
    `reimport ${Boolean((row.transfers?.performanceComposer as { reimport?: boolean } | undefined)?.reimport)}`,
  ].join('\n'));
  return file;
}

fs.mkdirSync(OUT, { recursive: true });
const before = sha256File(SOURCE);
const pitch = { pitchSource: 'riff', pitchSeed: 17, rhythmSeed: 17, displacementQuarters: 0.5 };
writeExample('01-riff-pitch-original-rhythm', { world: 'A', musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'original' } } });
writeExample('01-riff-pitch-bhl-rhythm', { world: 'A', musical: { riff: { ...pitch, rhythmSource: 'bhl', transform: 'original' } } });
writeExample('02-same-rhythm-world-A', { world: 'A', musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'continue' } } });
writeExample('02-same-rhythm-world-E', { world: 'E', musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'continue' } } });
writeExample('03-riff-a-pitch-engine-rhythm-seed-29', {
  world: 'C',
  musical: { riff: { pitchSource: 'riff', rhythmSource: 'other-riff', pitchSeed: 17, rhythmSeed: 29, transform: 'original', displacementQuarters: 0.5 } },
});
const dialogue = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'B',
  musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'continue' } },
});
if (!dialogue.ok) throw new Error(dialogue.error);
const file4 = path.join(OUT, '04-riff-rhythm-dialogue.musicxml');
if (fs.existsSync(file4)) throw new Error(`refusing to overwrite ${file4}`);
const regions = dialogue.plan.regions.map((region) => ({ id: region.id, density: 'counterline', dialogue: region.role === 'continuation' ? 'leave-space' : 'answer-after-bass' }));
const spoken = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'B',
  regions,
  protectedGuitarBars: [33],
  musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'continue' } },
});
if (!spoken.ok) throw new Error(spoken.error);
fs.writeFileSync(file4, stamp(spoken.xml, '04-riff-rhythm-dialogue'));
writeExample('05-contrasting-pentatonic', {
  world: 'E',
  musical: { pentatonic: { archetypeId: 'suspended_pentatonic', referenceNote: 'D', relationshipId: 'home', contrastId: 'hirajoshi' } },
});
writeExample('06-common-tone-transfer', {
  world: 'E',
  musical: {
    pentatonic: { archetypeId: 'major_pentatonic', referenceNote: 'C', relationshipId: 'home', contrastId: 'mixolydian_pentatonic' },
    motif: { kind: 'import', pitches: [60, 64, 67, 69], pitchTransform: 'none' },
  },
});
writeExample('07-cross-engine-handoff', {
  world: 'A',
  musical: { riff: { ...pitch, rhythmSource: 'riff', transform: 'displace', displacementQuarters: 0.5 } },
});
const projectPath = path.join(OUT, '08-saved-integrated-project.bhl.json');
if (!fs.existsSync(projectPath)) {
  const project = apiBhlSaveProject({
    path: projectPath,
    project: {
      format: 'bhl-project',
      version: 1,
      id: 'batch-d-example-08',
      title: 'Batch D saved project',
      savedAt: new Date().toISOString(),
      notes: MARK,
      mode: 'import',
      source: { path: SOURCE, sha256: before },
      span: SPAN,
      world: 'E',
      settings: {
        seed: 3340,
        musical: { pentatonic: { archetypeId: 'suspended_pentatonic', referenceNote: 'D', relationshipId: 'home', contrastId: 'remote_altered' }, riff: { ...pitch, rhythmSource: 'riff', transform: 'continue' } },
      },
      candidates: [],
      selectedCandidateId: null,
    },
  });
  if (!project.ok) throw new Error(project.error);
}
fs.writeFileSync(path.join(OUT, '04-riff-rhythm-dialogue.notes.txt'), [
  MARK,
  `protected guitar bar 33`,
  `verification ${spoken.verification.ok}`,
  `voices ${spoken.events.filter((event) => event.voice === '2').length}`,
].join('\n'));
if (sha256File(SOURCE) !== before) throw new Error('album changed');
console.log(OUT);
