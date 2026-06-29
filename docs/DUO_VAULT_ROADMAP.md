# Duo Vault Roadmap

Canonical staged plan for wiring Tonality Vault into the `guitar_bass_duo` harmony path. Vault is the single harmonic authority. Each stage is independently shippable.

## Stages

- **Stage 0 — Audit (done).** Repo read, over-architected design shrunk to a thin first slice (pure resolver + tests); vault confirmed as single harmonic authority.
- **Stage 1 — Resolver (done).** `resolveDuoHarmonyForSymbol` with slash, alt, fallback; smoke tests for key symbols; musical PCs verified; committed as a clean reversible slice.
- **Stage 2 — Baseline capture (done).** Formal GCE + V3 gate on 5 representative duo progressions, vault not wired; scores + inputs stored as regression yardstick. See `DUO_VAULT_BASELINE.md`.
- **Stage 3 — Single integration swap.** Swap one narrow duo tone-source call site to use the resolver; compare to baseline. Gate: baseline scores HELD (not merely still-passing), V3 still PASS, only that call site changed.
- **Stage 4 — Locked-harmony cleanup.** Fix canonical rewrite issues (e.g. unwanted G7→G13) on this vault-backed path. Gate: duo uses vault with no parallel hidden guide-tone authority.
- **Stage 5 — Advanced chords + fallback policy.** Extend to maj7#11, alt dominants, etc.; define policy for unmapped extension chords (may invent phantom sevenths / drop add9 tones). Gate: advanced chords improve; fallback safely constrained or declined.
- **Stage 6 — Regression + adoption.** Re-run baseline GCE + V3, add listening checks; if simple/medium hold and advanced sound better, promote vault-backed duo path to default; docs/tests updated, old path legacy.
