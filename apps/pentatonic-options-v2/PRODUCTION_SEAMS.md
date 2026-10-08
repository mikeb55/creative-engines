# Pentatonic Options V2 production seams

V2 calls the Composer OS pentatonic engine. It does not own a second engine.

| Practice need | Production function |
| --- | --- |
| Score / context analysis | `analyzePentatonicScore`, `formatPentatonicScoreMap`, `analyseScoreXml` |
| Manual context | `buildPentatonicMusicContext`, `recommendPentatonicsFromRegion` |
| Field / resource lookup | `listPentatonicColourResources`, `getPentatonicColourResource`, `spellFromReference` |
| Colour reading | `evaluatePentatonicColour` |
| Path home collection | `manualCollection` |
| AUTO COLOR | `planAutoColor` |
| Distance (advisory) | `planGradedOut` via `moveOut` |
| Pivot link (check only) | `planPivotLink` via `connectFields` |
| Extract (advisory) | `extractParentField` via `deriveField` |
| Layered field (metadata) | `planLayeredField` via `layerField` |
| Motif transformation | `transformCell`, `realisePentatonicPhrase` |
| Phrase generation | `realisePentatonicPhrase`, `planPentatonicOperator` |
| Quartal cells | `realiseQuartalComp`, `realiseQuartalLine` |
| Grounding / outside budget | `assessGrounding`, `DEFAULT_OUTSIDE_BUDGET` |
| Compare | `comparePentatonicCandidates`, `orderCompareCandidates` |
| GCE advisory | `evaluateGce`, `defaultGceWeights` |
| MusicXML | `exportScoreModelToMusicXml` via `createScore` / `createPart` / `createNote` / `createRest` |

Adapter: `engines/composer-os-v2/core/pentatonic/practiceFacade.ts`.

App: `apps/pentatonic-options-v2/`. UI state, session history, and MuseScore `open` live there.

Deferred: `FIELD_WALK` (strategy note only), `BIMODAL_DUO`, `RHYTHMIC_GROUPING`.
