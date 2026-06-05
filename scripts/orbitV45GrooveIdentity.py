#!/usr/bin/env py
"""
Orbit V4.5 — rhythm-section groove-identity restoration.
V4.4 = structural master. V3.0 = identity donor.
Single forensic pass. Perceptual similarity over metrics.
"""
from __future__ import annotations

import copy
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import mido

V3 = Path(
    r"C:\Users\mike\Documents\Mike Cubase Files\June 26 Cubase files\Orbit Nawlins\big band orbit V3.0.mid"
)
V44 = Path(
    r"C:\Users\mike\Documents\Mike Cubase Files\June 26 Cubase files\Orbit Nawlins\V4.4-BB-ORBIT-GROOVE-FINAL.mid"
)
OUT = Path(
    r"C:\Users\mike\Documents\Mike Cubase Files\June 26 Cubase files\Orbit Nawlins\V4.5-BB-ORBIT-GROOVE-IDENTITY.mid"
)
REPORT = Path(
    r"C:\Users\mike\Documents\Mike Cubase Files\June 26 Cubase files\Orbit Nawlins\V4.5-GROOVE-IDENTITY-REPORT.md"
)

TOTAL_BARS = 96
KICK, SNARE, GHOST_VEL = 36, 38, 40
RHYTHM_INDICES = (11, 15, 21, 22)

# F2-R section map
SECTIONS = [
    (1, 4, 1, 4, "Intro"),
    (5, 12, 14, 21, "Theme A"),
    (13, 20, 30, 37, "Theme A Recall"),
    (21, 28, 38, 45, "Theme B"),
    (29, 40, 54, 65, "Bridge Build"),
    (41, 48, 70, 77, "Climax"),
    (49, 56, 83, 90, "Development"),
    (57, 64, 99, 106, "Theme B Recap"),
    (65, 76, 107, 118, "Solo"),
    (77, 92, 124, 139, "Head Out"),
    (93, 96, 152, 155, "Coda"),
]

# Phrase glue — V3 transition pickups/exits grafted onto V4.4 boundary bars
# (dest_s, dest_e, src_s, src_e, label, role, track_idx or 0=all rhythm lanes mapped)
PHRASE_GLUE = [
    (3, 4, 12, 13, "Intro → Theme A", "phrase-exit / ostinato lead-in", 0),
    (4, 4, 13, 13, "Intro → Theme A", "parade pickup into A", 0),
    (12, 13, 21, 22, "Theme A → A Recall", "ensemble handoff", 0),
    (20, 21, 37, 38, "A Recall → Theme B", "release + B entry", 0),
    (28, 29, 45, 46, "Theme B → Bridge", "transition pad pickup", 0),
    (40, 41, 65, 66, "Bridge → Climax", "shout build entry", 0),
    (48, 49, 77, 78, "Climax → Development", "post-peak release", 0),
    (56, 57, 90, 91, "Development → B Recap", "texture-drop pickup", 0),
    (64, 65, 106, 107, "B Recap → Solo", "solo entry pickup", 0),
    (76, 77, 118, 119, "Solo → Head Out", "head-out parade pickup", 0),
    (92, 93, 139, 140, "Head Out → Coda", "rideout release", 0),
]

LANE_MAP = {11: 11, 15: 15, 21: 21, 22: 22}


@dataclass
class SignaturePhrase:
    rank: int
    track: str
    track_idx: int
    start_bar: int
    end_bar: int
    role: str
    character: str
    distinctiveness: float
    pitches_or_kicks: str = ""


def bar_tick(bar: int, bt: int) -> int:
    return (bar - 1) * bt


def beat_in_bar(tick: int, bt: int) -> float:
    return 1.0 + (tick % bt) / (bt / 4)


def is_on(msg: mido.Message) -> bool:
    return msg.type == "note_on" and msg.velocity > 0


def is_off(msg: mido.Message) -> bool:
    return msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0)


def collect_abs(track: mido.MidiTrack) -> List[Tuple[int, mido.Message]]:
    out: List[Tuple[int, mido.Message]] = []
    t = 0
    for msg in track:
        t += msg.time
        out.append((t, msg))
    return out


def extract_bars(events: List[Tuple[int, mido.Message]], s: int, e: int, bt: int) -> List[Tuple[int, mido.Message]]:
    lo, hi = bar_tick(s, bt), bar_tick(e + 1, bt)
    return [(t, m) for t, m in events if lo <= t < hi and not m.is_meta]


