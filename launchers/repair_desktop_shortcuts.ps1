# Repair Desktop Shortcuts for Creative Engines
# Uses cmd.exe as target for maximum Explorer compatibility (avoids .bat shortcut interpretation issues)

$Desktop = "C:\Users\mike\Desktop"
$RepoRoot = "C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
$Launchers = "$RepoRoot\launchers"
$CmdExe = "C:\Windows\System32\cmd.exe"

# Shortcuts to DELETE (all engine-related duplicates)
$ToDelete = @(
    "Wyble Etude Generator.lnk",
    "Ellington Orchestration Generator.lnk",
    "Ellington Orchestration.lnk",
    "Big Band Architecture Generator.lnk",
    "Big Band Architecture.lnk",
    "Contemporary Counterpoint Generator.lnk",
    "Contemporary Counterpoint.lnk"
)

foreach ($name in $ToDelete) {
    $path = Join-Path $Desktop $name
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: $name"
    }
}

# Create shortcuts: Target = cmd.exe, Arguments = /c "path\to\bat"
# This avoids PATH/npx/ts-node issues and .bat shortcut interpretation quirks in Explorer
$Shortcuts = @{
    "Wyble Etude Generator" = "wyble_etude.bat"
    "Ellington Orchestration" = "ellington_orchestration.bat"
    "Big Band Architecture" = "big_band_architecture.bat"
    "Contemporary Counterpoint" = "contemporary_counterpoint.bat"
}

$WshShell = New-Object -ComObject WScript.Shell

foreach ($entry in $Shortcuts.GetEnumerator()) {
    $shortcutPath = Join-Path $Desktop "$($entry.Key).lnk"
    $batPath = Join-Path $Launchers $entry.Value
    
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $CmdExe
    $shortcut.Arguments = "/c `"$batPath`""
    $shortcut.WorkingDirectory = $RepoRoot
    $shortcut.Save()
    Write-Host "Created: $($entry.Key).lnk -> cmd.exe /c `"$batPath`""
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
Write-Host "Done."
