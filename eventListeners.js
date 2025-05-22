// eventListeners.js
// eventListeners.js
import * as dom from './domElements.js';
import { updateAmbiance, onWindowResize } from './threeSetup.js';
import { ENVIRONMENTS_DATA } from './initializers.js';
import { previewSelectedFiles, processAndLoadFiles } from './fileLoader.js';
import { startNewEggIncubation, setupMating } from './creatureManager.js';
// Import main game interaction handlers from script.js
import {
    handleNewGameClick, handleLoadGameClick,
    handleStartGameFinal, handleCancelNewGame,
    handleCancelLoadGame, handleBackToMenuAndSave
} from './script.js';

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

export function setupMenuEventListeners() {
    if (dom.newGameButton) dom.newGameButton.addEventListener('click', handleNewGameClick);
    if (dom.loadGameButton) dom.loadGameButton.addEventListener('click', handleLoadGameClick);
    if (dom.startGameFinalButton) dom.startGameFinalButton.addEventListener('click', handleStartGameFinal);
    if (dom.cancelNewGameButton) dom.cancelNewGameButton.addEventListener('click', handleCancelNewGame);
    if (dom.cancelLoadGameButton) dom.cancelLoadGameButton.addEventListener('click', handleCancelLoadGame);
    if (dom.backToMenuButton) dom.backToMenuButton.addEventListener('click', handleBackToMenuAndSave);
}

export function setupGameEventListeners() {
    // These are the listeners for when the game view is active
    if (dom.hamburgerMenuButton) dom.hamburgerMenuButton.addEventListener('click', () => {
        if (dom.uploadModal) dom.uploadModal.style.display = 'flex';
        if (dom.fileListPreview) dom.fileListPreview.innerHTML = '';
        if (dom.modelFileInput) dom.modelFileInput.value = '';
    });
    if (dom.closeUploadModalButton) dom.closeUploadModalButton.addEventListener('click', () => {
        if (dom.uploadModal) dom.uploadModal.style.display = 'none';
    });
    if (dom.modelFileInput) dom.modelFileInput.addEventListener('change', previewSelectedFiles);
    if (dom.processUploadedFilesButton) dom.processUploadedFilesButton.addEventListener('click', processAndLoadFiles);

    if (dom.environmentSelect) dom.environmentSelect.addEventListener('change', onEnvironmentChange);
    if (dom.startIncubationButton) dom.startIncubationButton.addEventListener('click', startNewEggIncubation);
    if (dom.mateButton) dom.mateButton.addEventListener('click', setupMating);

    window.addEventListener('resize', onWindowResize); // This can be global
}

export function onEnvironmentChange() { //
    if (dom.environmentSelect && ENVIRONMENTS_DATA.length > 0) { //
        const selectedEnvKey = dom.environmentSelect.value; //
        const selectedEnvData = ENVIRONMENTS_DATA.find(e => e.key === selectedEnvKey); //
        if (selectedEnvData && selectedEnvData.ambiance) { //
            updateAmbiance(selectedEnvData.ambiance); // from threeSetup
        } else {
            console.warn(`No ambiance data found for selected environment: ${selectedEnvKey}`); //
        }
    }
}

// Initial setup can call both or manage them based on view
export function setupAllEventListeners() {
    setupMenuEventListeners();
    setupGameEventListeners(); // Game specific listeners can be set up here,
                               // or dynamically when game view is shown.
                               // For simplicity, setting them up once.
    if(dom.environmentSelect) dom.environmentSelect.addEventListener('change', onEnvironmentChange);
    // window.addEventListener('resize', onWindowResize); // Moved to setupGameEventListeners or make it global
}