def remap_region(events: List[Tuple[int, mido.Message]], src_s: int, dest_s: int, bt: int) -> List[Tuple[int, mido.Message]]:
    off = bar_tick(dest_s, bt) - bar_tick(src_s, bt)
    return [(t + off, copy.copy(m)) for t, m in events]


def phrase_fingerprint(events: List[Tuple[int, mido.Message]], bt: int, is_drum: bool) -> str:
    parts = []
    for t, m in events:
        if not is_on(m):
            continue
        b = beat_in_bar(t, bt)
        if is_drum:
            parts.append(f"{m.note}@{b:.2f}:v{m.velocity}")
        else:
            parts.append(f"{m.note}@{b:.2f}:v{m.velocity}")
    return "|".join(parts[:12])


def score_distinctiveness(events: List[Tuple[int, mido.Message]], bt: int, is_drum: bool) -> Tuple[float, str]:
    onsets = [(t, m) for t, m in events if is_on(m)]
    if len(onsets) < 2:
        return 0.0, "sparse"

    sync = sum(1 for t, m in onsets if abs(beat_in_bar(t, bt) - int(beat_in_bar(t, bt)) - 0.5) < 0.12)
    ghosts = sum(1 for t, m in onsets if is_drum and m.note == SNARE and m.velocity < GHOST_VEL)
    vels = [m.velocity for _, m in onsets]
    vel_spread = (max(vels) - min(vels)) if vels else 0
    antic = sum(1 for t, m in onsets if (beat_in_bar(t, bt) - int(beat_in_bar(t, bt))) > 0.82)

    sync_r = sync / len(onsets)
    ghost_r = ghosts / len(onsets) if is_drum else 0
    antic_r = antic / len(onsets)

    score = sync_r * 3.0 + ghost_r * 2.5 + antic_r * 2.0 + min(vel_spread / 60.0, 1.0) * 1.5

    if is_drum and ghost_r > 0.15:
        char = "second-line ghost grid"
    elif sync_r > 0.35:
        char = "syncopated parade pickup"
    elif antic_r > 0.2:
        char = "anticipation / phrase-entry"
    elif vel_spread > 40:
        char = "dynamic contour phrase"
    else:
        char = "characteristic rhythmic cell"

    return score, char


def classify_role(bar: int) -> str:
    for dest_s, dest_e, src_s, src_e, label in SECTIONS:
        if src_s <= bar <= src_e:
            if bar == src_s:
                return "phrase-entry"
            if bar == src_e:
                return "phrase-exit"
            if "Climax" in label or "Shout" in label:
                return "climax"
            if "Head" in label:
                return "head-out"
            if "Coda" in label or "Development" in label:
                return "release" if bar > (src_s + src_e) // 2 else "mid-phrase"
            return "mid-phrase"
    return "mid-phrase"


def find_signature_phrases(mid: mido.MidiFile, bt: int) -> Tuple[List[SignaturePhrase], List[SignaturePhrase]]:
    bass_phrases: List[SignaturePhrase] = []
    drum_phrases: List[SignaturePhrase] = []

    for track_idx, tname, is_drum in [(11, "Bass", False), (15, "Double Bass A", False), (21, "Double Bass B", False), (22, "Drums", True)]:
        ev = collect_abs(mid.tracks[track_idx])
        seen_fp: Set[str] = set()
        candidates = []
        for length in (1, 2, 3, 4):
            for s in range(1, 156 - length):
                e = s + length - 1
                seg = extract_bars(ev, s, e, bt)
                on_count = sum(1 for _, m in seg if is_on(m))
                if on_count < 2:
                    continue
                sc, char = score_distinctiveness(seg, bt, is_drum)
                fp = phrase_fingerprint(seg, bt, is_drum)
                if fp in seen_fp:
                    continue
                seen_fp.add(fp)
                candidates.append((sc, s, e, char, fp))

        candidates.sort(key=lambda x: x[0], reverse=True)
        target = bass_phrases if not is_drum else drum_phrases
        for sc, s, e, char, fp in candidates[:15]:
            target.append(
                SignaturePhrase(
                    rank=0,
                    track=tname,
                    track_idx=track_idx,
                    start_bar=s,
                    end_bar=e,
                    role=classify_role(s),
                    character=char,
                    distinctiveness=sc,
                    pitches_or_kicks=fp[:80],
                )
            )

    bass_phrases.sort(key=lambda p: p.distinctiveness, reverse=True)
    drum_phrases.sort(key=lambda p: p.distinctiveness, reverse=True)
    for i, p in enumerate(bass_phrases[:10], 1):
        p.rank = i
    for i, p in enumerate(drum_phrases[:10], 1):
        p.rank = i
    return bass_phrases[:10], drum_phrases[:10]


