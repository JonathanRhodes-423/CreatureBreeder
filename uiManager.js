// uiManager.js
import * as THREE from 'three'; // <-- ADD THIS LINE
import * as dom from './domElements.js';
import * as cfg from './config.js';
import { ENVIRONMENTS_DATA, ALL_MODEL_DEFINITIONS } from './initializers.js';
import { loadedModelData } from './fileLoader.js'; // For model status
import {
    activeCreatureInstance, storedCreatures, selectedForMating, isIncubating, isHybridIncubationSetup, egg,
    timeLeftForIncubation, parent1ForMating, parent2ForMating,
    activateStoredCreature, removeStoredCreature, attemptLevelUpCreature, attemptNaturalEvolution,
    updateCreatureCanEvolveStatus, formatTimeGlobal // formatTimeGlobal from creatureManager
} from './creatureManager.js';


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

    if (creature && creature.color instanceof THREE.Color) { // Ensure THREE is available or Color check is robust
        updateCreatureCanEvolveStatus(creature); // Ensures .canEvolve and evolution info is current
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

            // Dynamic buttons for level up and evolve
            const levelUpButtonInstance = document.createElement('button');
            levelUpButtonInstance.id = 'dynamicLevelUpButton';
            levelUpButtonInstance.textContent = 'Level Up';
            levelUpButtonInstance.style.marginTop = '10px';
            levelUpButtonInstance.style.width = '48%';
            levelUpButtonInstance.style.marginRight = '4%';
            levelUpButtonInstance.classList.add('modal-button');
            levelUpButtonInstance.addEventListener('click', attemptLevelUpCreature); // From creatureManager
            dom.activeCreatureDetailsPanel.appendChild(levelUpButtonInstance);

            const evolveCreatureButtonInstance = document.createElement('button');
            evolveCreatureButtonInstance.id = 'dynamicEvolveCreatureButton';
            evolveCreatureButtonInstance.textContent = 'Evolve';
            evolveCreatureButtonInstance.style.marginTop = '10px';
            evolveCreatureButtonInstance.style.width = '48%';
            evolveCreatureButtonInstance.classList.add('modal-button');
            evolveCreatureButtonInstance.addEventListener('click', attemptNaturalEvolution); // From creatureManager
            dom.activeCreatureDetailsPanel.appendChild(evolveCreatureButtonInstance);

    } else {
        dom.activeCreatureDetailsPanel.innerHTML = '<p>No creature active.</p>';
    }
    updateButtonState(); // Ensure buttons reflect new active creature state
}


export function updateStoredCreaturesDisplay() {
    if (!dom.storedCreaturesList) return;
    dom.storedCreaturesList.innerHTML = ''; // Clear existing list items

    for (let i = 0; i < cfg.MAX_STORED_CREATURES; i++) {
        const li = document.createElement('li');
        li.classList.add('stored-creature-item');
        const creature = storedCreatures[i]; // From creatureManager

        if (creature && creature.uniqueId !== undefined && creature.color instanceof THREE.Color) { // Check THREE Color
            updateCreatureCanEvolveStatus(creature); // Ensure status is current
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
            actionsWrapper.style.display = 'none'; // Hidden by default, shown by toggleMatingSelection logic

            const activateButton = document.createElement('button');
            activateButton.textContent = "Activate";
            activateButton.classList.add('activate-creature-button', 'slot-action-button');
            activateButton.disabled = (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creature.uniqueId) || isIncubating;
            activateButton.onclick = (e) => { e.stopPropagation(); activateStoredCreature(creature.uniqueId); };
            actionsWrapper.appendChild(activateButton);

            const removeButton = document.createElement('button');
            removeButton.textContent = "Remove";
            removeButton.classList.add('remove-creature-button', 'slot-action-button');
            removeButton.onclick = (e) => { e.stopPropagation(); removeStoredCreature(creature.uniqueId); };
            actionsWrapper.appendChild(removeButton);
            li.appendChild(actionsWrapper);

            infoWrapper.style.cursor = 'pointer';
            infoWrapper.onclick = () => toggleMatingSelection(creature.uniqueId); // Calls local toggleMatingSelection

        } else {
            li.innerHTML = `Slot ${i + 1}: Empty`;
            li.style.cursor = 'default';
        }
        dom.storedCreaturesList.appendChild(li);
    }
    // After rebuilding, re-evaluate action button visibility based on current selections
    if (selectedForMating.length === 1) {
        const onlySelectedLi = dom.storedCreaturesList.querySelector(`li[data-creature-unique-id="${selectedForMating[0]}"] .slot-actions`);
        if (onlySelectedLi) onlySelectedLi.style.display = 'flex';
    }
    updateButtonState(); // Ensure general buttons are also updated
}


