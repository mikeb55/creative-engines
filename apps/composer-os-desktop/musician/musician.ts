/** Musician shell renderer — plain DOM, no framework. */

interface MusicianComposerOption {
  slug: string;
  displayName: string;
  defaultSeed: number;
  frozen: boolean;
  scaffolded: boolean;
}

interface MusicianGenerateRequest {
  composerSlug: string;
  seed: number;
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
  seedInput.disabled = !enabled;
  randomiseBtn.disabled = !enabled;
  generateBtn.disabled = !enabled;
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

composerSelect.addEventListener('change', () => {
  const picked = composers.find((c) => c.slug === composerSelect.value);
  if (picked) seedInput.value = String(picked.defaultSeed);
});

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

  generating = true;
  setControlsEnabled(false);

  try {
    const response = await window.composerOsMusician.generate({ composerSlug, seed });
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
    setStatus(event.message ?? 'Ready');
    setControlsEnabled(true);
    return;
  }

  if (event.message) {
    const isError =
      event.message.toLowerCase().includes('failed') || event.message.includes('unavailable');
    setStatus(event.message, isError);
  }
});
