"use strict";
(() => {
  // musician/musician.ts
  var composerSelect = document.getElementById("composer");
  var progressionInput = document.getElementById("progression");
  var totalBarsSelect = document.getElementById("total-bars");
  var lengthField = document.querySelector(".field-length");
  var seedInput = document.getElementById("seed");
  var randomiseBtn = document.getElementById("randomise");
  var generateBtn = document.getElementById("generate");
  var form = document.getElementById("generate-form");
  var statusEl = document.getElementById("status");
  var composers = [];
  var generating = false;
  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", isError);
  }
  function setControlsEnabled(enabled) {
    composerSelect.disabled = !enabled;
    progressionInput.disabled = !enabled;
    totalBarsSelect.disabled = !enabled;
    seedInput.disabled = !enabled;
    randomiseBtn.disabled = !enabled;
    generateBtn.disabled = !enabled;
  }
  function hasPastedProgression() {
    return progressionInput.value.trim().length > 0;
  }
  function syncLengthFieldVisibility() {
    const show = hasPastedProgression();
    lengthField.hidden = !show;
    lengthField.classList.toggle("is-visible", show);
  }
  function defaultComposerSlug(list) {
    const active = list.find((c) => !c.frozen);
    return (active ?? list[0])?.slug ?? "";
  }
  function fillComposerOptions(list) {
    composerSelect.innerHTML = "";
    const reference = list.filter((c) => c.frozen);
    const active = list.filter((c) => !c.frozen);
    const addGroup = (label, items) => {
      if (items.length === 0)
        return;
      const group = document.createElement("optgroup");
      group.label = label;
      for (const c of items) {
        const opt = document.createElement("option");
        opt.value = c.slug;
        opt.textContent = c.displayName;
        group.appendChild(opt);
      }
      composerSelect.appendChild(group);
    };
    addGroup("Composers", active);
    addGroup("Frozen composers", reference);
    const slug = defaultComposerSlug(list);
    if (slug) {
      composerSelect.value = slug;
      const picked = list.find((c) => c.slug === slug);
      if (picked)
        seedInput.value = String(picked.defaultSeed);
    }
  }
  function randomSeed() {
    return Math.floor(Math.random() * 9e5) + 1e5;
  }
  function parseSeedInput() {
    const n = Number.parseInt(seedInput.value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 999999999)
      return null;
    return n;
  }
  function parseTotalBarsInput() {
    const n = Number.parseInt(totalBarsSelect.value, 10);
    if (!Number.isInteger(n))
      return null;
    return n;
  }
  composerSelect.addEventListener("change", () => {
    const picked = composers.find((c) => c.slug === composerSelect.value);
    if (picked)
      seedInput.value = String(picked.defaultSeed);
  });
  progressionInput.addEventListener("input", syncLengthFieldVisibility);
  randomiseBtn.addEventListener("click", () => {
    seedInput.value = String(randomSeed());
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (generating)
      return;
    const composerSlug = composerSelect.value.trim();
    const seed = parseSeedInput();
    if (!composerSlug || seed === null) {
      setStatus("Enter a valid seed (1-999999999).", true);
      return;
    }
    const progressionRaw = progressionInput.value.trim();
    const request = { composerSlug, seed };
    if (progressionRaw.length > 0) {
      const totalBars = parseTotalBarsInput();
      if (totalBars === null) {
        setStatus("Choose a valid bar length.", true);
        return;
      }
      request.chordProgressionText = progressionRaw;
      request.totalBars = totalBars;
    }
    generating = true;
    setControlsEnabled(false);
    try {
      const response = await window.composerOsMusician.generate(request);
      if (!response.ok) {
        if (response.errorCode !== "BUSY") {
          const debug = typeof response.detail === "string" ? ` [${response.detail}]` : "";
          setStatus(`${response.message}${debug}`, true);
        }
        return;
      }
      setStatus(`Saved: ${response.filename}`);
    } catch (err) {
      setStatus("Something went wrong. Restart and try again.", true);
      console.error(err);
    } finally {
      generating = false;
      setControlsEnabled(true);
    }
  });
  window.composerOsMusician.onStatus((event) => {
    if (event.phase === "ready") {
      composers = event.composers ?? [];
      if (composers.length === 0) {
        setStatus(event.message ?? "Composer list unavailable", true);
        setControlsEnabled(false);
        return;
      }
      fillComposerOptions(composers);
      syncLengthFieldVisibility();
      setStatus(event.message ?? "Ready");
      setControlsEnabled(true);
      return;
    }
    if (event.message) {
      const isError = event.message.toLowerCase().includes("failed") || event.message.includes("unavailable");
      setStatus(event.message, isError);
    }
  });
  syncLengthFieldVisibility();
})();
