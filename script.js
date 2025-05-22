// script.js (Main Orchestrator)
import * as THREE from 'three';
import * as dom from './domElements.js';
import * as cfg from './config.js';

import { parseModelList, fetchAndParseEnvironments, setupHybridRules, ALL_MODEL_DEFINITIONS, ENVIRONMENTS_DATA } from './initializers.js';
import { initializeScene, animate, updateAmbiance, onWindowResize as onThreeWindowResize } from './threeSetup.js';
import { setupAllEventListeners, onEnvironmentChange } from './eventListeners.js';
import * as ui from './uiManager.js';
import * as cm from './creatureManager.js';
import * as sl from './saveLoad.js'; // Save/Load module (API version)
import { processAndLoadFiles, loadedModelData, previewSelectedFiles } from './fileLoader.js'; // Added previewSelectedFiles


// --- Global State ---
let globalUpdateInterval = null;
let animationFrameId = null;
let isGameActive = false;
let currentUsername = null;

// --- Game Initialization and Teardown ---
async function initializeFullApp() {
    console.log("Initializing full app systems...");
    parseModelList(); //
    await fetchAndParseEnvironments(); // Assuming this is async if it involves actual fetching
    setupHybridRules(); //

    // UI for model loading should be available before game starts
    ui.updateModelStatusHeader(); // Initial status

    // Setup essential event listeners that are always active (like model upload)
    // Hamburger, modal, file input, process files - these are part of the "app shell"
    if (dom.hamburgerMenuButton) dom.hamburgerMenuButton.addEventListener('click', () => { //
        if(dom.uploadModal) dom.uploadModal.style.display = 'flex'; //
        if(dom.fileListPreview) dom.fileListPreview.innerHTML = ''; //
        if(dom.modelFileInput) dom.modelFileInput.value = ''; //
    });
    if(dom.closeUploadModalButton) dom.closeUploadModalButton.addEventListener('click', () => { //
        if(dom.uploadModal) dom.uploadModal.style.display = 'none'; //
    });
    if(dom.modelFileInput) dom.modelFileInput.addEventListener('change', previewSelectedFiles); //
    if(dom.processUploadedFilesButton) dom.processUploadedFilesButton.addEventListener('click', processAndLoadFiles); //


    console.log("App systems initialized. Showing main menu.");
    ui.showMainMenu(); //
    setupAllEventListeners(); // Sets up menu and general game listeners
}


function startGameSystems() {
    if (isGameActive) return; // Prevent multiple starts

    console.log("Starting game systems...");
    initializeScene(); // Initialize Three.js scene
    ui.populateEnvironmentDropdown(); //
    if (dom.environmentSelect && dom.environmentSelect.options.length > 0) { //
        onEnvironmentChange(); //
    } else if (ENVIRONMENTS_DATA.length > 0 && ENVIRONMENTS_DATA[0].ambiance) { //
        updateAmbiance(ENVIRONMENTS_DATA[0].ambiance); //
    }

    // Reset/initialize game state displays
    ui.resetIncubationTimerDisplay(); //
    ui.updateActiveCreatureDisplay(); //
    ui.updateStoredCreaturesDisplay(); //
    ui.updateButtonState(); //

    if (globalUpdateInterval) clearInterval(globalUpdateInterval);
    globalUpdateInterval = setInterval(cm.updateGameTimers, 1000); //

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    function gameAnimationLoop() {
        animate(); // threeSetup's animation loop
        animationFrameId = requestAnimationFrame(gameAnimationLoop);
    }
    gameAnimationLoop();

    isGameActive = true;
    ui.showGameView(); //
    console.log("Game systems started and view shown.");
}

