#!/usr/bin/env python3
"""Build the Composer OS V3.2 Quick Start and Handbook PDFs."""

from __future__ import annotations

import hashlib
import subprocess
import textwrap
from pathlib import Path

from shared.diagrams import fretboard_a_dorian, pitch_clock, world_map

ROOT = Path(__file__).resolve().parent
TYPST = ROOT / "tools" / "typst-aarch64-apple-darwin" / "typst"
ASSETS = ROOT / "assets"
DIAG = ASSETS / "diagrams"
OUT = ROOT / "out"

SPECIAL = set("#@$<>*_`\\[]")


def esc(text: str) -> str:
    return "".join("\\" + ch if ch in SPECIAL else ch for ch in text)


def ui(label: str) -> str:
    return "#ui[" + esc(label) + "]"


def badge(kind: str) -> str:
    return f"#badge({kind!r})"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def diagrams() -> None:
    DIAG.mkdir(parents=True, exist_ok=True)
    fretboard_a_dorian(DIAG / "a-dorian-fretboard.svg")
    pitch_clock(DIAG / "aug-hex-clock.svg", {0, 3, 4, 7, 8, 11}, [0, 3, 4, 7])
    world_map(DIAG / "bhl-worlds.svg")


def image(rel: str, alt: str, width: str = "100%") -> str:
    return f'#image("{rel}", width: {width}, alt: "{esc(alt)}")'


