/**
 * Contemporary Counterpoint Generator — Renderer Process
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const openFolderBtn = document.getElementById('openFolder');
const progressionSelect = document.getElementById('progression');
const voiceCountSelect = document.getElementById('voiceCount');
const densitySelect = document.getElementById('density');

let lastRunFolderPath = null;

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating counterpoint...', false);

  const progression = progressionSelect.value;
  const voiceCount = parseInt(voiceCountSelect.value, 10) || 2;
  const density = parseFloat(densitySelect.value) || 0.5;

  try {
    const result = await window.counterpoint.generate(progression, voiceCount, density);
    if (result.error) {
      setStatus('Error: ' + result.error, false);
    } else {
      lastRunFolderPath = result.runFolderPath || null;
      setStatus(
        `Generation complete.\n` +
        `Progression: ${result.progressionName || progression} | Voices: ${result.lineCount || voiceCount}\n` +
        `Output: ${result.runFolderPath || 'apps/contemporary-counterpoint-desktop/outputs/counterpoint/'}\n` +
        `Files: counterpoint_plan.json, counterpoint_summary.md, counterpoint_sketch.musicxml`,
        false
      );
    }
  } catch (err) {
    setStatus('Error: ' + (err.message || String(err)), false);
  } finally {
    generateBtn.disabled = false;
  }
});

openFolderBtn.addEventListener('click', async () => {
  try {
    await window.counterpoint.openOutputFolder(lastRunFolderPath);
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
