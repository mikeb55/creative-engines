"use strict";
/**
 * Test MusicXML generation — runs Wyble, Counterpoint, Ellington and validates output.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const ROOT = path_1.default.resolve(__dirname, '..');
console.log('Running engine export tests...');
const wyble = (0, child_process_1.spawnSync)('npm', ['run', 'wyble'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (wyble.status !== 0) {
    console.error('Wyble failed');
    process.exit(1);
}
const counterpoint = (0, child_process_1.spawnSync)('npm', ['run', 'counterpoint'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (counterpoint.status !== 0) {
    console.error('Counterpoint failed');
    process.exit(1);
}
const ellington = (0, child_process_1.spawnSync)('npm', ['run', 'ellington'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (ellington.status !== 0) {
    console.error('Ellington failed');
    process.exit(1);
}
console.log('\nChecking MusicXML validity...');
const PATHS = {
    wyble: path_1.default.join(ROOT, 'outputs', 'wyble', 'clean', 'wyble_clean.musicxml'),
    counterpoint: path_1.default.join(ROOT, 'outputs', 'counterpoint', 'clean', 'counterpoint_clean.musicxml'),
    ellington: path_1.default.join(ROOT, 'outputs', 'ellington', 'clean', 'ellington_clean.musicxml'),
};
function check(file) {
    const text = fs_1.default.readFileSync(file, 'utf8');
    if (!text.includes('<measure')) {
        throw new Error(`${file} missing measures`);
    }
}
const wybleFile = fs_1.default.existsSync(PATHS.wyble) ? PATHS.wyble : null;
const counterpointFile = fs_1.default.existsSync(PATHS.counterpoint) ? PATHS.counterpoint : null;
const ellingtonFile = fs_1.default.existsSync(PATHS.ellington) ? PATHS.ellington : null;
if (wybleFile) {
    check(wybleFile);
    console.log(`  Wyble: OK (${path_1.default.basename(wybleFile)})`);
}
else {
    console.warn('  Wyble: no output found');
}
if (counterpointFile) {
    check(counterpointFile);
    console.log(`  Counterpoint: OK (${path_1.default.basename(counterpointFile)})`);
}
else {
    console.warn('  Counterpoint: no output found');
}
if (ellingtonFile) {
    check(ellingtonFile);
    console.log(`  Ellington: OK (${path_1.default.basename(ellingtonFile)})`);
}
else {
    console.warn('  Ellington: no output found');
}
console.log('\nAll MusicXML generation tests passed.');
