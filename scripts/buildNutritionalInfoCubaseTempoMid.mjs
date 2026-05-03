/**
 * Builds a Standard MIDI File (SMF) containing only tempo + time-signature meta events
 * for "She Had The Nutritional Information Right There On The Box".
 *
 * Cubase: File > Import > MIDI File — ensure Preferences > MIDI > MIDI File has
 * "Ignore Master Track Events on Merge" unchecked so tempo/signature apply.
 *
 * PPQ: 480 (common Cubase default). Bar lengths use quarter-note tick math from each meter.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const outDir = join(repoRoot, 'outputs', 'nutritional-info')
const outFile = join(outDir, 'NUTRITIONAL_INFORMATION_tempo_map.mid')

const PPQ = 480

/** Ticks per one full bar for each meter (numerator / denominator as pow2). */
function ticksPerBar(numerator, denomPow2) {
  const denom = 2 ** denomPow2
  const quartersPerBar = (numerator * 4) / denom
  return Math.round(quartersPerBar * PPQ)
}

const T9_8 = ticksPerBar(9, 3) // 2160
const T7_8 = ticksPerBar(7, 3) // 1680
const T5_4 = ticksPerBar(5, 2) // 2400
const T4_4 = ticksPerBar(4, 2) // 1920

// Absolute tick at each bar start (1-based bar index). Derived from song form + user table.
const BAR_START_TICK = {
  1: 0,
  7: 6 * T9_8,
  11: 6 * T9_8 + 4 * T7_8,
  19: 6 * T9_8 + 4 * T7_8 + 8 * T9_8,
  25: 6 * T9_8 + 4 * T7_8 + 8 * T9_8 + 6 * T9_8,
  31:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4,
  36:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4 +
    5 * T9_8,
  39:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4 +
    5 * T9_8 +
    3 * T4_4,
  40:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4 +
    5 * T9_8 +
    3 * T4_4 +
    T9_8,
  41:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4 +
    5 * T9_8 +
    3 * T4_4 +
    T9_8 +
    T4_4,
  42:
    6 * T9_8 +
    4 * T7_8 +
    8 * T9_8 +
    6 * T9_8 +
    6 * T5_4 +
    5 * T9_8 +
    3 * T4_4 +
    T9_8 +
    T4_4 +
    T9_8,
}

function vlq(n) {
  const bytes = []
  bytes.unshift(n & 0x7f)
  n >>= 7
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80)
    n >>= 7
  }
  return Buffer.from(bytes)
}

/** FF 58 04 nn dd cc bb — dd = log2(denominator). */
function metaTimeSig(num, denomPow2) {
  return Buffer.from([0xff, 0x58, 0x04, num & 0xff, denomPow2 & 0xff, 24, 8])
}

/** FF 51 03 — microseconds per quarter (24-bit BE). */
function metaSetTempo(bpm) {
  const us = Math.round(60000000 / bpm)
  return Buffer.from([0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff])
}

/** Emit only when meter changes (omit bar 19 — still 9/8). */
const signatureChanges = [
  { tick: BAR_START_TICK[1], num: 9, dd: 3 },
  { tick: BAR_START_TICK[7], num: 7, dd: 3 },
  { tick: BAR_START_TICK[11], num: 9, dd: 3 },
  { tick: BAR_START_TICK[25], num: 5, dd: 2 },
  { tick: BAR_START_TICK[31], num: 9, dd: 3 },
  { tick: BAR_START_TICK[36], num: 4, dd: 2 },
  { tick: BAR_START_TICK[39], num: 9, dd: 3 },
  { tick: BAR_START_TICK[40], num: 4, dd: 2 },
  { tick: BAR_START_TICK[41], num: 9, dd: 3 },
  { tick: BAR_START_TICK[42], num: 4, dd: 2 },
]

function buildTrack0() {
  const parts = []
  let prevTick = 0

  const pushEvent = (absTick, buf) => {
    const delta = absTick - prevTick
    prevTick = absTick
    parts.push(vlq(delta), buf)
  }

  // Same tick: signature then tempo (delta 0 for second).
  pushEvent(signatureChanges[0].tick, metaTimeSig(signatureChanges[0].num, signatureChanges[0].dd))
  pushEvent(signatureChanges[0].tick, metaSetTempo(96))

  for (let i = 1; i < signatureChanges.length; i++) {
    const ev = signatureChanges[i]
    pushEvent(ev.tick, metaTimeSig(ev.num, ev.dd))
  }

  pushEvent(prevTick, Buffer.from([0xff, 0x2f, 0x00]))
  return Buffer.concat(parts)
}

function buildMidiFile() {
  const trackData = buildTrack0()
  const trackLen = trackData.length

  const header = Buffer.alloc(14)
  header.write('MThd', 0)
  header.writeUInt32BE(6, 4)
  header.writeUInt16BE(0, 8) // format 0
  header.writeUInt16BE(1, 10) // one track
  header.writeUInt16BE(PPQ, 12)

  const trackChunk = Buffer.alloc(8 + trackLen)
  trackChunk.write('MTrk', 0)
  trackChunk.writeUInt32BE(trackLen, 4)
  trackData.copy(trackChunk, 8)

  return Buffer.concat([header, trackChunk])
}

mkdirSync(outDir, { recursive: true })
const midi = buildMidiFile()
writeFileSync(outFile, midi)

console.log(`Wrote ${outFile} (${midi.length} bytes)`)
console.log('Verification ticks:', BAR_START_TICK)
console.log('ticks/bar check', { T9_8, T7_8, T5_4, T4_4 })
