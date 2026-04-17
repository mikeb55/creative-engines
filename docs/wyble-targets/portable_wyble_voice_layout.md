# Portable Wyble voice layout (neutral roles)

Three abstract roles drive future contrapuntal work across ensembles:

- **`lead_line`** — primary melodic / statement line  
- **`inner_counter`** — inner voice / counter line (may share a part with a different `voice` number on duo guitar)  
- **`bass_anchor`** — bass register anchor  

TypeScript: `engines/composer-os-v2/core/wyble/wybleVoiceLayoutTypes.ts` and static maps in `ensembleWybleRoleMaps.ts` map each role to **existing** part ids (`guitar` / `bass`, `SQ_PART_*`, `bb_alto_sax` / `bb_tenor_sax` / `bb_rhythm_section`). These align with `docs/wyble-targets/` descriptors and future string-quartet / big-band Wyble work.

**String quartet score build** reads `OrchestrationPlan.wybleVoiceLayout` when it matches `WYBLE_ROLE_MAP_STRING_QUARTET`: chord tones for **violin II** (`inner_counter`) and **viola** (unmapped fourth part) are **swapped** versus the legacy per-instrument stack so inner-line assignment follows the Wyble map in a minimal way. Implementation: `engines/composer-os-v2/core/string-quartet/quartetWybleChordToneStack.ts` + `quartetScoreBuilder.ts`. Tests: `tests/quartetWybleScoreConsumption.test.ts`.

**Big band score build** reads `OrchestrationPlan.wybleVoiceLayout` when it matches `WYBLE_ROLE_MAP_BIG_BAND`: **alto** keeps the sectional lead sax tone; **tenor** is voiced **three semitones lower** in sax register (`inner_counter` below `lead_line`) via `engines/composer-os-v2/core/big-band/bigBandWybleHornVoicing.ts` + `bigBandScoreBuilder.ts`. Tests: `tests/bigBandWybleScoreConsumption.test.ts`.

**Duo:** `GenerationMetadata.wybleVoiceLayout` remains metadata for duo-family golden-path / long-form contexts via `wybleVoiceLayoutForPreset()` — no duo note pass consumes it yet. See also `tests/wybleVoiceLayoutHook.test.ts`.
