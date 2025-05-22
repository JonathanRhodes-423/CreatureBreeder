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

    if (index > -1) { // Creature is already selected, deselect it
        selectedForMating.splice(index, 1);
    } else { // Creature is not selected, try to select it
        if (selectedForMating.length === 0) { // No creature selected yet, this is the first selection
            selectedForMating.push(creatureUniqueId);
        } else if (selectedForMating.length === 1) { // One creature already selected, this is the second
            const firstSelectedCreature = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
            if (firstSelectedCreature && firstSelectedCreature.currentEvolutionStage !== 0) {
                alert("First selected creature must be a BASE (Stage 0) creature for mating.");
                selectedForMating.length = 0; // Clear selection
                // Optionally, select the newly clicked creature if it's stage 0, or just clear
                // For now, just clearing to make the user re-select a valid first.
            } else if (creature.currentEvolutionStage !== 0) {
                alert("Second selected creature must also be a BASE (Stage 0) creature for mating.");
                // Do not add the second creature, first one remains selected.
            } else {
                selectedForMating.push(creatureUniqueId); // Both are valid for mating
            }
        } else { // selectedForMating.length === 2, replace the first one (FIFO for selection of 2)
            const firstSelectedCreature = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
             //This case implies we are clicking a third creature. We need to check the NEWLY clicked one.
            if (creature.currentEvolutionStage !== 0) {
                alert("New creature selected must be BASE (Stage 0) for mating. Selection cleared.");
                selectedForMating.length = 0;
            } else {
                 // If the newly clicked one is stage 0, the "oldest" of the two previously selected is replaced.
                 // However, the logic should be: if 2 are selected and a 3rd (valid) is clicked,
                 // it should probably clear and start a new pair with the clicked one, or replace the second.
                 // Current behavior (FIFO replacement of 2) could be confusing.
                 // For simplicity now: if 2 are selected, clicking a 3rd valid one will replace the first selected.
                 // This means the "newly clicked" one (creature) and the "second of the original pair" become the new pair.
                 // This part of the logic might need further refinement based on desired UX.
                 // Let's re-evaluate: if 2 are selected, a 3rd click should probably reset or be disallowed unless deselecting first.
                 // For now, let's simplify: if 2 are selected, any new click on a *different* creature either deselects one or alerts.
                 // Sticking to FIFO for 2 for now if the new one is valid:
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
            // Show actions if:
            // 1. This creature is the *only* one selected (regardless of its stage - for activation/removal)
            // OR
            // 2. No creatures are selected for mating (actions should be visible for all non-active creatures)
            // OR
            // 3. This creature is *not* part of the current mating selection (if 2 are selected for mating)
            // Hide actions if:
            // 1. This creature *is* one of two selected for mating.
            const isThisCreatureSelectedForMating = selectedForMating.includes(itemUniqueId);

            if (selectedForMating.length === 0) { // No creatures selected for mating, show actions for all
                actionsDiv.style.display = 'flex';
            } else if (selectedForMating.length === 1 && isThisCreatureSelectedForMating) { // This is the only one selected
                actionsDiv.style.display = 'flex';
            } else if (selectedForMating.length === 1 && !isThisCreatureSelectedForMating) { // One other is selected, hide for this one
                actionsDiv.style.display = 'none';
            } else if (selectedForMating.length === 2) { // Two creatures selected for mating
                actionsDiv.style.display = isThisCreatureSelectedForMating ? 'none' : 'flex'; // Hide if it's one of the pair, show otherwise
            } else {
                 actionsDiv.style.display = 'none'; // Default hide
            }


        }

        // Update 'selected' class for mating candidates (only if stage 0)
        if (selectedForMating.includes(itemUniqueId) && creatureInSlot && creatureInSlot.currentEvolutionStage === 0) {
            itemLi.classList.add('selected');
        } else {
            itemLi.classList.remove('selected');
        }
         // If a creature is selected but it's not stage 0, it shouldn't have the 'selected' class for mating
        if (selectedForMating.includes(itemUniqueId) && creatureInSlot && creatureInSlot.currentEvolutionStage !== 0) {
            itemLi.classList.remove('selected');
        }
    });
    updateButtonState();
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