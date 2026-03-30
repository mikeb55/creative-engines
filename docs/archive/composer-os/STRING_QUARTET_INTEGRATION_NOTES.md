# String Quartet integration (Prompt 6/7)

## Reused

- **Shared orchestration layer** (`core/orchestration/`): ensemble profile `string_quartet`, `planRegisterOwnership`, `planTextureOwnership`, `planDensityOwnership`, `validateOrchestrationPlan` (completeness, family roles, single-lead enforcement, register crowding, density overload, bass anchor).
- **Big Band module pattern** (Prompt 5/7): declarative form → role grid → density → `assemble*OrchestrationPlan` → validation; preset metadata + module registry + run-ledger optional fields.
- **Terminology**: quartet-specific roles (`lead`, `counterline`, `inner_motion`, `harmonic_support`, `bass_anchor`, `sustain_pad`, `silence`) mapped to shared `OrchestrationRoleLabel` via `quartetRoleMapping.ts`.

## Adapted

- **Form**: five phases (`statement` → `development` → `contrast` → `return` → `coda`) with weighted bar split (`quartetFormPlanner.ts`).
- **Texture**: phase-driven role grid so violin_1 is not always lead; viola can lead in contrast; cello keeps `bass_anchor` where foundation is required for orchestration validation.
- **Validation**: quartet bundle checks (coda, statement vs contrast density, cello foundation, single lead, anti “all-parts constant motion”) plus `validateQuartetRegisterOwnership` on the assembled plan.

## Later (not in this prompt)

- Full **MusicXML** string quartet score generation and **contrapuntal** writing engines.
- Dedicated **string instrument profiles** (currently guitar + bass stand-ins for manifests, same pattern as Big Band).
- UI wiring and generation entry points beyond `string_quartet_plan` module + preset listing.

**Prompt 6/7 complete:** String Quartet is a real **planning** mode; detailed writing and full score export remain future work.
