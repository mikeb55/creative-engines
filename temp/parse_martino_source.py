"""One-off parser for Activity Chords MusicXML from grand-criteria."""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(r"C:\Dev\composer-os\temp\martino\source_activity_chords.xml")
text = path.read_text(encoding="utf-8")
text = re.sub(r"<\?GP[\s\S]*?\?>", "", text)
root = ET.fromstring(text)

TUNING = [(6, "E", 2), (5, "A", 2), (4, "D", 3), (3, "G", 3), (2, "B", 3), (1, "E", 4)]
STEP_SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]


def fret_to_pitch(string_num, fret):
    for s, step, octv in TUNING:
        if s == string_num:
            semi = STEP_SEMI[step[0]] + (octv + 1) * 12 + fret
            pc = semi % 12
            octave = semi // 12 - 1
            return NAMES[pc], octave
    return "?", 0


activities = []
current = None
for meas in root.find("part").findall("measure"):
    label = None
    for d in meas.findall("direction"):
        w = d.find("direction-type/words")
        if w is not None and w.text and "Activity" in w.text:
            label = w.text.strip()

    harmony = meas.find("harmony")
    frame = harmony.find("frame") if harmony is not None else None
    chord_info = None
    if frame is not None:
        ff = frame.find("first-fret")
        notes_f = []
        for fn in frame.findall("frame-note"):
            notes_f.append((int(fn.find("string").text), int(fn.find("fret").text)))
        chord_info = {
            "first_fret": int(ff.text) if ff is not None else None,
            "frame_notes": notes_f,
        }

    notes = []
    beat = 0.0
    for n in meas.findall("note"):
        if n.find("chord") is not None:
            beat = 0.0
        dur_el = n.find("duration")
        dur = float(dur_el.text) if dur_el is not None else 1.0
        if n.find("rest") is not None:
            beat += dur
            continue
        staff = n.find("staff")
        staff_num = staff.text if staff is not None else "1"
        if staff_num == "2":
            tech = n.find("notations/technical")
            if tech is not None:
                s = int(tech.find("string").text)
                f = int(tech.find("fret").text)
                pitch, octv = fret_to_pitch(s, f)
                notes.append(
                    {
                        "string": s,
                        "fret": f,
                        "pitch": pitch,
                        "octave": octv,
                        "beat_position": beat,
                        "duration": dur,
                    }
                )
        else:
            p = n.find("pitch")
            if p is not None:
                step = p.find("step").text
                octv = int(p.find("octave").text)
                alt_el = p.find("alter")
                alt = float(alt_el.text) if alt_el is not None else 0
                pitch = step + ("#" if alt > 0 else "b" if alt < 0 else "")
                notes.append(
                    {
                        "pitch": pitch,
                        "octave": octv,
                        "beat_position": beat,
                        "duration": dur,
                    }
                )
        beat += dur

    if label:
        if current:
            activities.append(current)
        current = {"label": label, "measure": meas.get("number"), "chord": chord_info, "notes": []}
    if current and notes:
        current["notes"].extend(notes)

if current:
    activities.append(current)

print(json.dumps(activities, indent=2))
print(f"\nTotal activities: {len(activities)}", file=__import__("sys").stderr)
for a in activities:
    frets = [n["fret"] for n in a["notes"] if "fret" in n]
    print(
        f"{a['label']}: {len(a['notes'])} notes, frets {min(frets) if frets else '?'}-{max(frets) if frets else '?'}",
        file=__import__("sys").stderr,
    )
