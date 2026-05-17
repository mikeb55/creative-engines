# SQ→BB Era & BB Arranging Style Guide

**Status:** Source of truth for era labels, tooltips, and SQ→BB compatibility badge.  
**Scope:** Era dropdown is **unified across all Generate modes** (Song Mode, Big Band, String Quartet, SQ→BB, etc.). Compatibility badge is **SQ→BB panel only**.  
**Session 4** owns mismatch notice copy, conflict blocking, and scorer/renderer rules — not this document.

---

## 1. UI zones (SQ→BB panel)

| Zone | Controls | Lock when `phase !== 'idle'` |
|------|----------|------------------------------|
| **SQ Source** | SQ Harmonic Voice, Era, Length, Harmony / chord input, Density (placeholder) | Yes |
| **BB Output** | BB Arranging Style, compatibility badge, mismatch notice (RED only) | Yes (picker) |

- **BB Arranging Style** — picker label (Session 3). Maps to `sqToBbStyleProfile`: Schneider / Basie / Mingus / Brookmeyer. Default unchanged: **Brookmeyer**.
- **Era** — single dropdown; jazz block + classical block (Session 3). Value flows to API as `sqToBbEra` (same path for jazz and classical IDs).

---

## 2. Era taxonomy

### 2.1 No era

| Display | API / state value | Downstream |
|---------|-------------------|------------|
| — No Era — | `null` | Omit era tag (`sqToBbEra` null/undefined only; never `""`) |

### 2.2 Jazz eras (existing)

Shown in all modes that expose era today; in SQ→BB they appear **above** the classical divider.  
**Compatibility badge:** never shown for jazz era values (no matrix row).

| Display label | ID (`sqToBbEra`) |
|---------------|------------------|
| Swing | `swing` |
| Bebop | `bebop` |
| Post-bop | `post_bop` |
| Contemporary | `contemporary` |
| Cool Jazz | `cool_jazz` |
| Hard Bop | `hard_bop` |
| Fusion | `fusion` |

### 2.3 Classical / chamber eras (all modes)

Shown in **every** mode that exposes the Era dropdown, grouped under **Classical / Chamber Eras** after the jazz block (no mode gating).

| Display label | ID (`sqToBbEra`) |
|---------------|------------------|
| *(divider)* | — |
| Classical | `classical` |
| Romantic | `romantic` |
| Impressionist / Late Romantic | `impressionist` |
| Early Modernist | `early_modernist` |
| Postwar Modernist / Serialist | `postwar_modernist` |
| Contemporary Classical | `contemporary_classical` |

**Type (backward compatible):** extend `SqToBbJazzEraId` usage to a union, e.g.  
`SqToBbEraId = SqToBbJazzEraId | SqToBbClassicalEraId | null`  
where `SqToBbClassicalEraId` is the six IDs above.

---

## 3. Tooltip copy

Use **exactly** these strings as the `title` attribute (or accessible description) on each `<option>`. One sentence per option.

### Jazz eras

| ID | Tooltip |
|----|---------|
| `null` | Leave the sketch untagged by period so harmony and scoring stay neutral. |
| `swing` | Four-beat swing feel and pre-bop big-band phrasing cues. |
| `bebop` | Fast harmonic rhythm and linear bop language on the BB side. |
| `post_bop` | Extended harmony and looser form typical of 1960s small-group jazz. |
| `contemporary` | Current jazz orchestration: mixed meters, open voicings, ECM-adjacent color. |
| `cool_jazz` | Lyrical, restrained dynamics and lighter brass writing. |
| `hard_bop` | Blues roots, gospel cadences, and punchy section hits. |
| `fusion` | Electric-era harmony, backbeat layers, and rock-influenced densities. |

### Classical / chamber SQ eras

| ID | Tooltip |
|----|---------|
| `classical` | Clear phrases, periodic cadences, and restrained chromaticism in the source lines. |
| `romantic` | Long lyrical arcs, wider dynamics, and heightened harmonic color. |
| `impressionist` | Whole-tone and modal color, blurred cadence, and orchestral wash. |
| `early_modernist` | Stravinsky-era asymmetry, biting rhythms, and neoclassical irony. |
| `postwar_modernist` | Serial languages, sparse textures, and pointillistic independence. |
| `contemporary_classical` | Present-day concert syntax: extended techniques and mixed tonalities. |

---

## 4. BB arranging styles

