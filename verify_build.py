"""Verify Frisell + Counterpoint Hybrid build."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engines"))

# Step 2: Registry check
from shared_composer.engine_registry import get_engine, list_engines, ensure_engines_loaded
ensure_engines_loaded()
engines = list_engines()
required = ["wayne_shorter", "barry_harris", "andrew_hill", "monk", "bartok_night", "wheeler_lyric", "frisell_atmosphere"]
print("=== REGISTRY ===")
for r in required:
    status = "OK" if r in engines else "MISSING"
    print(f"  {r}: {status}")

# Step 3: Frisell check
print("\n=== FRISELL ===")
eng = get_engine("frisell_atmosphere")
ir = eng.generate_ir("Verification Study", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
out_dir = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(out_dir, exist_ok=True)
frisell_path = os.path.join(out_dir, "frisell_verification.xml")
with open(frisell_path, "w", encoding="utf-8") as f:
    f.write(xml)
print(f"  Title: {ir.title}")
print(f"  Sections: {len(compiled.sections)}")
print(f"  Exported: {frisell_path}")

# Step 4: Hybrid 2-voice (wheeler + frisell + bartok counter)
print("\n=== HYBRID 2-VOICE (Wheeler + Frisell + Bartok counter) ===")
from hybrid_engine.hybrid_planner import plan_hybrid_composition
from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml
from hybrid_engine.hybrid_ranker import evaluate_hybrid_candidate

h1 = plan_hybrid_composition(
    melody_engine="wheeler_lyric",
    harmony_engine="frisell_atmosphere",
    counter_engine="bartok_night",
    seed=0,
    title="Wheeler Frisell Bartok",
)
r1 = compile_hybrid_composition(h1, "Wheeler Frisell Bartok")
xml1 = export_hybrid_to_musicxml(r1)
cand1 = {"compiled": r1["compiled"], "melody_engine": "wheeler_lyric", "harmony_engine": "frisell_atmosphere", "counter_engine": "bartok_night", "hybrid_ir": h1, "counterline_events": r1.get("counterline_events", [])}
score1 = evaluate_hybrid_candidate(cand1)
path1 = os.path.join(out_dir, "hybrid_2voice_wheeler_frisell_bartok.xml")
with open(path1, "w", encoding="utf-8") as f:
    f.write(xml1)
print(f"  Score: {score1.adjusted_score:.2f}")
print(f"  Exported: {path1}")

# Step 4b: Hybrid 3-voice (shorter + harris + hill counter + monk rhythm)
print("\n=== HYBRID 3-VOICE (Shorter + Harris + Hill counter + Monk rhythm) ===")
h2 = plan_hybrid_composition(
    melody_engine="wayne_shorter",
    harmony_engine="barry_harris",
    counter_engine="andrew_hill",
    rhythm_engine="monk",
    seed=42,
    title="Shorter Harris Hill Monk",
)
r2 = compile_hybrid_composition(h2, "Shorter Harris Hill Monk")
xml2 = export_hybrid_to_musicxml(r2)
cand2 = {"compiled": r2["compiled"], "melody_engine": "wayne_shorter", "harmony_engine": "barry_harris", "counter_engine": "andrew_hill", "rhythm_engine": "monk", "hybrid_ir": h2, "counterline_events": r2.get("counterline_events", [])}
score2 = evaluate_hybrid_candidate(cand2)
path2 = os.path.join(out_dir, "hybrid_3voice_shorter_harris_hill_monk.xml")
with open(path2, "w", encoding="utf-8") as f:
    f.write(xml2)
print(f"  Score: {score2.adjusted_score:.2f}")
print(f"  Exported: {path2}")

# Step 5: MusicXML validity
print("\n=== MUSICXML VALIDITY ===")
for name, xml_content in [("Frisell", xml), ("Hybrid 2-voice", xml1), ("Hybrid 3-voice", xml2)]:
    has_score = "score-partwise" in xml_content
    has_parts = "part-list" in xml_content or "score-part" in xml_content
    has_notes = "<note>" in xml_content
    has_measures = "<measure" in xml_content
    print(f"  {name}: score-partwise={has_score}, parts={has_parts}, notes={has_notes}, measures={has_measures}")

print("\n=== DONE ===")
