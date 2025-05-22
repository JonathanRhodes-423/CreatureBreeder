// uiManager.js
import * as THREE from 'three'; // If directly used, e.g. for instanceof THREE.Color
import * as dom from './domElements.js';
import * as cfg from '../config.js';
import { ENVIRONMENTS_DATA, ALL_MODEL_DEFINITIONS } from '../gameLogic/initializers.js';
import { loadedModelData } from '../utils/fileLoader.js';
import {
    activeCreatureInstance, storedCreatures, selectedForMating, isIncubating, isHybridIncubationSetup, egg,
    timeLeftForIncubation, parent1ForMating, parent2ForMating,
    activateStoredCreature,
    attemptLevelUpCreature, attemptNaturalEvolution,
    updateCreatureCanEvolveStatus, formatTimeGlobal,
    attemptStoreActiveCreature, discardActiveCreature
} from '../gameLogic/creatureManager.js';
// Import game interaction functions from script.js or a new gameController.js if they are moved
// For now, assume they might be passed or called if uiManager directly triggers game loads.
// import { handleLoadSelectedGame } from './script.js'; // Example if it's in script.js

export function populateEnvironmentDropdown() {
    if (!dom.environmentSelect) return;
    dom.environmentSelect.innerHTML = '';
    ENVIRONMENTS_DATA.forEach((env) => {
        const option = document.createElement('option');
        option.value = env.key;
        option.textContent = env.name;
        dom.environmentSelect.appendChild(option);
    });
}

export function resetIncubationTimerDisplay() {
    // timeLeftForIncubation is managed in creatureManager
    if(dom.timerDisplay) dom.timerDisplay.textContent = `Time: ${formatTimeGlobal(cfg.EVOLUTION_TIME_SECONDS)}`;
}


