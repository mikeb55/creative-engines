"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var premiumMelodyPitchProfile_exports = {};
__export(premiumMelodyPitchProfile_exports, {
  PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER: () => PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER,
  assertValidPremiumMelodyPitchProfile: () => assertValidPremiumMelodyPitchProfile
});
module.exports = __toCommonJS(premiumMelodyPitchProfile_exports);
const PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER = [
  "approach",
  "enclosure",
  "blues",
  "grace",
  "bend"
];
function assertValidPremiumMelodyPitchProfile(pitchProfile) {
  if (!Number.isFinite(pitchProfile.pitchSeedSalt) || pitchProfile.pitchSeedSalt < 1) {
    throw new Error(
      `PremiumMelodyPitchProfile.pitchSeedSalt must be >= 1 when pitch layer enabled (got ${pitchProfile.pitchSeedSalt})`
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER,
  assertValidPremiumMelodyPitchProfile
});
