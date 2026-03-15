/**
 * Ellington Orchestration Generator — Renderer
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const openFolderBtn = document.getElementById('openFolder');
const progressionSelect = document.getElementById('progression');
const inputModeSelect = document.getElementById('inputMode');
const presetRow = document.getElementById('presetRow');
const musicxmlRow = document.getElementById('musicxmlRow');
const pickMusicXmlBtn = document.getElementById('pickMusicXml');
const musicxmlFileName = document.getElementById('musicxmlFileName');

let selectedMusicXmlPath = null;
let lastRunFolderPath = null;

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

inputModeSelect.addEventListener('change', () => {
  const usePreset = inputModeSelect.value === 'preset';
  presetRow.style.display = usePreset ? 'flex' : 'none';
  musicxmlRow.style.display = usePreset ? 'none' : 'flex';
  if (usePreset) selectedMusicXmlPath = null;
  musicxmlFileName.textContent = selectedMusicXmlPath ? selectedMusicXmlPath.split(/[/\\]/).pop() : '';
});

pickMusicXmlBtn.addEventListener('click', async () => {
  const filePath = await window.ellington.showMusicXmlPicker();
  if (filePath) {
    selectedMusicXmlPath = filePath;
    musicxmlFileName.textContent = filePath.split(/[/\\]/).pop();
  }
});

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating orchestration plans...', false);

  const progression = progressionSelect.value;
  const useMusicXml = inputModeSelect.value === 'musicxml' && selectedMusicXmlPath;

  if (inputModeSelect.value === 'musicxml' && !selectedMusicXmlPath) {
    setStatus('Please select a MusicXML file first.', false);
    generateBtn.disabled = false;
    return;
  }

  try {
    const result = await window.ellington.generateOrchestration(
      progression,
      useMusicXml ? selectedMusicXmlPath : null
    );
    if (result.error) {
      setStatus('Error: ' + result.error, false);
    } else {
      lastRunFolderPath = result.runFolderPath || null;
      setStatus(
        `Generation complete.\n` +
        `Progression: ${result.progressionName || progression}\n` +
        `Candidates: ${result.generated} | Exported: ${result.exported}\n` +
        `Scores: avg ${result.avgScore?.toFixed(2) || '—'} | best ${result.bestScore?.toFixed(2) || '—'}\n` +
        `Top ${result.exported} plans exported to:\n${result.runFolderPath || 'outputs/ellington/'}`,
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
    await window.ellington.openOutputFolder(lastRunFolderPath);
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
