"use strict";
/**
 * Wyble Etude Generator — Example driver
 * Generates an 8-bar study from Dm7 → G7 → Cmaj7 and exports MusicXML.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const wybleEtudeGenerator_1 = require("./wybleEtudeGenerator");
const wybleMusicXMLExporter_1 = require("./wybleMusicXMLExporter");
const progression = [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
];
function main() {
    const result = (0, wybleEtudeGenerator_1.generateWybleEtudeFromProgression)(progression, {
        key: 'C',
        phraseLength: 8,
    });
    console.log('\n--- WYBLE ETUDE GENERATED ---\n');
    console.log(`Progression: Dm7 (2 bars) → G7 (2 bars) → Cmaj7 (4 bars)`);
    console.log(`Total bars: ${result.bars}`);
    console.log(`Upper line events: ${result.upper_line.events.length}`);
    console.log(`Lower line events: ${result.lower_line.events.length}`);
    const musicXml = (0, wybleMusicXMLExporter_1.exportToMusicXML)(result, { title: 'Wyble Etude — ii–V–I' });
    const outPath = path.join(__dirname, 'wyble-etude-example.xml');
    fs.writeFileSync(outPath, musicXml, 'utf-8');
    console.log(`\nMusicXML exported to: ${outPath}`);
    console.log('\n--- END ---\n');
}
main();
