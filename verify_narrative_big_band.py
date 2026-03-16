"""Verify narrative big band form: generate, compile, export."""
import sys
import os

_root = os.path.dirname(os.path.abspath(__file__))
_engines = os.path.join(_root, "engines")
_bb = os.path.join(_engines, "big-band-engine")
for p in [_engines, _bb, _root]:
    if p not in sys.path:
        sys.path.insert(0, p)
os.chdir(_root)

# 1. Big Band Engine with narrative_big_band_form (load bb first, before other engines)
print("=== 1. Big Band narrative_big_band_form ===")
import importlib.util
# Force big-band-engine first
while _bb in sys.path:
    sys.path.remove(_bb)
sys.path.insert(0, _bb)
_spec = importlib.util.spec_from_file_location("bb_gen", os.path.join(_bb, "generator.py"))
_bb_gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bb_gen)
_spec2 = importlib.util.spec_from_file_location("bb_comp", os.path.join(_bb, "section_compiler.py"))
_bb_comp = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(_bb_comp)
_spec3 = importlib.util.spec_from_file_location("bb_mxml", os.path.join(_bb, "musicxml_exporter.py"))
_bb_mxml = importlib.util.module_from_spec(_spec3)
_spec3.loader.exec_module(_bb_mxml)
ir = _bb_gen.generate_composer_ir_from_title("Narrative Arc", seed=0, form_profile="narrative_big_band_form")
print("Form plan:", ir.form_plan)
print("Section order:", ir.section_order)
compiled = _bb_comp.compile_composition_from_ir(ir)
xml = _bb_mxml.export_composition_to_musicxml(compiled)
out_dir = os.path.join("outputs", "narrative_big_band")
os.makedirs(out_dir, exist_ok=True)
path1 = os.path.join(out_dir, "narrative_big_band_solo.musicxml")
with open(path1, "w", encoding="utf-8") as f:
    f.write(xml)
print("Exported:", path1)

# 2. Bridge: shorter_form + ligeti + big_band narrative
from shared_composer.engine_registry import ensure_engines_loaded
from big_band_bridge.big_band_bridge_runtime import run_big_band_form_texture_bridge
ensure_engines_loaded()
print("\n=== 2. Bridge with narrative big band ===")
result = run_big_band_form_texture_bridge(
    "Form Texture Narrative",
    form_seed=0,
    texture_seed=0,
    ensemble_seed=0,
    big_band_form_profile="narrative_big_band_form",
)
path2 = os.path.join(out_dir, "bridge_narrative.musicxml")
with open(path2, "w", encoding="utf-8") as f:
    f.write(result["musicxml"])
print("Exported:", path2)
print("Valid:", "<score-partwise" in result["musicxml"])

print("\n=== Done ===")
