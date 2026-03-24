/**
 * Map internal errors to short, user-facing messages (no stack traces in normal UI).
 */

export function friendlyGenerateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes('enoent') || lower.includes('no such file')) {
    return 'A required file was missing. Try generating again. If this persists, reinstall Composer OS.';
  }
  if (lower.includes('eacces') || lower.includes('permission')) {
    return 'Composer OS could not write to the output folder. Check that the folder is writable.';
  }
  if (lower.includes('enospc') || lower.includes('space')) {
    return 'Disk is full or the output folder could not be written. Free space and try again.';
  }
  return 'Generation failed. You can try again with a different seed. If this keeps happening, check Diagnostics for the output folder.';
}

export function friendlyOutputDirError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.toLowerCase().includes('eacces')) {
    return 'The output folder is not accessible. Adjust permissions or choose another folder.';
  }
  return 'Could not read the output folder.';
}
