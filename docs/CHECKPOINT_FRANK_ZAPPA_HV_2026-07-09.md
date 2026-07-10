# Checkpoint — Frank Zappa HV write-path (2026-07-09)

## HEAD + working tree

- **HEAD:** `9200267e00d2f9f37c78c2bd7a6989b804862e27`
- **Working tree:** 3 files **staged** (no other modified/unstaged files)

**Staged (`git diff --name-only --cached`):**

```
engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts
engines/composer-os-v2/core/harmony/harmonySpineProvider.ts
engines/composer-os-v2/core/song-mode/frankZappaSlice.ts
```

---

## Summary

**frank_zappa HV harmonyContext attach fix is IMPLEMENTED and STAGED (not committed)** — 3 files:

- `generateGoldenPathDuoScore.ts`
- `harmonySpineProvider.ts`
- `frankZappaSlice.ts`

**Result:** Fix works as designed — all 4 Phase 1 seams now correctly engage HV authority for frank_zappa with zero seam-file changes, proving the resolver/registry design generalizes to a second style.

---

## BLOCKING ISSUE (why not committed)

At seed **77777**, `barry_harris` + HV `frank_zappa` now fails LOCK on **finalBarTension** hard gate; GCE dropped **8.7 → 7.3**.

This is the harmony engine correctly engaging frank_zappa's real harmony (previously silently falling back to barry_harris) and that harmony producing an unresolved/accidental final bar in this configuration.

---

## Also flagged

**validator_mismatch** persists because `behaviourGates.zappaStructuralRelax` is still keyed on primary `songwriterStyleId` only, not the new HV path — `engagement.validator_relax` reports true but the validator itself doesn't yet honor HV for frank_zappa (separate, smaller gap).

---

## OPEN QUESTIONS (pending investigation, not yet answered)

1. Is **finalBarTension** failure a real musical defect in frank_zappa's harmony resolution for this config, or an artifact of a still-primary-only assumption elsewhere in the harmony engine?
2. Does it fail consistently across other seeds, or only at **77777**?
3. Is **zappaStructuralRelax**'s primary-only keying in scope for this commit, or a follow-up?

---

## NEXT ACTION

- **Do not commit** until these 3 questions are answered.
- **Do not revert** the staged work — leave it staged as-is.