| Picker label | `sqToBbStyleProfile` | Engine VRB (unchanged) |
|--------------|----------------------|-------------------------|
| Schneider | `schneider` | `maria_schneider` |
| Basie | `basie` | `count_basie` |
| Mingus | `mingus` | `charles_mingus` |
| Brookmeyer | `brookmeyer` | `bob_brookmeyer` |

Default: **Brookmeyer** (`brookmeyer`).

---

## 5. Compatibility matrix (SQ classical era × BB style)

**Purpose:** Advisory badge only. Never blocks Generate.  
**When to show badge:** SQ era is one of the **six classical IDs** (not `null`, not jazz). **And** BB arranging style is selected (always true once picker exists).  
**When to hide badge:** `sqToBbEra === null`, or any **jazz** era ID.

### 5.1 Levels

| Level | UI | Dot color | Badge text |
|-------|-----|-----------|------------|
| `natural` | GREEN | `rgb(22, 163, 74)` / green-600 | Natural fit |
| `unconventional` | AMBER | `rgb(180, 83, 9)` / amber-700 | Unconventional pairing — interesting results possible |
| `mismatch` | RED | `rgb(185, 28, 28)` / red-700 | Strong mismatch — unexpected results likely |

### 5.2 Matrix (rows = SQ classical era, columns = BB style)

| SQ era ↓ / BB → | **schneider** | **basie** | **mingus** | **brookmeyer** |
|-----------------|---------------|-----------|------------|----------------|
| `classical` | unconventional | **natural** | mismatch | **natural** |
| `romantic` | **natural** | **natural** | unconventional | **natural** |
| `impressionist` | **natural** | unconventional | unconventional | **natural** |
| `early_modernist` | **natural** | mismatch | **natural** | unconventional |
| `postwar_modernist` | unconventional | mismatch | **natural** | mismatch |
| `contemporary_classical` | **natural** | mismatch | unconventional | unconventional |

**Rationale (for maintainers, not UI):**

- **Basie** pairs naturally with periodic, danceable source eras (Classical, Romantic); struggles with serial/postwar density.
- **Schneider** favors coloristic and modern concert eras; less idiomatic on strict Classical or Postwar without jazz bridge.
- **Mingus** accepts angular and postwar source energy; poor fit when the source is courtly Classical.
- **Brookmeyer** favors linear, tonal, and impressionist counterpoint; clashes with shout-band swing (Basie) and atomized serial surfaces (Postwar).

### 5.3 Typed constant shape (implement from this table)

Define in `sqToBbWorkflowTypes.ts` (or a sibling module imported by UI), **not** inline in React:

```ts
export type SqToBbClassicalEraId =
  | 'classical'
  | 'romantic'
  | 'impressionist'
  | 'early_modernist'
  | 'postwar_modernist'
  | 'contemporary_classical';

export type SqToBbBbStyleProfileId = 'schneider' | 'basie' | 'mingus' | 'brookmeyer';

export type SqToBbEraBbCompatibility = 'natural' | 'unconventional' | 'mismatch';

export const SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY: Readonly<
  Record<SqToBbClassicalEraId, Readonly<Record<SqToBbBbStyleProfileId, SqToBbEraBbCompatibility>>>
> = {
  classical: {
    schneider: 'unconventional',
    basie: 'natural',
    mingus: 'mismatch',
    brookmeyer: 'natural',
  },
  romantic: {
    schneider: 'natural',
    basie: 'natural',
    mingus: 'unconventional',
    brookmeyer: 'natural',
  },
  impressionist: {
    schneider: 'natural',
    basie: 'unconventional',
    mingus: 'unconventional',
    brookmeyer: 'natural',
  },
  early_modernist: {
    schneider: 'natural',
    basie: 'mismatch',
    mingus: 'natural',
    brookmeyer: 'unconventional',
  },
  postwar_modernist: {
    schneider: 'unconventional',
    basie: 'mismatch',
    mingus: 'natural',
    brookmeyer: 'mismatch',
  },
  contemporary_classical: {
    schneider: 'natural',
    basie: 'mismatch',
    mingus: 'unconventional',
    brookmeyer: 'unconventional',
  },
} as const;

export function sqToBbClassicalEraCompatibility(
  era: string | null | undefined,
  bbStyle: SqToBbBbStyleProfileId,
): SqToBbEraBbCompatibility | null {
  if (era == null || era === '') return null;
  const row = SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY[era as SqToBbClassicalEraId];
  if (!row) return null; // jazz or unknown → no badge
  return row[bbStyle] ?? null;
}
```

Badge helper copy:

