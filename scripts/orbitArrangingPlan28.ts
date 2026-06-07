// @ts-nocheck
/**
 * Orbit 28-bar lead sheet — New Orleans + Big Band MusicContext arranging guide.
 * Chords via iReal-style paste; engines: new_orleans + big_band (harmonyBars shell).
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/orbitArrangingPlan28.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeChordSymbol } from '../engines/composer-os-v2/core/harmony/chordSymbolAnalysis';
import { parseChordProgressionInputWithBarCount } from '../engines/composer-os-v2/core/harmony/chordProgressionParser';
import { buildMusicContextFromHarmonyBars } from '../engines/composer-os-v2/core/music-context/harmonyBarsMusicContextShell';
import { computeMusicContextChecksum } from '../engines/composer-os-v2/core/music-context/musicContextAdapters';
import { buildMusicContextFromNewOrleans } from '../engines/composer-os-v2/core/new-orleans/newOrleansMusicContextProducer';
import { buildMusicContextFromBigBand } from '../engines/composer-os-v2/core/big-band/bigBandMusicContextProducer';
import type { NewOrleansCompingStyle } from '../engines/composer-os-v2/core/new-orleans/newOrleansMusicContextTypes';
import type { BigBandCompingStyle } from '../engines/composer-os-v2/core/big-band/bigBandMusicContextTypes';

const REV_DIR =
  process.env.ORBIT_REV_DIR ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-NewOrleans-Revision';
const OUT_PLAN = path.join(REV_DIR, 'Orbit-ArrangingPlan.md');
const MIDI_DIR =
  process.env.ORBIT_MIDI_DIR ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\New Orleans Orbit Beats';

const BPM = 90;
const KEY_PC = 5; // F

/** iReal paste — one chord per bar, 28 bars (N.C. preserved as NC for engine) */
const CHORDS_RAW: string[] = [
  'N.C.',
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'Abmaj7',
  'Gbmaj7',
  'Ebmaj7',
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'N.C.',
  'Gbmaj7',
  'Emaj7',
  'G',
  'G',
  'Eb',
  'Eb',
  'G',
  'G',
  'G',
  'Dbmaj7',
  'Bb7',
  'Fmaj7',
  'N.C.',
];

const CHORD_PASTE = CHORDS_RAW.join(' | ');

function normalizeOrbitBar(sym: string): string {
  if (/^n\.?c\.?$/i.test(sym.trim())) return 'NC';
  return normalizeChordSymbol(sym);
}

type SectionSpec = {
  id: string;
  label: string;
  start: number;
  end: number;
  melodyOwner: string;
  engine: 'new_orleans' | 'big_band';
  nolaStyles: NewOrleansCompingStyle[];
  bbStyle?: BigBandCompingStyle;
  grooveMidi: string;
  fillMidi?: string;
  fillAtBar?: number;
  backgroundRiff: string;
  soundBlurb: string;
};