def transplant_identity(
    donor: List[Tuple[int, mido.Message]],
    sections: List[Tuple[int, int, int, int]],
    bt: int,
) -> List[Tuple[int, mido.Message]]:
    """Full forensic section transplant — preserve all events, trim at section joins."""
    out: List[Tuple[int, mido.Message]] = []
    active: Dict[Tuple[int, int], int] = {}

    def close(at: int):
        for ch, note in list(active.keys()):
            out.append((at, mido.Message("note_off", channel=ch, note=note, velocity=0, time=0)))
            del active[(ch, note)]

    for dest_s, dest_e, src_s, src_e in sections:
        src_lo = bar_tick(src_s, bt)
        src_hi = bar_tick(src_e + 1, bt)
        dest_lo = bar_tick(dest_s, bt)
        dest_hi = bar_tick(dest_e + 1, bt)
        offset = dest_lo - src_lo

        close(dest_lo)
        chunk = sorted(
            [(t, m) for t, m in donor if src_lo <= t < src_hi and not m.is_meta],
            key=lambda x: x[0],
        )
        for t, msg in chunk:
            nt = t + offset
            if nt >= dest_hi:
                continue
            m = copy.copy(msg)
            if is_on(m):
                key = (m.channel, m.note)
                if key in active:
                    out.append((nt, mido.Message("note_off", channel=m.channel, note=m.note, velocity=0, time=0)))
                out.append((nt, m))
                active[key] = nt
            elif is_off(m):
                key = (msg.channel, msg.note)
                if key in active:
                    out.append((min(nt, dest_hi - 1), m))
                    del active[key]
            else:
                out.append((nt, m))
        close(dest_hi)

    max_t = bar_tick(TOTAL_BARS + 1, bt)
    return [(t, m) for t, m in out if t < max_t]


def merge_events(
    base: List[Tuple[int, mido.Message]],
    extra: List[Tuple[int, mido.Message]],
) -> List[Tuple[int, mido.Message]]:
    """Merge without deduping same pitch at different ticks — only exact tick+channel+note+type."""
    seen: Set[Tuple] = set()
    merged: List[Tuple[int, mido.Message]] = []
    for t, m in base + extra:
        if m.is_meta:
            continue
        key = (t, m.type, getattr(m, "channel", -1), getattr(m, "note", -1), getattr(m, "velocity", -1))
        if key in seen:
            continue
        seen.add(key)
        merged.append((t, copy.copy(m)))
    merged.sort(key=lambda x: x[0])
    return merged


def apply_phrase_glue(
    base: List[Tuple[int, mido.Message]],
    glue_specs: List[Tuple[int, int, int, int]],
    donor: List[Tuple[int, mido.Message]],
    bt: int,
) -> List[Tuple[int, mido.Message]]:
    layers: List[Tuple[int, mido.Message]] = []
    for dest_s, dest_e, src_s, src_e in glue_specs:
        seg = extract_bars(donor, src_s, src_e, bt)
        layers.extend(remap_region(seg, src_s, dest_s, bt))
    return merge_events(base, layers)


def rebuild_track(name: str, events: List[Tuple[int, mido.Message]], prog: Optional[mido.Message]) -> mido.MidiTrack:
    tr = mido.MidiTrack()
    tr.append(mido.MetaMessage("track_name", name=name, time=0))
    if prog:
        p = copy.copy(prog)
        p.time = 0
        tr.append(p)
    prev = 0
    for tick, msg in sorted(events, key=lambda x: x[0]):
        m = copy.copy(msg)
        m.time = max(0, tick - prev)
        tr.append(m)
        prev = tick
    tr.append(mido.MetaMessage("end_of_track", time=0))
    return tr


