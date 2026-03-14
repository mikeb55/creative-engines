# Andrew Hill Engine Runtime

This repository uses the following runtime files:

- runtime/run_hill_engine.py
- runtime/run_hill_engine.bat
- runtime/create_desktop_icon.bat

## What they do

**run_hill_engine.py**  
Generates a prototype Andrew Hill phrase as structured JSON event data.

**run_hill_engine.bat**  
Launches the engine from inside the repository.

**create_desktop_icon.bat**  
Creates a desktop launcher called: **Andrew Hill Engine.bat**

## Output location

The generated output file is written to:

**outputs/hill_phrase_output.json**

## Basic use

1. Run runtime/create_desktop_icon.bat once
2. Double-click Andrew Hill Engine.bat on the Desktop
3. Open outputs/hill_phrase_output.json to inspect the result
