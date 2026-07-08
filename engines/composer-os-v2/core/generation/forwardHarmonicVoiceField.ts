/**
 * Transport-only harmonicVoice field forwarding.
 * Mirrors generateComposition.ts L420–422 spread semantics — no normalization, no style logic.
 */

export const HARMONIC_VOICE_FORWARDING_CANONICAL_GUARD =
  'typeof harmonicVoice === "string" && harmonicVoice.trim() !== "" → { harmonicVoice: harmonicVoice.trim() }; else {}';

export function harmonicVoiceFieldFromRequest(req: {
  harmonicVoice?: string | null | undefined;
}): { harmonicVoice: string } | Record<string, never> {
  if (typeof req.harmonicVoice !== 'string') {
    return {};
  }
  const trimmed = req.harmonicVoice.trim();
  if (trimmed === '') {
    return {};
  }
  return { harmonicVoice: trimmed };
}

export function mergeHarmonicVoiceFromRequest<T extends object>(
  req: { harmonicVoice?: string | null | undefined },
  target: T
): T {
  return { ...target, ...harmonicVoiceFieldFromRequest(req) };
}
