@echo off
REM Songwriting Engine Launcher - Double-click to run
REM Calls launcher_entry.py with default settings
REM Outputs go to outputs/songwriting_engine/run_YYYYMMDD_HHMMSS/

cd /d "%~dp0.."
py -3 engines/songwriting_engine/runtime/launcher_entry.py
if errorlevel 1 (
    echo Launcher failed. Ensure Python 3 is installed and repo path is correct.
    pause
)
