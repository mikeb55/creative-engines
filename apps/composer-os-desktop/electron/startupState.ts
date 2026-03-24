/**
 * Composer OS Desktop — explicit startup / session state for the main process.
 */

export type StartupState =
  | 'booting'
  | 'resolving_port'
  | 'starting_backend'
  | 'waiting_for_backend'
  | 'loading_ui'
  | 'ready'
  | 'generate_running'
  | 'generate_failed'
  | 'generate_succeeded'
  | 'fatal_error';

const ORDER_SAFE_FROM_READY: Set<StartupState> = new Set([
  'generate_running',
  'generate_failed',
  'generate_succeeded',
  'ready',
]);

export function canTransitionFromReady(to: StartupState): boolean {
  return ORDER_SAFE_FROM_READY.has(to);
}

export function isFatalState(s: StartupState): boolean {
  return s === 'fatal_error';
}
