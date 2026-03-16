/**
 * Conductor Composer Desktop — Renderer Process
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const openFolderBtn = document.getElementById('openFolder');
const styleSelect = document.getElementById('style');
const templateSelect = document.getElementById('template');

let lastRunFolderPath = null;

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating composition...', false);

  const style = styleSelect.value;
  const template = templateSelect.value;

  try {
    const result = await window.conductor.generateComposition(style, template);
    if (result.success) {
      lastRunFolderPath = result.runFolderPath || null;
      setStatus(
        `Generation complete.\n` +
        `Style: ${result.style} | Progression: ${result.template}\n` +
        `Output: ${result.runFolderPath || 'outputs/'}`,
        false
      );
    } else {
      setStatus('Error: ' + (result.error || 'Unknown error'), false);
    }
  } catch (err) {
    setStatus('Error: ' + (err.message || String(err)), false);
  } finally {
    generateBtn.disabled = false;
  }
});

openFolderBtn.addEventListener('click', async () => {
  try {
    await window.conductor.openOutputFolder(lastRunFolderPath);
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