const SECTIONS: SectionSpec[] = [
  {
    id: 'intro',
    label: 'Intro',
    start: 1,
    end: 4,
    melodyOwner: 'Tenor Sax (hint only — bar 1 pickup C4)',
    engine: 'new_orleans',
    nolaStyles: ['second_line'],
    grooveMidi: 'Intro 01.mid',
    backgroundRiff:
      'Tbn + Tpt **pedal F–Ab–C#** whole/half over N.C.→Fmaj7; bone **anticipation on & of 4** into each new root. Piano **montuno shell** (R–3–5–7) sparse — one hit per beat max.',
    soundBlurb:
      'Street-parade setup: drums from Intro 01, tuba/bone feel implied in low register. Melody only peeks bar 1; horns paint the descending maj7 chain F→Eb→Db without stepping on future alto line.',
  },
  {
    id: 'head_a',
    label: 'Head A',
    start: 5,
    end: 13,
    melodyOwner: 'Alto Sax (primary melody — do not fragment)',
    engine: 'new_orleans',
    nolaStyles: ['second_line', 'anticipation_bass', 'brass_punch_offbeat'],
    grooveMidi: 'HeadGroove.mid',
    fillMidi: 'Fills 03.mid',
    fillAtBar: 13,
    backgroundRiff:
      '**Hook A** (bars 5–8): Tpt/Tbn unison **Bb–C#–C–Bb** eighth pickups answering alto; bone **anticipates** root on & of 4 before each change. Bars 9–12: **call–response** — Tpt **F–Eb–Ab** quarters offbeat (& of 2), Tbn **answer** on beat 1+ of following bar. Bar 13: horns **rest** — alto has half-note F4.',
    soundBlurb:
      'Full second-line ride: snare/backbeat sacred on 2 and 4. Brass punches stay **off the 3** and off downbeat-4; bass walks with anticipations into Bbm9 and Gb. Alto carries the singable head; ensemble is commentary.',
  },
  {
    id: 'head_b',
    label: 'Head B',
    start: 14,
    end: 17,
    melodyOwner: 'Tenor Sax (melody continues)',
    engine: 'new_orleans',
    nolaStyles: ['second_line', 'anticipation_bass', 'brass_punch_offbeat'],
    grooveMidi: 'HeadGroove.mid',
    backgroundRiff:
      '**Hook B**: muted Tpt **C4–C#4–Bb3** pattern mirrors tenor pickups; Tbn **pedal F3** with slides into bar 16 **Gbmaj7**. Bar 15 N.C.: **stop-time** 1 bar — drums only + bone hits on 2 and 4.',
    soundBlurb:
      'Same pocket as Head A but tenor registers warmer; horns thinner so the line breathes toward the bridge. Bar 17 Bb3 half sets up the key change without shouting.',
  },
  {
    id: 'bridge',
    label: 'Bridge (G major)',
    start: 18,
    end: 24,
    melodyOwner: 'Trumpet (G major section)',
    engine: 'big_band',
    nolaStyles: [],
    bbStyle: 'brass_punch',
    grooveMidi: 'ShoutParade.mid',
    fillMidi: 'Fills 05.mid',
    fillAtBar: 24,
    backgroundRiff:
      '**Sax soli pad** (A/T) **G–B–D–Eb** quarter rhythm under trumpet; bars 20–21 **Eb** pedal — bone + bari line **G–Bb–D**. Bars 22–24: **shout stack** Tpt/Tbn **G–G–G** hits on 1 and &2; sax **soli texture** — chromatic approach **D–Eb–F** into Dbmaj7 setup.',
    soundBlurb:
      'Climax lane: Composer OS **big_band / brass_punch** grid — ensemble hits on **1** and **& of 2**, not beat 4 downbeat. Trumpet owns the lyric G tune; saxes provide soli cushion, not competing melody.',
  },
  {
    id: 'outro',
    label: 'Outro',
    start: 25,
    end: 28,
    melodyOwner: 'Ensemble (return home — alto/tenor unison on pickup, then release)',
    engine: 'big_band',
    nolaStyles: ['brass_punch_offbeat'],
    bbStyle: 'shell_voicing',
    grooveMidi: 'RideoutHalfTime.mid',
    fillMidi: 'Fills 05.mid',
    fillAtBar: 28,
    backgroundRiff:
      'Bars 25–26: **shell voicings** (3–7–9) on **Dbmaj7→Bb7** — piano + guitar comp; horns **punch** & of 2 and 4& only. Bar 27 **Fmaj7**: sax unison **C–F–Eb** from melody; bar 28 N.C. **tag** — whole-band **cutoff** with bone **F** pedal.',
    soundBlurb:
      'Half-time rideout feel: thinner texture, clearer shells, final brass offbeats echo second-line parade without full shout density. Last bar is air — don’t over-write.',
  },
];

const NOLA_BEAT_PATTERN: Record<NewOrleansCompingStyle, string> = {
  second_line: 'all_beats',
  anticipation_bass: 'beats_2_4',
  brass_punch_offbeat: 'offbeats',
};

const BB_BEAT_PATTERN: Record<BigBandCompingStyle, string> = {
  brass_punch: 'all_beats',
  sax_soli: 'beats_1_3',
  shell_voicing: 'beats_2_4',
  freddie_green: 'beats_2_4',
};

/** 3-2 son clave in 4/4 — strong beats for backbeat alignment */
const CLAVE_STRONG = [2, 4];

function beatPatternToPunches(pattern: string, sectionLabel: string): string[] {
  if (pattern === 'offbeats') return ['1&', '2&', '4&'];
  if (pattern === 'beats_2_4') return ['2', '4', '4&'];
  if (pattern === 'beats_1_3') return ['1', '3', '1&'];
  if (pattern === 'all_beats' && sectionLabel.includes('Bridge')) return ['1', '2&', '3&', '4&'];
  if (pattern === 'all_beats') return ['1', '2&', '3&', '4&'];
  return ['2', '4'];
}

