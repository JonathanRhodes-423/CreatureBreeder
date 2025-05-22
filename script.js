// script.js (Main Orchestrator)
import * as THREE from 'three'; // Keep for global access if any module relies on it implicitly, though explicit imports are better.
// Order of imports can matter if there are inter-dependencies at the module level (less common with ES6 modules top-level code)
import * as dom from './domElements.js'; // Should be one of the first
import * as cfg from './config.js'; // Config values

// Initializers must run early to populate data used by other modules
import { parseModelList, fetchAndParseEnvironments, setupHybridRules, ALL_MODEL_DEFINITIONS, ENVIRONMENTS_DATA } from './initializers.js';

import { initializeScene, animate, updateAmbiance } from './threeSetup.js'; // threeSetup might use ENVIRONMENTS_DATA
import { setupEventListeners, onEnvironmentChange } from './eventListeners.js';
import {
    updateActiveCreatureDisplay, updateStoredCreaturesDisplay,
    updateButtonState, populateEnvironmentDropdown, resetIncubationTimerDisplay,
    updateModelStatusHeader
} from './uiManager.js';
import { updateGameTimers, activeCreatureInstance } from './creatureManager.js'; // For global timer

// Global variable for the game update interval
let globalUpdateInterval;

async function initializeApp() {
    console.log("Initializing app...");

    // 1. Parse static data definitions
    parseModelList(); // Populates ALL_MODEL_DEFINITIONS in initializers.js
    console.log("Model list parsed.");

    // 2. Fetch/Parse environment data (this also populates ENVIRONMENTS_DATA in initializers.js)
    await fetchAndParseEnvironments(); // Using await if it were truly async
    console.log("Environments fetched and parsed.");

    // 3. Setup hybrid rules (uses parsed model and environment data)
    setupHybridRules(); // Uses ALL_MODEL_DEFINITIONS and ENVIRONMENTS_DATA from initializers.js
    console.log("Hybrid rules set up.");

    // 4. Initialize the 3D scene (might use ENVIRONMENTS_DATA for initial ambiance)
    if (!dom.viewerContainer || !dom.storedCreaturesList || !dom.activeCreatureDetailsPanel) {
        console.error("FATAL: Essential DOM elements not found during initialization.");
        return;
    }
    initializeScene(); // From threeSetup.js
    console.log("Scene initialized.");


    // 5. Populate UI elements that depend on parsed data
    populateEnvironmentDropdown(); // From uiManager.js, uses ENVIRONMENTS_DATA
    console.log("Environment dropdown populated.");

    // 6. Setup event listeners
    setupEventListeners(); // From eventListeners.js
    console.log("Event listeners set up.");

    // 7. Initial UI updates
    resetIncubationTimerDisplay(); // From uiManager.js
    updateActiveCreatureDisplay(); // From uiManager.js
    updateStoredCreaturesDisplay(); // From uiManager.js
    updateModelStatusHeader(); // From uiManager.js, uses ALL_MODEL_DEFINITIONS.length
    updateButtonState(); // From uiManager.js
    console.log("Initial UI updated.");

    // 8. Trigger initial environment ambiance if dropdown is populated
    if (dom.environmentSelect.options.length > 0) {
        onEnvironmentChange(); // From eventListeners.js, which calls updateAmbiance from threeSetup.js
    } else if (ENVIRONMENTS_DATA.length > 0 && ENVIRONMENTS_DATA[0].ambiance) {
        // Fallback if onEnvironmentChange wasn't triggered but data exists
        updateAmbiance(ENVIRONMENTS_DATA[0].ambiance);
    }


    // 9. Start game loop / timers
    globalUpdateInterval = setInterval(updateGameTimers, 1000); // updateGameTimers from creatureManager.js
    animate(); // From threeSetup.js (starts rendering loop)
    console.log("App initialization complete. Starting animation and game update loops.");
}


// --- Start the application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}