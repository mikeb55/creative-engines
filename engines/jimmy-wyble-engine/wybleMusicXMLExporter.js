"use strict";
/**
 * Wyble MusicXML Exporter — serializes core Score. No timeline packing.
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
exports.exportScoreToMusicXML = exportScoreToMusicXML;
const validateScore_1 = require("../../scripts/validateScore");
const scoreToMusicXML_1 = require("../core/scoreToMusicXML");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Export Score to MusicXML. Throws if validation fails. */
function exportScoreToMusicXML(score, options) {
    const title = options?.title ?? 'Wyble Etude';
    (0, validateScore_1.validateScore)(score);
    if (options?.runPath) {
        fs.writeFileSync(path.join(options.runPath, 'validation_report.json'), JSON.stringify({ valid: true, errors: [] }, null, 2), 'utf-8');
    }
    return (0, scoreToMusicXML_1.scoreToMusicXML)(score, {
        title,
        partName: 'Guitar',
        staves: 2,
    });
}
