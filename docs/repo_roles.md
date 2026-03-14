# Repository Roles — Creative Engines Ecosystem

This document defines the responsibilities of each repository in the Creative Engines ecosystem.

---

## REPO 1 — creative-engines

**Purpose:** Platform and shared infrastructure

| Component | Description |
|-----------|-------------|
| **runtime** | Run scripts, desktop icon, execution environment |
| **shared infrastructure** | Common tooling, conventions, and support |
| **palettes** | Tonality Vault, interval cycles, triad pairs, polychords |
| **templates** | Composition request, revision loop templates |
| **rules** | GCE, anti-monotony, ensemble, engraving, structure |
| **docs** | Documentation, consolidation reports, repo roles |

---

## REPO 2 — creative-rule-engines

**Purpose:** Engine definitions and experimental development

| Component | Description |
|-----------|-------------|
| **composer engine definitions** | Specs for each composition engine |
| **harmonic grammar engines** | Harmonic and voice-leading engines |
| **experimental engine development** | New engine concepts and prototypes |
| **engine specs** | Monk, Barry Harris, Andrew Hill, Bartók, Zappa, Scofield–Holland, Shorter, Frisell, Wheeler, Stravinsky, Slonimsky, and others |

---

## Rule: No Duplication

**Do not duplicate engine files across both repos.** Engine definitions live only in **creative-rule-engines**. The **creative-engines** repo provides infrastructure; it does not contain engine spec files.