```ts
export const SQ_TO_BB_COMPATIBILITY_BADGE_LABEL: Record<SqToBbEraBbCompatibility, string> = {
  natural: 'Natural fit',
  unconventional: 'Unconventional pairing — interesting results possible',
  mismatch: 'Strong mismatch — unexpected results likely',
};
```

---

## 6. Mismatch notice copy (Session 4)

Show **only** when compatibility = `mismatch` (RED), classical era selected, and BB style selected.  
**Never** for AMBER, jazz eras, or `null` era. Advisory only — never block Generate.

**Language rules**

- Never use “incorrect” or “not allowed”.
- Describe as **strong mismatch** or **unusual pairing**.
- Every notice body ends with: **You can still generate.**
- UI may repeat “You can still generate.” on its own line after the body (same sentence).

**Fallback template** (use when level is `mismatch` but no row below exists):

> [BB style]-style writing relies on [key trait]. [SQ era label] source material may produce unexpected results. You can still generate.

Replace `[BB style]` with Schneider / Basie / Mingus / Brookmeyer. Replace `[SQ era label]` with the display label from §2.3.

### 6.1 Listed RED pairings (use exactly)

| SQ era ID | BB style | Notice copy |
|-----------|----------|-------------|
| `classical` | `mingus` | Mingus-style writing relies on blues roots and angular post-bop expression. Classical source material may produce unexpected results. You can still generate. |
| `early_modernist` | `basie` | Basie-style writing relies on swing feel and economical shout-band rhythms. Early Modernist source material may produce unexpected results. You can still generate. |
| `postwar_modernist` | `basie` | Basie-style writing relies on swing feel and economical shout-band rhythms. Postwar Modernist / Serialist source material may produce unexpected results. You can still generate. |
| `postwar_modernist` | `brookmeyer` | Brookmeyer-style writing relies on linear contrapuntal voicing and cool-jazz pacing. Postwar Modernist / Serialist source material may produce unexpected results. You can still generate. |
| `contemporary_classical` | `basie` | Basie-style writing relies on swing feel and economical shout-band rhythms. Contemporary Classical source material may produce unexpected results. You can still generate. |

Implement via typed constant `SQ_TO_BB_MISMATCH_NOTICE_COPY` derived from this table (not inline in components).

---

## 7. Badge UI rules (Session 3)

1. Render badge **adjacent to** the BB Arranging Style picker (BB Output zone).
2. Dot + short label from §5.1; full AMBER/RED strings may wrap on narrow panels.
3. **Advisory only** — no disable on Generate, no modal (Session 4).
4. `aria-label` example: `Era and BB style compatibility: Natural fit`.

---

## 8. API / generation context

- All era IDs (jazz + classical) pass through unchanged: `sqToBbEra: string` on `GenerateRequest`, normalized by `normalizeSqToBbEraInput()` (non-empty string only).
- **Do not** map classical IDs to jazz aliases in Session 3.
- **Do not** change GCE gates, scorer weights, or BB renderer routing in Session 3.
- Store selected classical era on `generationMetadata.era` when present (same as jazz).

---

## 9. Dropdown structure (SQ→BB)

```
— No Era —
Swing
Bebop
… (all jazz options)
────────────────────  ← divider label: "── Classical Music Eras ──" (disabled optgroup or disabled option)
Classical
Romantic
Impressionist / Late Romantic
Early Modernist
Postwar Modernist / Serialist
Contemporary Classical
```

Use `<optgroup label="Jazz eras">` / `<optgroup label="Classical Music Eras">` if clearer than a disabled divider row.

---

## 10. Checklist for implementers

- [ ] Read this file in full before editing UI or types.
- [ ] Classical options visible in **all** modes (not gated to SQ→BB).
- [ ] Tooltips match §3 verbatim.
- [ ] Matrix matches §5.2 via `SQ_TO_BB_CLASSICAL_ERA_BB_COMPATIBILITY` (no duplicate literals in TSX).
- [ ] Badge hidden for `null` and jazz eras.
- [ ] BB zone label: **BB Arranging Style**.
- [ ] Smoke: **248** passing, **0** failing.

---

## 11. Revision log

| Date | Change |
|------|--------|
| 2026-05-17 | Initial handbook for Session 3 (GAP 5–6). |
| 2026-05-17 | Patch: classical eras in unified dropdown for all modes (badge still SQ→BB-only). |
| 2026-05-17 | Session 4: mismatch notice copy (§6), SQ Source holds Era. |
