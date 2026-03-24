/** Mirrors desktop `StartupState` for renderer typing without importing Electron code. */
export type ComposerOsStartupState =
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