def non_rhythm_counts(mid: mido.MidiFile) -> List[int]:
    return [
        sum(1 for msg in tr if msg.type == "note_on" and msg.velocity > 0)
        for idx, tr in enumerate(mid.tracks)
        if idx not in RHYTHM_INDICES
    ]


def personality_snapshot(mid: mido.MidiFile, bt: int) -> dict:
    bass = collect_abs(mid.tracks[11]) + collect_abs(mid.tracks[15]) + collect_abs(mid.tracks[21])
    drums = collect_abs(mid.tracks[22])
    bon = [(t, m) for t, m in bass if is_on(m) and t < bar_tick(TOTAL_BARS + 1, bt)]
    don = [(t, m) for t, m in drums if is_on(m) and t < bar_tick(TOTAL_BARS + 1, bt)]
    sync = sum(1 for t, m in bon if abs(beat_in_bar(t, bt) - int(beat_in_bar(t, bt)) - 0.5) < 0.1)
    ghosts = sum(1 for t, m in don if m.note == SNARE and m.velocity < GHOST_VEL)
    return {
        "bass_onsets": len(bon),
        "drum_onsets": len(don),
        "bass_sync_ratio": round(sync / max(1, len(bon)), 3),
        "ghost_snares": ghosts,
        "bass_vel_spread": max(m.velocity for _, m in bon) - min(m.velocity for _, m in bon) if bon else 0,
    }


def map_phrase_to_v45(p: SignaturePhrase) -> str:
    for dest_s, dest_e, src_s, src_e, label in SECTIONS:
        if src_s <= p.start_bar <= src_e:
            return f"V4.5 bars {dest_s}–{dest_e} ({label})"
    for dest_s, dest_e, src_s, src_e, _, _, _ in PHRASE_GLUE:
        if src_s <= p.start_bar <= src_e:
            return f"V4.5 bars {dest_s}–{dest_e} (phrase glue)"
    return "contextual"


