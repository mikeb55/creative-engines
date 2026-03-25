/**
 * Phase 1A+1B — module invocation layer (static registry).
 */

import { invokeModule } from '../core/module-invocation/invokeModule';
import { getModuleCapabilities, getRegisteredModuleIds, MODULE_REGISTRY } from '../core/module-invocation/moduleRegistry';

export function runModuleInvocationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: typeof MODULE_REGISTRY === 'object' && 'phase1a_echo' in MODULE_REGISTRY,
    name: 'module registry loads phase1a_echo',
  });

  out.push({
    ok:
      getRegisteredModuleIds().includes('phase1a_echo') &&
      getRegisteredModuleIds().includes('song_mode_scaffold') &&
      getRegisteredModuleIds().includes('song_mode_compile') &&
      getRegisteredModuleIds().includes('big_band_plan'),
    name: 'getRegisteredModuleIds lists echo, song_mode_scaffold, song_mode_compile, big_band_plan',
  });

  const echo = invokeModule<{ message: string }, { message: string }>('phase1a_echo', { message: 'hi' });
  out.push({
    ok: echo.message === 'hi',
    name: 'invokeModule runs echo module',
  });

  const sc = invokeModule<{ structureHint?: string }, { structureHint?: string }>('song_mode_scaffold', {});
  out.push({
    ok: sc.structureHint === 'default_verse_chorus',
    name: 'invokeModule runs song_mode_scaffold',
  });

  const cap = getModuleCapabilities('phase1a_echo');
  out.push({
    ok: Boolean(
      cap?.readsFrom?.length &&
        cap?.writesTo?.length &&
        cap?.compatiblePresets?.includes('song_mode')
    ),
    name: 'registry entries can expose capabilities',
  });

  let threw = false;
  try {
    invokeModule('missing_module_xyz', {});
  } catch {
    threw = true;
  }
  out.push({
    ok: threw,
    name: 'invokeModule throws on unknown id',
  });

  return out;
}
