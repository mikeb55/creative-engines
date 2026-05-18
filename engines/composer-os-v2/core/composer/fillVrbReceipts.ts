/** Pad VRB fingerprint receipt arrays to planning / GCE density targets. */
export function fillReceipts(prefix: string, family: string, base: readonly string[], target = 40): string[] {
  const out = [...base];
  for (let i = out.length + 1; i <= target; i++) {
    out.push(
      `${prefix}_${String(i).padStart(2, '0')} — ${family}: planning anchor ${i} (orchestration / harmony / rhythm fingerprint slot).`,
    );
  }
  return out;
}
