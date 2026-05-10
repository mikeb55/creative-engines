# Agent instructions — Composer OS

Full Composer OS guidance: **`CLAUDE.md`**. Cursor rules: **`.cursor/rules/`**.

## Ship discipline

After every **shipped feature**, land **`CHANGELOG.md` + relevant architecture doc + `COMPOSER_OS_ROADMAP.md`** updates in the **same commit** as the code. No separate docs-only commit unless fixing docs alone. No approval gate—documentation is part of the ship.

Typical paths:
- **`docs/CHANGELOG.md`** — `[Unreleased]` or dated entry
- **Architecture** — usually **`docs/COMPOSER_OS_ARCHITECTURE.md`** for API/pipeline; use another doc if the feature’s natural home differs
- **`docs/COMPOSER_OS_ROADMAP.md`** — when roadmap / Current / priority bullets change

Playbook touchpoints: **`docs/COMPOSER_OS_PLAYBOOK.md`** + regenerate **`.docx`** per **`CLAUDE.md`** when user-facing composer/preset behaviour changes.
