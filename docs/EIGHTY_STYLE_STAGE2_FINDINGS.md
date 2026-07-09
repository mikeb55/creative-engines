# 80-Style Audit — Stage 2 Validation Findings

One-off probe results for Tier 1 candidates from [EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md](./EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md). **Documentation only — no fixes logged here as completed.**

---

## Stage 2 validation: frank_zappa (2026-07-08)

**CONFIRMED:** `frank_zappa` exhibits the same 3-symptom bug class as Verlaine when used as `harmonicVoice`:

1. **Harmony authority conflict** — chord authority / spine stays on primary style; Zappa's `harmonyContext` never activates
2. **Validator mismatch** — `zappaStructuralRelax` never activates on HV path
3. **GCE scoring uses wrong route** (generic evaluator instead of `scoreFrankZappaResultForGce`) — produces a **MISLEADING score improvement (7.4 → 8.5)** that is not real quality, just wrong-scorer artifact. **This is worse than a plain failure — flag prominently.**

`generationSuccess: false` on HV path despite `exportIntegrityPassed: true` — matches Verlaine's authority-mismatch signature exactly.

### Methodology validated

Tier 1 static-sweep scoring correctly predicted this before any code was tested. Confirms audit approach works — proceed to test remaining Tier 1 candidates (**31 remaining**) using same one-off probe pattern before deciding on a fix batch.

### Next scoped fix (not started)

`frank_zappa` needs Verlaine-equivalent HV-aware wiring for:

- `harmonyContext` precompute
- `resolveDuoRiffVrbLaneId` `frank_zappa` block
- `isFrankZappaSongwriterId` checks in `behaviourGates` / `gceGate`
- `EFFECTIVE_HARMONY_TRUTH_REGISTRY` / `pipelineTruthGates` alignment

Log as its own **DCR item**, same treatment as Verlaine originally.

## Stage 2 HV probe expansion (2026-07-09)

Tested styles: `allan_holdsworth`, `fripp`, `bill_evans`, `pat_metheny` (seed 77777, `guitar_bass_duo` 32-bar path). Central GCE scorer-routing fix (`commit 951ea2a7`) was already in place, so all probes reflect honest generic scoring plus `HV_SCORER_MISMATCH` diagnostics rather than the earlier misleading score uplift.

Result: 4/4 match the Verlaine/Zappa bug class at the harmony-authority level:

- Symptom A (authority): chord authority / spine / effective bars remain on the primary style when the target is used as `harmonicVoice`. For `allan_holdsworth` and `fripp`, the riff lane engages via VRB, but the harmony spine stays on the primary writer.
- Symptom B (validators): any style-specific relax / bypass / precompute gates for these styles remain primary-only on the HV path and do not engage when the style is only `harmonicVoice`.
- Symptom C (scoring): `HV_SCORER_MISMATCH` fires for all four styles when used as `harmonicVoice`, and GCE uses the generic scorer with high-7 / low-8 scores, reflecting "style not engaged" rather than a false improvement.

Combined with the earlier Stage 2 probes for `verlaine` and `frank_zappa` as `harmonicVoice`, this makes 6/6 Tier 1 candidates tested that share the same three-symptom pattern. This satisfies the audit stopping rule (>=4/5 matches -> commit to a shared abstraction) with full consistency across all probed styles.

Decision: proceed to design and implement a shared "HV-aware effective style identity / authority" abstraction, instead of continuing bespoke per-style probing for the remaining Tier 1 candidates. The remaining Tier 1 styles will be addressed via rollout of this abstraction, with targeted verification rather than fresh diagnosis from scratch.
