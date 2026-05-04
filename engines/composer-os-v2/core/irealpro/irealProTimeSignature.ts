/** Shared iReal `T` digit-run parsing (matches {@link parseTimeSignature} in legacy callers). */
export function parseIrealTimeSignatureDigits(ts: string | null | undefined): { num: number; den: number } | null {
  if (ts == null || ts === '') return null;
  const d = String(ts).replace(/\D/g, '');
  if (d.length < 2) return null;
  if (d === '128') return { num: 12, den: 8 };
  if (d.length === 2) {
    const num = parseInt(d[0]!, 10);
    const den = parseInt(d[1]!, 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return { num, den };
  }
  const den = parseInt(d.slice(-1), 10);
  const num = parseInt(d.slice(0, -1), 10);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return { num, den };
}
