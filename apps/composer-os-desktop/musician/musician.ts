/**
 * Musician shell renderer — plain DOM, no framework.
 */

import { buildBlocksGenerateRequest } from '../electron/buildBlocksGenerateRequest';
import {
  BARS_PER_MOSAIC_BLOCK,
  reindexMosaicSectionPlan,
} from '../electron/stitchMosaicBlocks';
import {
  DEFAULT_MOSAIC_COMPOSER_IDS,
  FEATURED_MOSAIC_COMPOSER_IDS,
  MOSAIC_COMPOSER_IDS,
} from './mosaicComposerIds';

interface MusicianComposerOption {
  slug: string;
  displayName: string;
  defaultSeed: number;
  frozen: boolean;
  scaffolded: boolean;
}

interface MusicianMosaicSectionPlanEntry {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  songwriterStyleId: string;
}

interface MusicianGenerateRequest {
  composerSlug: string;
  seed: number;
  chordProgressionText?: string;
  totalBars?: number;
  songwriterStyleId?: string;
  mosaicSectionPlan?: MusicianMosaicSectionPlanEntry[];
}

interface MusicianGenerateResponseSuccess {
  ok: true;
  outputPath: string;
  filename: string;
  composerSlug: string;
  seed: number;
}

interface MusicianGenerateResponseFailure {
  ok: false;
  errorCode: string;
  message: string;
  detail?: string;
}

type MusicianGenerateResponse = MusicianGenerateResponseSuccess | MusicianGenerateResponseFailure;

interface MusicianStatusEvent {
  phase: 'ready' | 'generating' | 'idle';
  composers?: MusicianComposerOption[];
  composerSlug?: string;
  seed?: number;
  message?: string;
}

interface ComposerOsMusicianBridge {
  generate(request: MusicianGenerateRequest): Promise<MusicianGenerateResponse>;
  onStatus(listener: (event: MusicianStatusEvent) => void): () => void;
}

declare global {
  interface Window {
    composerOsMusician: ComposerOsMusicianBridge;
  }
}

const composerSelect = document.getElementById('composer') as HTMLSelectElement;
const progressionInput = document.getElementById('progression') as HTMLTextAreaElement;
const totalBarsSelect = document.getElementById('total-bars') as HTMLSelectElement;
const lengthField = document.querySelector('.field-length') as HTMLLabelElement;
const seedInput = document.getElementById('seed') as HTMLInputElement;
const randomiseBtn = document.getElementById('randomise') as HTMLButtonElement;
const generateBtn = document.getElementById('generate') as HTMLButtonElement;
const form = document.getElementById('generate-form') as HTMLFormElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

let composers: MusicianComposerOption[] = [];
let generating = false;

function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function setControlsEnabled(enabled: boolean): void {
  composerSelect.disabled = !enabled;
  progressionInput.disabled = !enabled;
  totalBarsSelect.disabled = !enabled;
  seedInput.disabled = !enabled;
  randomiseBtn.disabled = !enabled;
  generateBtn.disabled = !enabled;
}

function hasPastedProgression(): boolean {
  return progressionInput.value.trim().length > 0;
}

function syncLengthFieldVisibility(): void {
  const show = hasPastedProgression();
  lengthField.hidden = !show;
  lengthField.classList.toggle('is-visible', show);
}

function defaultComposerSlug(list: MusicianComposerOption[]): string {
  const active = list.find((c) => !c.frozen);
  return (active ?? list[0])?.slug ?? '';
}

