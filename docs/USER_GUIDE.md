# Composer OS — User Guide

## What is Composer OS?

**Composer OS** is a program that **creates musical scores** (starting with guitar and bass duo parts) from your choices—preset, chords, style, and optional rhythm “intent.” You get **MusicXML** files you can open in notation software.

It runs as a **local web app** or a **Windows desktop app**. Everything stays on your machine; normal use does not require Python or batch scripts.

## How it works (simple)

1. You pick a **mode** (for example Guitar–Bass Duo, ECM Chamber, or Song Mode).
2. You set options the screen asks for—key, chords, title, and so on.
3. You click **Generate**.
4. The app writes a score into your **Composer** library folder (under Documents by default).

The app checks the score for technical correctness before treating the run as successful.

## What works today

- **Guitar–Bass Duo** and **ECM Chamber** — full score generation.
- **Song Mode** — songwriting-oriented flow with pairing and harmony; generation goes through the same Composer OS engine with Song Mode routing. Choosing **Wayne Shorter** as the primary songwriter turns on a dedicated **chord-tone bias** (more upper extensions, less root/fifth default spellings) so the score reflects that harmonic language.
- **Rhythm intent (D1/D2)** — When you use **Song Mode**, you may see **Groove**, **Space**, **Expression**, and **Surprise** sliders. They send values to the engine so rhythm behaviour can follow your intent. If you leave them at the middle (**50%**), behaviour matches the **balanced** intent baseline. Other modes may not show these controls.

## Running the D1 self-test (developers / verification)

This checks the **engine** only (not the graphical app). From the repo:

```bash
npm run d1:selftest --prefix engines/composer-os-v2
```

See [TESTING.md](./TESTING.md) for what “pass” looks like and where files go.

## Where outputs go

By default, scores are saved under **Documents → Mike Composer Files**, in subfolders by preset (for example **Guitar-Bass Duos**). Each run usually creates a **.musicxml** file; extra metadata may live in a hidden **`_meta`** folder so your main folder stays tidy.

## What’s next

- **D2** — More polish on how rhythm sliders appear and behave in the app.
- **D3** — Not shipped yet; future control features may build on D1/D2.

For technical detail, see [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md).
