# Bacharach reference mining → Composer Song Mode v1 (non-imitative)

## Sources expected locally

When you copy scores from `C:\Users\mike\Documents\Burt Bachrach Resources\` into `reference/bacharach/` (see `README.md`), the mining script (`npm run mine:bacharach`) reads:

| Area | Example filenames (prefixes) |
|------|------------------------------|
| Film / standard | `alfie-burt-bacharach-alfie` |
| Pop ballad | `close-to-you-they-long-to-be` |
| Groove / travelogue | `do-you-know-the-way-to-san-jose-burt` |
| Ballad | `ill-never-fall-in-love-again-bacharach` |
| Up-tempo pop | `i-say-a-little-prayer-burt-bacharach` |
| Anthem / march feel | `what-the-world-needs-now-is-love-burt` |

**No song titles or progressions are embedded in engine code.** Rules are generative biases only.

## Recurring traits (cross-score, arranger tradition)

Observed across published Bacharach-style harmony (lead sheets and reductions—not cloning any one file):

1. **Stable pillars** often carry **major-seventh** colour on tonic and subdominant family chords, and **minor-seventh** on the relative minor (vi)—a “smooth” pop-jazz blend without dense altered harmony.
2. **Cadences** frequently use **dominant or secondary-dominant colour** toward important arrivals; motion stays **functional and lyrical**, not bebop-level substitution chains.
3. **Bridge / contrasting section**: a **modest lift**—borrowed minor iv colour, brief V7 colour, or half-step side-step—then **return to home**.
4. **Form**: mostly **4-bar grammar** with **occasional phrase extension** (2- or 3-bar cells) in vocal prosody; engine mirrors this via phrase-regularity metadata, not fixed bar counts.
5. **Texture**: **sustained** harmony and **lighter comp** relative to busy jazz-trio writing—room for melody on top.
6. **Returns (A′)**: often **same harmonic skeleton** with **one colour tweak** (e.g. maj9 on final tonic, or a single bar of richer extension)—not a full reharmonisation every time.

## Traits promoted into Composer `bacharach` v1

| Trait | Engine mapping |
|-------|------------------|
| I / IV / vi smooth colour | `dressBacharachChordForBar` biases maj7 / m7 on pillars by section; section **B** slightly stronger |
| One secondary-dominant / richer dominant moment | Bridge slot + rare dom9 nudge on existing V7 in **B** |
| One bridge colour / mixture moment | Single deterministic **B-section bar** may apply Fm7 / G7 / maj7 lift (bounded) |
| Return variation | **Final bar** of **return** may lift to maj9 when symbol is plain major |
| Lighter accompaniment | `applyBacharachSongModeSurfaceV1` lowers sync/density vs neutral; keys-comp profile receipt |
| Phrase flexibility | Lower `songwriterPhraseRegularity` nudge |

## Traits deliberately rejected (too song-specific or anti-generative)

| Trait | Reason |
|-------|--------|
| Exact progressions from any one title | Would be pastiche / legal risk; not implemented |
| Multiple modulations per song | User cap: **one** bridge-colour moment per form |
| Heavy altered dominants (alt, b9#13 stacks) | Reads as jazz-trio, not Bacharach-adjacent pop |
| Hard-coded bar maps per title | Engine uses **section kind** from total bar count only |

## Receipts (user-visible)

Aligned with implemented behaviour—see `applyBacharachSongModeSurfaceV1` and `songwriterCompProfile` for `bacharach`. Wording is **descriptive**, not “sounds like” any catalogue work.

## Rule bundle identifier

Code: `bacharachSongModeRuleBundle.ts` (`BACHARACH_SONG_MODE_RULE_BUNDLE_ID = 'v1'`).
