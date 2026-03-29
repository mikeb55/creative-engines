# Composer OS – Minimal Control Surface & Intent-Based UI for Generative Rhythm Systems

**Document type:** System design specification (generative music engine)  
**Audience:** Composer-engineers implementing UI over an engine with internal rhythm modules (e.g. groove, ostinato, control layer, expression, space)

---

## 1. Principles of Minimal Musical Control (CRITICAL)

### Core UI Principles

- **Intent over mechanism:** The user sets *what* they want musically; the engine decides *which* internal modules and weights realize it.
- **Fewer knobs, fewer failure modes:** Every exposed control is a contract (state space, tests, support). Cap total primary controls (see §8).
- **One mental model:** All controls read as musical adjectives (groove, space, pattern), not engine topology (C3, C5, merge rules).
- **Defaults first:** Sensible defaults so “generate” works without tuning; advanced intent is optional.
- **No hidden randomness:** User-visible behavior changes must be explainable as intent + seed, not unexplained drift.
- **Progressive disclosure:** If needed, expose *presets* or *tiers* (e.g. Stable / Balanced / Surprise), not per-module sliders.
- **Conflict resolution is centralized:** A single control layer interprets intent and resolves clashes; the UI does not let users create contradictory direct assignments.

---

## 2. Intent-Based Control Design

### Intent Control Rules

- **Definition:** An *intent control* is a small set of user-facing axes that describe desired *musical outcome*, not algorithm parameters.
- **Must be:**
  - **Monotonic in meaning:** “More X” always moves perception in one direction (within style bounds).
  - **Orthogonal enough:** Users can describe combinations without learning module interactions.
  - **Bounded:** Always maps to safe internal ranges (see §6).
- **Good examples:**
  - **Groove:** emphasis on pocket, backbeat clarity, syncopation *feel* (not “swing %” or “delay ms”).
  - **Space:** silence vs. density; breath between attacks (not “rest probability per 16th”).
  - **Pattern / hook:** recognisable repeating figure vs. free line (not “ostinato template length”).
  - **Expression:** dynamic contrast and accent clarity (not “velocity curve editor”).
  - **Stability / surprise:** creative variance vs. repeatability (not “RNG sigma”).
- **Not intent controls:**
  - Per-module on/off, per-bar edits, grid resolution, internal priorities (C2 vs C3 vs C4), seed as a “randomize” button without fixed meaning.
- **Difference from technical controls:** Technical controls bind to *implementation*; intent controls bind to *perceptual targets* that the control layer translates.

---

## 3. Mapping Intent → Engine Behaviour (CRITICAL)

### Mapping Rules

- **Single writer:** Intent → (normalized vector) → **control layer** → module weights/caps. UI never writes module internals directly.
- **Groove (intent up):**
  - Increase weight of groove-aligned behaviour; reduce competing density/pattern emphasis so rhythm isn’t washed out.
  - *Does not* mean: fixed tempo change or user-editable swing curve unless that is a separate, explicit product decision.
- **Space (intent up):**
  - Increase rest/hold/shape influence; tighten caps on simultaneous dense layers; prefer subtractive phrasing over new attacks.
  - *Does not* mean: delete bars or change form unless form is its own intent.
- **Pattern / hook (intent up):**
  - Increase pattern-memory / ostinato-like identity within phrase windows; reduce features that fight repetition (within caps).
  - *Does not* mean: user picks pattern MIDI; engine selects pattern *class* from style + seed.
- **Expression (intent up):**
  - Increase accent/articulation contrast; preserve anchors (e.g. backbeats) via control-layer priority.
  - *Does not* mean: per-note DAW mixer.
- **Stability / surprise (tier):**
  - Scales variance budgets and how aggressively the control layer thins or reinforces; same seed + same tier → same class of outcome.
- **Determinism:** Mapping must be **pure**: `(intent_snapshot, seed, style_profile) → internal parameters` with no hidden time or session state.

---

## 4. Control Layer Architecture (LIKE C5)

### Control Layer Rules

- **Role:** Sole interpreter of UI intent for rhythm-side stacking: assigns **primary / secondary** roles to *families* of behaviour, applies **caps**, **yield rules**, and **anti-mud** reduction.
- **Inputs:** Normalized intent vector (0–1 or enum tiers), style profile, phrase context (if exposed at all, keep coarse: section, not bar).
- **Outputs:** Module *influence scalars* and *hard disables* per phrase/section—not raw MIDI edits.
- **Ordering:** Intent is applied **before** final timing seal / export validation; control layer must never bypass export rules.
- **No UI bypass:** If the UI sends conflicting signals, the control layer picks a deterministic resolution order (documented), not “last slider wins.”

---

## 5. Avoiding Over-Exposure

### Anti-UI Rules

- **Do not expose:** Internal module IDs (C1–C7), per-module toggles, per-parameter curves tied to one algorithm.
- **Do not expose:** Raw RNG controls without tying them to named tiers (Stability / Surprise).
- **Do not expose:** Independent sliders that fight the same perceptual axis (e.g. “density” + “space” both implemented as competing note counts without coupling).
- **Do not expose:** “Fix it” controls that map to timing surgery unless timing is a first-class product surface (usually not for intent UI).
- **Do not imply:** That users are mixing stems; they are steering *one* generative run.