function sliceBars(all: string[], start: number, end: number): string[] {
  return all.slice(start - 1, end);
}

function chordSummary(bars: string[], scoreStartBar: number): string {
  const parts: string[] = [];
  let i = 0;
  while (i < bars.length) {
    const sym = bars[i];
    let j = i;
    while (j + 1 < bars.length && bars[j + 1] === sym) j++;
    const barStart = scoreStartBar + i;
    const barEnd = scoreStartBar + j;
    parts.push(
      barStart === barEnd ? `bar ${barStart}: ${sym}` : `bars ${barStart}–${barEnd}: ${sym}`,
    );
    i = j + 1;
  }
  return parts.join('; ');
}

function buildSectionContext(
  section: SectionSpec,
  harmonyBars: string[],
): { ctxJson: string; punches: string[] } {
  const punches: string[] = [];
  if (section.engine === 'big_band' && section.bbStyle) {
    const ctx = buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'big_band',
      presetId: 'big_band',
      bpm: BPM,
      receipts: [
        {
          engine: 'big_band',
          kind: 'big_band_realisation_complete',
          payload: {
            sectionId: section.id,
            compingStyle: section.bbStyle,
            beatPattern: BB_BEAT_PATTERN[section.bbStyle],
            barCount: harmonyBars.length,
            harmonyChecksum: computeMusicContextChecksum(harmonyBars),
            bpm: BPM,
          },
        },
      ],
    });
    punches.push(...beatPatternToPunches(BB_BEAT_PATTERN[section.bbStyle], section.label));
    return {
      ctxJson: JSON.stringify(
        {
          presetId: ctx.presetId,
          sourceEngineId: ctx.provenance?.sourceEngineId,
          bpm: ctx.bpm,
          key: ctx.key,
          harmonyChecksum: ctx.harmony.checksum,
          bars: ctx.harmony.bars,
          receipt: ctx.receipts[0]?.payload,
        },
        null,
        2,
      ),
      punches,
    };
  }

  const style = section.nolaStyles[0] ?? 'second_line';
  const templateCtx = buildMusicContextFromNewOrleans({
    key: KEY_PC,
    tempo: BPM,
    compingStyle: style,
  });
  const ctx = buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'new_orleans',
    presetId: 'new_orleans',
    bpm: BPM,
    receipts: section.nolaStyles.map((compingStyle) => ({
      engine: 'new_orleans',
      kind: 'new_orleans_realisation_complete',
      payload: {
        sectionId: section.id,
        compingStyle,
        beatPattern: NOLA_BEAT_PATTERN[compingStyle],
        barCount: harmonyBars.length,
        harmonyChecksum: computeMusicContextChecksum(harmonyBars),
        bpm: BPM,
        templateReference: templateCtx.harmony.checksum,
      },
    })),
  });
  for (const cs of section.nolaStyles) {
    punches.push(...beatPatternToPunches(NOLA_BEAT_PATTERN[cs], section.label));
  }
  const uniquePunches = [...new Set(punches)].sort();
  return {
    ctxJson: JSON.stringify(
      {
        presetId: ctx.presetId,
        sourceEngineId: ctx.provenance?.sourceEngineId,
        bpm: ctx.bpm,
        key: ctx.key,
        harmonyChecksum: ctx.harmony.checksum,
        bars: ctx.harmony.bars,
        receipts: ctx.receipts.map((r) => r.payload),
        claveStrongBeats: CLAVE_STRONG,
      },
      null,
      2,
    ),
    punches: uniquePunches,
  };
}

