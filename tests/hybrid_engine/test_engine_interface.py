"""Tests for ComposerEngine interface."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_wayne_shorter_interface():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Footprints", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_barry_harris_interface():
    ensure_engines_loaded()
    eng = get_engine("barry_harris")
    ir = eng.generate_ir("Bebop Head", mode="title", seed=0)
    assert ir.title
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert xml


def test_andrew_hill_interface():
    ensure_engines_loaded()
    eng = get_engine("andrew_hill")
    ir = eng.generate_ir("Angular", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections


def test_monk_interface():
    ensure_engines_loaded()
    eng = get_engine("monk")
    ir = eng.generate_ir("Blues Head", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections


def test_bartok_night_interface():
    ensure_engines_loaded()
    eng = get_engine("bartok_night")
    ir = eng.generate_ir("Night Study", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_wheeler_lyric_interface():
    ensure_engines_loaded()
    eng = get_engine("wheeler_lyric")
    ir = eng.generate_ir("Lyrical Study", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_frisell_atmosphere_interface():
    ensure_engines_loaded()
    eng = get_engine("frisell_atmosphere")
    ir = eng.generate_ir("Open Study", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_scofield_holland_interface():
    ensure_engines_loaded()
    eng = get_engine("scofield_holland")
    ir = eng.generate_ir("Chromatic Groove", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_stravinsky_pulse_interface():
    ensure_engines_loaded()
    eng = get_engine("stravinsky_pulse")
    ir = eng.generate_ir("Pulse Block", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml


def test_zappa_disruption_interface():
    ensure_engines_loaded()
    eng = get_engine("zappa_disruption")
    ir = eng.generate_ir("Interruption", mode="title", seed=0)
    assert ir.title
    r = eng.validate_ir(ir)
    assert r.valid
    compiled = eng.compile_from_ir(ir)
    assert compiled.sections
    xml = eng.export_musicxml(compiled)
    assert "<score-partwise" in xml
