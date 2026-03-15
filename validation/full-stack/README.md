# Full-Stack Validation

Integrated validation test for the complete big-band generation pipeline. Does not modify any engine logic.

## Pipeline

Architecture → Ellington → Arranger Assist → Selective Generation → MusicXML Export

## Run

```bash
npm run test:fullstack
```

## Output

- `validation/reports/full_stack_validation_report.md`
- `validation/reports/full_stack_validation_report.json`

## Checks

- Architecture: sections, bar counts
- Ellington: orchestration roles, density
- Arranger Assist: suggestions match sections, no lead conflicts
- Selective: notes generated, register limits
- MusicXML: score-partwise, measures, staves, chord symbols