export function toggleMatingSelection(creatureUniqueId) {
    if (isIncubating || (isHybridIncubationSetup && egg)) { // Don't allow selection changes during these states
        alert("Cannot change mating selection during incubation or when a mated egg is ready.");
        return;
    }

    const creature = storedCreatures.find(c => c && c.uniqueId === creatureUniqueId);
    if (!creature) return; // Should not happen if clicking on a rendered creature

    // Prevent selecting active creature for mating
    if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creatureUniqueId) {
        alert("Cannot select the currently active creature for mating. Please store it first or choose another.");
        return;
    }
    // Only allow selection of Stage 0 creatures for mating
    if (creature.currentEvolutionStage !== 0) {
        alert("Only BASE creatures (Stage 0) can be selected for mating.");
        // If a non-base creature was clicked and there was a mating selection, clear it.
        if (selectedForMating.length > 0) selectedForMating.length = 0; // Clear array
    } else {
        const index = selectedForMating.indexOf(creatureUniqueId);
        if (index > -1) { // Creature is selected, deselect it
            selectedForMating.splice(index, 1);
        } else { // Creature is not selected, try to select it
            if (selectedForMating.length < 2) {
                selectedForMating.push(creatureUniqueId);
            } else { // Already 2 selected, replace the first one (FIFO for selection of 2)
                selectedForMating.shift();
                selectedForMating.push(creatureUniqueId);
            }
        }
    }

    // Update visual state (CSS classes and action buttons) for all stored creature items
    const creatureItems = dom.storedCreaturesList.querySelectorAll('.stored-creature-item');
    creatureItems.forEach(itemLi => {
        const itemUniqueIdStr = itemLi.dataset.creatureUniqueId;
        if (!itemUniqueIdStr) return;
        const itemUniqueId = parseInt(itemUniqueIdStr);
        const actionsDiv = itemLi.querySelector('.slot-actions');
        const creatureInSlot = storedCreatures.find(c => c && c.uniqueId === itemUniqueId);

        if (actionsDiv && creatureInSlot) {
            // Show actions only if ONE creature is selected AND it's THIS one
            // AND this creature itself is NOT selected for mating (i.e., it's the one whose actions we might want to show)
            if (selectedForMating.length === 1 && selectedForMating[0] === itemUniqueId && creatureInSlot.currentEvolutionStage !== 0) {
                 actionsDiv.style.display = 'flex'; // Show for single, non-mating-candidate selection
            } else if (selectedForMating.length === 1 && selectedForMating[0] === itemUniqueId && creatureInSlot.currentEvolutionStage === 0) {
                // If it's a stage 0 creature and it's the only one selected, it could be for activation OR for starting a mating pair
                // So, still show its actions. The mating button itself will gate the mating action.
                actionsDiv.style.display = 'flex';
            }
            else {
                actionsDiv.style.display = 'none';
            }
        }

        // Update 'selected' class for mating candidates
        if (selectedForMating.includes(itemUniqueId) && creatureInSlot && creatureInSlot.currentEvolutionStage === 0) {
            itemLi.classList.add('selected');
        } else {
            itemLi.classList.remove('selected');
        }
    });
    updateButtonState(); // Update global buttons like "Mate Selected"
}


