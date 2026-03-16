"""Verify final Composer Studio + Orchestration + Songwriting Bridge build."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engines"))

# Step 3: Composer Studio run (chamber_jazz)
from composer_studio.studio_runtime import run_composer_studio
print("=== STEP 3: COMPOSER STUDIO (chamber_jazz) ===")
r3 = run_composer_studio(
    input_text="floating chamber modern theme",
    preset_name="chamber_jazz",
    seed=1
)
print("Preset:", r3.get("preset"))
print("Engine combo: wheeler_lyric + frisell_atmosphere + bartok_night")
print("Candidates:", len(r3.get("candidates", [])))
finalists = r3.get("finalists", [])
if finalists:
    print("Top score:", finalists[0].adjusted_score)
print("Output folder:", r3.get("run_path", ""))
top_compiled = finalists[0].compiled_result.get("compiled") if finalists else None

# Step 4: Hybrid run
print("\n=== STEP 4: HYBRID (hybrid_counterpoint) ===")
r4 = run_composer_studio("Hybrid Test", "hybrid_counterpoint", seed=1)
print("Engine combo: wayne_shorter + barry_harris + andrew_hill + monk")
if r4.get("finalists"):
    print("Hybrid score:", r4["finalists"][0].adjusted_score)
print("Output folder:", r4.get("run_path", ""))

# Step 5: Orchestration bridge
print("\n=== STEP 5: ORCHESTRATION BRIDGE ===")
from orchestration_bridge.orchestration_bridge import orchestrate_composition
from orchestration_bridge.ensemble_musicxml_exporter import export_ensemble_to_musicxml
if top_compiled:
    cand = finalists[0].compiled_result
    arr = orchestrate_composition(
        cand.get("compiled"),
        "string_quartet",
        seed=0,
        hybrid_result=cand if isinstance(cand, dict) and cand.get("counterline_events") else None
    )
    xml = arr.get("musicxml", export_ensemble_to_musicxml(arr))
    out_dir = os.path.join(os.path.dirname(__file__), "outputs", "composer_studio", "verification")
    os.makedirs(out_dir, exist_ok=True)
    orch_path = os.path.join(out_dir, "orchestration_string_quartet.musicxml")
    with open(orch_path, "w", encoding="utf-8") as f:
        f.write(xml)
    parts = arr.get("parts", [])
    print("Ensemble type: string_quartet")
    print("Parts written:", len(parts))
    print("Exported:", orch_path)

# Step 6: Songwriting bridge
print("\n=== STEP 6: SONGWRITING BRIDGE ===")
from songwriting_bridge.songwriting_bridge import build_lead_sheet_from_composition
from songwriting_bridge.lead_sheet_exporter import export_lead_sheet_to_musicxml
if top_compiled:
    lead = build_lead_sheet_from_composition(top_compiled, voice_type="male_tenor")
    xml = export_lead_sheet_to_musicxml(lead)
    lead_path = os.path.join(out_dir, "lead_sheet_male_tenor.musicxml")
    with open(lead_path, "w", encoding="utf-8") as f:
        f.write(xml)
    print("Vocal range: male_tenor (55-81)")
    print("Chord symbols:", len(lead.chord_symbols.symbols))
    print("Exported:", lead_path)

# Step 7: Launcher
print("\n=== STEP 7: LAUNCHER ===")
from composer_studio.studio_launcher_entry import run_studio_launcher
r7 = run_studio_launcher("Launcher Test", "wheeler_lyric", 0)
print("Launcher callable: OK")
print("Example: run_studio_launcher('Untitled', 'wheeler_lyric', 0)")

# Step 8: Output structure
print("\n=== STEP 8: OUTPUT STRUCTURE ===")
run_path = r3.get("run_path", "")
if run_path and os.path.isdir(run_path):
    for root, dirs, files in os.walk(run_path):
        level = root.replace(run_path, "").count(os.sep)
        indent = "    " * level
        print(f"{indent}{os.path.basename(root)}/")
        if level < 2:
            for d in sorted(dirs)[:6]:
                print(f"{indent}    {d}/")
        break
print("\n=== DONE ===")
