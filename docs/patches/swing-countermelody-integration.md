# Swing + Countermelody Integration Patch

**Date:** 2026-03  
**Type:** LOCK + GCE extension

---

## Summary

Lightweight, non-restrictive modules for Swing Feel and Countermelody / Secondary-Line Interaction. Integrated into LOCK rules and GCE criteria. Design remains flexible, musical, and non-dogmatic.

---

## New Files

### LOCK Modules (rules/lock/)
- `swing-module.md` — Swing / Feel activation when stylistically relevant
- `countermelody-module.md` — Secondary-line roles and placement
- `multi-line-clarity.md` — Line independence and density control

### GCE Modules (rules/gce/)
- `swing-authority.md` — Scoring lens for rhythmic feel
- `countermelody-line-interaction.md` — Scoring lens for line interaction

---

## Activation

| Module | Activates when |
|--------|----------------|
| Swing Authority | Idiom calls for swing, groove, jazz-pop phrasing |
| Countermelody | 2+ meaningful lines present |
| Multi-Line Clarity | 2+ lines active simultaneously |

---

## Design Philosophy

- **Evaluative lenses** — not rigid universal constraints
- **Activation modules** — only apply when contextually relevant
- **Musical intelligence preserved** — no forced formula
- **Soft guidance** — no hard numeric quotas except where explicitly phrased as such

---

## Integration

- GCE master (`rules/gce_evaluation_framework.md`) references new scoring lenses
- LOCK implementations (e.g. guitar-bass-duos) reference new modules
- No existing rule architecture broken; extensions only
