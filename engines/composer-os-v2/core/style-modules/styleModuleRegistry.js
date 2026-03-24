"use strict";
/**
 * Composer OS V2 — Style module registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRegisteredStyleModuleInfos = listRegisteredStyleModuleInfos;
exports.registerStyleModule = registerStyleModule;
exports.getStyleModule = getStyleModule;
exports.applyStyleStack = applyStyleStack;
exports.applyStyleModules = applyStyleModules;
const styleModuleTypes_1 = require("./styleModuleTypes");
const moduleApply_1 = require("./barry-harris/moduleApply");
const moduleApply_2 = require("./metheny/moduleApply");
const moduleApply_3 = require("./triad-pairs/moduleApply");
const moduleApply_4 = require("./bacharach/moduleApply");
const registry = new Map();
/** Display labels for app API / UI (ids come from module definitions). */
const MODULE_DISPLAY_NAMES = {
    barry_harris: 'Barry Harris',
    metheny: 'Metheny',
    triad_pairs: 'Triad Pairs',
    bacharach: 'Bacharach',
};
function registerBuiltIn() {
    if (registry.size > 0)
        return;
    registerStyleModule(moduleApply_1.barryHarrisModule);
    registerStyleModule(moduleApply_2.methenyModule);
    registerStyleModule(moduleApply_3.triadPairsModule);
    registerStyleModule(moduleApply_4.bacharachModule);
}
registerBuiltIn();
/** Ordered list of built-in modules for App API (single source of truth with registry keys). */
function listRegisteredStyleModuleInfos() {
    registerBuiltIn();
    return Array.from(registry.keys())
        .sort()
        .map((id) => ({
        id,
        displayName: MODULE_DISPLAY_NAMES[id] ?? id,
    }));
}
function registerStyleModule(module) {
    registry.set(module.id, module);
}
function getStyleModule(id) {
    return registry.get(id);
}
/** Apply style stack. Order: primary, secondary, colour. */
function applyStyleStack(context, stack) {
    const ids = (0, styleModuleTypes_1.styleStackToModuleIds)(stack);
    let result = context;
    for (const id of ids) {
        const mod = registry.get(id);
        if (mod)
            result = mod.modify(result);
    }
    return result;
}
/** Apply modules by id list (legacy). */
function applyStyleModules(context, moduleIds) {
    let result = context;
    for (const id of moduleIds) {
        const mod = registry.get(id);
        if (mod)
            result = mod.modify(result);
    }
    return result;
}
