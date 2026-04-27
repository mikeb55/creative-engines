/**
 * Import-harmony API / manifest contract version (Stage 4+).
 * Kept dependency-free so app and golden-path callers avoid circular imports via `compositionContext`.
 *
 * Stage 5 (v3): `blend_harmony` is active in Song Mode (`composerOsAppGeneration.runSongStructure`)
 * — merges imported `<harmony>` timeline bars with generator harmony using `harmonyBlend`.
 */
export const IMPORT_HARMONY_POLICY_VERSION = 3 as const;
