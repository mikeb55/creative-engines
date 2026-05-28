"""
Martino-specific GCE dimensions (0.0–1.0 each). Stdlib only.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

_log = logging.getLogger(__name__)

MARTINO_GCE_DIMENSIONS: tuple[str, ...] = (
    "reduction_integrity",
    "spatial_continuity",
    "directional_persistence",
    "inversion_coherence",
    "activity_architecture",
    "anti_bebop_drift",
    "lfv_integrity",
    "interval_dna_continuity",
)

MARTINO_GCE_WEIGHTS: dict[str, float] = {
    "reduction_integrity": 0.14,
    "spatial_continuity": 0.10,
    "directional_persistence": 0.14,
    "inversion_coherence": 0.10,
    "activity_architecture": 0.14,
    "anti_bebop_drift": 0.16,
    "lfv_integrity": 0.12,
    "interval_dna_continuity": 0.10,
}

DCR_SCORE_KEYS: dict[str, str] = {
    "reduction": "reduction_integrity",
    "variety": "activity_architecture",
    "direction": "directional_persistence",
    "anti_bebop": "anti_bebop_drift",
    "lfv": "lfv_integrity",
}


@dataclass
class MartinoGceResult:
    dimensions: dict[str, float]
    overall: float
    hard_gate_triggered: bool
    hard_gate_reasons: list[str]
    anti_bebop_penalty: float
    gate_failed: bool = False

    def to_provenance_dict(self) -> dict[str, float]:
        return dict(self.dimensions)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _activity_keys(plan: list[dict[str, Any]]) -> list[str]:
    keys: list[str] = []
    for row in plan:
        act = str(row.get("activity") or "")
        if act.startswith("A") and "_" in act:
            keys.append(act.split("_", 1)[0])
        elif len(act) >= 2 and act[1].isdigit():
            keys.append(act[:2])
        else:
            keys.append(act)
    return keys


def _pc_shortest_distance(a: int, b: int) -> int:
    d = abs((int(b) - int(a)) % 12)
    return min(d, 12 - d)


def score_reduction_integrity(plan: list[dict[str, Any]]) -> float:
    if not plan:
        return 0.5
    pcs = [int(r.get("reduction_pc", 0)) for r in plan if "reduction_pc" in r]
    if not pcs:
        names = [str(r.get("reduction", "")) for r in plan]
        stable = sum(1 for i in range(1, len(names)) if names[i] == names[i - 1])
        return _clamp01(0.55 + stable / max(1, len(names) - 1) * 0.45) if len(names) > 1 else 0.7
    changes = sum(1 for i in range(1, len(pcs)) if _pc_shortest_distance(pcs[i], pcs[i - 1]) > 2)
    return _clamp01(1.0 - changes / max(1, len(pcs) - 1))


def score_spatial_continuity(
    plan: list[dict[str, Any]],
    interval_fingerprints: list[list[int]] | None = None,
) -> float:
    if interval_fingerprints:
        jumps = [abs(x) for fp in interval_fingerprints for x in fp]
        if not jumps:
            return 0.65
        big = sum(1 for j in jumps if j > 7)
        return _clamp01(1.0 - big / max(1, len(jumps)) * 1.2)
    keys = _activity_keys(plan)
    motion_cost = {"A1": 0.1, "A2": 0.25, "A3": 0.2, "A4": 0.15, "A5": 0.35}
    if not keys:
        return 0.5
    cost = sum(motion_cost.get(k, 0.3) for k in keys) / len(keys)
    return _clamp01(1.0 - cost)


def score_directional_persistence(
    direction_vectors: list[str] | None,
    plan: list[dict[str, Any]] | None = None,
) -> float:
    if direction_vectors and len(direction_vectors) >= 2:
        reversals = 0
        prev = direction_vectors[0]
        for vec in direction_vectors[1:]:
            if vec != prev and vec != "pivot" and prev != "pivot":
                reversals += 1
            prev = vec
        return _clamp01(1.0 - reversals / max(1, len(direction_vectors) - 1) * 0.55)
    if plan:
        pcs = [int(r.get("reduction_pc", 0)) for r in plan if "reduction_pc" in r]
        if len(pcs) >= 2:
            ups = sum(1 for i in range(1, len(pcs)) if ((pcs[i] - pcs[i - 1]) % 12) in (1, 2))
            return _clamp01(0.5 + ups / (len(pcs) - 1) * 0.5)
    return 0.65


def score_inversion_coherence(plan: list[dict[str, Any]]) -> float:
    if not plan:
        return 0.5
    ok = 0.0
    for row in plan:
        role = str(row.get("role", ""))
        act = str(row.get("activity", ""))
        chord = str(row.get("chord", ""))
        inversion = str(row.get("inversion", "root")).lower()
        is_dominant = (
            "dominant" in chord.lower()
            or (chord.endswith("7") and "maj" not in chord.lower())
        )
        if is_dominant:
            if "A2" in act or "A3" in act:
                ok += 1.0
            else:
                ok += 0.5
            continue
        # Opening/climactic: reward root or first inversion
        if "A1" in act or "A5" in act:
            if inversion in ("root", "first"):
                ok += 1.0
            else:
                ok += 0.5
        # Pivot/anchor: penalise root-only (expect more movement)
        elif "A3" in act or "A4" in act:
            if inversion == "root":
                ok += 0.75
            else:
                ok += 1.0
        else:
            ok += 1.0
    return _clamp01(ok / len(plan))


def score_activity_architecture(plan: list[dict[str, Any]]) -> float:
    keys = _activity_keys(plan)
    if not keys:
        return 0.4
    uniq = len(set(keys))
    variety = min(1.0, uniq / max(1, min(4, len(keys))))
    run_penalty = 0.0
    for i in range(2, len(keys)):
        if keys[i] == keys[i - 1] == keys[i - 2]:
            run_penalty += 0.25
    return _clamp01(0.45 + variety * 0.55 - run_penalty)


def _stepwise_reward(interval_fingerprints: list[list[int]] | None) -> float:
    """Fraction of melodic intervals that are steps (semitones 1–2)."""
    if not interval_fingerprints:
        return 0.0
    intervals = [abs(x) for fp in interval_fingerprints for x in fp]
    if not intervals:
        return 0.0
    steps = sum(1 for iv in intervals if iv in (1, 2))
    return steps / len(intervals)


def score_anti_bebop_drift(
    plan: list[dict[str, Any]],
    chords: list[str] | None = None,
    interval_fingerprints: list[list[int]] | None = None,
) -> float:
    """1.0 = no bebop drift; 0.0 = heavy cliché/bebop language."""
    penalty = 0.0
    chord_list = chords or [str(r.get("chord", "")) for r in plan]
    keys = _activity_keys(plan)

    for i in range(len(chord_list) - 1):
        c0, c1 = chord_list[i].lower(), chord_list[i + 1].lower()
        if "m7" in c0 and c0.startswith("d") and c1.startswith("g") and "7" in c1:
            if i < len(keys) and keys[i] in ("A1", "A1_LINEAR_CORE"):
                penalty += 0.35
            penalty += 0.15

    if interval_fingerprints:
        for fp in interval_fingerprints:
            for j in range(2, len(fp)):
                if fp[j - 1] == -fp[j - 2] and abs(fp[j - 1]) <= 2:
                    penalty += 0.12
            sym = sum(1 for x in fp if abs(x) == 2)
            penalty += sym * 0.04

    cadence_every_two = 0
    for i in range(1, len(keys), 2):
        if i < len(keys) and keys[i] in ("A4", "A4_ANCHOR_ARP"):
            cadence_every_two += 1
    penalty += cadence_every_two * 0.08

    contour_resets = 0
    if interval_fingerprints and len(interval_fingerprints) >= 2:
        for i in range(1, len(interval_fingerprints)):
            a = sum(interval_fingerprints[i - 1])
            b = sum(interval_fingerprints[i])
            if a != 0 and b != 0 and (a > 0) != (b > 0):
                contour_resets += 1
        penalty += contour_resets * 0.06

    step_frac = _stepwise_reward(interval_fingerprints)
    if step_frac >= 0.9 and penalty < 0.5:
        penalty *= 0.5

    p = min(1.0, penalty)
    reward = step_frac * 0.3 if p < 0.4 else step_frac * 0.08
    base = (1.0 - p) * 0.7 + reward
    return _clamp01(max(base, step_frac * 0.05))


def score_lfv_integrity(plan: list[dict[str, Any]]) -> float:
    if not plan:
        return 0.5
    ok = sum(1 for r in plan if r.get("lfv_ok", True))
    return _clamp01(ok / len(plan))


def score_interval_dna_continuity(fingerprints: list[list[int]] | None) -> float:
    if not fingerprints or len(fingerprints) < 2:
        return 0.72
    dup_adj = sum(
        1 for i in range(1, len(fingerprints)) if fingerprints[i] == fingerprints[i - 1]
    )
    tri_dup = sum(
        1
        for i in range(2, len(fingerprints))
        if fingerprints[i] == fingerprints[i - 1] == fingerprints[i - 2]
    )
    return _clamp01(1.0 - dup_adj * 0.2 - tri_dup * 0.45)


def check_hard_gates(
    plan: list[dict[str, Any]],
    rhythmic_signatures: list[str] | None = None,
    interval_fingerprints: list[list[int]] | None = None,
    direction_vectors: list[str] | None = None,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    keys = _activity_keys(plan)

    if rhythmic_signatures and len(rhythmic_signatures) >= 3:
        for i in range(2, len(rhythmic_signatures)):
            if (
                rhythmic_signatures[i]
                == rhythmic_signatures[i - 1]
                == rhythmic_signatures[i - 2]
            ):
                reasons.append("rhythmic_identity_triple")
                break

    reductions = [str(r.get("reduction", "")) for r in plan]
    if len(reductions) >= 3 and len(set(reductions)) == len(reductions):
        reasons.append("reduction_centre_unstable")

    roles = [str(r.get("role", "")) for r in plan]
    if len(roles) >= 3 and all(r == "opening" for r in roles):
        reasons.append("phrase_fragmentation")

    if interval_fingerprints and len(interval_fingerprints) >= 2:
        for i in range(1, len(interval_fingerprints)):
            fp_prev, fp_cur = interval_fingerprints[i - 1], interval_fingerprints[i]
            if not fp_prev or not fp_cur:
                continue
            if len(fp_prev) != len(fp_cur):
                bar_a = int(plan[i - 1].get("bar", i)) if i - 1 < len(plan) else i
                bar_b = int(plan[i].get("bar", i + 1)) if i < len(plan) else i + 1
                _log.debug(
                    "lfv_positional_jump skipped bars %d-%d: fingerprint length "
                    "mismatch %d vs %d (not a positional jump)",
                    bar_a,
                    bar_b,
                    len(fp_prev),
                    len(fp_cur),
                )
                continue
            bridge_jump = abs(fp_cur[0] - fp_prev[-1])
            if bridge_jump > 9:
                bar_a = int(plan[i - 1].get("bar", i)) if i - 1 < len(plan) else i
                bar_b = int(plan[i].get("bar", i + 1)) if i < len(plan) else i + 1
                _log.warning(
                    "lfv_positional_jump bars %d-%d (plan idx %d-%d) bridge_jump=%d "
                    "(fp lens %d vs %d)",
                    bar_a,
                    bar_b,
                    i - 1,
                    i,
                    bridge_jump,
                    len(fp_prev),
                    len(fp_cur),
                )
                reasons.append(f"lfv_positional_jump:bars_{bar_a}-{bar_b}:bridge_{bridge_jump}")
                break

    if direction_vectors and len(direction_vectors) >= 4:
        resets = 0
        for i in range(1, len(direction_vectors)):
            a, b = direction_vectors[i - 1], direction_vectors[i]
            if a != "pivot" and b != "pivot" and a != b:
                resets += 1
        if resets >= len(direction_vectors) - 1:
            reasons.append("excessive_contour_resets")

    if len(keys) >= 3 and len(set(keys)) == 1:
        reasons.append("activity_monotony")

    return bool(reasons), reasons


def score_martino_gce(
    plan: list[dict[str, Any]],
    *,
    interval_fingerprints: list[list[int]] | None = None,
    direction_vectors: list[str] | None = None,
    rhythmic_signatures: list[str] | None = None,
    chords: list[str] | None = None,
    anti_bebop_penalty: float = 0.0,
) -> MartinoGceResult:
    dimensions = {
        "reduction_integrity": score_reduction_integrity(plan),
        "spatial_continuity": score_spatial_continuity(plan, interval_fingerprints),
        "directional_persistence": score_directional_persistence(direction_vectors, plan),
        "inversion_coherence": score_inversion_coherence(plan),
        "activity_architecture": score_activity_architecture(plan),
        "anti_bebop_drift": score_anti_bebop_drift(plan, chords, interval_fingerprints),
        "lfv_integrity": score_lfv_integrity(plan),
        "interval_dna_continuity": score_interval_dna_continuity(interval_fingerprints),
    }
    if anti_bebop_penalty > 0:
        dimensions["anti_bebop_drift"] = _clamp01(
            dimensions["anti_bebop_drift"] - anti_bebop_penalty
        )

    overall = sum(
        dimensions[k] * MARTINO_GCE_WEIGHTS[k] for k in MARTINO_GCE_DIMENSIONS
    )
    hard, reasons = check_hard_gates(
        plan, rhythmic_signatures, interval_fingerprints, direction_vectors
    )
    overall_clamped = _clamp01(overall)
    gate_failed = (overall_clamped * 10 < 7.5) or (
        dimensions.get("anti_bebop_drift", 1.0) < 0.75
    )
    return MartinoGceResult(
        dimensions=dimensions,
        overall=overall_clamped,
        hard_gate_triggered=hard,
        hard_gate_reasons=reasons,
        anti_bebop_penalty=anti_bebop_penalty,
        gate_failed=gate_failed,
    )


def weakest_dcr_dimension(dimensions: dict[str, float]) -> str:
    mapping = {
        "reduction_integrity": "reduction",
        "activity_architecture": "variety",
        "directional_persistence": "direction",
        "anti_bebop_drift": "anti_bebop",
        "lfv_integrity": "lfv",
    }
    focus = {k: dimensions.get(v, 0.5) for k, v in DCR_SCORE_KEYS.items()}
    return min(focus, key=focus.get)


def overall_plan_score(result: MartinoGceResult) -> float:
    if result.hard_gate_triggered:
        return result.overall * 0.55
    return result.overall
