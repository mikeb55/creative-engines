"use strict";
(() => {
  // electron/stitchMosaicBlocks.ts
  var BARS_PER_MOSAIC_BLOCK = 8;
  function normalizeProgressionSeparators(input) {
    return input.replace(/\r\n/g, "\n").replace(/[,;]/g, "|").replace(/\n+/g, "|").trim();
  }
  function parseBlockChords(rawText) {
    const trimmed = normalizeProgressionSeparators(rawText);
    if (!trimmed)
      return [];
    const bars = [];
    for (const cell of trimmed.split("|")) {
      const token = cell.trim().split(/\s+/).filter(Boolean)[0]?.trim();
      if (!token)
        continue;
      bars.push(token);
    }
    return bars;
  }
  function sectionLabelForIndex(index) {
    return String.fromCharCode(65 + index);
  }
  function reindexMosaicSectionPlan(blocks) {
    return blocks.map((block, i) => ({
      sectionLabel: sectionLabelForIndex(i),
      startBar: i * BARS_PER_MOSAIC_BLOCK + 1,
      endBar: i * BARS_PER_MOSAIC_BLOCK + BARS_PER_MOSAIC_BLOCK,
      songwriterStyleId: block.songwriterStyleId
    }));
  }
  function stitchMosaicBlocks(blocks) {
    if (blocks.length < 2) {
      return { ok: false, error: "Add at least two 8-bar sections." };
    }
    const allChords = [];
    const plan = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const composer = block.songwriterStyleId.trim();
      if (!composer) {
        return { ok: false, error: `Section ${sectionLabelForIndex(i)}: pick a composer.` };
      }
      const chords = parseBlockChords(block.chordsText);
      if (chords.length !== BARS_PER_MOSAIC_BLOCK) {
        return {
          ok: false,
          error: `Section ${sectionLabelForIndex(i)} needs exactly ${BARS_PER_MOSAIC_BLOCK} chords (found ${chords.length}).`
        };
      }
      allChords.push(...chords);
      plan.push({
        sectionLabel: sectionLabelForIndex(i),
        startBar: i * BARS_PER_MOSAIC_BLOCK + 1,
        endBar: i * BARS_PER_MOSAIC_BLOCK + BARS_PER_MOSAIC_BLOCK,
        songwriterStyleId: composer
      });
    }
    return {
      ok: true,
      result: {
        chordProgressionText: allChords.join(" | "),
        mosaicSectionPlan: plan,
        totalBars: allChords.length
      }
    };
  }

  // electron/buildBlocksGenerateRequest.ts
  function buildBlocksGenerateRequest(cards, seed) {
    const stitched = stitchMosaicBlocks(
      cards.map((b) => ({
        chordsText: b.chords,
        songwriterStyleId: b.composerId
      }))
    );
    if (!stitched.ok) {
      return { ok: false, error: stitched.error };
    }
    const { chordProgressionText, mosaicSectionPlan, totalBars } = stitched.result;
    const composerSlug = mosaicSectionPlan[0].songwriterStyleId;
    return {
      ok: true,
      request: {
        composerSlug,
        seed,
        chordProgressionText,
        totalBars,
        mosaicSectionPlan
      }
    };
  }

  // musician/mosaicComposerIds.ts
  var FEATURED_MOSAIC_COMPOSER_IDS = ["verlaine", "marr", "fripp"];
  var DEFAULT_MOSAIC_COMPOSER_IDS = [...FEATURED_MOSAIC_COMPOSER_IDS];
  var MORE_MOSAIC_COMPOSER_IDS = [
    "allan_holdsworth",
    "andrew_hill",
    "angelo_badalamenti",
    "antonio_carlos_jobim",
    "arvo_part",
    "bacharach",
    "barry_harris",
    "bartok",
    "beatles",
    "beefheart",
    "berg",
    "bernard_herrmann",
    "bill_evans",
    "bill_holman",
    "billy_strayhorn",
    "bob_brookmeyer",
    "brian_wilson",
    "carla_bley",
    "charles_mingus",
    "charlie_parker",
    "clare_fischer",
    "claus_ogerman",
    "cole_porter",
    "count_basie",
    "debussy",
    "don_sebesky",
    "donald_fagen",
    "duke_ellington",
    "eberhard_weber",
    "ecm_chamber",
    "ennio_morricone",
    "fela_kuti",
    "frank_zappa",
    "fripp_king_crimson",
    "gershwin",
    "gil_evans",
    "hans_zimmer",
    "henry_threadgill",
    "herbie_hancock",
    "jack_white",
    "james_brown",
    "jan_garbarek",
    "jerry_goldsmith",
    "jim_hall",
    "john_barry",
    "john_coltrane",
    "john_surman",
    "john_williams",
    "johnny_mandel",
    "joni_mitchell",
    "kate_bush",
    "kenny_wheeler",
    "lalo_schifrin",
    "maria_schneider",
    "mccoy_tyner",
    "messiaen",
    "miles_davis",
    "nino_rota",
    "oliver_nelson",
    "pat_metheny",
    "philip_glass",
    "prince",
    "quincy_jones",
    "radiohead",
    "ralph_towner",
    "sammy_nestico",
    "satie",
    "sonic_youth",
    "stephen_sondheim",
    "steve_reich",
    "stevie_wonder",
    "thad_jones",
    "thelonious_monk",
    "wayne_shorter"
  ];
  var MOSAIC_COMPOSER_IDS = [
    ...FEATURED_MOSAIC_COMPOSER_IDS,
    ...MORE_MOSAIC_COMPOSER_IDS
  ];

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
      initBlocksTab();
      return;
    }
    if (event.message) {
      const isError = event.message.toLowerCase().includes("failed") || event.message.includes("unavailable");
      setStatus(event.message, isError);
    }
  });
  syncLengthFieldVisibility();
  var MAX_MOSAIC_BLOCKS = 8;
  var tabQuick = document.getElementById("tab-quick");
  var tabBlocks = document.getElementById("tab-blocks");
  var panelQuick = document.getElementById("panel-quick");
  var panelBlocks = document.getElementById("panel-blocks");
  var subtitleEl = document.getElementById("subtitle");
  var blocksAddBtn = document.getElementById("blocks-add-section");
  var blocksLengthHint = document.getElementById("blocks-length-hint");
  var blocksListEl = document.getElementById("blocks-list");
  var blocksSeedInput = document.getElementById("blocks-seed");
  var blocksRandomiseBtn = document.getElementById("blocks-randomise");
  var blocksGenerateBtn = document.getElementById("blocks-generate");
  var mosaicComposerIds = [];
  var mosaicListUsedDefaults = false;
  var blockCards = [];
  var blocksTabReady = false;
  function resolveMosaicComposerIds() {
    if (MOSAIC_COMPOSER_IDS.length > 0)
      return [...MOSAIC_COMPOSER_IDS];
    mosaicListUsedDefaults = true;
    return [...DEFAULT_MOSAIC_COMPOSER_IDS];
  }
  function formatComposerLabel(id) {
    return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }
  function defaultBlockComposer(index) {
    const featured = FEATURED_MOSAIC_COMPOSER_IDS[index % FEATURED_MOSAIC_COMPOSER_IDS.length];
    if (mosaicComposerIds.includes(featured))
      return featured;
    return mosaicComposerIds[0] ?? "verlaine";
  }
  function createDefaultBlock(index) {
    return { chords: "", composerId: defaultBlockComposer(index) };
  }
  function syncBlocksLengthHint() {
    const bars = blockCards.length * BARS_PER_MOSAIC_BLOCK;
    blocksLengthHint.textContent = `${bars} bars \xB7 ${blockCards.length} sections`;
    blocksAddBtn.disabled = blockCards.length >= MAX_MOSAIC_BLOCKS;
  }
  function setBlocksControlsEnabled(enabled) {
    blocksAddBtn.disabled = !enabled || blockCards.length >= MAX_MOSAIC_BLOCKS;
    blocksSeedInput.disabled = !enabled;
    blocksRandomiseBtn.disabled = !enabled;
    blocksGenerateBtn.disabled = !enabled;
    for (const card of blocksListEl.querySelectorAll("textarea, button, select")) {
      card.disabled = !enabled;
    }
  }
  function switchTab(tab) {
    const isQuick = tab === "quick";
    tabQuick.classList.toggle("active", isQuick);
    tabBlocks.classList.toggle("active", !isQuick);
    tabQuick.setAttribute("aria-selected", isQuick ? "true" : "false");
    tabBlocks.setAttribute("aria-selected", isQuick ? "false" : "true");
    panelQuick.classList.toggle("hidden", !isQuick);
    panelBlocks.classList.toggle("hidden", isQuick);
    panelQuick.hidden = !isQuick;
    panelBlocks.hidden = isQuick;
    subtitleEl.textContent = isQuick ? "Quick Generate \u2014 Song Mode or pasted chords" : "Arrange in Blocks \u2014 8-bar sections, one composer each";
  }
  function buildMoreComposerOptions(selectedId) {
    const featuredSet = new Set(FEATURED_MOSAIC_COMPOSER_IDS);
    const rest = mosaicComposerIds.filter((id) => !featuredSet.has(id));
    return rest.map((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = formatComposerLabel(id);
      if (id === selectedId)
        opt.selected = true;
      return opt;
    });
  }
  function renderBlockCards() {
    blocksListEl.innerHTML = "";
    const plan = reindexMosaicSectionPlan(
      blockCards.map((b) => ({ songwriterStyleId: b.composerId }))
    );
    blockCards.forEach((card, index) => {
      const section = plan[index];
      const article = document.createElement("article");
      article.className = "block-card";
      const head = document.createElement("div");
      head.className = "block-card-head";
      const titleWrap = document.createElement("div");
      titleWrap.className = "block-card-labels";
      const sectionLetter = document.createElement("span");
      sectionLetter.className = "block-section-letter";
      sectionLetter.textContent = section.sectionLabel;
      const barCue = document.createElement("span");
      barCue.className = "block-bar-cue";
      barCue.textContent = `bars ${section.startBar}\u2013${section.endBar}`;
      titleWrap.append(sectionLetter, barCue);
      const ops = document.createElement("div");
      ops.className = "block-card-ops";
      const dupBtn = document.createElement("button");
      dupBtn.type = "button";
      dupBtn.className = "btn-icon";
      dupBtn.title = "Duplicate";
      dupBtn.textContent = "\u29C9";
      dupBtn.addEventListener("click", () => duplicateBlock(index));
      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "btn-icon";
      leftBtn.title = "Move left";
      leftBtn.textContent = "\u2190";
      leftBtn.disabled = index === 0;
      leftBtn.addEventListener("click", () => moveBlock(index, -1));
      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "btn-icon";
      rightBtn.title = "Move right";
      rightBtn.textContent = "\u2192";
      rightBtn.disabled = index === blockCards.length - 1;
      rightBtn.addEventListener("click", () => moveBlock(index, 1));
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-icon danger";
      delBtn.title = "Delete";
      delBtn.textContent = "\xD7";
      delBtn.disabled = blockCards.length <= 2;
      delBtn.addEventListener("click", () => deleteBlock(index));
      ops.append(dupBtn, leftBtn, rightBtn, delBtn);
      head.append(titleWrap, ops);
      const composerChip = document.createElement("button");
      composerChip.type = "button";
      composerChip.className = "composer-chip composer-chip-prominent";
      composerChip.textContent = formatComposerLabel(card.composerId);
      composerChip.setAttribute("aria-pressed", "true");
      const chordsArea = document.createElement("textarea");
      chordsArea.className = "block-chords-input";
      chordsArea.rows = 4;
      chordsArea.spellcheck = false;
      chordsArea.placeholder = "8 chords \u2014 separate with | or newlines";
      chordsArea.value = card.chords;
      chordsArea.addEventListener("input", () => {
        card.chords = chordsArea.value;
      });
      const composerField = document.createElement("div");
      composerField.className = "field block-composer-field";
      const composerLabel = document.createElement("span");
      composerLabel.className = "label";
      composerLabel.textContent = "Composer voice";
      composerField.appendChild(composerLabel);
      const chipRow = document.createElement("div");
      chipRow.className = "composer-chips";
      for (const id of FEATURED_MOSAIC_COMPOSER_IDS) {
        if (!mosaicComposerIds.includes(id))
          continue;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "composer-chip";
        chip.textContent = formatComposerLabel(id);
        chip.dataset.composerId = id;
        chip.setAttribute("aria-pressed", card.composerId === id ? "true" : "false");
        chip.classList.toggle("selected", card.composerId === id);
        chip.addEventListener("click", () => {
          card.composerId = id;
          renderBlockCards();
        });
        chipRow.appendChild(chip);
      }
      composerField.appendChild(chipRow);
      const moreRow = document.createElement("div");
      moreRow.className = "composer-more";
      const moreSelect = document.createElement("select");
      moreSelect.className = "composer-more-select";
      const featuredIds = FEATURED_MOSAIC_COMPOSER_IDS;
      const onFeatured = featuredIds.includes(card.composerId);
      moreSelect.appendChild(new Option("More\u2026", "", true, !onFeatured));
      for (const opt of buildMoreComposerOptions(card.composerId)) {
        moreSelect.appendChild(opt);
      }
      if (card.composerId && !onFeatured) {
        moreSelect.value = card.composerId;
      }
      moreSelect.addEventListener("change", () => {
        if (moreSelect.value) {
          card.composerId = moreSelect.value;
          renderBlockCards();
        }
      });
      moreRow.appendChild(moreSelect);
      composerField.appendChild(moreRow);
      article.append(head, composerChip, chordsArea, composerField);
      blocksListEl.appendChild(article);
    });
    syncBlocksLengthHint();
  }
  function duplicateBlock(index) {
    if (blockCards.length >= MAX_MOSAIC_BLOCKS)
      return;
    const source = blockCards[index];
    if (!source)
      return;
    blockCards.splice(index + 1, 0, {
      chords: source.chords,
      composerId: source.composerId
    });
    renderBlockCards();
  }
  function moveBlock(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= blockCards.length)
      return;
    const tmp = blockCards[index];
    blockCards[index] = blockCards[target];
    blockCards[target] = tmp;
    renderBlockCards();
  }
  function deleteBlock(index) {
    if (blockCards.length <= 2)
      return;
    blockCards.splice(index, 1);
    renderBlockCards();
  }
  function addBlockSection() {
    if (blockCards.length >= MAX_MOSAIC_BLOCKS)
      return;
    blockCards.push(createDefaultBlock(blockCards.length));
    renderBlockCards();
  }
  function parseBlocksSeedInput() {
    const n = Number.parseInt(blocksSeedInput.value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 999999999)
      return null;
    return n;
  }
  function initBlocksTab() {
    if (blocksTabReady)
      return;
    blocksTabReady = true;
    mosaicComposerIds = resolveMosaicComposerIds();
    if (mosaicListUsedDefaults) {
      setStatus("Mosaic composer list unavailable \u2014 using defaults", true);
    }
    blockCards = [createDefaultBlock(0), createDefaultBlock(1)];
    blocksSeedInput.value = String(randomSeed());
    renderBlockCards();
    tabQuick.addEventListener("click", () => switchTab("quick"));
    tabBlocks.addEventListener("click", () => switchTab("blocks"));
    blocksAddBtn.addEventListener("click", () => addBlockSection());
    blocksRandomiseBtn.addEventListener("click", () => {
      blocksSeedInput.value = String(randomSeed());
    });
    blocksGenerateBtn.addEventListener("click", async () => {
      if (generating)
        return;
      const seed = parseBlocksSeedInput();
      if (seed === null) {
        setStatus("Enter a valid seed (1-999999999).", true);
        return;
      }
      const built = buildBlocksGenerateRequest(blockCards, seed);
      if (!built.ok) {
        setStatus(built.error, true);
        return;
      }
      generating = true;
      setControlsEnabled(false);
      setBlocksControlsEnabled(false);
      try {
        const response = await window.composerOsMusician.generate(built.request);
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
        setBlocksControlsEnabled(true);
      }
    });
  }
})();
