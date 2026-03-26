"use strict";
/**
 * Composer OS V2 — App API: get style modules (from engine registry)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStyleModules = getStyleModules;
const styleModuleRegistry_1 = require("../core/style-modules/styleModuleRegistry");
function getStyleModules() {
    return (0, styleModuleRegistry_1.listRegisteredStyleModuleInfos)().map((m) => ({
        id: m.id,
        name: m.displayName,
        enabled: true,
        type: 'any',
    }));
}
