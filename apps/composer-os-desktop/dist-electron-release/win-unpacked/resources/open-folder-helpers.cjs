"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/openFolderHelpersBundleEntry.ts
var openFolderHelpersBundleEntry_exports = {};
__export(openFolderHelpersBundleEntry_exports, {
  ensureFolderForOpen: () => ensureFolderForOpen,
  resolveOpenFolderTarget: () => resolveOpenFolderTarget
});
module.exports = __toCommonJS(openFolderHelpersBundleEntry_exports);

// ../../engines/composer-os-v2/app-api/composerOsOutputPaths.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var OUTPUT_META_FOLDER = "_meta";
function normalizeLibraryFolderOpenTarget(pathOrFile) {
  let r = path.resolve(pathOrFile);
  try {
    if (fs.existsSync(r) && fs.statSync(r).isFile()) {
      r = path.dirname(r);
    }
  } catch {
  }
  while (path.basename(r) === OUTPUT_META_FOLDER) {
    const parent = path.dirname(r);
    if (parent === r)
      break;
    r = parent;
  }
  return r;
}
function isPathUnderComposerRoot(composerRoot, candidate) {
  const r = path.normalize(path.resolve(composerRoot));
  const c = path.normalize(path.resolve(candidate));
  if (process.platform === "win32") {
    const rl = r.toLowerCase();
    const cl = c.toLowerCase();
    if (cl === rl)
      return true;
    const prefix2 = rl.endsWith("\\") ? rl : `${rl}\\`;
    return cl.startsWith(prefix2);
  }
  if (c === r)
    return true;
  const prefix = r.endsWith(path.sep) ? r : r + path.sep;
  return c.startsWith(prefix);
}
function resolveOpenFolderTarget(composerRoot, body) {
  let target = path.resolve(composerRoot);
  if (body?.path && typeof body.path === "string" && body.path.trim()) {
    const resolved = path.normalize(path.resolve(body.path.trim()));
    if (!isPathUnderComposerRoot(composerRoot, resolved)) {
      return {
        ok: false,
        message: "That folder is not part of your Composer OS output library."
      };
    }
    target = normalizeLibraryFolderOpenTarget(resolved);
    if (!isPathUnderComposerRoot(composerRoot, target)) {
      return {
        ok: false,
        message: "That folder is not part of your Composer OS output library."
      };
    }
  }
  return { ok: true, target };
}

// ../../engines/composer-os-v2/app-api/openOutputFolder.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
function ensureFolderForOpen(outputDir) {
  const dir = path2.resolve(outputDir);
  try {
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    return {
      ok: false,
      message: `Composer OS could not create or access the output folder. Check disk space and permissions. (${String(e)})`
    };
  }
  if (!fs2.existsSync(dir)) {
    return {
      ok: false,
      message: "The output folder does not exist and could not be created."
    };
  }
  try {
    fs2.accessSync(dir, fs2.constants.R_OK | fs2.constants.W_OK);
  } catch {
    return {
      ok: false,
      message: "The output folder exists but is not writable. Choose another location or fix folder permissions."
    };
  }
  return { ok: true, path: dir };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureFolderForOpen,
  resolveOpenFolderTarget
});
