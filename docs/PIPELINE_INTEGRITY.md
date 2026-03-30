You are working ONLY in:

C:\Users\mike\Documents\Cursor AI Projects\creative-engines

PROJECT
Composer OS V8.0

TASK
Embed system-wide pipeline integrity rules (identity lock, no post-generation mutation, final integrity gate) into the repo and commit.

--------------------------------------------------
SCOPE
--------------------------------------------------

Make ONLY these changes:

1) Create a new file:
docs/PIPELINE_INTEGRITY.md

2) Add minimal inline TODO guards in:
- engines/composer-os-v2/core/goldenPath/songModePhraseEngineV1.ts
- engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts

DO NOT:
- modify logic
- refactor code
- change behavior
- touch UI/export
- touch tests

--------------------------------------------------
FILE CONTENT (WRITE EXACTLY)
--------------------------------------------------

docs/PIPELINE_INTEGRITY.md

# Composer OS - Pipeline Integrity Rules

## Core Principle
Identity-critical musical material (e.g. hook bars) must not change after generation.

## Rules

1. Single Source of Truth  
Motif / identity material must exist in one canonical representation shared across generator, transforms, and validator.

2. Identity Lock  
After generation, identity-critical regions (e.g. Song Mode hook bars) are read-only.  
No downstream stage may modify their pitches.

3. Pipeline Contracts  
Each stage must explicitly define:
- what it may modify
- what it must not modify

4. No Silent Mutation  
Post-generation pitch rewriting (clamp, snap, correction, voice-leading) is forbidden on protected identity material unless explicitly allowed.

5. Deterministic Order  
generation → identity lock → optional transforms → validation  
No pitch-changing transforms after identity lock.

6. Final Integrity Gate  
Before output, compare generated identity material with final score.  
Fail if interval pattern or contour has changed.

7. Default for Future Engines  
All motif-based engines must:
- use one canonical motif representation
- protect identity bars from mutation by default

--------------------------------------------------
INLINE TODO INSERTS
--------------------------------------------------

In songModePhraseEngineV1.ts, directly above the pitch write line:

// TODO: PIPELINE INTEGRITY RULE
// Do not mutate pitches for identity-locked bars (e.g. Song Mode hook-first bar 25)

In generateGoldenPathDuoScore.ts, before returning final score:

// TODO: PIPELINE INTEGRITY GATE
// Compare generated hook material vs final output and fail if identity changed

--------------------------------------------------
GIT
--------------------------------------------------

Run:

git add docs/PIPELINE_INTEGRITY.md
git add engines/composer-os-v2/core/goldenPath/songModePhraseEngineV1.ts
git add engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts
git commit -m "Add pipeline integrity rules (identity lock + no post-generation mutation + integrity gate)"
git push

--------------------------------------------------
OUTPUT ONLY
--------------------------------------------------

1. files created/edited
2. confirmation of commit + push