export function updateButtonState() {
    if (!dom.startIncubationButton || !dom.storeActiveCreatureButton || !dom.mateButton || !dom.hybridEggMessage) {
        console.warn("One or more button/display DOM elements not found in updateButtonState.");
        return;
    }

    const activeCreatureData = activeCreatureInstance ? activeCreatureInstance.userData : null;
    if (activeCreatureData) updateCreatureCanEvolveStatus(activeCreatureData); // Ensure canEvolve is current

    // Start Incubation Button
    dom.startIncubationButton.disabled = isIncubating || !!activeCreatureData || (isHybridIncubationSetup && egg && !!activeCreatureData);
    if(isIncubating) {
        dom.startIncubationButton.textContent = "Incubating...";
    } else if (isHybridIncubationSetup && egg) {
        dom.startIncubationButton.textContent = "Incubate Mated Egg";
    } else {
        dom.startIncubationButton.textContent = "Start Incubation (New Egg)";
    }

    // Store Active Creature Button
    dom.storeActiveCreatureButton.disabled = !activeCreatureData || isIncubating;


    // Dynamic buttons in Active Creature Panel
    const dynamicLevelUpButton = document.getElementById('dynamicLevelUpButton');
    const dynamicEvolveCreatureButton = document.getElementById('dynamicEvolveCreatureButton');

    let creatureIsStoredAndPermittedForPanelActions = false;
    if (activeCreatureData && activeCreatureData.uniqueId !== undefined) {
        const isStored = storedCreatures.some(c => c && c.uniqueId === activeCreatureData.uniqueId);
        if (isStored && activeCreatureData.allowActivePanelActions) {
            creatureIsStoredAndPermittedForPanelActions = true;
        }
    }

    if (dynamicLevelUpButton) {
        let canLevelUp = false;
        if (activeCreatureData && !isIncubating && creatureIsStoredAndPermittedForPanelActions) {
            if (activeCreatureData.isPurebred) { // Purebreds can level up at stage 0 or 1, if not max level and not max evolution (stage 2)
                canLevelUp = (activeCreatureData.currentEvolutionStage === 0 || activeCreatureData.currentEvolutionStage === 1) &&
                             activeCreatureData.level < cfg.MAX_LEVEL && activeCreatureData.currentEvolutionStage < 2;
            } else if (activeCreatureData.isHybrid) { // Hybrids can level up at stage 0, if not max level
                canLevelUp = activeCreatureData.currentEvolutionStage === 0 && activeCreatureData.level < cfg.MAX_LEVEL;
            }
        }
        dynamicLevelUpButton.disabled = !canLevelUp;
    }

    if (dynamicEvolveCreatureButton) { // This is for Natural Evolution (Purebred Stage 0 by timer)
        let canNatEvolve = false;
        if (activeCreatureData && !isIncubating && creatureIsStoredAndPermittedForPanelActions) {
            if (activeCreatureData.isPurebred &&
                activeCreatureData.currentEvolutionStage === 0 &&
                activeCreatureData.timeToNextEvolution <= 0 && // Timer is up
                activeCreatureData.canEvolve) { // General evolvability check
                canNatEvolve = true;
            }
        }
        dynamicEvolveCreatureButton.disabled = !canNatEvolve;
    }

    // Mate Button
    let canMateNow = selectedForMating.length === 2 && !isIncubating && !(isHybridIncubationSetup && egg) && !activeCreatureInstance;
    if (canMateNow) { // Further check if selected creatures are valid (should be handled by toggleMatingSelection, but double check)
         const p1 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
         const p2 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[1]);
         if (!p1 || p1.currentEvolutionStage !== 0 || !p2 || p2.currentEvolutionStage !== 0) {
            canMateNow = false;
         }
    }
    dom.mateButton.disabled = !canMateNow;

    // Hybrid Egg Message
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

export function updateModelStatusHeader() {
    const loadedCount = Object.keys(loadedModelData).length;
    const totalDefinitions = ALL_MODEL_DEFINITIONS.length;
    if (dom.modelStatusHeader) {
        dom.modelStatusHeader.textContent = `Models: ${loadedCount} / ${totalDefinitions}`;
    }
}