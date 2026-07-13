/**
 * Exact-id HV gate for fela_kuti — kept free of spine imports (cycle-safe).
 * Soft fela (ALIASES) songwriter-normalize only — never engage HV.
 */
function normalizeFelaHvId(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^hv:/, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
}

export function isFelaKutiHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    normalizeFelaHvId(metadata?.songwriterStyleId) === 'fela_kuti' ||
    normalizeFelaHvId(metadata?.harmonicVoice) === 'fela_kuti'
  );
}
