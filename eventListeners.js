// eventListeners.js
import * as dom from './domElements.js';
import { updateAmbiance, onWindowResize } from './threeSetup.js';
import { ENVIRONMENTS_DATA } from './initializers.js';
import { previewSelectedFiles, processAndLoadFiles } from './fileLoader.js';
import { startNewEggIncubation, setupMating } from './creatureManager.js';

export function onEnvironmentChange() {
    if (dom.environmentSelect && ENVIRONMENTS_DATA.length > 0) {
        const selectedEnvKey = dom.environmentSelect.value;
        const selectedEnvData = ENVIRONMENTS_DATA.find(e => e.key === selectedEnvKey);
        if (selectedEnvData && selectedEnvData.ambiance) {
            updateAmbiance(selectedEnvData.ambiance); // from threeSetup
        } else {
            console.warn(`No ambiance data found for selected environment: ${selectedEnvKey}`);
            // Optionally set a default ambiance if needed
        }
    }
}

export function setupEventListeners() {
    if(dom.hamburgerMenuButton) dom.hamburgerMenuButton.addEventListener('click', () => {
        if(dom.uploadModal) dom.uploadModal.style.display = 'flex';
        if(dom.fileListPreview) dom.fileListPreview.innerHTML = '';
        if(dom.modelFileInput) dom.modelFileInput.value = '';
    });
    if(dom.closeUploadModalButton) dom.closeUploadModalButton.addEventListener('click', () => {
        if(dom.uploadModal) dom.uploadModal.style.display = 'none';
    });
    if(dom.modelFileInput) dom.modelFileInput.addEventListener('change', previewSelectedFiles);
    if(dom.processUploadedFilesButton) dom.processUploadedFilesButton.addEventListener('click', processAndLoadFiles);

    if(dom.environmentSelect) dom.environmentSelect.addEventListener('change', onEnvironmentChange);
    if(dom.startIncubationButton) dom.startIncubationButton.addEventListener('click', startNewEggIncubation);
    // The listener for storeActiveCreatureButton is removed as the button is now dynamic.
    // if(dom.storeActiveCreatureButton) dom.storeActiveCreatureButton.addEventListener('click', attemptStoreActiveCreature); 
    if(dom.mateButton) dom.mateButton.addEventListener('click', setupMating);

    window.addEventListener('resize', onWindowResize);
}