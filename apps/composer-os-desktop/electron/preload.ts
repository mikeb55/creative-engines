/**
 * Composer OS Desktop — preload (exposes safe flags only; no legacy launcher hooks)
 */
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('composerOsDesktop', {
  mode: 'desktop' as const,
  productName: 'Composer OS',
});
