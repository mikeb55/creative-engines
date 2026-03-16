"""
Platform verification script — runs full test suite in engine-isolated batches.
"""
import subprocess
import sys
import os

def run_pytest(paths, label=""):
    """Run pytest on given paths, return (passed, failed, errors, runtime)."""
    cmd = [sys.executable, "-m", "pytest"] + list(paths) + ["-v", "--tb=no", "-q"]
    t0 = __import__("time").time()
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)), timeout=180)
    elapsed = __import__("time").time() - t0
    out = r.stdout + r.stderr
    passed = out.count(" PASSED") if "PASSED" in out else 0
    failed = out.count(" FAILED") if "FAILED" in out else 0
    errors = out.count(" ERROR") if "ERROR" in out else 0
    # Parse summary line like "50 passed in 2.30s"
    if "passed" in out:
        for line in out.split("\n"):
            if "passed" in line and "in" in line:
                parts = line.strip().split()
                for i, p in enumerate(parts):
                    if p == "passed" and i > 0:
                        try:
                            passed = int(parts[i - 1])
                        except ValueError:
                            pass
                        break
                break
    return passed, failed, errors, round(elapsed, 2), out

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    # Run in isolated batches to avoid sys.path conflicts between engines
    batches = [
        ("bartok_night_engine", ["tests/bartok_night_engine"]),
        ("big_band_engine", ["tests/big_band_engine"]),
        ("big_band_bridge", ["tests/big_band_bridge"]),
        ("composer_daw", ["tests/composer_daw"]),
        ("composer_studio", ["tests/composer_studio"]),
        ("composition_evaluator", ["tests/composition_evaluator"]),
        ("frisell_atmosphere_engine", ["tests/frisell_atmosphere_engine"]),
        ("hybrid_engine", ["tests/hybrid_engine"]),
        ("ligeti_texture_engine", ["tests/ligeti_texture_engine"]),
        ("messiaen_colour_engine", ["tests/messiaen_colour_engine"]),
        ("orchestration_bridge", ["tests/orchestration_bridge"]),
        ("population_composer", ["tests/population_composer"]),
        ("scofield_holland_engine", ["tests/scofield_holland_engine"]),
        ("shorter_form_engine", ["tests/shorter_form_engine"]),
        ("shared_rhythm_disruption", ["tests/shared_rhythm_disruption"]),
        ("songwriting_bridge", ["tests/songwriting_bridge"]),
        ("stravinsky_pulse_engine", ["tests/stravinsky_pulse_engine"]),
        ("style_dna", ["tests/style_dna"]),
        ("wheeler_lyric_engine", ["tests/wheeler_lyric_engine"]),
        ("zappa_disruption_engine", ["tests/zappa_disruption_engine"]),
        ("engine_interface", ["tests/hybrid_engine/test_engine_interface.py"]),
    ]

    results = []
    for name, paths in batches:
        p, f, e, t, _ = run_pytest(paths, name)
        total = p + f + (e if e else 0)
        results.append((name, total, p, f, e, t))

    # Print table
    print("\n| Suite | Tests | Passed | Failed | Errors | Runtime |")
    print("|-------|-------|--------|--------|--------|---------|")
    total_tests = total_passed = total_failed = total_errors = 0
    for name, n, p, f, e, t in results:
        total_tests += n
        total_passed += p
        total_failed += f
        total_errors += e or 0
        print(f"| {name} | {n} | {p} | {f} | {e or 0} | {t}s |")
    print(f"| **TOTAL** | **{total_tests}** | **{total_passed}** | **{total_failed}** | **{total_errors}** | |")
    return total_failed + total_errors == 0

if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
