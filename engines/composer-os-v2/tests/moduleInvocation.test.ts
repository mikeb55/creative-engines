/**
 * Phase 1A — module invocation layer (static registry).
 */

import { invokeModule } from '../core/module-invocation/invokeModule';
import { getRegisteredModuleIds, MODULE_REGISTRY } from '../core/module-invocation/moduleRegistry';

export function runModuleInvocationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: typeof MODULE_REGISTRY === 'object' && 'phase1a_echo' in MODULE_REGISTRY,
    name: 'module registry loads phase1a_echo',
  });

  out.push({
    ok: getRegisteredModuleIds().includes('phase1a_echo'),
    name: 'getRegisteredModuleIds lists echo module',
  });

  const echo = invokeModule<{ message: string }, { message: string }>('phase1a_echo', { message: 'hi' });
  out.push({
    ok: echo.message === 'hi',
    name: 'invokeModule runs echo module',
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
