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
