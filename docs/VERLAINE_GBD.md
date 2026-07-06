# RESOLVED 2026-07-06 — Tom Verlaine GBD Slonimsky Voice

**Status: WORKING** — Guitar–Bass Duo **Voice** dropdown **Tom Verlaine** ships and generates Verlaine suspended-field harmony end-to-end (desktop v2.10.8, commit **`50e1d2a5`**).

Previously blocked (2026-07-05): UI reverted after normal-path hang + harmony wire failure. All blockers below are resolved.

---

## Fix chain (2026-07-06)

| # | Commit | What |
|---|--------|------|
| 1 | **`8f248347`** | **`harmonicVoice`** on **`GenerateRequest`** + forward through **`generateComposition.ts`** → **`runGoldenPath`**; Verlaine precompute on GBD golden path. |
| 2 | **`1b97bce0`** | Re-add **`verlaine`** to GBD Slonimsky **Voice** roster. Desktop **v2.10.7**. |
| 3 | **`e2cd13ab`** | Relax Duo **V3 melodic-leap** gates for Verlaine harmonicVoice/primary paths. |
| 4 | **`6575d778`** | Verlaine harmony authority in **`getChordForBar`** / spine; **`verlaineHarmonicPathAuthority.test.ts`**. |
| 5 | **`54af24c8`** | **`apiGenerate()`** copies **`harmonicVoice`** from IPC body (desktop gap). |
| 6 | **`50e1d2a5`** | GBD payload uses **`gbdWriterId`** at generate time (UI state split fix). |

---

## Verification (2026-07-06)

- **Live UI (Mike):** GBD → Voice **Tom Verlaine** → Verlaine sus/slash harmony; no V3 leap error.
- **Musician-facing GCE:** readiness **0.9**, **shareable**.
- **Desktop build:** **v2.10.8**, stamp git **`50e1d2a5`**.

---

## Usage

1. Preset **Guitar–Bass Duo**.
2. **Slonimsky presets** → **Voice** → **Tom Verlaine**.
3. Generate — Barry Harris primary stack; Verlaine via **`harmonicVoice: verlaine`**.

---

## Historical blockers (superseded)

- **Harmony wire failure** (Dmin9 vs Esus4/D) — fixed **`6575d778`**.
- **IPC dropped harmonicVoice** — fixed **`54af24c8`**.
- **UI gbdWriterId / slonimskyHarmonicVoice split** — fixed **`50e1d2a5`**.
- **2026-07-05 hang probe** — not reproduced post-fix; reopen only if it recurs on **`50e1d2a5`**.

Anchor: Jamerson GBD **`1503219f`**.