export function updateActiveCreatureDisplay() {
    if (!dom.activeCreatureDetailsPanel) return;
    const creature = activeCreatureInstance ? activeCreatureInstance.userData : null;

    // Clear previous dynamic buttons first
    const existingStoreButton = document.getElementById('dynamicStoreCreatureButton');
    if (existingStoreButton) existingStoreButton.remove();
    const existingDiscardButton = document.getElementById('dynamicDiscardCreatureButton');
    if (existingDiscardButton) existingDiscardButton.remove();
    const existingLevelUpButton = document.getElementById('dynamicLevelUpButton');
    if (existingLevelUpButton) existingLevelUpButton.remove();
    const existingEvolveButton = document.getElementById('dynamicEvolveCreatureButton');
    if (existingEvolveButton) existingEvolveButton.remove();


    if (creature && creature.color instanceof THREE.Color) {
        updateCreatureCanEvolveStatus(creature);
        let evolutionInfo = "Evolution status unknown";
        if (creature.isPurebred) {
            if (creature.currentEvolutionStage === 0) evolutionInfo = creature.timeToNextEvolution > 0 ? `Evolves (Nat.): ${formatTimeGlobal(creature.timeToNextEvolution)}` : "Ready for Nat. EV1";
            else if (creature.currentEvolutionStage === 1) evolutionInfo = creature.level < cfg.MAX_LEVEL ? `Train to Lvl ${cfg.MAX_LEVEL} for EV2` : "Ready for EV2 (Lvl Up)";
            else evolutionInfo = "Max Evolution (Purebred EV2)";
        } else if (creature.isHybrid) {
            if (creature.currentEvolutionStage === 0) evolutionInfo = creature.level < cfg.MAX_LEVEL ? `Train to Lvl ${cfg.MAX_LEVEL} for Sheen` : "Ready for Sheen (Lvl Up)";
            else evolutionInfo = "Max Evolution (Hybrid Sheen)";
        }


        const originEnvObj = ENVIRONMENTS_DATA.find(env => env.key === creature.originEnvironmentKey);
        const originDisplayName = originEnvObj ? originEnvObj.name : (creature.originEnvironmentKey || 'N/A');

        dom.activeCreatureDetailsPanel.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div class="stored-creature-color" style="background-color: #${creature.color.getHexString()};"></div>
                <strong>${creature.name || 'Unnamed'} (Lvl ${creature.level || 0})</strong>
            </div>
            <div class="info">Species: ${creature.speciesName || 'N/A'}</div>
            <div class="info">Model: ${creature.modelKey || 'N/A'}</div>
            <div class="info">Stage: ${creature.currentEvolutionStage !== undefined ? creature.currentEvolutionStage : 'N/A'} ${creature.isHybrid ? "[Hybrid]" : "[Purebred]"}</div>
            <div class="info">Origin: ${originDisplayName}</div>
            ${creature.hasSilverSheen ? '<div class="info" style="color: #C0C0C0;">Silver Sheen Active</div>' : ''}
            <div class="info">Evolution: ${evolutionInfo}</div>
            `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '15px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'wrap';
        buttonContainer.style.gap = '10px';

        const storeButtonInstance = document.createElement('button');
        storeButtonInstance.id = 'dynamicStoreCreatureButton';
        storeButtonInstance.textContent = 'Store Creature';
        storeButtonInstance.classList.add('modal-button');
        storeButtonInstance.addEventListener('click', attemptStoreActiveCreature);
        buttonContainer.appendChild(storeButtonInstance);

        const discardButtonInstance = document.createElement('button');
        discardButtonInstance.id = 'dynamicDiscardCreatureButton';
        discardButtonInstance.textContent = 'Discard Creature';
        discardButtonInstance.classList.add('modal-button', 'discard-button-style');
        discardButtonInstance.addEventListener('click', discardActiveCreature);
        buttonContainer.appendChild(discardButtonInstance);

        const levelUpButtonInstance = document.createElement('button');
        levelUpButtonInstance.id = 'dynamicLevelUpButton';
        levelUpButtonInstance.textContent = 'Level Up';
        levelUpButtonInstance.classList.add('modal-button');
        levelUpButtonInstance.addEventListener('click', attemptLevelUpCreature);
        buttonContainer.appendChild(levelUpButtonInstance);

        const evolveCreatureButtonInstance = document.createElement('button');
        evolveCreatureButtonInstance.id = 'dynamicEvolveCreatureButton';
        evolveCreatureButtonInstance.textContent = 'Evolve';
        evolveCreatureButtonInstance.classList.add('modal-button');
        evolveCreatureButtonInstance.addEventListener('click', attemptNaturalEvolution);
        buttonContainer.appendChild(evolveCreatureButtonInstance);
        
        [storeButtonInstance, discardButtonInstance, levelUpButtonInstance, evolveCreatureButtonInstance].forEach(btn => {
            btn.style.flexBasis = 'calc(50% - 5px)';
            btn.style.minWidth = '120px';
        });

        dom.activeCreatureDetailsPanel.appendChild(buttonContainer);

    } else {
        dom.activeCreatureDetailsPanel.innerHTML = '<p>No creature active.</p>';
    }
    updateButtonState();
}


export function updateStoredCreaturesDisplay() {
    if (!dom.storedCreaturesList) return;
    dom.storedCreaturesList.innerHTML = ''; 

    for (let i = 0; i < cfg.MAX_STORED_CREATURES; i++) {
        const li = document.createElement('li');
        li.classList.add('stored-creature-item');
        const creature = storedCreatures[i]; 

        if (creature && creature.uniqueId !== undefined && creature.color instanceof THREE.Color) { 
            updateCreatureCanEvolveStatus(creature); 
            li.dataset.creatureUniqueId = creature.uniqueId;

            if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creature.uniqueId) {
                li.classList.add('is-active-in-viewer');
            }
            if (selectedForMating.includes(creature.uniqueId)) {
                li.classList.add('selected');
            }

            let evolutionInfo = "Evolution status unknown";
            if (creature.isPurebred) {
                if (creature.currentEvolutionStage === 0) evolutionInfo = creature.timeToNextEvolution > 0 ? `Evolves (Nat.): ${formatTimeGlobal(creature.timeToNextEvolution)}` : "Ready for Nat. EV1";
                else if (creature.currentEvolutionStage === 1) evolutionInfo = creature.level < cfg.MAX_LEVEL ? `Train to Lvl ${cfg.MAX_LEVEL} for EV2` : "Ready for EV2 (Lvl Up)";
                else evolutionInfo = "Max Evolution (Purebred EV2)";
            } else if (creature.isHybrid) {
                 if (creature.currentEvolutionStage === 0) evolutionInfo = creature.level < cfg.MAX_LEVEL ? `Train to Lvl ${cfg.MAX_LEVEL} for Sheen` : "Ready for Sheen (Lvl Up)";
                else evolutionInfo = "Max Evolution (Hybrid Sheen)";
            }

            const originEnvObj = ENVIRONMENTS_DATA.find(env => env.key === creature.originEnvironmentKey);
            const originDisplayName = originEnvObj ? originEnvObj.name : (creature.originEnvironmentKey || 'N/A');

            const infoWrapper = document.createElement('div');
            infoWrapper.classList.add('creature-info-wrapper');
            infoWrapper.innerHTML = `
                <div class="stored-creature-color" style="background-color: #${creature.color.getHexString()};"></div>
                <div class="creature-details">
                    <strong>${creature.name || 'Unnamed'} (Lvl ${creature.level || 0})</strong>
                    <div class="info">Type: ${creature.modelKey || 'N/A'} (Stage ${creature.currentEvolutionStage !== undefined ? creature.currentEvolutionStage : 'N/A'})</div>
                    <div class="info">Origin: ${originDisplayName} ${creature.isHybrid ? "[Hybrid]" : "[Purebred]"}</div>
                    ${creature.hasSilverSheen ? '<div class="info" style="color: #C0C0C0;">Silver Sheen</div>' : ''}
                    <div class="evolution-timer">${evolutionInfo}</div>
                </div>`;
            li.appendChild(infoWrapper);

            const actionsWrapper = document.createElement('div');
            actionsWrapper.classList.add('slot-actions');
            actionsWrapper.style.display = 'none'; 

            const activateButton = document.createElement('button');
            activateButton.textContent = "Activate";
            activateButton.classList.add('activate-creature-button', 'slot-action-button');
            activateButton.disabled = (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creature.uniqueId) || isIncubating;
            activateButton.onclick = (e) => { e.stopPropagation(); activateStoredCreature(creature.uniqueId); };
            actionsWrapper.appendChild(activateButton);

            // REMOVE BUTTON IS NO LONGER CREATED HERE
            // const removeButton = document.createElement('button');
            // removeButton.textContent = "Remove";
            // removeButton.classList.add('remove-creature-button', 'slot-action-button');
            // removeButton.onclick = (e) => { e.stopPropagation(); removeStoredCreature(creature.uniqueId); }; // This function call would now be dead code if not used elsewhere
            // actionsWrapper.appendChild(removeButton);
            
            li.appendChild(actionsWrapper);

            infoWrapper.style.cursor = 'pointer';
            infoWrapper.onclick = () => toggleMatingSelection(creature.uniqueId); 

        } else {
            li.innerHTML = `Slot ${i + 1}: Empty`;
            li.style.cursor = 'default';
        }
        dom.storedCreaturesList.appendChild(li);
    }
    
    if (selectedForMating.length === 1) {
        const onlySelectedLi = dom.storedCreaturesList.querySelector(`li[data-creature-unique-id="${selectedForMating[0]}"] .slot-actions`);
        if (onlySelectedLi) onlySelectedLi.style.display = 'flex';
    } else if (selectedForMating.length === 0) { // If no creatures are selected for mating, show activate button on all.
         const allItems = dom.storedCreaturesList.querySelectorAll('.stored-creature-item');
         allItems.forEach(itemLi => {
             const creatureUniqueIdStr = itemLi.dataset.creatureUniqueId;
             if (creatureUniqueIdStr) { // If it's a slot with a creature
                const actionsDiv = itemLi.querySelector('.slot-actions');
                if(actionsDiv) actionsDiv.style.display = 'flex';
             }
         });
    }


    updateButtonState(); 
}


export function toggleMatingSelection(creatureUniqueId) {
    if (isIncubating || (isHybridIncubationSetup && egg)) { 
        alert("Cannot change mating selection during incubation or when a mated egg is ready.");
        return;
    }

    const creature = storedCreatures.find(c => c && c.uniqueId === creatureUniqueId);
    if (!creature) return; 

    if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creatureUniqueId) {
        alert("Cannot select the currently active creature for mating. Please store it first or choose another.");
        return;
    }
    
    const index = selectedForMating.indexOf(creatureUniqueId);

    if (index > -1) { 
        selectedForMating.splice(index, 1);
    } else { 
        if (selectedForMating.length === 0) { 
            selectedForMating.push(creatureUniqueId);
        } else if (selectedForMating.length === 1) { 
            const firstSelectedCreature = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
            if (firstSelectedCreature && firstSelectedCreature.currentEvolutionStage !== 0) {
                alert("First selected creature must be a BASE (Stage 0) creature for mating.");
                selectedForMating.length = 0; 
            } else if (creature.currentEvolutionStage !== 0) {
                alert("Second selected creature must also be a BASE (Stage 0) creature for mating.");
            } else {
                selectedForMating.push(creatureUniqueId); 
            }
        } else { 
            
            if (creature.currentEvolutionStage !== 0) {
                alert("New creature selected must be BASE (Stage 0) for mating. Selection cleared.");
                selectedForMating.length = 0;
            } else {
                selectedForMating.shift();
                selectedForMating.push(creatureUniqueId);
            }
        }
    }

    const creatureItems = dom.storedCreaturesList.querySelectorAll('.stored-creature-item');
    creatureItems.forEach(itemLi => {
        const itemUniqueIdStr = itemLi.dataset.creatureUniqueId;
        if (!itemUniqueIdStr) return;
        const itemUniqueId = parseInt(itemUniqueIdStr);
        const actionsDiv = itemLi.querySelector('.slot-actions');
        const creatureInSlot = storedCreatures.find(c => c && c.uniqueId === itemUniqueId);

        if (actionsDiv && creatureInSlot) {
            const isThisCreatureSelectedForMating = selectedForMating.includes(itemUniqueId);
            const isThisCreatureActive = activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === itemUniqueId;

            // Show "Activate" if:
            // 1. No creatures are selected for mating (actions shown for all non-active creatures).
            // 2. This creature is the *only* one selected (regardless of its stage - for activation).
            // 3. Two creatures are selected for mating, but *this is not one of them*.
            // Essentially, actions (now only "Activate") are visible if the slot is not part of a mating pair,
            // and it's not the active creature.
            if (isThisCreatureActive) {
                actionsDiv.style.display = 'none';
            } else if (selectedForMating.length === 0) {
                actionsDiv.style.display = 'flex';
            } else if (selectedForMating.length === 1 && isThisCreatureSelectedForMating) {
                actionsDiv.style.display = 'flex';
            } else if (selectedForMating.length === 1 && !isThisCreatureSelectedForMating) {
                actionsDiv.style.display = 'none';
            } else if (selectedForMating.length === 2) {
                actionsDiv.style.display = isThisCreatureSelectedForMating ? 'none' : 'flex';
            } else {
                 actionsDiv.style.display = 'none'; 
            }
        }

        if (selectedForMating.includes(itemUniqueId) && creatureInSlot && creatureInSlot.currentEvolutionStage === 0) {
            itemLi.classList.add('selected');
        } else {
            itemLi.classList.remove('selected');
        }
        if (selectedForMating.includes(itemUniqueId) && creatureInSlot && creatureInSlot.currentEvolutionStage !== 0) {
            itemLi.classList.remove('selected');
        }
    });
    updateButtonState();
}


export function updateButtonState() {
    if (!dom.startIncubationButton || !dom.mateButton || !dom.hybridEggMessage) {
        console.warn("One or more button/display DOM elements not found in updateButtonState.");
    }

    const activeCreatureData = activeCreatureInstance ? activeCreatureInstance.userData : null;
    if (activeCreatureData) updateCreatureCanEvolveStatus(activeCreatureData);

    if (dom.startIncubationButton) {
        dom.startIncubationButton.disabled = isIncubating || !!activeCreatureData || (isHybridIncubationSetup && egg && !!activeCreatureData);
        if (isIncubating) {
            dom.startIncubationButton.textContent = "Incubating...";
        } else if (isHybridIncubationSetup && egg) {
            dom.startIncubationButton.textContent = "Incubate Mated Egg";
        } else {
            dom.startIncubationButton.textContent = "Start Incubation (New Egg)";
        }
    }

    const dynamicStoreButton = document.getElementById('dynamicStoreCreatureButton');
    const dynamicDiscardButton = document.getElementById('dynamicDiscardCreatureButton');
    const dynamicLevelUpButton = document.getElementById('dynamicLevelUpButton');
    const dynamicEvolveButton = document.getElementById('dynamicEvolveCreatureButton');

    if (dynamicStoreButton) {
        dynamicStoreButton.disabled = !activeCreatureData || isIncubating;
    }
    if (dynamicDiscardButton) {
        dynamicDiscardButton.disabled = !activeCreatureData || isIncubating;
    }
    
    if (dynamicLevelUpButton) {
        let canLevelUp = false;
        if (activeCreatureData && !isIncubating && activeCreatureData.allowActivePanelActions) {
            if (activeCreatureData.isPurebred) {
                canLevelUp = (activeCreatureData.currentEvolutionStage === 0 || activeCreatureData.currentEvolutionStage === 1) &&
                             activeCreatureData.level < cfg.MAX_LEVEL && activeCreatureData.currentEvolutionStage < 2;
            } else if (activeCreatureData.isHybrid) {
                canLevelUp = activeCreatureData.currentEvolutionStage === 0 && activeCreatureData.level < cfg.MAX_LEVEL;
            }
        }
        dynamicLevelUpButton.disabled = !canLevelUp;
    }

    if (dynamicEvolveButton) { 
        let canNatEvolve = false;
        if (activeCreatureData && !isIncubating && activeCreatureData.allowActivePanelActions) {
            if (activeCreatureData.isPurebred &&
                activeCreatureData.currentEvolutionStage === 0 &&
                activeCreatureData.timeToNextEvolution <= 0 &&
                activeCreatureData.canEvolve) {
                canNatEvolve = true;
            }
        }
        dynamicEvolveButton.disabled = !canNatEvolve;
    }

    if (dom.mateButton) {
        let canMateNow = selectedForMating.length === 2 && !isIncubating && !(isHybridIncubationSetup && egg) && !activeCreatureInstance;
        if (canMateNow) {
            const p1 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
            const p2 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[1]);
            if (!p1 || p1.currentEvolutionStage !== 0 || !p2 || p2.currentEvolutionStage !== 0) {
                canMateNow = false;
            }
        }
        dom.mateButton.disabled = !canMateNow;
    }

    if (dom.hybridEggMessage) {
        dom.hybridEggMessage.style.display = (isHybridIncubationSetup && egg && !isIncubating && !activeCreatureInstance) ? 'block' : 'none';
        if (isHybridIncubationSetup && egg && !isIncubating) {
            if (parent1ForMating && parent2ForMating && parent1ForMating.modelKey === parent2ForMating.modelKey &&
                ALL_MODEL_DEFINITIONS.find(m => m.modelKey === parent1ForMating.modelKey)?.isPurebredLine) {
                dom.hybridEggMessage.textContent = "Purebred Pair Egg Ready!";
            } else {
                dom.hybridEggMessage.textContent = "Hybrid Egg Ready!";
            }
        }
    }
}

export function updateModelStatusHeader() {
    const loadedCount = Object.keys(loadedModelData).length;
    const totalDefinitions = ALL_MODEL_DEFINITIONS.length;
    if (dom.modelStatusHeader) {
        dom.modelStatusHeader.textContent = `Models: ${loadedCount} / ${totalDefinitions}`;
    }
}

// --- New UI functions for Menu and Game State ---

export function showMainMenu() {
    if (dom.mainMenuContainer) dom.mainMenuContainer.style.display = 'flex';
    if (dom.gameContainer) dom.gameContainer.style.display = 'none';
    if (dom.appHeader) dom.appHeader.style.display = 'none'; // Hide game header
    // Hide any dialogs
    if (dom.newGamePrompt) dom.newGamePrompt.style.display = 'none';
    if (dom.loadGameListContainer) dom.loadGameListContainer.style.display = 'none';
    if (dom.newGameError) dom.newGameError.style.display = 'none';
    if (dom.loadGameError) dom.loadGameError.style.display = 'none';

    // Reset input fields
    if(dom.usernameInput) dom.usernameInput.value = '';
}

export function showGameView() {
    if (dom.mainMenuContainer) dom.mainMenuContainer.style.display = 'none';
    if (dom.gameContainer) dom.gameContainer.style.display = 'flex'; // Or 'block' depending on layout
    if (dom.appHeader) dom.appHeader.style.display = 'flex'; // Show game header
}

export function showNewGamePrompt() {
    if (dom.newGamePrompt) dom.newGamePrompt.style.display = 'block';
    if (dom.loadGameListContainer) dom.loadGameListContainer.style.display = 'none';
    if (dom.usernameInput) dom.usernameInput.focus();
    if (dom.newGameError) dom.newGameError.textContent = ''; dom.newGameError.style.display = 'none';
}

export function showLoadGameList(savedGames, loadGameHandler) { // loadGameHandler is a function from script.js
    if (dom.loadGameListContainer) dom.loadGameListContainer.style.display = 'block';
    if (dom.newGamePrompt) dom.newGamePrompt.style.display = 'none';
    if (dom.savedGamesList) {
        dom.savedGamesList.innerHTML = ''; // Clear previous list
        if (savedGames && savedGames.length > 0) {
            savedGames.forEach(gameUsername => {
                const li = document.createElement('li');
                li.textContent = gameUsername;
                li.dataset.username = gameUsername;
                li.addEventListener('click', () => loadGameHandler(gameUsername));
                dom.savedGamesList.appendChild(li);
            });
        } else {
            dom.savedGamesList.innerHTML = '<li class="no-saves">No saved games found.</li>';
        }
    }
    if (dom.loadGameError) dom.loadGameError.textContent = ''; dom.loadGameError.style.display = 'none';
}

export function displayNewGameError(message) {
    if (dom.newGameError) {
        dom.newGameError.textContent = message;
        dom.newGameError.style.display = message ? 'block' : 'none';
    }
}

export function displayLoadGameError(message) {
    if (dom.loadGameError) {
        dom.loadGameError.textContent = message;
        dom.loadGameError.style.display = message ? 'block' : 'none';
    }
}