function stopGameSystems() {
    console.log("Stopping game systems...");
    if (globalUpdateInterval) {
        clearInterval(globalUpdateInterval);
        globalUpdateInterval = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    cm.resetCreatureManagerState(); // Clear all creature-related data

    isGameActive = false;
    currentUsername = null;
    console.log("Game systems stopped.");
}


// --- Menu Interaction Handlers (Exported for eventListeners.js) ---
export function handleNewGameClick() {
    ui.showNewGamePrompt(); //
}

export async function handleLoadGameClick() {
    ui.displayLoadGameError(''); // Clear previous errors
    const result = await sl.getSavedUsernames();
    if (result.success) {
        ui.showLoadGameList(result.data, handleLoadSelectedGame); // Pass handler
    } else {
        ui.showLoadGameList([], handleLoadSelectedGame); // Show empty list
        ui.displayLoadGameError(result.message || "Could not fetch saved games."); //
    }
}

export function handleCancelNewGame() {
    ui.showMainMenu(); //
}

export function handleCancelLoadGame() {
    ui.showMainMenu(); //
}

export async function handleBackToMenuAndSave() {
    if (!currentUsername) {
        console.warn("No current user to save for. Returning to menu without saving.");
        stopGameSystems();
        ui.showMainMenu(); //
        return;
    }

    console.log(`Saving game for ${currentUsername} before returning to menu.`);
    const gameState = {
        ...cm.getCreatureManagerState(), //
        currentEnvironmentKey: dom.environmentSelect ? dom.environmentSelect.value : null, //
    };

    const saveResult = await sl.saveGameState(currentUsername, gameState);
    if (saveResult.success) {
        alert("Game saved!");
    } else {
        alert(`Failed to save game: ${saveResult.message}`);
        if (!confirm("Failed to save. Return to menu anyway (progress will be lost)?")) {
            return;
        }
    }

    stopGameSystems();
    ui.showMainMenu(); //
}

// --- Game Start/Load Logic (Exported for UI Manager or direct calls) ---
export async function handleStartGameFinal() {
    const usernameValue = dom.usernameInput ? dom.usernameInput.value.trim() : ''; //
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(usernameValue)) {
        ui.displayNewGameError("Username must be 3-15 chars (a-z, 0-9, _)."); //
        return;
    }
    ui.displayNewGameError(""); //

    if (Object.keys(loadedModelData).length < ALL_MODEL_DEFINITIONS.length) { //
        const confirmStart = confirm("Not all creature models are loaded. Some creatures may not display correctly. Continue to game?");
        if (!confirmStart) {
            if(dom.uploadModal) dom.uploadModal.style.display = 'flex'; //
            return;
        }
    }

    currentUsername = usernameValue;
    console.log(`Starting new game for user: ${currentUsername}`);

    if (isGameActive) stopGameSystems();
    cm.resetCreatureManagerState(); // Ensure a fresh state for new game

    startGameSystems();
    if (ENVIRONMENTS_DATA.length > 0 && dom.environmentSelect) { //
         dom.environmentSelect.value = ENVIRONMENTS_DATA[0].key; //
         onEnvironmentChange(); //
    }
}

export async function handleLoadSelectedGame(usernameToLoad) {
    if (!usernameToLoad) {
        ui.displayLoadGameError("No username selected to load.");
        return;
    }
    ui.displayLoadGameError("");

     if (Object.keys(loadedModelData).length < ALL_MODEL_DEFINITIONS.length) {
        const confirmStart = confirm("Not all creature models are loaded. Some creatures may not display correctly. Continue to load game?");
        if (!confirmStart) {
            if(dom.uploadModal) dom.uploadModal.style.display = 'flex';
            return;
        }
    }

    console.log(`Attempting to load game for user: ${usernameToLoad}`);
    const loadResult = await sl.loadGameState(usernameToLoad);

    if (loadResult.success && loadResult.data) {
        currentUsername = usernameToLoad;
        if (isGameActive) {
            stopGameSystems(); // Stop current game systems
        }

        // ***** CORRECTED ORDER *****
        // 1. Start game systems (this will initialize the Three.js scene)
        startGameSystems(); // This now happens before setting creature manager state

        // 2. Now that the scene is initialized, set the creature manager state
        //    which might try to remove old objects from the scene.
        cm.setCreatureManagerState(loadResult.data);

        // Apply other global states from loaded data
        if (loadResult.data.currentEnvironmentKey && dom.environmentSelect) {
            dom.environmentSelect.value = loadResult.data.currentEnvironmentKey;
            onEnvironmentChange();
        } else if (ENVIRONMENTS_DATA.length > 0 && dom.environmentSelect) {
            dom.environmentSelect.value = ENVIRONMENTS_DATA[0].key;
            onEnvironmentChange();
        }
        console.log("Game loaded successfully and systems started.");
    } else {
        ui.displayLoadGameError(loadResult.message || "Failed to load game data.");
        console.error("Failed to load game:", loadResult.message);
    }
}


// --- Global App Initialization ---
document.addEventListener('DOMContentLoaded', initializeFullApp);