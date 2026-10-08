// contextBridge already binds `practice` in the page. A second `const practice` prevents this script from loading.
const practiceApi = window.practice;
const modes = ['PRACTICE', 'ANALYSE', 'AUTO COLOR', 'MOTIF', 'PHRASE', 'COMPARE', 'EXPORT'];
const categories = [
  ['HOME_CONTINUITY', 'HOME / CONTINUITY'],
  ['HOLD_FIELD', 'HOLD_FIELD'],
  ['RESEAT', 'RESEAT'],
  ['CELL_LINEAGE', 'CELL_LINEAGE'],
  ['OUTSIDE_RETURN', 'OUTSIDE / RETURN'],
  ['TRITONE_PAIR', 'TRITONE_PAIR'],
  ['QUARTAL_COMP', 'QUARTAL_COMP'],
  ['QUARTAL_LINE', 'QUARTAL_LINE'],
  ['ANSWER_BASS', 'ANSWER_BASS'],
  ['SUPPORT_BASS', 'SUPPORT_BASS'],
  ['STRUCTURAL_SILENCE', 'STRUCTURAL_SILENCE'],
  ['NO_PHRASE', 'NO_PHRASE'],
  ['NONE', 'NONE'],
];

const state = {
  mode: 'PRACTICE',
  category: 'HOME_CONTINUITY',
  variation: 0,
  example: null,
  history: [],
  cursor: -1,
  favourites: [],
  lastExport: '',
  intentions: [],
  intention: 'MORE_CONTINUITY',
};

const $ = (id) => document.getElementById(id);

function request() {
  return {
    category: state.category,
    difficulty: $('difficulty').value,
    centre: $('centre').value,
    chord: $('chord').value,
    targetNotes: $('targets').value,
    bassNotes: $('bass').value,
    heldNotes: $('held').value,
    landingNote: $('landing').value,
    motif: $('motif').value,
    fieldId: $('field').value,
    customNotes: $('custom').value,
    guitarRole: $('role').value,
    variation: state.variation,
    intentions: [state.intention],
  };
}

