@echo off
REM Composer DAW Launcher - Double-click to run
REM Creates project, runs generation, exports to projects/composer_daw/

cd /d "%~dp0.."
py -3 -c "import sys; sys.path.insert(0, 'engines'); from composer_daw.composer_daw_runtime import run_composer_daw; r = run_composer_daw('Untitled_Project'); print('Status:', r.get('status', {})); print('Exports:', r.get('status', {}).get('export_count', 0))"
if errorlevel 1 (
    echo Launcher failed. Ensure Python 3 is installed and repo path is correct.
    pause
)
