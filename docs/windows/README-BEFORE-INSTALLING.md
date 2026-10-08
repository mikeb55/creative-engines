# READ ME BEFORE INSTALLING COMPOSER OS ON WINDOWS

**WINDOWS INSTALLER NOT YET AVAILABLE**

Checked on 2026-10-08: [GitHub Releases](https://github.com/mikeb55/creative-engines/releases) for `mikeb55/creative-engines` has no published release and no Windows download. Do not install anything until a release on that page lists a Windows installer.

The macOS app does not run on Windows. A `.app` or `.dmg` from a Mac is not a Windows program.

## What still has to happen

The repository can build a Windows package. Nobody has published that package on GitHub.

1. On a Windows machine, from `apps/composer-os-desktop`, run `npm run desktop:package`. That script runs `electron-builder --win`.
2. The build is configured to write two files into `apps/composer-os-desktop/release/`:
   - `Composer-OS-Setup.exe` — NSIS installer (`oneClick` is false, so the installer lets you choose a folder, and it creates a desktop shortcut)
   - `Composer-OS.exe` — portable program (no installer)
3. Create a GitHub Release and attach those files. Nothing in `.github/workflows` publishes a release today.

Until those files appear on the Releases page, there is nothing for a Windows user to download.

## 1. Where the installer will be

Releases page: [https://github.com/mikeb55/creative-engines/releases](https://github.com/mikeb55/creative-engines/releases)

When a release exists, download the asset named **`Composer-OS-Setup.exe`**. That name comes from `apps/composer-os-desktop/package.json` (`build.nsis.artifactName`). The portable file, if attached, is **`Composer-OS.exe`**.

There is no other download URL in this repository. Do not follow a link that is not that Releases page.

## 2. The repository ZIP is not Composer OS

**Code → Download ZIP** on GitHub gives the source tree. That ZIP has no Windows installer. Opening it does not install an app. You would still need Node.js, a full build, and the Windows package step above. That path is for developers, not for installing Composer OS.

## 3. Windows version and architecture

`apps/composer-os-desktop/package.json` sets the Windows targets to `portable` and `nsis`. It does **not** set a CPU architecture and it does **not** name a minimum Windows version.

Verified facts from this repo:

| Item | What the build config says |
| --- | --- |
| App name | Composer OS Desktop |
| App id | `com.mikeb55.composeros.desktop` |
| Desktop package version in source | `2.10.10` (`apps/composer-os-desktop/package.json`) |
| Electron used by that package | `28.3.3` |
| Windows targets | NSIS installer and portable exe |
| Installer file name | `Composer-OS-Setup.exe` |
| Portable file name | `Composer-OS.exe` |
| Code signing | Off (`signAndEditExecutable` is false; packaging sets `CSC_IDENTITY_AUTO_DISCOVERY=false`) |
| CPU architecture | Not set in the Windows build block |
| Minimum Windows version | Not set in the Windows build block |

macOS packaging in the same file is separate and is Apple Silicon (`arm64`) only. That Mac build is not the Windows build.

## 4. Download, install, and launch

Do these steps only after `Composer-OS-Setup.exe` is listed on the Releases page.

1. Open [the Releases page](https://github.com/mikeb55/creative-engines/releases).
2. Download `Composer-OS-Setup.exe` from a release asset. Leave the repository ZIP alone.
3. Run the installer. It is configured to ask for an install folder and to add a desktop shortcut named for Composer OS Desktop.
4. Start **Composer OS Desktop** from that shortcut or the Start menu.

The package is unsigned. Windows may show a SmartScreen or “unknown publisher” warning. That matches the build settings. Only continue if you downloaded the file from the Releases page above.

`Composer-OS.exe`, if a release includes it, is the portable build. Run that file directly. It does not go through the NSIS installer.

## 5. Prerequisites

For the packaged app, the desktop notes say you do not start a server, install Python, or run a `.bat` file. Node.js is for building the app, not for running a published installer.

MuseScore 4 is not included. Install it yourself from [musescore.org](https://musescore.org) if you want to see or hear the MusicXML.

## 6. Pentatonic Engine → Recommend → Generate Music

In the Composer OS window:

1. Click **Pentatonic**.
2. Leave **Mode** on **Region** unless you mean to analyse a passage or a whole score.
3. Fill the region fields (tonal centre, harmony, melody). The page tells you when something required is missing.
4. Click **Recommend**.
5. Click a recommendation card so it is selected. The line **Selected pentatonic collection** shows the name and spelling.
6. Click **Generate Music**.

Generate Music writes a file only inside the desktop app. If the inputs change after Recommend, the page marks the result stale. Recommend again before Generate Music.

## 7. Open the MusicXML in MuseScore 4

After a successful Generate Music, the page shows the full file path, **Open MusicXML**, and **Open Folder**.

**Open MusicXML** looks only for `/Applications/MuseScore 4.app`. That path is on a Mac. On Windows the button reports that MuseScore 4 is not at that path. Use **Open Folder** instead.

Then, in MuseScore 4: **File → Open** and choose the `.musicxml` file. MuseScore must already be installed. Composer OS does not install it.

## 8. Where the file is saved

Generate Music writes under the Windows Documents folder that Electron reports (`app.getPath('documents')` in `apps/composer-os-desktop/electron/ipcEntry.ts`):

`Documents\Composer OS Exports\Pentatonic Engine\`

The file name looks like `Pentatonic-<collection-label>-<timestamp>.musicxml`. The page prints the full path after a successful write. **Open Folder** reveals that file (on Windows this uses Explorer).

Other Composer OS export folders are separate. This path is only for Pentatonic Generate Music.

## 9. Troubleshooting and how to report a problem

- The Releases page is empty or has no `.exe`: the installer is not published yet. Stop. Do not use the source ZIP as a substitute.
- Windows blocks an unknown publisher: confirm the file came from the Releases page. The build is unsigned on purpose.
- Generate Music does nothing useful: Recommend first, select one collection, and generate again if the page says the result is stale.
- **Open MusicXML** fails on Windows: use **Open Folder**, then open the file from MuseScore 4.
- The window title stays **Composer OS** with no version: the desktop shell did not report a version. Open **Diagnostics** and read **Desktop app version**.

Report problems on [GitHub Issues](https://github.com/mikeb55/creative-engines/issues). Include the desktop app version, the Windows edition, what you clicked, and the exact error text on the page. Do not attach private scores unless you mean to share them.

## 10. Check the installed version

The window heading shows `Composer OS - v` plus the desktop version when the shell reports one.

Open **Diagnostics** in the app. It lists **Desktop app version** and **UI bundle version**. Those two should match. A mismatch line means the bundled interface and the Electron shell were not built together.

The source tree’s desktop package version is `2.10.10`. That number describes this repository. It is not proof of what a future Windows installer will say until that installer is published and you read Diagnostics on the installed app.

Developer packaging notes, including the Windows build commands, are in [the desktop README](../../apps/composer-os-desktop/README.md).
