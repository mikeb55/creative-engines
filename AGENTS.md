# Agent instructions — Composer OS

Full Composer OS guidance: **`CLAUDE.md`**. Cursor rules: **`.cursor/rules/`**. GCE entry point: **`docs/GCE_CANONICAL.md`**.

## GCE — two modes

- **Formal / technical** — repo gates, evaluator runs, LOCK / DCR, release readiness (`.cursor/rules/gce-evaluation.mdc` §1, `composer-os-quality-gates.mdc`)
- **Musician-facing / conversational** — chat critique (“GCE this”, “is this good?”); not a release gate unless formal validation requested (`.cursor/rules/gce-evaluation.mdc` §2, `docs/GCE_LOCK_DCR_STANDARDS.md` §1.0–§1.3)

**Default:** musician-facing for chat evaluation unless the prompt asks for **formal Composer OS validation** or mentions **LOCK**, **DCR**, or **CI**. Formal mode for code, evaluator runs, and release decisions.

Formulas, weights, thresholds, and hard gates are **unchanged**; only agent application differs.

## Ship discipline

After every **shipped feature**, land **`CHANGELOG.md` + relevant architecture doc + `COMPOSER_OS_ROADMAP.md`** updates in the **same commit** as the code. No separate docs-only commit unless fixing docs alone. No approval gate—documentation is part of the ship.

Typical paths:
- **`docs/CHANGELOG.md`** — `[Unreleased]` or dated entry
- **Architecture** — usually **`docs/COMPOSER_OS_ARCHITECTURE.md`** for API/pipeline; use another doc if the feature’s natural home differs
- **`docs/COMPOSER_OS_ROADMAP.md`** — when roadmap / Current / priority bullets change

Playbook touchpoints: **`docs/COMPOSER_OS_PLAYBOOK.md`** + regenerate **`.docx`** per **`CLAUDE.md`** when user-facing composer/preset behaviour changes.
