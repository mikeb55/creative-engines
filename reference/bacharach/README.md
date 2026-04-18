# Bacharach reference scores (local analysis)

Place **MusicXML** (`.musicxml` / `.xml`) or **MXL** (`.mxl`) exports here **without renaming** the original base names so mining output can cite sources.

**Suggested source folder (your machine):**

`C:\Users\mike\Documents\Burt Bachrach Resources\`

Copy or symlink files such as:

- `alfie-burt-bacharach-alfie*.musicxml` / `.mxl`
- `close-to-you-they-long-to-be*`
- `do-you-know-the-way-to-san-jose-burt*`
- `ill-never-fall-in-love-again-bacharach*`
- `i-say-a-little-prayer-burt-bacharach*`
- `what-the-world-needs-now-is-love-burt*`

Then run (from repo root):

```bash
npm run mine:bacharach -- --dir reference/bacharach
```

Or point at your Documents folder:

```bash
set COMPOSER_OS_BACHARACH_REF_DIR=C:\Users\mike\Documents\Burt Bachrach Resources
npm run mine:bacharach --
```

Output is **diagnostic** (stdout + optional JSON path); it does not affect generation.

See **`BACHARACH_MINING_FINDINGS.md`** in this folder for how cross-score traits map to Composer’s non-imitative Bacharach Song Mode v1 slice.
