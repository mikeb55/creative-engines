/**
 * Wyble Etude Generator — Renderer Process
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const openFolderBtn = document.getElementById('openFolder');
const progressionSelect = document.getElementById('progression');
const practiceModeSelect = document.getElementById('practiceMode');

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating etudes...', false);

  const progression = progressionSelect.value;
  const practiceMode = practiceModeSelect ? practiceModeSelect.value : 'etude';

  try {
    const result = await window.wyble.generateEtudes(progression, practiceMode);
    setStatus(
      `Generation complete.\n` +
      `Studies generated: ${result.generated}\n` +
      `Studies exported (GCE ≥ 9): ${result.exported}\n` +
      `Output: outputs/wyble/desktop/`,
      false
    );
  } catch (err) {
    setStatus('Error: ' + (err.message || String(err)), false);
  } finally {
    generateBtn.disabled = false;
  }
});

openFolderBtn.addEventListener('click', async () => {
  try {
    await window.wyble.openOutputFolder();
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
