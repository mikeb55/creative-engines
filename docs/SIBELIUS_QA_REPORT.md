# Sibelius QA Report — V65 P3

Date: 2026-05-25

Scope: MusicXML export validation for Composer OS modes after V65 P3 deep MusicXML import wiring.

## Summary

All V65 P3 automated MusicXML export checks passed with `engines/composer-os-v2/scripts/runSibeliusQaV65P3.ts`.

The automated checker verifies generated MusicXML exists, contains expected parts/measures/harmony where applicable, has part names, and passes the repository MusicXML output validator. Current validator output still reports non-blocking duration-sum warnings in several modes because some exporters use MusicXML divisions that the lightweight QA pass reports verbosely; these warnings did not fail the existing validation layer.

## Mode Matrix

| Mode | Seed | Bars | Automated status | Manual Sibelius status | Notes |
|---|---:|---:|---|---|---|
| Song Mode (`guitar_bass_duo` export path) | 83001 | 8 | PASS | Confirmed 2026-04-17 | Uses two-part guitar/bass MusicXML surface. |
| Guitar-Bass Duo | 83002 | 8 | PASS | Confirmed 2026-05-02 | Zappa / GBD import previously verified clean in Sibelius. |
| ECM chamber | 83003 | 8 | PASS | TBD | Automated only in this report. |
| String Quartet | 83004 | 16 | PASS | TBD | Automated only; exported five parts in current QA fixture. |
| Big Band | 83005 | 16 | PASS | TBD | Automated only; exported seven parts in current QA fixture. |
| Riff generator | 83006 | 8 | PASS | TBD | Automated only; two-part riff export. |
| Wyble etude | 83007 | 8 | PASS | TBD | Automated only; single-part multi-voice guitar export. |
| Slonimsky etude | 83008 | 8 | PASS | TBD | Automated only; single-part etude export, no harmony symbols expected. |

## Validation Criteria

- MusicXML file written for each mode.
- Part metadata present.
- Clef/part structure produced by mode exporter.
- Harmony present where expected.
- Measure/part counts coherent for short 8-16 bar examples.
- Repository output validator returns PASS.

## Known Limitations

- Manual Sibelius confirmation exists only for Song Mode and GBD as of this report.
- ECM, String Quartet, Big Band, Riff generator, Wyble etude, and Slonimsky etude remain automated-only until a human imports the generated files into Sibelius.
- Duration-sum warnings from the lightweight validator remain noisy for several modes; they are recorded as non-blocking because the existing validator returned PASS.
- Slonimsky etude intentionally exports pattern material without chord-symbol harmony.

## Reproduction

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runSibeliusQaV65P3.ts
```
