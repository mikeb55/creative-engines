/**
 * Wyble Etude Generator — Renderer Process
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const openFolderBtn = document.getElementById('openFolder');
const progressionSelect = document.getElementById('progression');
const practiceModeSelect = document.getElementById('practiceMode');
const inputModeSelect = document.getElementById('inputMode');
const presetRow = document.getElementById('presetRow');
const musicxmlRow = document.getElementById('musicxmlRow');
const pickMusicXmlBtn = document.getElementById('pickMusicXml');
const musicxmlFileName = document.getElementById('musicxmlFileName');

let selectedMusicXmlPath = null;

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

inputModeSelect.addEventListener('change', () => {
  const usePreset = inputModeSelect.value === 'preset';
  presetRow.style.display = usePreset ? 'flex' : 'none';
  musicxmlRow.style.display = usePreset ? 'none' : 'flex';
  if (usePreset) selectedMusicXmlPath = null;
  musicxmlFileName.textContent = selectedMusicXmlPath ? path.basename(selectedMusicXmlPath) : '';
});

pickMusicXmlBtn.addEventListener('click', async () => {
  const filePath = await window.wyble.showMusicXmlPicker();
  if (filePath) {
    selectedMusicXmlPath = filePath;
    musicxmlFileName.textContent = filePath.split(/[/\\]/).pop();
  }
});

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating etudes...', false);

  const progression = progressionSelect.value;
  const practiceMode = practiceModeSelect ? practiceModeSelect.value : 'etude';
  const useMusicXml = inputModeSelect.value === 'musicxml' && selectedMusicXmlPath;

  if (inputModeSelect.value === 'musicxml' && !selectedMusicXmlPath) {
    setStatus('Please select a MusicXML file first.', false);
    generateBtn.disabled = false;
    return;
  }

  try {
    const result = await window.wyble.generateEtudes(
      progression,
      practiceMode,
      useMusicXml ? selectedMusicXmlPath : null
    );
    if (result.error) {
      setStatus('MusicXML error: ' + result.error + '\n\nV1 requires: explicit chord symbols, 4/4, linear form.', false);
    } else {
      setStatus(
        `Generation complete.\n` +
        `Studies generated: ${result.generated}\n` +
        `Studies exported (GCE ≥ 9): ${result.exported}\n` +
        `Output: outputs/wyble/desktop/`,
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
    await window.wyble.openOutputFolder();
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
