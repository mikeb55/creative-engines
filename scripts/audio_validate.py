#!/usr/bin/env python3
"""
Release-tier audio validation — render MIDI to WAV, silence + onset + spectral checks.
Requires: fluidsynth, fluid-soundfont-gm, pip install -r requirements-ci.txt
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
from music21 import converter
from midi2audio import FluidSynth


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def render_mid_to_wav(mid_path: Path, wav_path: Path) -> None:
    fs = FluidSynth()
    fs.midi_to_audio(str(mid_path), str(wav_path))


def silence_windows_fail(y: np.ndarray, sr: int, window_s: float = 2.0, floor_db: float = -50.0) -> list[str]:
    failures: list[str] = []
    win = int(window_s * sr)
    if win <= 0 or len(y) < win:
        return failures
    hop = max(1, win // 2)
    for start in range(0, len(y) - win + 1, hop):
        chunk = y[start : start + win]
        rms = float(np.sqrt(np.mean(chunk**2) + 1e-12))
        db = 20.0 * np.log10(rms + 1e-12)
        if db < floor_db:
            failures.append(f"2s window at {start / sr:.1f}s RMS {db:.1f} dB < {floor_db} dB")
    return failures


def onset_density_ok(y: np.ndarray, sr: int, min_onsets: int = 4) -> bool:
  sections = 4
  seg = max(1, len(y) // sections)
  for i in range(sections):
    chunk = y[i * seg : (i + 1) * seg]
    if len(chunk) < sr // 4:
      continue
    onsets = librosa.onset.onset_detect(y=chunk, sr=sr, units="time")
    if len(onsets) < min_onsets:
      return False
  return True


def spectral_energy_in_band(y: np.ndarray, sr: int, lo_hz: float, hi_hz: float) -> float:
    S = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    mask = (freqs >= lo_hz) & (freqs <= hi_hz)
    if not np.any(mask):
        return 0.0
    return float(np.mean(S[mask, :]))


def validate_mid(mid_path: Path, expected_bars: int) -> dict:
    failures: list[str] = []
    stats: dict = {"file": str(mid_path)}

    with tempfile.TemporaryDirectory() as td:
        wav_path = Path(td) / "render.wav"
        try:
            render_mid_to_wav(mid_path, wav_path)
        except Exception as e:
            return {"passed": False, "failures": [f"render failed: {e}"], "stats": stats}

        y, sr = librosa.load(str(wav_path), sr=None, mono=True)
        stats["duration_s"] = float(len(y) / sr)
        stats["sr"] = int(sr)

        trimmed, _ = librosa.effects.trim(y, top_db=50)
        if len(trimmed) < sr // 8:
            failures.append("trimmed audio nearly silent")

        failures.extend(silence_windows_fail(y, sr))

        if not onset_density_ok(y, sr, min_onsets=3):
            failures.append("onset density below minimum in one or more quarters")

        try:
            sc = converter.parse(str(mid_path))
            stats["parts"] = len(getattr(sc, "parts", []) or [])
        except Exception:
            stats["parts"] = 0

        # Family bands (coarse)
        low = spectral_energy_in_band(y, sr, 40, 250)
        mid = spectral_energy_in_band(y, sr, 250, 2000)
        high = spectral_energy_in_band(y, sr, 2000, 8000)
        stats["band_energy"] = {"low": low, "mid": mid, "high": high}
        if low + mid + high < 1e-6:
            failures.append("no spectral energy in expected bands")

    return {"passed": len(failures) == 0, "failures": failures, "stats": stats}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input-dir", default=str(repo_root() / "_test_outputs"))
    ap.add_argument("--expected-bars", type=int, default=8)
    args = ap.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(json.dumps({"passed": False, "failures": [f"missing input dir {input_dir}"], "stats": {}}))
        return 1

    mids = sorted(input_dir.rglob("*.mid"))
    if not mids:
        print(json.dumps({"passed": False, "failures": ["no .mid files in input-dir"], "stats": {}}))
        return 1

    results = []
    all_failures: list[str] = []
    for mid in mids:
        if "drum_guide" in mid.name.lower():
            continue
        r = validate_mid(mid, args.expected_bars)
        results.append(r)
        if not r["passed"]:
            all_failures.extend([f"{mid.name}: {f}" for f in r["failures"]])

    report = {
        "passed": len(all_failures) == 0,
        "failures": all_failures,
        "stats": {"midiFiles": len(mids), "validated": len(results), "expectedBars": args.expected_bars},
        "results": results,
    }
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