function fillComposerOptions(list: MusicianComposerOption[]): void {
  composerSelect.innerHTML = '';
  const reference = list.filter((c) => c.frozen);
  const active = list.filter((c) => !c.frozen);

  const addGroup = (label: string, items: MusicianComposerOption[]) => {
    if (items.length === 0) return;
    const group = document.createElement('optgroup');
    group.label = label;
    for (const c of items) {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = c.displayName;
      group.appendChild(opt);
    }
    composerSelect.appendChild(group);
  };

  addGroup('Composers', active);
  addGroup('Frozen composers', reference);

  const slug = defaultComposerSlug(list);
  if (slug) {
    composerSelect.value = slug;
    const picked = list.find((c) => c.slug === slug);
    if (picked) seedInput.value = String(picked.defaultSeed);
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
}

function parseSeedInput(): number | null {
  const n = Number.parseInt(seedInput.value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 999_999_999) return null;
  return n;
}

function parseTotalBarsInput(): number | null {
  const n = Number.parseInt(totalBarsSelect.value, 10);
  if (!Number.isInteger(n)) return null;
  return n;
}

composerSelect.addEventListener('change', () => {
  const picked = composers.find((c) => c.slug === composerSelect.value);
  if (picked) seedInput.value = String(picked.defaultSeed);
});

progressionInput.addEventListener('input', syncLengthFieldVisibility);

randomiseBtn.addEventListener('click', () => {
  seedInput.value = String(randomSeed());
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (generating) return;

  const composerSlug = composerSelect.value.trim();
  const seed = parseSeedInput();
  if (!composerSlug || seed === null) {
    setStatus('Enter a valid seed (1-999999999).', true);
    return;
  }

  const progressionRaw = progressionInput.value.trim();
  const request: MusicianGenerateRequest = { composerSlug, seed };
  if (progressionRaw.length > 0) {
    const totalBars = parseTotalBarsInput();
    if (totalBars === null) {
      setStatus('Choose a valid bar length.', true);
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
      if (response.errorCode !== 'BUSY') {
        const debug = typeof response.detail === 'string' ? ` [${response.detail}]` : '';
        setStatus(`${response.message}${debug}`, true);
      }
      return;
    }
    setStatus(`Saved: ${response.filename}`);
  } catch (err) {
    setStatus('Something went wrong. Restart and try again.', true);
    console.error(err);
  } finally {
    generating = false;
    setControlsEnabled(true);
  }
});

window.composerOsMusician.onStatus((event) => {
  if (event.phase === 'ready') {
    composers = event.composers ?? [];
    if (composers.length === 0) {
      setStatus(event.message ?? 'Composer list unavailable', true);
      setControlsEnabled(false);
      return;
    }
    fillComposerOptions(composers);
    syncLengthFieldVisibility();
    setStatus(event.message ?? 'Ready');
    setControlsEnabled(true);
    initBlocksTab();
    return;
  }

  if (event.message) {
    const isError =
      event.message.toLowerCase().includes('failed') || event.message.includes('unavailable');
    setStatus(event.message, isError);
  }
});

syncLengthFieldVisibility();

/* —— Tab 2: Arrange in Blocks —— */

const MAX_MOSAIC_BLOCKS = 8;

const tabQuick = document.getElementById('tab-quick') as HTMLButtonElement;
const tabBlocks = document.getElementById('tab-blocks') as HTMLButtonElement;
const panelQuick = document.getElementById('panel-quick') as HTMLDivElement;
const panelBlocks = document.getElementById('panel-blocks') as HTMLDivElement;
const subtitleEl = document.getElementById('subtitle') as HTMLParagraphElement;
const blocksAddBtn = document.getElementById('blocks-add-section') as HTMLButtonElement;
const blocksLengthHint = document.getElementById('blocks-length-hint') as HTMLSpanElement;
const blocksListEl = document.getElementById('blocks-list') as HTMLDivElement;
const blocksSeedInput = document.getElementById('blocks-seed') as HTMLInputElement;
const blocksRandomiseBtn = document.getElementById('blocks-randomise') as HTMLButtonElement;
const blocksGenerateBtn = document.getElementById('blocks-generate') as HTMLButtonElement;

interface BlockCardState {
  chords: string;
  composerId: string;
}

let mosaicComposerIds: string[] = [];
let mosaicListUsedDefaults = false;
let blockCards: BlockCardState[] = [];
let blocksTabReady = false;

function resolveMosaicComposerIds(): string[] {
  if (MOSAIC_COMPOSER_IDS.length > 0) return [...MOSAIC_COMPOSER_IDS];
  mosaicListUsedDefaults = true;
  return [...DEFAULT_MOSAIC_COMPOSER_IDS];
}

function formatComposerLabel(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function defaultBlockComposer(index: number): string {
  const featured = FEATURED_MOSAIC_COMPOSER_IDS[index % FEATURED_MOSAIC_COMPOSER_IDS.length]!;
  if (mosaicComposerIds.includes(featured)) return featured;
  return mosaicComposerIds[0] ?? 'verlaine';
}

function createDefaultBlock(index: number): BlockCardState {
  return { chords: '', composerId: defaultBlockComposer(index) };
}

function syncBlocksLengthHint(): void {
  const bars = blockCards.length * BARS_PER_MOSAIC_BLOCK;
  blocksLengthHint.textContent = `${bars} bars · ${blockCards.length} sections`;
  blocksAddBtn.disabled = blockCards.length >= MAX_MOSAIC_BLOCKS;
}

function setBlocksControlsEnabled(enabled: boolean): void {
  blocksAddBtn.disabled = !enabled || blockCards.length >= MAX_MOSAIC_BLOCKS;
  blocksSeedInput.disabled = !enabled;
  blocksRandomiseBtn.disabled = !enabled;
  blocksGenerateBtn.disabled = !enabled;
  for (const card of blocksListEl.querySelectorAll('textarea, button, select')) {
    (card as HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement).disabled = !enabled;
  }
}

function switchTab(tab: 'quick' | 'blocks'): void {
  const isQuick = tab === 'quick';
  tabQuick.classList.toggle('active', isQuick);
  tabBlocks.classList.toggle('active', !isQuick);
  tabQuick.setAttribute('aria-selected', isQuick ? 'true' : 'false');
  tabBlocks.setAttribute('aria-selected', isQuick ? 'false' : 'true');
  panelQuick.classList.toggle('hidden', !isQuick);
  panelBlocks.classList.toggle('hidden', isQuick);
  panelQuick.hidden = !isQuick;
  panelBlocks.hidden = isQuick;
  subtitleEl.textContent = isQuick
    ? 'Quick Generate — Song Mode or pasted chords'
    : 'Arrange in Blocks — 8-bar sections, one composer each';
}

function buildMoreComposerOptions(selectedId: string): HTMLOptionElement[] {
  const featuredSet = new Set<string>(FEATURED_MOSAIC_COMPOSER_IDS);
  const rest = mosaicComposerIds.filter((id) => !featuredSet.has(id));
  return rest.map((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = formatComposerLabel(id);
    if (id === selectedId) opt.selected = true;
    return opt;
  });
}

function renderBlockCards(): void {
  blocksListEl.innerHTML = '';
  const plan = reindexMosaicSectionPlan(
    blockCards.map((b) => ({ songwriterStyleId: b.composerId }))
  );

  blockCards.forEach((card, index) => {
    const section = plan[index]!;
    const article = document.createElement('article');
    article.className = 'block-card';

    const head = document.createElement('div');
    head.className = 'block-card-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'block-card-labels';
    const sectionLetter = document.createElement('span');
    sectionLetter.className = 'block-section-letter';
    sectionLetter.textContent = section.sectionLabel;
    const barCue = document.createElement('span');
    barCue.className = 'block-bar-cue';
    barCue.textContent = `bars ${section.startBar}–${section.endBar}`;
    titleWrap.append(sectionLetter, barCue);

    const ops = document.createElement('div');
    ops.className = 'block-card-ops';

    const dupBtn = document.createElement('button');
    dupBtn.type = 'button';
    dupBtn.className = 'btn-icon';
    dupBtn.title = 'Duplicate';
    dupBtn.textContent = '⧉';
    dupBtn.addEventListener('click', () => duplicateBlock(index));

    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'btn-icon';
    leftBtn.title = 'Move left';
    leftBtn.textContent = '←';
    leftBtn.disabled = index === 0;
    leftBtn.addEventListener('click', () => moveBlock(index, -1));

    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'btn-icon';
    rightBtn.title = 'Move right';
    rightBtn.textContent = '→';
    rightBtn.disabled = index === blockCards.length - 1;
    rightBtn.addEventListener('click', () => moveBlock(index, 1));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-icon danger';
    delBtn.title = 'Delete';
    delBtn.textContent = '×';
    delBtn.disabled = blockCards.length <= 2;
    delBtn.addEventListener('click', () => deleteBlock(index));

    ops.append(dupBtn, leftBtn, rightBtn, delBtn);
    head.append(titleWrap, ops);

    const composerChip = document.createElement('button');
    composerChip.type = 'button';
    composerChip.className = 'composer-chip composer-chip-prominent';
    composerChip.textContent = formatComposerLabel(card.composerId);
    composerChip.setAttribute('aria-pressed', 'true');

    const chordsArea = document.createElement('textarea');
    chordsArea.className = 'block-chords-input';
    chordsArea.rows = 4;
    chordsArea.spellcheck = false;
    chordsArea.placeholder = '8 chords — separate with | or newlines';
    chordsArea.value = card.chords;
    chordsArea.addEventListener('input', () => {
      card.chords = chordsArea.value;
    });

    const composerField = document.createElement('div');
    composerField.className = 'field block-composer-field';
    const composerLabel = document.createElement('span');
    composerLabel.className = 'label';
    composerLabel.textContent = 'Composer voice';
    composerField.appendChild(composerLabel);

    const chipRow = document.createElement('div');
    chipRow.className = 'composer-chips';
    for (const id of FEATURED_MOSAIC_COMPOSER_IDS) {
      if (!mosaicComposerIds.includes(id)) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'composer-chip';
      chip.textContent = formatComposerLabel(id);
      chip.dataset.composerId = id;
      chip.setAttribute('aria-pressed', card.composerId === id ? 'true' : 'false');
      chip.classList.toggle('selected', card.composerId === id);
      chip.addEventListener('click', () => {
        card.composerId = id;
        renderBlockCards();
      });
      chipRow.appendChild(chip);
    }
    composerField.appendChild(chipRow);

    const moreRow = document.createElement('div');
    moreRow.className = 'composer-more';
    const moreSelect = document.createElement('select');
    moreSelect.className = 'composer-more-select';
    const featuredIds = FEATURED_MOSAIC_COMPOSER_IDS as readonly string[];
    const onFeatured = featuredIds.includes(card.composerId);
    moreSelect.appendChild(new Option('More…', '', true, !onFeatured));
    for (const opt of buildMoreComposerOptions(card.composerId)) {
      moreSelect.appendChild(opt);
    }
    if (card.composerId && !onFeatured) {
      moreSelect.value = card.composerId;
    }
    moreSelect.addEventListener('change', () => {
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

function duplicateBlock(index: number): void {
  if (blockCards.length >= MAX_MOSAIC_BLOCKS) return;
  const source = blockCards[index];
  if (!source) return;
  blockCards.splice(index + 1, 0, {
    chords: source.chords,
    composerId: source.composerId,
  });
  renderBlockCards();
}

function moveBlock(index: number, delta: -1 | 1): void {
  const target = index + delta;
  if (target < 0 || target >= blockCards.length) return;
  const tmp = blockCards[index]!;
  blockCards[index] = blockCards[target]!;
  blockCards[target] = tmp;
  renderBlockCards();
}

function deleteBlock(index: number): void {
  if (blockCards.length <= 2) return;
  blockCards.splice(index, 1);
  renderBlockCards();
}

function addBlockSection(): void {
  if (blockCards.length >= MAX_MOSAIC_BLOCKS) return;
  blockCards.push(createDefaultBlock(blockCards.length));
  renderBlockCards();
}

function parseBlocksSeedInput(): number | null {
  const n = Number.parseInt(blocksSeedInput.value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 999_999_999) return null;
  return n;
}

function initBlocksTab(): void {
  if (blocksTabReady) return;
  blocksTabReady = true;

  mosaicComposerIds = resolveMosaicComposerIds();
  if (mosaicListUsedDefaults) {
    setStatus('Mosaic composer list unavailable — using defaults', true);
  }

  blockCards = [createDefaultBlock(0), createDefaultBlock(1)];
  blocksSeedInput.value = String(randomSeed());
  renderBlockCards();

  tabQuick.addEventListener('click', () => switchTab('quick'));
  tabBlocks.addEventListener('click', () => switchTab('blocks'));

  blocksAddBtn.addEventListener('click', () => addBlockSection());

  blocksRandomiseBtn.addEventListener('click', () => {
    blocksSeedInput.value = String(randomSeed());
  });

  blocksGenerateBtn.addEventListener('click', async () => {
    if (generating) return;
    const seed = parseBlocksSeedInput();
    if (seed === null) {
      setStatus('Enter a valid seed (1-999999999).', true);
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
        if (response.errorCode !== 'BUSY') {
          const debug = typeof response.detail === 'string' ? ` [${response.detail}]` : '';
          setStatus(`${response.message}${debug}`, true);
        }
        return;
      }
      setStatus(`Saved: ${response.filename}`);
    } catch (err) {
      setStatus('Something went wrong. Restart and try again.', true);
      console.error(err);
    } finally {
      generating = false;
      setControlsEnabled(true);
      setBlocksControlsEnabled(true);
    }
  });
}
