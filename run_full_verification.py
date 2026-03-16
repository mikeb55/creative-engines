"""
Full platform verification — registry, bridge, studio, trial batch.
"""
import sys
import os

root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(root, "engines"))
os.chdir(root)

def step1_registry():
    """Registry check."""
    from shared_composer.engine_registry import list_engines, get_engine, ensure_engines_loaded
    ensure_engines_loaded()
    engines = list_engines()
    required = [
        "wayne_shorter", "barry_harris", "andrew_hill", "monk", "slonimsky_harmonic",
        "bartok_night", "wheeler_lyric", "frisell_atmosphere", "scofield_holland",
        "stravinsky_pulse", "zappa_disruption", "messiaen_colour", "big_band",
        "shorter_form", "ligeti_texture"
    ]
    table = []
    for e in sorted(engines):
        try:
            eng = get_engine(e)
            status = "OK"
        except Exception as ex:
            status = str(ex)[:40]
        table.append((e, status))
    return table, all(e in engines for e in required)

def step2_big_band_bridge():
    """Big band bridge: shorter_form + ligeti + big_band merge."""
    from shared_composer.engine_registry import get_engine, ensure_engines_loaded
    ensure_engines_loaded()
    # Bridge uses wayne_shorter for form (per current impl). User asked for shorter_form.
    # Check if bridge can use shorter_form - form_texture_bridge expects section_order, phrase_plan, etc.
    from big_band_bridge.big_band_bridge_runtime import run_big_band_form_texture_bridge
    out_dir = os.path.join(root, "outputs", "verification")
    os.makedirs(out_dir, exist_ok=True)
    result = run_big_band_form_texture_bridge("Form Texture Verification", form_seed=0, texture_seed=0, ensemble_seed=0)
    xml = result.get("musicxml", "")
    path = os.path.join(out_dir, "big_band_bridge_verification.musicxml")
    if xml:
        with open(path, "w", encoding="utf-8") as f:
            f.write(xml)
    return path, "<score-partwise" in xml if xml else False, result

def step3_composer_studio():
    """Composer Studio preset run and export."""
    from composer_studio.studio_runtime import run_composer_studio
    from composer_studio.studio_export_manager import export_composer_outputs, export_orchestrated_outputs, export_lead_sheet_outputs
    r = run_composer_studio("Verification Theme", "chamber_jazz", seed=1)
    run_path = r.get("run_path", "")
    finalists = r.get("finalists", [])
    if not finalists:
        return "chamber_jazz", run_path, [], "No finalists"
    preset = r.get("preset") or type("P", (), {"bridge_orchestration": False})()
    export_paths = []
    if run_path:
        comp_paths = export_composer_outputs(finalists, run_path, preset)
        export_paths.extend(comp_paths)
        orch_paths = export_orchestrated_outputs(finalists, run_path, "string_quartet", seed=0)
        export_paths.extend(orch_paths)
        lead_paths = export_lead_sheet_outputs(finalists, run_path, voice_type="male_tenor")
        export_paths.extend(lead_paths)
    return "chamber_jazz", run_path, export_paths, None

