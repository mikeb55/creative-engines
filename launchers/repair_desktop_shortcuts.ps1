# Repair Desktop Shortcuts for Creative Engines
# Deletes duplicates, creates one clean shortcut per app

$Desktop = "C:\Users\mike\Desktop"
$RepoRoot = "C:\Users\mike\Documents\Cursor AI Projects\creative-engines"
$Launchers = "$RepoRoot\launchers"

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

# Delete duplicates
foreach ($name in $ToDelete) {
    $path = Join-Path $Desktop $name
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: $name"
    }
}

# Create new shortcuts: Name -> .bat file
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
    $shortcut.TargetPath = $batPath
    $shortcut.WorkingDirectory = $RepoRoot
    $shortcut.Save()
    Write-Host "Created: $($entry.Key).lnk -> $batPath"
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
Write-Host "Done."
