/**
 * QA export: default duo bartok 8-bar MusicXML for Bartok CLE pitch-scoring review.
 * Run: npx tsx engines/composer-os-v2/scripts/bartokCleGenerateQaMusicXml.ts
 * Writes: qa-output/bartok/bartok_cle_duo_seed61234.musicxml (repo root)
 */

import * as fs from "fs";
import * as path from "path";
import { runGoldenPathOnce } from "../core/goldenPath/runGoldenPath";

const LOCKED = ["F#m7b5", "B7alt", "Emaj7", "Gm7", "F#m7b5", "B7alt", "Emaj7", "Gm7"];
const SEED = 61234;
const outDir = path.join(__dirname, "../../../qa-output/bartok");

const gp = runGoldenPathOnce(SEED, {
  presetId: "guitar_bass_duo",
  totalBars: 8,
  harmonyMode: "custom_locked",
  lockedHarmonyBarsRaw: [...LOCKED],
  parsedChordBars: [...LOCKED],
  chordProgressionText: LOCKED.join(" | "),
  tonalCenterOverride: "C",
  primarySongwriterStyle: "bartok",
  harmonicVoice: "bartok",
  songModeHookFirstIdentity: false,
  suppressWybleVoiceLayoutForTest: true,
  orchestrationEnabled: false,
});

if (!gp.xml) {
  console.error("Golden path produced no MusicXML", gp.errors[0] ?? "");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const xmlPath = path.join(outDir, "bartok_cle_duo_seed61234.musicxml");
fs.writeFileSync(xmlPath, gp.xml, "utf8");
console.log("Wrote", xmlPath);