def capabilities_yaml() -> str:
    rows = [
        ("nav.generate", "Generate", "apps/composer-os-app/src/router/appRouter.ts:128", "ok", "Route label. Seen on the running UI bundle v2.10.10."),
        ("nav.arranger", "Arranger", "apps/composer-os-app/src/router/appRouter.ts:130", "verify", "Route exists. Exact arranging behaviour was not exercised for this edition."),
        ("nav.structure", "Structure", "apps/composer-os-app/src/router/appRouter.ts:132", "verify", "Route exists. Behaviour not exercised."),
        ("nav.ensemble", "Ensemble", "apps/composer-os-app/src/router/appRouter.ts:134", "verify", "Route exists. Behaviour not exercised."),
        ("nav.grid", "Grid", "apps/composer-os-app/src/router/appRouter.ts:136", "verify", "Route exists. Behaviour not exercised."),
        ("nav.presets", "Presets", "apps/composer-os-app/src/router/appRouter.ts:138", "ok", "Route label seen in the running UI."),
        ("nav.outputs", "Outputs", "apps/composer-os-app/src/router/appRouter.ts:140", "verify", "Route exists. Export location not re-checked this run."),
        ("nav.riffgen", "RiffGen", "apps/composer-os-app/src/router/appRouter.ts:142", "ok", "Route label seen."),
        ("nav.engines", "Composer Engines", "apps/composer-os-app/src/router/appRouter.ts:144", "ok", "Route label seen."),
        ("nav.slonimsky", "Slonimsky Etudes", "apps/composer-os-app/src/router/appRouter.ts:146", "ok", "Route label seen."),
        ("nav.pentatonic", "Pentatonic", "apps/composer-os-app/src/router/appRouter.ts:148", "ok", "Page opened. Heading Pentatonic Engine."),
        ("nav.hexatonic", "Hexatonic", "apps/composer-os-app/src/router/appRouter.ts:150", "ok", "Route exists. Controls read from HexatonicEnginePage.tsx."),
        ("nav.bhl", "BHL", "apps/composer-os-app/src/router/appRouter.ts:152", "ok", "Route label seen. Procedure lives in the BHL V1.0 manuals."),
        ("nav.practice", "Practice & Scales Studio", "apps/composer-os-app/src/router/appRouter.ts:154", "ok", "Page opened on A Dorian."),
        ("nav.evaluation", "Evaluation", "apps/composer-os-app/src/router/appRouter.ts:156", "verify", "Route exists. Listening-log behaviour not re-run."),
        ("nav.performance", "Performance Composer", "apps/composer-os-app/src/router/appRouter.ts:158", "verify", "Route exists. Respond flow not re-run."),
        ("nav.help", "Help", "apps/composer-os-app/src/router/appRouter.ts:160", "ok", "Route label seen."),
        ("nav.credits", "Credits", "apps/composer-os-app/src/router/appRouter.ts:162", "ok", "Route label seen."),
        ("preset.duo", "Guitar/Bass Duo", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:22", "ok", "Preset name in APP_PRESET_REGISTRY, supported true."),
        ("preset.single", "Guitar–Bass Duo (Single-Line)", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:29", "ok", "Preset name in the registry."),
        ("preset.wyble", "Wyble Etude", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:36", "ok", "Preset name in the registry."),
        ("preset.slonimsky", "Slonimsky Etude", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:42", "ok", "Preset name in the registry."),
        ("preset.martino", "Martino Linear", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:48", "ok", "Preset name in the registry."),
        ("preset.ecm", "ECM Chamber", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:54", "ok", "Preset name in the registry."),
        ("preset.song", "Song Mode", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:61", "ok", "Preset name in the registry."),
        ("preset.bigband", "Big Band", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:68", "ok", "Seven-part ensemble MusicXML when export passes."),
        ("preset.sq", "String Quartet", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:75", "ok", "Four strings plus piano harmony staff."),
        ("preset.riff", "Riff Generator", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:82", "ok", "1–4 bar loopable riffs."),
        ("preset.sqbb", "SQ → BB", "apps/composer-os-app/src/constants/composerOsPresetUi.ts:89", "ok", "Line-first SATB sketch then big-band section plan."),
        ("practice.play", "Play Scale", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:321", "ok", "Clicked presence confirmed on the open page. No drone."),
        ("practice.generate", "Generate", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:774", "ok", "Exercise button. GUI report 16 Oct 2026 wrote a pathway."),
        ("practice.another", "Generate another", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:777", "ok", "Button present in source."),
        ("practice.export", "Export MusicXML", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:942", "ok", "Button present. GUI report downloaded a MusicXML file."),
        ("practice.save", "Save session", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:918", "ok", "Button present. Browser downloads JSON."),
        ("practice.bhl", "Develop in BHL Composer", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:333", "verify", "Shown only when the sounding set matches a BHL colour. Absent on default A Dorian."),
        ("practice.open", "Open File", "apps/composer-os-app/src/practice/PracticeStudioPage.tsx:945", "verify", "Desktop-only after a file is written. Not clicked in Electron."),
        ("pent.path", "Generate path", "apps/composer-os-app/src/pentatonic/PentatonicEnginePage.tsx", "ok", "Button visible on the open Pentatonic page."),
        ("pent.practice", "Practice this collection", "apps/composer-os-app/src/pentatonic/PentatonicEnginePage.tsx", "ok", "Button visible. Inbound handoff described in the 16 Oct GUI report."),
        ("pent.use", "Use for path transform and phrase generation", "apps/composer-os-app/src/pentatonic/PentatonicEnginePage.tsx", "ok", "Button under each colour card, including Kumoi."),
        ("hex.generate", "Generate INSIDE / OUTSIDE / RETURN", "apps/composer-os-app/src/hexatonic/HexatonicEnginePage.tsx:275", "ok", "Exact button string in source."),
        ("hex.export", "Export MusicXML", "apps/composer-os-app/src/hexatonic/HexatonicEnginePage.tsx:278", "ok", "Exact button string in source."),
        ("hex.augmented", "Augmented t0", "apps/composer-os-app/src/hexatonic/hexatonicWorkspaceModel.ts:27", "ok", "Scalar collection menu label. Pitches C Eb E G Ab B."),
        ("limit.orchestra", "No orchestral engine", "docs/FILM_COMPOSER_GUIDE.md", "manual", "Orchestra and film-cue sync are done by hand."),
        ("limit.electronic", "No electronic engine", "docs/manuals/v3.2/capabilities.yaml", "manual", "DAW processing is outside Composer OS."),
        ("limit.nodrone", "No drone", "docs/V3.2-PRACTICE-STUDIO-GUI-REFINEMENT.md", "ok", "Play Scale has no drone."),
    ]
    lines = ["# Capability register for the V3.2 manuals. Status: ok, verify, manual.", "items:"]
    for ident, label, source, status, evidence in rows:
        lines.append(f"  - id: {ident}")
        lines.append(f"    label: {label!r}")
        lines.append(f"    source: {source}")
        lines.append(f"    status: {status}")
        lines.append(f"    evidence: {evidence!r}")
    text = "\n".join(lines) + "\n"
    write(ROOT / "capabilities.yaml", text)
    return hashlib.sha256(text.encode()).hexdigest()[:12]


def paragraph(text: str) -> str:
    return esc(text) + "\n\n"


def steps(items: list[str]) -> str:
    body = "\n".join(f"  + {item}" for item in items)
    return "#set enum(numbering: n => [#text(fill: white, font: \"Source Sans 3\", size: 8pt, weight: 700)[#n]]) \n" + body + "\n"


# The enum numbering trick is fragile. Use a simple numbered list in prose instead.
def step_list(items: list[str]) -> str:
    lines = []
    for index, item in enumerate(items, start=1):
        lines.append(f"#strong[{index}.] {item}\n")
    return "\n".join(lines) + "\n"
