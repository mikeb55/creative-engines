@echo off
set REPO_ROOT=%~dp0..
set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT=%DESKTOP%\Andrew Hill Engine.bat

(
echo @echo off
echo cd /d "%REPO_ROOT%"
echo py runtime\run_hill_engine.py
echo pause
) > "%SHORTCUT%"

echo Desktop launcher created:
echo %SHORTCUT%
pause
