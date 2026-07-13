/**
 * Steve Reich — Song Mode / duo process-field VRB stub fingerprints.
 * SR_* receipts encode pitch-field process (phasing / additive / cycle) — not reich_glass SQ dual-profile.
 */

import { fillReceipts } from '../../composer/fillVrbReceipts';

const SR_BASE = [
  'SR_POLICY_01 — voiceId=steve_reich: Song Mode process-field twin (not reich_glass SQ VRB).',
  'SR_POLICY_02 — harmony emerges from phasing/additive/cycle inside a static diatonic field — not functional chord streams.',
  'SR_POLICY_03 — harmonicRhythm: long field windows (8–32 bars); allowMidBarChange=false.',
  'SR_POLICY_04 — vs reich_glass: single Song Mode composer id; no glass_profile / reich_profile dual SQ sub-bundle.',
  'SR_HARM_01 — pitch fields: major / mixolydian / dorian / major_pentatonic; low chromatic alteration budget.',
  'SR_HARM_02 — sus / quartal colour bias; static dominant posture under pulse.',
  'SR_VL_01 — minimal functional voice-leading; field continuity over cadence teleology.',
  'SR_MEL_01 — high pulse-grid density; cells displace rather than develop thematically.',
  'SR_RHY_01 — phasing: rhythmic displacement of identical cells creating emergent harmony.',
  'SR_RHY_02 — additive: gradual note addition/subtraction within static field.',
  'SR_RHY_03 — cycle: slow chord cycle with internal process (Music for 18 Musicians posture).',
  'SR_FORM_01 — process continuity; section cuts rare; no ii–V–I song-form spine.',
  'SR_TEX_01 — layered ostinato / unison process; silence is structural only when process rests.',
  'SR_WORK_MUSIC_18_01 — Music for 18 Musicians: slow cycle + internal additive process under pulse.',
  'SR_WORK_PIANO_PHASE_01 — Piano Phase: identical cells + gradual phase drift.',
  'SR_DIFF_REICH_GLASS_01 — vs reich_glass SQ: Song Mode slice steveReichEffectiveHarmonyBars; no SQ dual glass/reich profiles.',
  'SR_DIFF_PHILIP_GLASS_01 — vs philip_glass film stub: Reich keeps high pulse density under one field; Glass uses modular harmonic rhythm.',
  'SR_DIFF_ARVO_PART_01 — vs arvo_part: no tintinnabuli / silence grid; Reich stays rhythm-busy under static harmony.',
  'SR_DUO_01 — duoVoicePolicy: pattern interlocking; rhythmicIndependenceFloor moderate; diatonic interval preference.',
] as const;

export const STEVE_REICH_SONG_VRB_FINGERPRINT_RECEIPTS = fillReceipts(
  'SR',
  'Steve Reich Song Mode',
  SR_BASE,
  40
);