function lockedMelodyNotes(): string {
  return `
| Bar | Melody (concert, locked) |
|-----|--------------------------|
| 1 | rest, **C4** quarter |
| 2 | **F4 Eb4 Ab3 C#4** quarters |
| 3 | **C4** quarter, rest ×3 |
| 4 | **C#3 F3 C4 C4** 8ths, **Eb4** 8th, rest |
| 5 | **Bb3** half, rest |
| 6 | rest, **C4 C#4 C4 Bb3 C4** 8ths, **F3** quarter |
| 7 | **F3** quarter, **C4 C#4** 8ths, **F#4 C#4** quarters |
| 8 | **C4 C#4** 8ths, **F#4** half, rest |
| 9 | **F4 Eb4** quarters, **Ab3 Bb3** 8ths, **C#4** quarter |
| 10 | **C4 F4 Eb4 Bb3** quarters |
| 11 | **C#4** quarter, **C4** half |
| 12 | rest, **F4** 8th, **Eb4** quarter, **F4** 8th, **G#4** 8th, **F4** quarter |
| 13 | **F4** half, rest |
| 14 | rest, **C4 C#4 C4** 8ths, **Bb3 C4** quarters |
| 15 | **F3** quarter, rest, **C4 C#4** quarters |
| 16 | **F#4 C#4** quarters, **C#4 C#4** 8ths, **Bb3** quarter |
| 17 | **Bb3** half, rest |
| 18 | rest, **F3 A3** 8ths, **C4 D4** quarters |
| 19 | **B3** quarter, **G3** half, rest |
| 20 | **G3 B3 D4 Eb4** quarters |
| 21 | **C4** whole |
| 22 | **C4 G3** quarters, **Eb4** quarter, rest |
| 23 | **D4 G3** quarters, **D4** half |
| 24 | **Bb3** half, rest |
| 25 | rest, **C4 F4 Eb4** quarters |
| 26 | **Eb4** quarter, **Ab3 Bb3** 8ths, **C4** quarter |
| 27 | **C4** half, rest |
| 28 | rest |
`.trim();
}

