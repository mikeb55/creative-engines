# WPS V1.1 snapshot

Frozen before V1.2 edits on 2026-10-12.

These copies are the V1.1 sources. The live tree is V1.2. Do not relabel the live checker as this baseline.

Verified before the copy:

- Command: `npm run wps --prefix engines/composer-os-v2 -- --spec core/wwh/wps/specs/07-impossible-metaphysics.json`
- Baseline test: 12/12 PASS
- Reference: Impossible Metaphysics Performance Edition V1.3
- Source LOCK PASS, guitar feasibility PASS, duration 4:17.30
- A–H inventory complete, E is E-V3.0
- CBV: zero proposals
- No official numeric GCE
- No note generation

Proposed tag, not created: `wps-v1.1-baseline`

Proposed commit, not created. Stage only these paths from this snapshot, not the later V1.2 edits:

- `docs/WPS_WORKFLOW.md`
- `docs/CHANGELOG.md`
- `docs/COMPOSER_OS_ARCHITECTURE.md`
- `docs/COMPOSER_OS_ROADMAP.md`
- `engines/composer-os-v2/package.json`
- `engines/composer-os-v2/scripts/wpsCli.ts`
- `engines/composer-os-v2/core/wwh/wps/wpsTypes.ts`
- `engines/composer-os-v2/core/wwh/wps/wpsAssess.ts`
- `engines/composer-os-v2/core/wwh/wps/specs/03-the-mirror.json`
- `engines/composer-os-v2/core/wwh/wps/specs/05-orbit-v2.1.json`
- `engines/composer-os-v2/core/wwh/wps/specs/06-wrong-turning.json`
- `engines/composer-os-v2/core/wwh/wps/specs/07-impossible-metaphysics.json`
- `engines/composer-os-v2/tests/wpsBaseline.test.ts`

Message:

```
chore(wps): freeze V1.1 baseline

Record the checked Impossible Metaphysics V1.3 workflow before the V1.2 blueprint and Mirror import correction.
```

Do not stage `docs/MORPH_DQA_V0.1-PILOT.md` or `engines/composer-os-v2/scripts/wwhEV2Liquid.ts`.