def step4_trial_batch():
    """Generate single-engine, hybrid, big-band, lead-sheet pieces."""
    from shared_composer.engine_registry import get_engine, ensure_engines_loaded
    from composer_studio.studio_runtime import run_composer_studio
    from big_band_bridge.big_band_bridge_runtime import run_big_band_form_texture_bridge
    ensure_engines_loaded()
    out_dir = os.path.join(root, "outputs", "trial_batch")
    os.makedirs(out_dir, exist_ok=True)
    results = []
    # 3 single-engine
    for name, eng_name in [("wheeler", "wheeler_lyric"), ("frisell", "frisell_atmosphere"), ("shorter_form", "shorter_form")]:
        eng = get_engine(eng_name)
        ir = eng.generate_ir(f"Single {name}", mode="title", seed=0)
        comp = eng.compile_from_ir(ir)
        xml = eng.export_musicxml(comp)
        p = os.path.join(out_dir, f"single_{name}.musicxml")
        with open(p, "w", encoding="utf-8") as f:
            f.write(xml)
        results.append(("single", name, p, None))
    # 3 hybrid
    for preset in ["hybrid_counterpoint", "chamber_jazz", "hybrid_counterpoint"]:
        r = run_composer_studio(f"Hybrid {preset}", preset, seed=2)
        fins = r.get("finalists", [])
        if fins:
            top = fins[0]
            comp = top.compiled_result.get("compiled", top.compiled_result) if isinstance(top.compiled_result, dict) else top.compiled_result
            xml = top.compiled_result.get("musicxml", "") if isinstance(top.compiled_result, dict) else ""
            if not xml and comp:
                xml = get_engine("wayne_shorter").export_musicxml(comp)
            p = os.path.join(out_dir, f"hybrid_{preset.replace(' ', '_')}.musicxml")
            if xml:
                with open(p, "w", encoding="utf-8") as f:
                    f.write(xml)
                results.append(("hybrid", preset, p, getattr(top, "adjusted_score", None)))
    # 2 big-band
    r = run_big_band_form_texture_bridge("Big Band 1", 0, 1, 2)
    if r.get("musicxml"):
        p = os.path.join(out_dir, "big_band_1.musicxml")
        with open(p, "w", encoding="utf-8") as f:
            f.write(r["musicxml"])
        results.append(("big_band", "1", p, None))
    r = run_big_band_form_texture_bridge("Big Band 2", 1, 2, 3)
    if r.get("musicxml"):
        p = os.path.join(out_dir, "big_band_2.musicxml")
        with open(p, "w", encoding="utf-8") as f:
            f.write(r["musicxml"])
        results.append(("big_band", "2", p, None))
    # 2 lead sheets
    r = run_composer_studio("Lead 1", "chamber_jazz", seed=3)
    if r.get("finalists"):
        from songwriting_bridge.songwriting_bridge import build_lead_sheet_from_composition
        from songwriting_bridge.lead_sheet_exporter import export_lead_sheet_to_musicxml
        comp = r["finalists"][0].compiled_result.get("compiled", r["finalists"][0].compiled_result)
        lead = build_lead_sheet_from_composition(comp, voice_type="male_tenor")
        xml = export_lead_sheet_to_musicxml(lead)
        p = os.path.join(out_dir, "lead_sheet_1.musicxml")
        with open(p, "w", encoding="utf-8") as f:
            f.write(xml)
        results.append(("lead_sheet", "1", p, None))
    r = run_composer_studio("Lead 2", "wheeler_lyric", seed=4)
    if r.get("finalists"):
        from songwriting_bridge.songwriting_bridge import build_lead_sheet_from_composition
        from songwriting_bridge.lead_sheet_exporter import export_lead_sheet_to_musicxml
        comp = r["finalists"][0].compiled_result.get("compiled", r["finalists"][0].compiled_result)
        lead = build_lead_sheet_from_composition(comp, voice_type="female_alto")
        xml = export_lead_sheet_to_musicxml(lead)
        p = os.path.join(out_dir, "lead_sheet_2.musicxml")
        with open(p, "w", encoding="utf-8") as f:
            f.write(xml)
        results.append(("lead_sheet", "2", p, None))
    return out_dir, results

def main():
    print("=== STEP 2: REGISTRY CHECK ===")
    table, ok = step1_registry()
    for e, s in table:
        print(f"  {e}: {s}")
    print(f"Required engines present: {ok}\n")

    print("=== STEP 3: BIG BAND BRIDGE ===")
    path, valid, res = step2_big_band_bridge()
    print(f"Output: {path}")
    print(f"Valid MusicXML: {valid}")
    if not valid and res:
        print(f"Issues: {res.get('musicxml', '')[:200]}\n")
    else:
        print()

    print("=== STEP 4: COMPOSER STUDIO ===")
    preset, run_path, export_paths, err = step3_composer_studio()
    print(f"Preset: {preset}")
    print(f"Run path: {run_path}")
    print(f"Exports: {export_paths}")
    if err:
        print(f"Error: {err}\n")
    else:
        print()

    print("=== STEP 5: TRIAL BATCH ===")
    out_dir, results = step4_trial_batch()
    print(f"Output dir: {out_dir}")
    for cat, name, p, score in results:
        print(f"  {cat} {name}: {p} (score={score})")
    print()

    print("=== STEP 6: OUTPUT TREE ===")
    studio_dir = os.path.join(root, "outputs", "composer_studio")
    if os.path.isdir(studio_dir):
        for r, ds, fs in os.walk(studio_dir):
            level = r.replace(studio_dir, "").count(os.sep)
            indent = "  " * level
            print(f"{indent}{os.path.basename(r)}/")
            for f in sorted(fs)[:8]:
                print(f"{indent}  {f}")
            if level > 2:
                break
    else:
        print("  (outputs/composer_studio not yet created)")

if __name__ == "__main__":
    main()
