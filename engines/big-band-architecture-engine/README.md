# Big Band Architecture Engine

Generates arrangement form structures (intro, head, soli, shout, etc.) that feed into the Ellington orchestration engine.

## Architecture Patterns

- **Standard Swing** — Intro, Head A/B, Background, Soli, Shout, Head out, Tag
- **Ellington Style** — Intro reeds, Head sax, Brass answer, Background, Soli trumpet, Shout brass, Release
- **Ballad Form** — Intro pad, Head, Background, Soli, Head reprise, Tag

## Ellington Integration

Each architecture section maps to Ellington parameters (lead section, density, arrangement mode). The engine calls `runEllingtonEngine()` per section to produce orchestration plans.

## Output

`apps/big-band-architecture-desktop/outputs/` — architecture.json, architecture.md, arrangement_plan.md
