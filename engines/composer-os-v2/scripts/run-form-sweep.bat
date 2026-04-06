@echo off
cd /d "%~dp0..\..\..\"
echo Running form sweep — all 15 forms...
npx ts-node --transpile-only --project tsconfig.json ^
  engines/composer-os-v2/scripts/form-sweep.ts
echo Done.
pause
