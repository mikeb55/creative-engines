/**
 * Writes docs/v4.0-phase3 evidence. Does not touch earlier phase folders.
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/writeV40Phase3Examples.ts
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { orchestrate } from '../core/orchestrate/orchestrate';
import type { SymphonicOrchestrationSettings } from '../core/orchestrate/types';

const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.env.V40_PHASE3_OUT ? path.resolve(process.env.V40_PHASE3_OUT) : path.join(ROOT, 'docs/v4.0-phase3');
const SRC = path.join(ROOT, 'docs/v3.5-phase1');

function sha(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}

function exportedPositiveVelocities(zipBytes: Buffer): number {
  const zip = unzipSync(zipBytes);
  const values = new Set<number>();
  for (const name of Object.keys(zip)) {
    if (!name.endsWith('.mid')) continue;
    const data = Buffer.from(zip[name]!);
    let pos = 14;
    while (pos + 8 <= data.length && data.toString('ascii', pos, pos + 4) === 'MTrk') {
      const end = pos + 8 + data.readUInt32BE(pos + 4);
      pos += 8;
      let status = 0;
      while (pos < end) {
        let byte = 0;
        do byte = data[pos++]!;
        while (byte & 0x80);
        if (data[pos]! >= 0x80) status = data[pos++]!;
        if (status === 0xff) {
          data[pos++]!;
          let length = 0;
          do {
            byte = data[pos++]!;
            length = (length << 7) | (byte & 0x7f);
          } while (byte & 0x80);
          pos += length;
          continue;
        }
        if (status === 0xf0 || status === 0xf7) {
          let length = 0;
          do {
            byte = data[pos++]!;
            length = (length << 7) | (byte & 0x7f);
          } while (byte & 0x80);
          pos += length;
          continue;
        }
        const kind = status & 0xf0;
        data[pos++]!;
        const data2 = kind === 0xc0 || kind === 0xd0 ? 0 : data[pos++]!;
        if (kind === 0x90 && data2 > 0) values.add(data2);
      }
      pos = end;
    }
  }
  return values.size;
}

const settings: Record<string, SymphonicOrchestrationSettings> = {
  lyrical: { allocation: 'phase-2', expression: 'expressive', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'limited', percussion: 'limited' } },
  contrapuntal: { allocation: 'phase-2', expression: 'expressive', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'off', strings: 'open', harp: 'off', percussion: 'off' } },
  rhythmic: { allocation: 'phase-2', expression: 'expressive', activity: 'moderate', foreground: 'source-register', counterline: 'when-source-allows', families: { woodwind: 'open', brass: 'open', strings: 'open', harp: 'limited', percussion: 'open' } },
};

const summaries: string[] = [];
for (const id of ['lyrical', 'contrapuntal', 'rhythmic'] as const) {
  const xml = readFileSync(path.join(SRC, id, 'source.musicxml'), 'utf8');
  const legacySettings = { ...settings[id]! };
  delete legacySettings.expression;
  const expressed = orchestrate({
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: settings[id] } },
  });
  const legacy = orchestrate({
    enabled: true,
    sourceMusicXml: xml,
    template: 'chamber_orchestra',
    plan: [],
    seed: 11,
    preserveMelody: true,
    pianoChamber: { action: 'realise', sourceMusicXml: xml, correction: { mode: 'developing', reviewConfirmed: true, ensemble: 'symphonic', symphonic: legacySettings } },
  });
  if (!expressed.ok || !('musicXml' in expressed) || !expressed.midiSetBase64 || !expressed.fidelity?.symphonic?.expression) {
    throw new Error(expressed.ok ? `${id} missing expression` : expressed.error);
  }
  if (!legacy.ok || !('musicXml' in legacy)) throw new Error(legacy.ok ? `${id} missing legacy` : legacy.error);
  const expression = expressed.fidelity.symphonic.expression;
  const midiZip = Buffer.from(expressed.midiSetBase64, 'base64');
  const exportedVelocityLevels = exportedPositiveVelocities(midiZip);
  const dir = path.join(OUT, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${id}.musicxml`), expressed.musicXml);
  writeFileSync(path.join(dir, 'phase2.musicxml'), legacy.musicXml);
  writeFileSync(path.join(dir, 'symphony-midi-set.zip'), midiZip);
  writeFileSync(path.join(dir, 'expression.json'), JSON.stringify(expression, null, 2));
  writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify({
    source: `docs/v3.5-phase1/${id}/source.musicxml`,
    seed: 11,
    mode: 'developing',
    settings: settings[id],
    expressiveMusicXmlSha256: sha(expressed.musicXml),
    phase2MusicXmlSha256: sha(legacy.musicXml),
    midiZipSha256: sha(midiZip),
    expression: {
      dynamicMarks: expression.dynamicMarks,
      wedges: expression.wedges,
      slurs: expression.slurs,
      articulations: expression.articulations,
      marcato: expression.marcato,
      midiExpressionEvents: expression.midiExpressionEvents,
      plannedVelocityLevels: expression.plannedVelocityLevels,
      exportedPositiveNoteOnVelocityLevels: exportedVelocityLevels,
      identicalConsecutiveLong: expression.identicalConsecutiveLong,
    },
    artisticApproval: 'PENDING',
    note: 'Expressive orchestration keeps Phase 2 pitches, durations, and ties. MusicXML differs in dynamics, hairpins, slurs, and articulations. MIDI note-on and note-off ticks match. Planned velocity levels are the distinct velocities written on attacks. Exported positive note-on velocity levels are decoded from MIDI after the existing 1-127 to 1-100 writer scale. Those two counts are separate. Velocity 0 note-ons are excluded. CC11 is written only for hairpins.',
  }, null, 2));
  const line = `${id}: marks ${expression.dynamicMarks}, hairpins ${expression.wedges}, slurs ${expression.slurs}, articulations ${expression.articulations}, marcato ${expression.marcato}, planned velocity levels ${expression.plannedVelocityLevels}, exported positive note-on velocity levels ${exportedVelocityLevels}, cc11 ${expression.midiExpressionEvents}, repeated long patterns ${expression.identicalConsecutiveLong}`;
  summaries.push(line);
  console.log(line);
}

writeFileSync(path.join(OUT, 'TECHNICAL.md'), `# V4.0 Phase 3 — expressive orchestration

Technical evidence. Not artistic approval. Player feasibility was not reviewed. The music was not heard.

Expression is \`correction.symphonic.expression: "expressive"\` and it runs only with \`allocation: "phase-2"\`. Absent expression, and explicit \`legacy\`, keep the Phase 2 note pass. \`expressive\` on Phase 1 allocation is ignored. Chamber stays the default when \`ensemble\` is absent.

## Examples

Seed 11. Mode developing. Sources were not edited. Allocation stays Phase 2. Expression is the only added pass.

${summaries.map((line) => `- ${line}`).join('\n')}

Primary comparison is Phase 2 versus expressive Phase 2 on the same source, review, seed, and allocation. Pitches, durations, and ties match. MusicXML bytes differ where dynamics, hairpins, slurs, and articulations were written. MIDI note-on and note-off ticks match. MIDI velocities differ. CC11 follows a written hairpin, so those hairpins are in the MIDI file. No rubato was written.

## What the expression does

- Each part reads its phrase role: foreground, answer, support, bass, or colour.
- Contour is arch, rising, falling, leap, or static, taken from that part's notes. Tension mixes leap size, short-note density, phrase function, and the ending.
- Dynamics stay inside an instrument range: harp \`pp\`–\`mp\`, strings and winds \`pp\`/\`p\` through \`f\` (or \`ff\` only at high tension), brass and timpani \`mp\`–\`ff\`, percussion \`mf\`–\`ff\`.
- A hairpin is written only when the line has room and the contour moves. Static pads and harp do not get one. A long phrase does not repeat the previous phrase's pattern.
- A hairpin stays in one part, staff, and voice. Tied notes and chord members stay inside it. A rest in another voice does not end it. At the first gap it stops on the previous note's release, which is the rest's onset when the rest follows at once. That stop does not cross the rest. The written end value is the original dynamic line sampled at the release, not the full change squeezed into the short span. A clipped span under three attacks or under two quarters of onset is omitted. The hairpin is not extended into the next phrase.
- Strings and winds slur a stepwise group and stop at a rest or a leap. Brass slurs only a short legato group. Harp, timpani, and percussion do not slur. A tie is not split.
- Short notes outside a slur take staccato. A slur ending on a longer wind or string note takes tenuto. Brass and strings accent a leap arrival or a phrase-start downbeat. Marcato is one short unslurred brass or timpani peak in a high-tension leap, and the next phrase on that part does not repeat it.
- Note-on velocity follows the written dynamic, and it interpolates across a written hairpin. CC11 carries that same written span. \`planned velocity levels\` counts distinct attack velocities before export. \`exported positive note-on velocity levels\` counts distinct MIDI note-ons with velocity above 0. The MIDI writer still scales 1–127 into 1–100. The two counts are not the same measurement. The files were not played back in this run.

Artistic approval: PENDING.

## Limitations

- Player feasibility was not reviewed.
- The music was not heard.
- Desktop DEV and STABLE applications were not rebuilt.
- Playback remains four synchronized MIDI files at PPQ 480, plus the set manifest.
`);

console.log('wrote docs/v4.0-phase3');
