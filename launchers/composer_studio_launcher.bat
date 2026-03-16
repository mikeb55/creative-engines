@echo off
REM Composer Studio Launcher - Double-click to run
REM Calls studio launcher with default settings
REM Outputs go to outputs/composer_studio/studio_runs/

cd /d "%~dp0.."
py -3 -c "import sys; sys.path.insert(0, 'engines'); from composer_studio.studio_launcher_entry import run_studio_launcher; r = run_studio_launcher('Untitled', 'wheeler_lyric', 0); print('Run path:', r.get('run_path', '')); print('Finalists:', len(r.get('finalists', [])))"
if errorlevel 1 (
    echo Launcher failed. Ensure Python 3 is installed and repo path is correct.
    pause
)
