import json
import random
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "hill_phrase_output.json"

interval_cells = [
    ["C", "Db", "E"],
    ["D", "F", "B"],
    ["C", "F", "Gb"],
    ["C", "D", "Ab"],
    ["C", "Eb", "F"]
]

harmonic_fields = [
    ["C", "Eb", "F#", "G"],
    ["D", "F", "G", "Bb"],
    ["E", "G", "Bb", "C#"],
    ["F", "Ab", "B", "C"]
]

phrase_structures = [
    "3+5",
    "5+4",
    "4+4+3",
    "7+5"
]

roles = [
    "melody_fragment",
    "counterline",
    "cluster_color"
]

register_bands = [
    "low",
    "middle",
    "upper-middle"
]

rhythmic_layers = [
    "pulse",
    "displacement",
    "phrase_stretch"
]

def generate_event(i, cell, field, phrase):
    return {
        "event_id": f"HILL_{i:03d}",
        "pitches": random.sample(field, min(3, len(field))),
        "role": random.choice(roles),
        "beat_position": round(random.uniform(0, 8), 2),
        "duration": random.choice([0.5, 1.0, 1.5]),
        "register_band": random.choice(register_bands),
        "rhythmic_layer": random.choice(rhythmic_layers),
        "source_interval_cell": cell,
        "source_harmonic_field": field,
        "phrase_structure": phrase
    }

def generate_phrase():
    cell = random.choice(interval_cells)
    field = random.choice(harmonic_fields)
    phrase = random.choice(phrase_structures)

    events = [generate_event(i, cell, field, phrase) for i in range(12)]

    return {
        "engine": "Andrew Hill Engine Prototype",
        "generated": datetime.now().isoformat(),
        "interval_cell": cell,
        "harmonic_field": field,
        "phrase_structure": phrase,
        "events": events
    }

def main():
    data = generate_phrase()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Hill phrase generated -> {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