function showExample(example) {
  state.example = example;
  $('headline').textContent = example.silenceKind === 'SOUNDING' ? example.fieldName : example.silenceKind.replaceAll('_', ' ');
  $('notes').textContent = example.notes;
  $('reason').textContent = example.reason;
  $('facts').innerHTML = [
    ['Field', `${example.fieldName}${example.practiceView ? ' · PRACTICE VIEW' : ''} · ${example.fieldNotes}`],
    ['Operator', example.operator],
    ['Lineage', example.lineage],
    ['Return', example.returnQuality],
    ['Form', example.formFit],
    ['Duo', example.duoFit],
    ['GCE', example.gceAdvisory],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function remember(example) {
  state.history.push({
    id: `ex-${state.history.length + 1}`,
    example,
    exported: false,
    favourite: false,
  });
  state.cursor = state.history.length - 1;
}

function renderModes() {
  $('modes').innerHTML = modes.map((mode) => `<button type="button" data-mode="${mode}" class="${mode === state.mode ? 'active' : ''}">${mode}</button>`).join('');
  $('mode-label').textContent = state.mode;
}

function renderCategories() {
  $('categories').innerHTML = categories.map(([id, label]) => `<button type="button" class="chip ${id === state.category ? 'active' : ''}" data-category="${id}">${label}</button>`).join('');
}

async function loadFields() {
  const rows = await practiceApi.fields($('centre').value || 'C');
  const options = rows.map((row) => `<option value="${row.id}">${row.name}</option>`).join('');
  const target = $('target-field').value;
  $('field').innerHTML = options;
  $('field').value = 'minor_pentatonic';
  $('target-field').innerHTML = `<option value="">Choose a target</option>${options}`;
  if (target && [...$('target-field').options].some((option) => option.value === target)) $('target-field').value = target;
}

async function generate() {
  state.mode = 'PRACTICE';
  renderModes();
  const example = await practiceApi.generate(request());
  showExample(example);
  remember(example);
}

function reset() {
  state.mode = 'PRACTICE';
  state.category = 'HOME_CONTINUITY';
  state.variation = 0;
  state.example = null;
  state.intention = 'MORE_CONTINUITY';
  $('centre').value = 'C';
  $('chord').value = '';
  $('targets').value = '';
  $('bass').value = '';
  $('held').value = '';
  $('landing').value = '';
  $('motif').value = '';
  $('custom').value = '';
  $('role').value = '';
  $('difficulty').value = 'SPARSE';
  $('field').value = 'minor_pentatonic';
  $('target-centre').value = '';
  $('target-field').value = '';
  $('headline').textContent = 'Ready';
  $('notes').textContent = 'Centre C. Sparse continuity. No score, motif, or bass.';
  $('facts').innerHTML = '';
  $('reason').textContent = '';
  $('auto-distance').textContent = '';
  $('extra').innerHTML = '';
  clearAnalysis();
  renderModes();
  renderCategories();
  refreshPivot();
  refreshDuo();
}

function clearAnalysis() {
  $('distance-readout').textContent = 'Choose a target field.';
  $('distance-detail').textContent = '';
  $('outness-readout').textContent = '';
  $('pivot-readout').textContent = '';
  $('extract-readout').textContent = '';
  $('duo-readout').textContent = '';
  $('duo-detail').textContent = '';
}

function distancePayload() {
  return {
    centre: $('centre').value,
    fieldId: $('field').value,
    targetCentre: $('target-centre').value,
    targetFieldId: $('target-field').value,
    motif: $('motif').value,
  };
}

function showCard(readoutId, detailId, view) {
  $(readoutId).textContent = view.text;
  if (detailId) $(detailId).textContent = view.detail || '';
}

async function measureDistance() {
  const view = await practiceApi.fieldDistance(distancePayload());
  showCard('distance-readout', 'distance-detail', view);
  return view;
}

function onOutnessChange() {
  const band = $('outness').value;
  $('outness-hint').textContent = `${band} candidates. Check measures the band. It does not write a phrase.`;
}

function refreshPivot() {
  const ready = Boolean($('target-field').value);
  $('pivot').disabled = !ready;
  $('pivot-hint').textContent = ready ? '' : 'Choose a target field first';
  if (!ready) $('pivot-readout').textContent = '';
}

function duoContext() {
  return Boolean($('bass').value.trim() || $('role').value || state.category === 'ANSWER_BASS' || state.category === 'SUPPORT_BASS');
}

function refreshDuo() {
  $('duo-block').hidden = !duoContext();
}

async function showAutoDistance() {
  const view = await practiceApi.fieldDistance(distancePayload());
  if (view.ready && view.text.includes('DISTANCE:\n') && !view.text.includes('DISTANCE:\nIDENTICAL')) {
    const line = view.text.split('DISTANCE:\n')[1].split('\n')[0];
    $('auto-distance').textContent = `FIELD DISTANCE TO ALTERNATIVE:\n${line}`;
    return;
  }
  $('auto-distance').textContent = '';
}

document.body.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.mode) {
    state.mode = target.dataset.mode;
    renderModes();
    if (state.mode === 'AUTO COLOR') await showIntentions();
    if (state.mode === 'EXPORT') $('extra').textContent = state.lastExport || 'Export writes MusicXML for MuseScore 4.';
    return;
  }
  if (target.dataset.category) {
    state.category = target.dataset.category;
    state.variation = 0;
    renderCategories();
    refreshDuo();
    return;
  }
  if (target.dataset.intention) {
    state.intention = target.dataset.intention;
    await showIntentions();
    return;
  }
  const id = target.id;
  if (id === 'generate') await generate();
  if (id === 'next') {
    state.variation += 1;
    const example = await practiceApi.next({ ...request(), variation: state.variation - 1 });
    state.variation = example.variation;
    showExample(example);
    remember(example);
  }
  if (id === 'analyse') {
    state.mode = 'ANALYSE';
    renderModes();
    const result = await practiceApi.analyse(request());
    $('headline').textContent = 'Analysis';
    $('notes').textContent = result.recommendation || result.song || 'Score map';
    $('extra').textContent = result.map || result.colour || '';
  }
  if (id === 'auto') {
    state.mode = 'AUTO COLOR';
    renderModes();
    const plan = await practiceApi.autoColor(request());
    $('headline').textContent = `AUTO COLOR: ${String(plan.outcome).replaceAll('_', ' ')}`;
    $('notes').textContent = `${plan.operator} · ${plan.silence}`;
    $('reason').textContent = plan.rationale;
    await showAutoDistance();
    await showIntentions();
  }
  if (id === 'compare') {
    if (!state.example) await generate();
    state.mode = 'COMPARE';
    renderModes();
    const compared = await practiceApi.compare(state.example);
    $('extra').innerHTML = compared.candidates.map((row) => `<div class="card"><strong>${row.slot}</strong> ${row.operator}<br>${row.notes}<br>${row.lineage}<br>${row.gceAdvisory}</div>`).join('') || 'No candidates.';
    $('headline').textContent = 'Compare';
    $('notes').textContent = 'Plan, one alternative, silence. GCE stays advisory.';
  }
  if (id === 'export') {
    if (!state.example) await generate();
    state.lastExport = await practiceApi.exportXml(state.example);
    if (state.history[state.cursor]) state.history[state.cursor].exported = true;
    state.mode = 'EXPORT';
    renderModes();
    $('extra').textContent = state.lastExport;
  }
  if (id === 'open-mscore' && state.lastExport) await practiceApi.openMuseScore(state.lastExport);
  if (id === 'reveal' && state.lastExport) await practiceApi.reveal(state.lastExport);
  if (id === 'open-score') {
    try {
      const score = await practiceApi.analyseScore();
      if (!score) return;
      if (score.ok === false) {
        $('reason').textContent = score.error || 'Could not open MusicXML.';
        return;
      }
      $('score-path').textContent = `${score.fileName} · ${score.path} · read-only`;
      $('headline').textContent = score.song || 'Score';
      $('extra').textContent = score.map;
      $('reason').textContent = '';
    } catch (error) {
      $('reason').textContent = error && error.message ? error.message : 'Could not open MusicXML.';
    }
  }
  if (id === 'show-fields') {
    const rows = await practiceApi.fields($('centre').value || 'C');
    $('side-list').innerHTML = rows.map((row) => `<div class="card"><strong>${row.name}</strong><br>${row.notes}<br>${row.brightness} bright · ${row.darkness} dark · ${row.tension} tension<br>${row.relationship}</div>`).join('');
  }
  if (id === 'show-wheel') {
    const rows = await practiceApi.wheel($('centre').value || 'C');
    $('side-list').innerHTML = rows.map((row) => `<div class="card"><strong>${row.label}</strong> ${row.practiceView ? 'PRACTICE VIEW' : row.mappedResourceName}<br>${row.notes}<br>${row.mappedResourceName || 'No registry match'} ${row.mappedReference || ''}</div>`).join('');
  }
  if (id === 'back' && state.cursor > 0) {
    state.cursor -= 1;
    showExample(state.history[state.cursor].example);
  }
  if (id === 'favourite' && state.history[state.cursor]) {
    state.history[state.cursor].favourite = !state.history[state.cursor].favourite;
    state.favourites = state.history.filter((row) => row.favourite);
    $('reason').textContent = state.history[state.cursor].favourite ? 'Saved in this session.' : 'Removed from favourites.';
  }
  if (id === 'sheet') {
    const chosen = state.favourites.length >= 2 ? state.favourites.map((row) => row.example) : state.history.slice(-4).map((row) => row.example);
    if (chosen.length < 2) {
      $('reason').textContent = 'Generate at least two examples, or favourite two.';
      return;
    }
    state.lastExport = await practiceApi.exportSheet(chosen.slice(0, 8));
    $('extra').textContent = state.lastExport;
  }
  if (id === 'measure') await measureDistance();
  if (id === 'check-outness') {
    const view = await practiceApi.outness(request(), $('outness').value);
    showCard('outness-readout', null, view);
  }
  if (id === 'pivot') {
    const view = await practiceApi.pivotCheck(distancePayload());
    showCard('pivot-readout', null, view);
  }
  if (id === 'extract') {
    const view = await practiceApi.deriveCheck(request());
    showCard('extract-readout', null, view);
  }
  if (id === 'layered') {
    const view = await practiceApi.duoCheck(request());
    showCard('duo-readout', 'duo-detail', view);
  }
  if (id === 'reset') reset();
});

$('outness').addEventListener('change', onOutnessChange);

$('target-field').addEventListener('change', async () => {
  refreshPivot();
  if ($('target-field').value) await measureDistance();
});

$('target-centre').addEventListener('change', async () => {
  if ($('target-field').value) await measureDistance();
});

$('field').addEventListener('change', async () => {
  if ($('target-field').value) await measureDistance();
});

$('bass').addEventListener('input', refreshDuo);
$('role').addEventListener('change', refreshDuo);

$('custom').addEventListener('change', async () => {
  if (!$('custom').value.trim()) return;
  const inspected = await practiceApi.custom($('custom').value, $('centre').value || 'C');
  $('reason').textContent = inspected.ok ? `${inspected.label}: ${inspected.notes}` : inspected.error;
});

async function showIntentions() {
  if (state.intentions.length === 0) state.intentions = await practiceApi.intentions();
  $('extra').innerHTML = state.intentions.map(([id, label]) => `<button type="button" data-intention="${id}" class="${id === state.intention ? 'active' : ''}">${label}</button>`).join(' ');
}

renderModes();
renderCategories();
loadFields().then(reset);
