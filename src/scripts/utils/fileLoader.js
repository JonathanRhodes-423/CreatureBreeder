// fileLoader.js
import * as dom from '../ui/domElements.js';
import { ALL_MODEL_DEFINITIONS } from '../gameLogic/initializers.js'; // Needs populated ALL_MODEL_DEFINITIONS
import { updateModelStatusHeader, updateButtonState } from '../ui/uiManager.js';

export let loadedModelData = {}; // Stores { modelKey: { fileURL, file } }

export function previewSelectedFiles(event) {
    dom.fileListPreview.innerHTML = '';
    const files = event.target.files;
    if (!files) return;

    let foundCount = 0;
    const expectedFilenamesLowercase = ALL_MODEL_DEFINITIONS.map(def => def.expectedFilename.toLowerCase());
    const selectedFilenamesLowercase = Array.from(files).map(f => f.name.toLowerCase());

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const div = document.createElement('div');
        const isExpected = expectedFilenamesLowercase.includes(file.name.toLowerCase());
        const isDuplicateInSelection = selectedFilenamesLowercase.filter(name => name === file.name.toLowerCase()).length > 1;

        if (isExpected) {
            div.textContent = `${file.name} (Expected)`;
            div.className = 'file-matched';
            if (isDuplicateInSelection) {
                div.textContent += ` - DUPLICATE IN SELECTION!`;
                div.className = 'file-duplicate';
            }
            foundCount++;
        } else {
            div.textContent = `${file.name} (Not in expected list)`;
            div.className = 'file-unmatched';
        }
        dom.fileListPreview.appendChild(div);
    }
    const totalExpected = ALL_MODEL_DEFINITIONS.length;
    const progress = totalExpected > 0 ? Math.min(100, (foundCount / totalExpected) * 100) : 0;
    dom.uploadProgressBar.style.width = `${progress}%`;
    dom.uploadProgressBar.textContent = `${foundCount} / ${totalExpected} expected models found in selection.`;
}

export async function processAndLoadFiles() {
    const files = dom.modelFileInput.files;
    if (!files || files.length === 0) {
        alert("No files selected.");
        return;
    }

    let loadedCount = 0;
    let filesProcessedCounter = 0;

    // Revoke old URLs and clear data
    for (const key in loadedModelData) {
        if (loadedModelData[key].fileURL) {
            URL.revokeObjectURL(loadedModelData[key].fileURL);
        }
    }
    Object.keys(loadedModelData).forEach(key => delete loadedModelData[key]);

    const uniqueFilesToLoad = new Map();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const matchedDefinition = ALL_MODEL_DEFINITIONS.find(def => def.expectedFilename.toLowerCase() === file.name.toLowerCase());

        if (matchedDefinition) {
            if (!uniqueFilesToLoad.has(matchedDefinition.modelKey)) {
                uniqueFilesToLoad.set(matchedDefinition.modelKey, file);
            } else {
                console.warn(`Duplicate file in selection for modelKey ${matchedDefinition.modelKey}: ${file.name}. Using first instance.`);
            }
        } else {
            console.warn(`Uploaded file ${file.name} does not match any expected model filename.`);
        }
    }

    for (const [modelKey, file] of uniqueFilesToLoad) {
         loadedModelData[modelKey] = {
            fileURL: URL.createObjectURL(file),
            file: file // Keep file reference if needed later, e.g., for re-upload without selection
        };
        loadedCount++;
        filesProcessedCounter++;
        const progress = (filesProcessedCounter / uniqueFilesToLoad.size) * 100;
        dom.uploadProgressBar.style.width = `${progress}%`;
        dom.uploadProgressBar.textContent = `Loading: ${filesProcessedCounter}/${uniqueFilesToLoad.size}`;
    }

    dom.uploadProgressBar.textContent = `Load Complete: ${loadedCount} unique matching models processed.`;
    updateModelStatusHeader(); // From uiManager
    updateButtonState();      // From uiManager
    console.log("Model processing complete. Loaded data count:", Object.keys(loadedModelData).length);
    setTimeout(() => {dom.uploadModal.style.display = 'none';}, 1500);
}

export function getModelURL(modelKey) {
    return loadedModelData[modelKey]?.fileURL || null;
}