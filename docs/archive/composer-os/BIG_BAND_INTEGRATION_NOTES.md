# Big Band — integration notes (Prompt 5/7)

## Reused (ideas / terminology only)

- **Workspace engines** (`engines/big-band-architecture-engine`, `engines/ellington-orchestration-engine`, `engines/arranger-assist-engine`): section/chart vocabulary and “shout / pads / rhythm” language informed role enums; **no runtime imports** from those packages.
- **Shared orchestration layer** (`core/orchestration/`): register/texture/density ownership, ensemble family `big_band`, `buildBigBandOrchestrationPlan` maps BB roles → `OrchestrationRoleLabel`.

## Adapted in Composer OS

- **Instrument groups**: `saxes`, `trumpets`, `trombones`, `rhythm_section` as planning sections (not full score parts).
- **Form phases**: `intro` → `melody_head` → … → `shout_chorus` → `ending` (default omits `background_figures`; optional extended form can include it).
- **Pipeline**: `runBigBandMode` → form / section / density → `assembleBigBandOrchestrationPlan` → validation; **registry id** `big_band_plan`.

## Not imported / later

- Full **MusicXML** big-band score generation, detailed **voicings**, rhythm-section drum notation, sax/trumpet/trombone staves as separate generated parts.
- **Ellington** / **architecture-engine** orchestration runtimes (keep as separate tools unless explicitly bridged later).

Prompt **5/7** complete: Big Band is a **real planning module**; detailed scoring still TBD.
