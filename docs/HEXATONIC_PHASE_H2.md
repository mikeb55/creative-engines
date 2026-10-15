# Hexatonic Phase H2 — Six-note registry

**Version:** `hexatonic-registry-h2.0`  
**Date:** 2026-10-15  
**Definition lock:** `docs/HEXATONIC_PHASE_H1.md`  
**Module:** `engines/composer-os-v2/core/hexatonic/`

H2 is a sibling catalogue. It does not generate a score, write MusicXML, or open a user interface. Fixtures in `evidence.ts` are deterministic checks. They are not compositions and they are not artistically approved.

## Catalogue

Eleven adopted scalar collections, in H1 order:

`hex_western_claim_not_ritsu`, `hex_major_omit_seventh`, `hex_major_omit_fourth`, `hex_lydian_triad_pair`, `hex_minor_primary`, `hex_whole_tone_even`, `hex_whole_tone_odd`, `hex_augmented_t0`, `hex_augmented_t1`, `hex_augmented_t2`, `hex_augmented_t3`.

Traditional Ritsu stays the five-note `open_pentatonic`. `hex_minor_omit_second`, `hex_minor_dorian_omit_second`, and `hex_blues` stay unadopted.

The sixteen WPS resolution/tension pairs are a separate family, `wps-resolution-tension`. Each pair is read from `WPS_VAULT_TONALITIES` and keeps that record’s id, parent symbol, Harris label, two triads, union, and shell tones that sit outside the union. Lydian pitch classes are read from `buildBhlWorldField` world A.

`hex_major_omit_fourth` and WPS `maj9` share one pitch-class set and remain two entries. `hex_minor_primary` and WPS `min11` do the same. The scalar id has no parent chord. The WPS id keeps the parent.

## Operations

Membership, twelve-centre transposition, canonical pitch-class form, set equality, duplicate reporting, common-tone intersection, nearest-tone distance, inside / outside / return, and symmetry landing for whole-tone (period 2) and augmented (period 4).

Distance and continuity divide by the collection’s own cardinality. They do not call the five-note cutoffs in `measureFieldDistance`.

Triad exchange uses `validateParentTriad` and `analyzeTriadPair`. Shared pitch classes can hold. Disjoint triads move by a one-to-one nearest-tone assignment, and a voice may leap when the nearest tone is already taken. A six-note set is a collection. A guitar surface in this module is a dyad or a triad.

`TONALITY_VAULT_DATABASE` and `triad-pair-pendulum` are untouched. Quadratonic grips stay four notes.

## Tests

`engines/composer-os-v2/tests/hexatonicH2.test.ts`  
`engines/composer-os-v2/tests/hexatonicH1Regression.test.ts` still locks the pentatonic registries, BHL worlds, WPS records, and quadratonic pendulum.
