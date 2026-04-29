# Composer OS — Bacharach & Donald Fagen (roadmap note)

**Snapshot: 2026-04-29** — Same content as `COMPOSER_OS_ROADMAP.md` § *Product notes — Bacharach & Donald Fagen*.

## Product notes — Bacharach & Donald Fagen: UI grouping vs implementation

- **Generate UI** (Songwriter dropdown) lists **Bacharach** and **Donald Fagen** under **Ready to build** with ids that do **not** yet use the newest **full golden-path slice** packaging (dedicated `*Slice.ts`, five named harmonic devices, `*EffectiveHarmonyBars` + export/disk truth, dedicated smoke test) used for **Shipped (full slice)** writers (e.g. Pat Metheny, Joni Mitchell).

- **Engine status:** Both writers already ship **real** Song Mode behaviour — registry/rules, surfaces, harmony/guitar passes, **`eval:bacharach`** / **`eval:fagen`**, Bacharach harmony dressing & surfaces, Fagen keys-comp / rhythm overlays / sophisticated-pop hooks — i.e. **not** placeholder or compile-only rows.

- **Gap:** **Architectural / marketing** alignment with the newest slice template, not absence of music pipeline behaviour.

- **Parity refactor** (repackage to full `*Slice.ts` pattern): **not a quick win** — budget **days+ per writer**; treat as **normal scheduled work**. **Optional** unless the goal is **one maintenance pattern** or **parity** with Pat Metheny–style receipts/tests.

- **When to skip parity:** Current outputs meet product needs; prioritize **new writer territories** or other **Priority stack** items.

- **When to schedule parity:** Team wants **one canonical slice pattern** and **regression** coverage aligned with the newest shipped slices.

---

*Canonical roadmap:* [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md)
