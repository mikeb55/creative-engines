# Bacharach (Composer OS style module)

Lightweight **melody-first** bias for Guitar–Bass Duo: asymmetrical phrase starts, subtle chromatic colour, and reduced “square” grid placement—without turning the engine into random harmony.

- **moduleApply**: sets `styleOverrides.bacharach` (phrase asymmetry, chromatic passing weight ~0.32, cadence cliché avoidance).
- **bacharachSignal**: shared helpers for chromatic steps, off–strong-grid onsets, and rhythmic variety (used by validation and documented alongside generation).
- **moduleValidation**: per section (A/B), passes when there is at least one chromatic step, off-grid onset, or varied rhythm; fails only when a section is fully diatonic and square; caps global chromatic ratio (~45%) to avoid chaos.
- **Golden path**: when Bacharach is active, bars **2** and **6** use a deterministic anchor bar (chromatic neighbour + 3+5 asymmetry) so the validator always has a detectable signal without breaking bar math.

Used with the Style Blend system (primary / secondary / colour) like other Composer OS modules.
