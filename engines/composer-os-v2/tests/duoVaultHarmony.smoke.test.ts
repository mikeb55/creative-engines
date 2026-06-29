/**
 * Smoke — Duo Stage 1 vault harmony resolver (pure; no duo pipeline).
 */

import { resolveDuoHarmonyForSymbol } from '../core/harmony/duoVaultHarmony';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function testSlashSplitAndVaultHit(): boolean {
  const r = resolveDuoHarmonyForSymbol('D/C');
  assert(r.harmonyPart === 'D', `D/C harmonyPart expected D, got ${r.harmonyPart}`);
  assert(r.slashBassPc === 0, `D/C slashBassPc expected 0 (C), got ${r.slashBassPc}`);
  assert(r.source === 'vault', `D/C source expected vault, got ${r.source}`);
  assert(r.vaultChordTypeId === 'Maj7', `D/C vault id expected Maj7, got ${r.vaultChordTypeId}`);
  assert(r.rootPc === 2, `D/C rootPc expected 2 (D), got ${r.rootPc}`);
  assert(r.melodyPcs.length >= 3, 'D/C melodyPcs non-empty');
  assert(r.identityPcs.length >= 1, 'D/C identityPcs non-empty on vault hit');
  assert(
    r.identityPcs.includes(0),
    `D/C identityPcs must retain slash C (0), got [${r.identityPcs.join(',')}]`
  );
  assert(r.shellPcs.length >= 3, 'D/C shellPcs non-empty');
  return true;
}

function testEbOverDSlashIdentity(): boolean {
  const r = resolveDuoHarmonyForSymbol('Eb/D');
  assert(r.harmonyPart === 'Eb', `Eb/D harmonyPart expected Eb, got ${r.harmonyPart}`);
  assert(r.slashBassPc === 2, `Eb/D slashBassPc expected 2 (D), got ${r.slashBassPc}`);
  assert(r.source === 'vault', `Eb/D source expected vault, got ${r.source}`);
  assert(r.rootPc === 3, `Eb/D rootPc expected 3 (Eb), got ${r.rootPc}`);
  assert(r.melodyPcs.length >= 3, 'Eb/D melodyPcs non-empty');
  assert(r.identityPcs.length >= 1, 'Eb/D identityPcs non-empty on vault hit');
  assert(
    r.identityPcs.includes(2),
    `Eb/D identity must include slash D (2), got [${r.identityPcs.join(',')}]`
  );
  return true;
}

function testAmaj7Sharp11Vault(): boolean {
  const r = resolveDuoHarmonyForSymbol('Amaj7#11');
  assert(r.harmonyPart === 'Amaj7#11', `harmonyPart mismatch: ${r.harmonyPart}`);
  assert(r.slashBassPc === undefined, 'Amaj7#11 should have no slash');
  assert(r.source === 'vault', `Amaj7#11 source expected vault, got ${r.source}`);
  assert(r.vaultChordTypeId === 'Maj7#11', `vault id expected Maj7#11, got ${r.vaultChordTypeId}`);
  assert(r.rootPc === 9, `Amaj7#11 rootPc expected 9 (A), got ${r.rootPc}`);
  assert(r.melodyPcs.length >= 3, 'Amaj7#11 melodyPcs non-empty');
  assert(r.identityPcs.length >= 1, 'Amaj7#11 identityPcs non-empty');
  assert(
    r.identityPcs.includes(3),
    `Amaj7#11 identity must include #11 (D# = pc 3), got [${r.identityPcs.join(',')}]`
  );
  return true;
}

function testG7AltVault(): boolean {
  const r = resolveDuoHarmonyForSymbol('G7alt');
  assert(r.source === 'vault', `G7alt source expected vault, got ${r.source}`);
  assert(r.vaultChordTypeId === '7#9#5', `G7alt vault id expected 7#9#5, got ${r.vaultChordTypeId}`);
  assert(r.rootPc === 7, `G7alt rootPc expected 7 (G), got ${r.rootPc}`);
  assert(r.melodyPcs.length >= 3, 'G7alt melodyPcs non-empty');
  assert(r.identityPcs.length >= 1, 'G7alt identityPcs non-empty');
  assert(
    r.identityPcs.includes(10),
    `G7alt identity must include #9 (pc 10), got [${r.identityPcs.join(',')}]`
  );
  return true;
}

function testUnmappedFallback(): boolean {
  const r = resolveDuoHarmonyForSymbol('Cadd9');
  assert(r.source === 'fallback', `Cadd9 source expected fallback, got ${r.source}`);
  assert(r.vaultChordTypeId === undefined, 'Cadd9 should not have vaultChordTypeId');
  assert(r.melodyPcs.length >= 4, 'Cadd9 fallback melodyPcs non-empty');
  assert(r.shellPcs.length >= 3, 'Cadd9 fallback shellPcs non-empty');
  assert(r.rootPc === 0, `Cadd9 rootPc expected 0 (C), got ${r.rootPc}`);
  return true;
}

export function runDuoVaultHarmonySmokeTests(): { name: string; ok: boolean }[] {
  const cases: { name: string; fn: () => boolean }[] = [
    { name: 'Duo vault harmony: D/C slash split + vault Maj7', fn: testSlashSplitAndVaultHit },
    { name: 'Duo vault harmony: Eb/D slash identity', fn: testEbOverDSlashIdentity },
    { name: 'Duo vault harmony: Amaj7#11 vault color', fn: testAmaj7Sharp11Vault },
    { name: 'Duo vault harmony: G7alt -> 7#9#5', fn: testG7AltVault },
    { name: 'Duo vault harmony: Cadd9 fallback (no crash)', fn: testUnmappedFallback },
  ];

  return cases.map(({ name, fn }) => {
    try {
      return { name, ok: fn() };
    } catch (e) {
      console.error(`[duoVaultHarmony] ${name}:`, e);
      return { name, ok: false };
    }
  });
}

if (require.main === module) {
  const results = runDuoVaultHarmonySmokeTests();
  let fail = 0;
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
    if (!r.ok) fail++;
  }
  process.exit(fail > 0 ? 1 : 0);
}