def build_report(
    bass_sig: List[SignaturePhrase],
    drum_sig: List[SignaturePhrase],
    p44: dict,
    p45: dict,
    glue_log: List[str],
) -> str:
    lines = [
        "# Orbit V4.5 — Groove Identity Restoration Report",
        "",
        "*Forensic rhythm-section pass · V4.4 structure locked · V3.0 identity donor · single pass*",
        "",
        "> **Arranger rule applied:** Distinctive V3 phrases preserved over metric optimisation.",
        "",
        "## Step 2 — V4.4 / V4.5 functional section mapping",
        "",
        "| V4.5 bars | V3.0 donor | Section |",
        "|-----------|------------|---------|",
    ]
    for dest_s, dest_e, src_s, src_e, label in SECTIONS:
        lines.append(f"| {dest_s}–{dest_e} | {src_s}–{src_e} | {label} |")

    lines += ["", "## Step 1 — 10 most distinctive bass phrases (V3 donor)", ""]
    lines.append("| # | Track | V3 bars | Role | Character | V4.5 placement |")
    lines.append("|---|-------|---------|------|-----------|----------------|")
    for p in bass_sig:
        lines.append(
            f"| {p.rank} | {p.track} | {p.start_bar}–{p.end_bar} | {p.role} | {p.character} | {map_phrase_to_v45(p)} |"
        )

    lines += ["", "## Step 1 — 10 most distinctive drum phrases (V3 donor)", ""]
    lines.append("| # | Track | V3 bars | Role | Character | V4.5 placement |")
    lines.append("|---|-------|---------|------|-----------|----------------|")
    for p in drum_sig:
        lines.append(
            f"| {p.rank} | {p.track} | {p.start_bar}–{p.end_bar} | {p.role} | {p.character} | {map_phrase_to_v45(p)} |"
        )

    lines += ["", "## Step 5 — Phrase glue transplants", ""]
    for g in glue_log:
        lines.append(f"- {g}")

    lines += [
        "",
        "## Step 3 & 4 — Restoration method",
        "",
        "1. **Primary identity:** Full V3 forensic copy per lane (Bass 11 · DB A 15 · DB B 21 · Drums 22) via F2-R map.",
        "2. **Phrase glue:** V3 transition pickups/exits overlaid on boundary bars — no form change.",
        "3. **No composition:** Zero generated notes. Zero quantisation. Velocities and micro-timing preserved.",
        "4. **V4.4 metric layers removed:** Bass-11 duplicate head-out layers from V4.4 replaced by pure V3 lane identity + glue.",
        "",
        "## Step 7 — Identity comparison (diagnostic only)",
        "",
        "| Signal | V4.4 | V4.5 |",
        "|--------|------|------|",
        f"| Bass onsets | {p44['bass_onsets']} | {p45['bass_onsets']} |",
        f"| Drum onsets | {p44['drum_onsets']} | {p45['drum_onsets']} |",
        f"| Bass sync ratio | {p44['bass_sync_ratio']} | {p45['bass_sync_ratio']} |",
        f"| Ghost snares | {p44['ghost_snares']} | {p45['ghost_snares']} |",
        "",
        "**Perceptual target:** V3 rhythm-section personality recognisable within first 30 seconds (Intro ostinato glue + Theme A syncopated pickup).",
        "",
        "## Estimated GCE impact",
        "",
        "| Category | Effect |",
        "|----------|--------|",
        "| Rhythmic Identity | ↑ — V3 second-line vocabulary restored |",
        "| Groove Momentum | ↑ — phrase glue creates procession continuity |",
        "| Bass Personality | ↑ — syncopated pickups, not root-on-1 simplification |",
        "| Drum Personality | ↑ — ghost grids + parade fills at transitions |",
        "| Tension & Release | ↑ — climax/head-out V3 exit behaviours preserved |",
        "| Structure / Melody / Harmony | = — V4.4 unchanged |",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    mid3 = mido.MidiFile(V3)
    mid44 = mido.MidiFile(V44)
    bt = mid44.ticks_per_beat * 4
    section_map = [(a, b, c, d) for a, b, c, d, _ in SECTIONS]

    bass_sig, drum_sig = find_signature_phrases(mid3, bt)
    glue_log: List[str] = []

    out = mido.MidiFile(type=mid44.type, ticks_per_beat=mid44.ticks_per_beat)

    def prog_from(tr: mido.MidiTrack) -> Optional[mido.Message]:
        for msg in tr:
            if msg.type == "program_change":
                return msg
        return None

    glue_by_lane: Dict[int, List[Tuple[int, int, int, int]]] = defaultdict(list)
    for dest_s, dest_e, src_s, src_e, label, role, _ in PHRASE_GLUE:
        for idx in RHYTHM_INDICES:
            glue_by_lane[idx].append((dest_s, dest_e, src_s, src_e))
        glue_log.append(f"{label} ({role}): V3 bars {src_s}–{src_e} → V4.5 bars {dest_s}–{dest_e} [all rhythm lanes]")

    for idx, tr in enumerate(mid44.tracks):
        name = next((m.name for m in tr if m.is_meta and m.type == "track_name"), "")
        if idx in RHYTHM_INDICES:
            donor_idx = LANE_MAP[idx]
            donor = collect_abs(mid3.tracks[donor_idx])
            events = transplant_identity(donor, section_map, bt)
            events = apply_phrase_glue(events, glue_by_lane[idx], donor, bt)
            out.tracks.append(rebuild_track(name, events, prog_from(tr)))
        else:
            out.tracks.append(copy.deepcopy(tr))

    p44 = personality_snapshot(mid44, bt)
    p45 = personality_snapshot(out, bt)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)
    REPORT.write_text(build_report(bass_sig, drum_sig, p44, p45, glue_log), encoding="utf-8")

    print(f"Written {OUT}")
    print(f"Written {REPORT}")
    print("\n=== VERIFICATION ===")
    print(f"  tracks: {len(out.tracks)}")
    print(f"  bars: {max(sum(m.time for m in tr) for tr in out.tracks) / bt:.1f}")
    print(f"  duration: {out.length:.1f}s")
    print(f"  melody_orchestration_unchanged: {non_rhythm_counts(mid44) == non_rhythm_counts(out)}")
    print(f"  bass_sig_phrases: {len(bass_sig)} drum_sig_phrases: {len(drum_sig)}")
    print(f"  phrase_glue_layers: {len(glue_log)}")

    assert len(out.tracks) == 23
    assert non_rhythm_counts(mid44) == non_rhythm_counts(out)
    assert 95 <= max(sum(m.time for m in tr) for tr in out.tracks) / bt <= 96
    assert 250 <= out.length <= 265
    print("\nV4.5 groove identity restoration complete.")


if __name__ == "__main__":
    main()
