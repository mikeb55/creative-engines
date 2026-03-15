/**
 * Big Band Architecture Generator — Renderer
 */

const statusEl = document.getElementById('status');
const generateBtn = document.getElementById('generate');
const generateScoreBtn = document.getElementById('generateScore');
const openFolderBtn = document.getElementById('openFolder');
const progressionSelect = document.getElementById('progression');
const styleSelect = document.getElementById('style');

let lastRunFolderPath = null;

function setStatus(text, isEmpty = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('empty', isEmpty);
}

generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  setStatus('Generating architecture...', false);

  try {
    const result = await window.bigBandArch.generateArchitecture(
      progressionSelect.value,
      styleSelect.value
    );
    if (result.error) {
      setStatus('Error: ' + result.error, false);
    } else {
      lastRunFolderPath = result.runFolderPath || null;
      setStatus(
        `Architecture complete.\n` +
        `Progression: ${result.architecture?.progressionTemplate || progressionSelect.value}\n` +
        `Sections: ${result.architecture?.sections?.length || 0}\n` +
        `Output: ${result.runFolderPath || 'outputs/architecture/'}`,
        false
      );
    }
  } catch (err) {
    setStatus('Error: ' + (err.message || String(err)), false);
  } finally {
    generateBtn.disabled = false;
  }
});

generateScoreBtn.addEventListener('click', async () => {
  generateScoreBtn.disabled = true;
  setStatus('Generating score skeleton (architecture + Ellington + MusicXML)...', false);

  try {
    const result = await window.bigBandArch.generateScoreSkeleton(
      progressionSelect.value,
      styleSelect.value
    );
    if (result.error) {
      setStatus('Error: ' + result.error, false);
    } else {
      lastRunFolderPath = result.runFolderPath || null;
      setStatus(
        `Score skeleton complete.\n` +
        `Progression: ${result.architecture?.progressionTemplate || progressionSelect.value}\n` +
        `Sections: ${result.architecture?.sections?.length || 0}\n` +
        `Output: ${result.runFolderPath || 'outputs/score/'}`,
        false
      );
    }
  } catch (err) {
    setStatus('Error: ' + (err.message || String(err)), false);
  } finally {
    generateScoreBtn.disabled = false;
  }
});

openFolderBtn.addEventListener('click', async () => {
  try {
    await window.bigBandArch.openOutputFolder(lastRunFolderPath);
  } catch (err) {
    setStatus('Error opening folder: ' + (err.message || String(err)), false);
  }
});
