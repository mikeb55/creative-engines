"use strict";
/**
 * Shared notation timing core — single source of truth for all engines.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./notationTimingConstants"), exports);
__exportStar(require("./notationTimingEngine"), exports);
__exportStar(require("./musicxmlMeasurePacker"), exports);
__exportStar(require("./musicxmlTimingValidation"), exports);
__exportStar(require("./scoreModel"), exports);
__exportStar(require("./barComposer"), exports);
__exportStar(require("./scoreToTimedEvents"), exports);
__exportStar(require("./notationValidation"), exports);
__exportStar(require("./barFirstMusicXMLWriter"), exports);
