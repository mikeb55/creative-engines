# Composer DAW

Project-based generative composition system. Manages multiple compositions, sessions, and exports.

## Quick Start

```python
from composer_daw import run_composer_daw

result = run_composer_daw("MyProject", idea="Floating theme", preset_name="wheeler_lyric", seed=0)
print(result["status"])
```

## Project Structure

```
projects/composer_daw/<project_name>/
  project.json
  sessions/
  exports/
```

## Integration

Composer DAW calls Composer Studio, Orchestration Bridge, and Songwriting Bridge as subsystems.
