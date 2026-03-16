"""Run Phase 1 tests in separate sessions to avoid engine path conflicts."""
import subprocess
import sys

DIRS = [
    "tests/frisell_atmosphere_engine",
    "tests/bartok_night_engine",
    "tests/wheeler_lyric_engine",
    "tests/hybrid_engine",
]
for d in DIRS:
    result = subprocess.run([sys.executable, "-m", "pytest", d, "-v"])
    if result.returncode != 0:
        sys.exit(result.returncode)
print("All Phase 1 tests passed.")
