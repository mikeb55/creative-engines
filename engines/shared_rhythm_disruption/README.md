# Shared Rhythm/Disruption Layer

Compact utility layer for **Stravinsky Pulse** and **Zappa Disruption** engines.

## Modules

- **pulse_cells** — `build_pulse_cell`, `score_pulse_identity`
- **accent_displacement** — `displace_accents`, `score_accent_instability`
- **block_form_tools** — `build_block_contrast_plan`, `score_block_contrast`
- **interruption_patterns** — `build_interruption_pattern`, `score_disruption_energy`
- **asymmetrical_cycle_tools** — `build_asymmetrical_cycle`, `score_cycle_irregularity`

## Usage

Both engines import from this layer:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared_rhythm_disruption.pulse_cells import build_pulse_cell, score_pulse_identity
from shared_rhythm_disruption.accent_displacement import displace_accents
from shared_rhythm_disruption.block_form_tools import build_block_contrast_plan
from shared_rhythm_disruption.interruption_patterns import build_interruption_pattern
from shared_rhythm_disruption.asymmetrical_cycle_tools import build_asymmetrical_cycle
```

## Design

- Deterministic: same seed → same output
- Compact: minimal dependencies
- Shared: no engine-specific logic