---

## 6. Safe Parameter Ranges

### Safety Rules

- **Normalize all intent to [0,1] or small enums** before mapping; clamp *after* mapping to engine-safe bands.
- **Hard caps on:**
  - Maximum simultaneous emphasis (expression + pattern + groove cannot all sit at max without reduction).
  - Maximum structural or density change per generation (if space/pattern can remove events, cap **fraction** of change).
- **Monotonic clamps:** Increasing “space” cannot increase note count; increasing “groove” cannot remove all anchor events by design.
- **Style bounds:** Intent never overrides harmony lock, form length, or notation-export invariants—those are **constraints**, not sliders.
- **Telemetry:** Log resolved internal weights for debugging, not user-facing sliders.

---

## 7. Deterministic UI Behaviour

### Determinism Rules

- **Seed is part of the contract:** Same `(seed, intent_snapshot, style_profile)` ⇒ same generation result (for a pinned engine version).
- **UI changes are discrete:** Prefer stepped controls or quantized sliders so tiny gestures don’t create untestable float soup.
- **No implicit randomize:** “Regenerate” must either keep seed or explicitly change seed with clear UI affordance.
- **A/B discipline:** Comparing two settings requires either two seeds or two intent snapshots—not both ambiguously.

---

## 8. Minimal Control Set (VERY IMPORTANT)

### Recommended Control Set

**Target: 5 primary controls (+ optional style preset).**

| Control | What it steers internally (conceptually) | What it must NOT control |
|--------|--------------------------------------------|---------------------------|
| **Groove** | Weight of pocket/backbeat-aligned behaviour; conflict resolution favouring groove when intent is high | Grid, ms offsets, per-hit swing nodes |
| **Pattern** | Strength of repeating/hook identity vs. free melody | Choosing exact ostinato MIDI |
| **Expression** | Accent/articulation contrast vs. flat line | Per-note velocity drawing |
| **Space** | Rest/hold/density shaping; breathing | Bar delete, time signature |
| **Stability / Surprise** | Tier controlling variance budgets and how hard the control layer thins/compounds | Raw noise / “chaos” without tiers |

**Optional 6th (only if needed):** **Focus** (e.g. rhythm vs. harmony emphasis) — still intent-named, not “C6 gain.”

---

## 9. Interaction Between Controls

### Interaction Rules

- **Coupled axes:** Groove ↑ + Pattern ↑ requires automatic **yield**: control layer reduces one family’s secondary influence unless user tier is “Surprise” and caps allow.
- **Space ↑:** Down-weights density-heavy interpretations of Pattern/Expression unless tier expands budget.
- **Expression ↑:** Must not erase groove anchors; control layer preserves anchor priority over ornamental accents.
- **Stability ↑:** Narrows dynamic range of internal scaling; Surprise widens it—without exposing internals.
- **No double-counting:** If two intents map to the same internal conflict (e.g. density), resolve in one place (control layer), not in two sliders.

---

## 10. Failure Modes

| Failure | Cause | Prevention rule |
|--------|--------|------------------|
| Too many controls | Feature pressure, debugging leaks to UI | Hard cap; everything else is preset or debug panel |
| Conflicting intent signals | Independent sliders on same perceptual axis | Coupled mapping + control-layer arbitration |
| Non-musical extremes | Unclamped intent + stacked max | Global budget + tier caps + export validation |
| “Random” feel | Seed changes without user clarity | Explicit seed/regenerate model; named tiers |
| User distrust | Opaque mapping | Short plain-language tooltips tied to *perception*, not modules |

---

## 11. Implementation Guidance (NO CODE)

- **Architecture:** UI emits **IntentRequest** → **Normalizer** → **ControlLayer** → **Engine modules** → **Validator** → **Export**.
- **Versioning:** Serialize `{ intent, seed, styleId, engineVersion }` with outputs for reproducibility.
- **Safe integration:** Add intent first; route existing module parameters *only* through control layer; keep a **debug** overlay for engineers, not users.
- **Testing:** Golden tests on mapping `(intent → resolved weights)` and full pipeline with fixed seeds.

---

## 12. Final Summary

### UI design checklist

- [ ] ≤6 primary intent controls  
- [ ] No internal module names in UI  
- [ ] Control layer owns conflict resolution  
- [ ] Clamped, deterministic mapping  
- [ ] Seed semantics documented  
- [ ] Presets/tiers for variance, not raw noise  

### Control philosophy

**Users choose musical intent; the engine chooses implementation.**

### Do / don’t

| Do | Don’t |
|----|--------|
| Name controls by perception | Name by engine module |
| Couple conflicting intents in one resolver | Let sliders fight in separate panels |
| Bind determinism to seed + intent | Hide seed while claiming reproducibility |
| Use tiers for variance | Expose internal RNG parameters |

---

*End of UI-Control.md*