function buildPlan(allBars: string[]): string {
  const lines: string[] = [];
  lines.push('# Orbit — New Orleans + Big Band Arranging Plan (28 bars)');
  lines.push('');
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Tempo:** ${BPM} BPM · **Meter:** 4/4 · **Key area:** F major (bridge → G)`);
  lines.push(`**Source:** iReal-style chord paste → Composer OS \`normalizeChordSymbol\` / MusicContext producers`);
  lines.push(`**Output path:** \`${OUT_PLAN}\``);
  lines.push('');
  lines.push('> Arranging guide only — enter horn parts in Sibelius manually. Melody is **locked**; do not fragment across sections.');
  lines.push('');

  lines.push('## Chord chart (28 bars — paste input)');
  lines.push('');
  lines.push('```text');
  lines.push(CHORD_PASTE.replace(/\s*\|\s*/g, '\n'));
  lines.push('```');
  lines.push('');
  const parseCheck = parseChordProgressionInputWithBarCount(CHORD_PASTE, 28);
  lines.push(
    `Parser check: **${parseCheck.ok ? parseCheck.bars.length : 'FAIL'}** bars (expected 28; N.C. may fallback in strict parser — chart uses raw symbols)`,
  );
  lines.push('');

  lines.push('## Locked melody reference');
  lines.push('');
  lines.push(lockedMelodyNotes());
  lines.push('');

  lines.push('## Producer routing');
  lines.push('');
  lines.push('| Section | Bars | Engine | Comping / style |');
  lines.push('|---------|------|--------|-----------------|');
  for (const s of SECTIONS) {
    const styles =
      s.engine === 'big_band'
        ? `big_band: **${s.bbStyle}**`
        : `new_orleans: **${s.nolaStyles.join('**, **')}**`;
    lines.push(`| ${s.label} | ${s.start}–${s.end} | ${s.engine} | ${styles} |`);
  }
  lines.push('');

  lines.push('## SD3 drum groove palette');
  lines.push('');
  lines.push(`Folder: \`${MIDI_DIR}\``);
  lines.push('');
  lines.push('| File | Use |');
  lines.push('|------|-----|');
  lines.push('| **Intro 01.mid** | Intro — sparse setup |');
  lines.push('| **HeadGroove.mid** | Head A / Head B — second-line pocket |');
  lines.push('| **ShoutParade.mid** | Bridge — climax backbeat |');
  lines.push('| **RideoutHalfTime.mid** | Outro — half-time release |');
  lines.push('| **Fills 03.mid** | Head A seam (bar 13) |');
  lines.push('| **Fills 05.mid** | Bridge exit + final bar 28 |');
  lines.push('');

  lines.push('## Second-line clave reference (brass placement)');
  lines.push('');
  lines.push('- Treat snare/backbeat on **beats 2 & 4** and **& of 4** as sacred.');
  lines.push('- **Avoid** brass punches on **beat 3**, **& of 2** (when it fights snare), and **downbeat 4**.');
  lines.push('- Preferred NOLA punch locus: **1+**, **2+**, **4&** (maps to `brass_punch_offbeat` / `offbeats` beatPattern).');
  lines.push('- Big Band shout: hits on **1** and **& of 2**; relocate any beat-4 stack to **next bar beat 1**.');
  lines.push('');

  for (const section of SECTIONS) {
    const bars = sliceBars(allBars, section.start, section.end);
    const barsDisplay = sliceBars(CHORDS_RAW, section.start, section.end);
    const { ctxJson, punches } = buildSectionContext(section, bars);
    lines.push(`---`);
    lines.push('');
    lines.push(`## ${section.label} (bars ${section.start}–${section.end})`);
    lines.push('');
    lines.push(`**Melody owner:** ${section.melodyOwner}`);
    lines.push('');
    lines.push(`**Harmony:** ${chordSummary(barsDisplay.map(normalizeOrbitBar), section.start)}`);
    lines.push('');
    lines.push(`**Drum groove MIDI:** \`${path.join(MIDI_DIR, section.grooveMidi)}\``);
    if (section.fillMidi && section.fillAtBar) {
      lines.push(
        `**Fill:** \`${path.join(MIDI_DIR, section.fillMidi)}\` overdub **1 bar before/at bar ${section.fillAtBar}**`,
      );
    }
    lines.push('');
    lines.push('**Brass punch positions (beats, all horns unless noted):**');
    lines.push('');
    lines.push(`- Grid: **${[...new Set(punches)].join(', ')}** per bar (typical; adjust when melody rests on that beat)`);
    lines.push(`- Clave alignment: strong beats **${CLAVE_STRONG.join(', ')}** — punches sit *around* backbeat, not on 3`);
    if (section.nolaStyles.includes('brass_punch_offbeat')) {
      lines.push('- Offbeat punches: **1&, 2&, 4&** — never double the alto/tenor downbeats on 1 or 3');
    }
    if (section.bbStyle === 'brass_punch') {
      lines.push('- Shout punches: **1**, **2&** ensemble; add **3&** only bar 24 pickup to Dbmaj7');
    }
    if (section.bbStyle === 'shell_voicing') {
      lines.push('- Outro comp: piano/guitar **shell** (3–7) on beats **2 & 4**; horns punctuate offbeats only');
    }
    lines.push('');
    lines.push('**Background riff:**');
    lines.push('');
    lines.push(section.backgroundRiff);
    lines.push('');
    lines.push('**Sound:**');
    lines.push('');
    lines.push(section.soundBlurb);
    lines.push('');
    lines.push('<details><summary>MusicContext snapshot (Composer OS)</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(ctxJson);
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Sibelius workflow');
  lines.push('');
  lines.push('1. Paste chord row into Composer OS / iReal producer (verify 28 bars).');
  lines.push('2. Enter **locked melody** on alto (5–13), tenor (14–17), trumpet (18–24) — no splits.');
  lines.push('3. Import SD3 MIDI to drum part per section table; align to **90 BPM**.');
  lines.push('4. Horns: layer **background riffs** first, then **punch grid** from sections above.');
  lines.push('5. Bass: **anticipation** on & of 4 before changes (bars 6, 14, 16, 26).');
  lines.push('6. Playtest Bridge (18–24) with ShoutParade before adding trumpet lead.');
  lines.push('');

  const bbRef = buildMusicContextFromBigBand({ key: KEY_PC, tempo: BPM, compingStyle: 'brass_punch' });
  const nolaRef = buildMusicContextFromNewOrleans({
    key: KEY_PC,
    tempo: BPM,
    compingStyle: 'second_line',
  });
  lines.push('## Engine template receipts (reference harmony — not Orbit changes)');
  lines.push('');
  lines.push(`- \`buildMusicContextFromNewOrleans({ compingStyle: 'second_line' })\` → ${nolaRef.harmony.bars.join(' | ')}`);
  lines.push(`- \`buildMusicContextFromBigBand({ compingStyle: 'brass_punch' })\` → ${bbRef.harmony.bars.join(' | ')}`);
  lines.push('');

  return lines.join('\n');
}

function main() {
  if (CHORDS_RAW.length !== 28) {
    console.error('Expected 28 bars, got', CHORDS_RAW.length);
    process.exit(1);
  }
  const allBars = CHORDS_RAW.map(normalizeOrbitBar);
  if (!fs.existsSync(REV_DIR)) fs.mkdirSync(REV_DIR, { recursive: true });
  const plan = buildPlan(allBars);
  fs.writeFileSync(OUT_PLAN, plan, 'utf8');
  console.log('Wrote', OUT_PLAN);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) main();
