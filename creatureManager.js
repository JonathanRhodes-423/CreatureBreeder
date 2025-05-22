// creatureManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as cfg from './config.js';
import * as dom from './domElements.js';
import { scene, createPlaceholderModel, disposeGltf } from './threeSetup.js';
import { ALL_MODEL_DEFINITIONS, ENVIRONMENTS_DATA, INTRA_ENV_HYBRID_RULES, INTER_ENV_HYBRID_RULES } from './initializers.js';
import { getModelURL } from './fileLoader.js';
import { updateActiveCreatureDisplay, updateStoredCreaturesDisplay, updateButtonState, resetIncubationTimerDisplay } from './uiManager.js';
import { deserializeCreatureFromLoad } from './saveLoad.js'; // For consistency in deserialization


export let egg, activeCreatureInstance;
export let incubationInterval;
export let timeLeftForIncubation = cfg.EVOLUTION_TIME_SECONDS;
export let isIncubating = false;
export let isHybridIncubationSetup = false;

export let storedCreatures = [];
export let selectedForMating = [];
export let nextCreatureUniqueId = 0;
export let parent1ForMating = null;
export let parent2ForMating = null;

export function resetCreatureManagerState() {
    if (activeCreatureInstance) {
        scene.remove(activeCreatureInstance);
        disposeGltf(activeCreatureInstance);
        activeCreatureInstance = null;
    }
    if (egg) {
        scene.remove(egg);
        disposeGltf(egg); // Assuming disposeGltf handles materials/geometry
        egg = null;
    }
    if (incubationInterval) {
        clearInterval(incubationInterval);
        incubationInterval = null;
    }

    timeLeftForIncubation = cfg.EVOLUTION_TIME_SECONDS;
    isIncubating = false;
    isHybridIncubationSetup = false;
    storedCreatures = [];
    selectedForMating = [];
    nextCreatureUniqueId = 0; // Or 1, depending on your ID scheme for new games
    parent1ForMating = null;
    parent2ForMating = null;

    // Also update UI elements that reflect this state
    updateActiveCreatureDisplay();
    updateStoredCreaturesDisplay();
    resetIncubationTimerDisplay();
    if (dom.hybridEggMessage) dom.hybridEggMessage.style.display = 'none';
    updateButtonState();
    console.log("Creature manager state reset.");
}

// createCreatureObject: Ensure color handling is robust
export function createCreatureObject(params) {
    const modelDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === params.modelKey);
    let colorToUse = params.color;

    if (typeof colorToUse === 'string') { // If color is a hex string from save file
        try {
            colorToUse = new THREE.Color(colorToUse.startsWith('#') ? colorToUse : `#${colorToUse}`);
        } catch (e) {
            console.warn("Invalid hex color string in createCreatureObject, using default. Params:", params, e);
            colorToUse = new THREE.Color(0xcccccc);
        }
    } else if (!(colorToUse instanceof THREE.Color)) {
        console.warn("Invalid color object provided to createCreatureObject, using default. Params:", params);
        colorToUse = new THREE.Color(0xcccccc); // Default color
    }

    return {
        uniqueId: params.uniqueId !== undefined ? params.uniqueId : nextCreatureUniqueId++,
        name: params.name || (modelDef?.speciesName) || `Creature ${params.uniqueId !== undefined ? params.uniqueId : nextCreatureUniqueId -1}`,
        modelKey: params.modelKey,
        baseSpeciesModelKey: params.isPurebred && (modelDef?.evolutionStage === 0) ? params.modelKey : (params.baseSpeciesModelKey || null),
        color: colorToUse.clone(), // Ensure it's a THREE.Color instance
        currentEvolutionStage: params.currentEvolutionStage !== undefined ? params.currentEvolutionStage : (modelDef?.evolutionStage || 0),
        level: params.level || 0,
        isPurebred: params.isPurebred || false,
        isHybrid: params.isHybrid || false,
        canEvolve: params.canEvolve !== undefined ? params.canEvolve : true,
        timeToNextEvolution: params.timeToNextEvolution !== undefined ? params.timeToNextEvolution : cfg.EVOLUTION_TIME_SECONDS,
        originEnvironmentKey: params.originEnvironmentKey || (dom.environmentSelect ? dom.environmentSelect.value : null),
        incubatedEnvironmentKey: params.incubatedEnvironmentKey,
        evolvedInEnvironmentKey: params.evolvedInEnvironmentKey || null,
        hasSilverSheen: params.hasSilverSheen || false,
        speciesName: params.speciesName || (modelDef?.speciesName) || "Creature",
        allowActivePanelActions: params.allowActivePanelActions || false
    };
}

export function spawnEgg(isHybrid, forIncubation = true, eggColorOverride = null) {
    if (activeCreatureInstance) { scene.remove(activeCreatureInstance); disposeGltf(activeCreatureInstance); activeCreatureInstance = null; }
    if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; }
    updateActiveCreatureDisplay();

    let finalEggColor;
    if (eggColorOverride && eggColorOverride instanceof THREE.Color) {
        finalEggColor = eggColorOverride.getHex();
    } else {
        finalEggColor = isHybrid ? 0xDA70D6 : 0xffffff; // Default orchid for hybrid, white for normal
    }

    const geometry = new THREE.SphereGeometry(0.25, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: finalEggColor, roughness: 0.6, metalness: 0.2 });
    egg = new THREE.Mesh(geometry, material);
    egg.userData = { isHybrid: isHybrid, color: new THREE.Color(finalEggColor) }; // Store color for saving
    egg.scale.y = 1.25;
    try {
        const box = new THREE.Box3().setFromObject(egg);
        // const size = box.getSize(new THREE.Vector3()); // Not used here
        egg.position.set(0, -box.min.y + 0.01, 0);
    } catch(e) {
        console.error("Error positioning egg:", e);
        egg.position.set(0, 0.3, 0);
    }
    egg.castShadow = true;
    scene.add(egg);

    if(dom.hybridEggMessage) dom.hybridEggMessage.style.display = isHybrid ? 'block' : 'none';
    if (!forIncubation) {
        isIncubating = false;
    }
    updateButtonState();
}

export function startNewEggIncubation() {
    if (isHybridIncubationSetup && egg) {
        if (isIncubating) {
            alert("An egg is already incubating.");
            return;
        }
        console.log("Starting incubation for existing hybrid egg.");
        startIncubationProcess();
        return;
    }

    if (isIncubating && egg) {
        alert("An egg is already incubating.");
        return;
    }
    if (activeCreatureInstance) {
        alert("An active creature is in the viewer. Store it first before starting a new egg incubation.");
        return;
    }

    console.log("Starting incubation for a new non-hybrid egg.");
    isHybridIncubationSetup = false;
    parent1ForMating = null;
    parent2ForMating = null;
    spawnEgg(false, false); // Spawn egg, but don't set incubating status yet, startIncubationProcess will
    startIncubationProcess();
}

export function startIncubationProcess() {
    if (!egg) {
        alert("No egg to incubate. Spawn an egg first.");
        return;
    }
    if (isIncubating && timeLeftForIncubation < cfg.EVOLUTION_TIME_SECONDS && timeLeftForIncubation > 0) {
         console.log("Incubation already in progress.");
         return;
    }

    isIncubating = true;
    timeLeftForIncubation = cfg.EVOLUTION_TIME_SECONDS;
    resetIncubationTimerDisplay(); // From uiManager
    updateButtonState(); // From uiManager

    if (incubationInterval) clearInterval(incubationInterval);
    incubationInterval = setInterval(() => {
        timeLeftForIncubation--;
        if(dom.timerDisplay) dom.timerDisplay.textContent = `Time: ${formatTimeGlobal(timeLeftForIncubation)}`; // Use global formatTime
        if (timeLeftForIncubation <= 0) {
            clearInterval(incubationInterval);
            hatchCreature();
        }
    }, 1000);
}

export function hatchCreature() {
    if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; }
    if(dom.hybridEggMessage) dom.hybridEggMessage.style.display = 'none';
    isIncubating = false;

    let offspringModelKey = ALL_MODEL_DEFINITIONS[0]?.modelKey || "MIREFIN_BASE";
    let isNewCreaturePurebred = false;
    let isNewCreatureHybrid = false;
    let baseSpeciesModelKeyForPurebred = null;

    const incubationEnvKey = dom.environmentSelect.value;
    const incubationEnvData = ENVIRONMENTS_DATA.find(e => e.key === incubationEnvKey);
    const hatchColor = (incubationEnvData && incubationEnvData.ambiance && incubationEnvData.ambiance.creatureColor) ? incubationEnvData.ambiance.creatureColor.clone() : new THREE.Color(0x999999);


    if (isHybridIncubationSetup && parent1ForMating && parent2ForMating) {
        const p1Def = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === parent1ForMating.modelKey);
        const p2Def = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === parent2ForMating.modelKey);

        if (p1Def && p2Def && p1Def.isPurebredLine && p2Def.isPurebredLine && p1Def.modelKey === p2Def.modelKey) {
            isNewCreaturePurebred = true;
            isNewCreatureHybrid = false;
            offspringModelKey = p1Def.modelKey;
            baseSpeciesModelKeyForPurebred = p1Def.modelKey;
        } else if (p1Def && p2Def && p1Def.evolutionStage === 0 && p2Def.evolutionStage === 0) {
            isNewCreatureHybrid = true;
            isNewCreaturePurebred = false;
            baseSpeciesModelKeyForPurebred = null;

            const p1OriginEnvKey = parent1ForMating.originEnvironmentKey;
            const p2OriginEnvKey = parent2ForMating.originEnvironmentKey;
            const parentKeys = [p1Def.modelKey, p2Def.modelKey].sort().join('+');
            let specificHybridResultKey = null;

            if (p1OriginEnvKey === p2OriginEnvKey) {
                specificHybridResultKey = INTRA_ENV_HYBRID_RULES[p1OriginEnvKey]?.[parentKeys];
            } else {
                const sortedEnvKeys = [p1OriginEnvKey, p2OriginEnvKey].sort().join('+');
                specificHybridResultKey = INTER_ENV_HYBRID_RULES[sortedEnvKeys]?.[parentKeys];
            }

            offspringModelKey = specificHybridResultKey || p1Def.modelKey;
            if(!specificHybridResultKey) console.error(`Hybrid Mating FAILED: No rule for ${p1Def.modelKey} & ${p2Def.modelKey}. Defaulting.`);
        } else { // Fallback if something unexpected with parents
            isNewCreatureHybrid = true; // Or some default behavior
            isNewCreaturePurebred = false;
            offspringModelKey = p1Def ? p1Def.modelKey : (ALL_MODEL_DEFINITIONS[0]?.modelKey || "MIREFIN_BASE");
            baseSpeciesModelKeyForPurebred = null;
        }
    } else { // Not a hybrid incubation (new egg)
        isNewCreaturePurebred = true;
        isNewCreatureHybrid = false;
        if (!incubationEnvData) { // Should not happen if dropdown is populated
            const allPurebredBaseModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0);
            if (allPurebredBaseModels.length > 0) offspringModelKey = allPurebredBaseModels[Math.floor(Math.random() * allPurebredBaseModels.length)].modelKey;
        } else {
            const currentEnvironmentName = incubationEnvData.name;
            const envModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0 && m.originEnvironmentName === currentEnvironmentName);
            if (envModels.length > 0) {
                offspringModelKey = envModels[Math.floor(Math.random() * envModels.length)].modelKey;
            } else { // Fallback if no models for current env (should not happen with good data)
                const allPurebredBaseModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0);
                if (allPurebredBaseModels.length > 0) offspringModelKey = allPurebredBaseModels[Math.floor(Math.random() * allPurebredBaseModels.length)].modelKey;
            }
        }
        baseSpeciesModelKeyForPurebred = offspringModelKey;
    }

    const creatureData = createCreatureObject({
        modelKey: offspringModelKey,
        baseSpeciesModelKey: baseSpeciesModelKeyForPurebred,
        color: hatchColor,
        isPurebred: isNewCreaturePurebred,
        isHybrid: isNewCreatureHybrid,
        incubatedEnvKey: incubationEnvKey,
        originEnvKey: isNewCreaturePurebred ? incubationEnvKey : (parent1ForMating?.originEnvironmentKey || incubationEnvKey), // Hybrid origin might need refinement
        speciesName: ALL_MODEL_DEFINITIONS.find(m=>m.modelKey === offspringModelKey)?.speciesName || "Unknown Species",
        level: 0
    });

    loadAndDisplayCreature(creatureData, false, 'hatch');

    isHybridIncubationSetup = false;
    parent1ForMating = null;
    parent2ForMating = null;
    selectedForMating = []; // Clear selection after mating/hatching
    updateStoredCreaturesDisplay(); // From uiManager
    updateButtonState(); // From uiManager
}

export function loadAndDisplayCreature(creatureInstanceData, isEvolutionDisplayUpdate = false, sourceAction = 'unknown') {
    if (!creatureInstanceData || !creatureInstanceData.modelKey) {
        console.error("loadAndDisplayCreature called with invalid creatureInstanceData:", creatureInstanceData);
        return;
    }

    const creatureDataWithActionFlag = { ...creatureInstanceData };
    if (sourceAction === 'hatch') {
        creatureDataWithActionFlag.allowActivePanelActions = false;
    } else if (sourceAction === 'activation' || sourceAction === 'evolution') {
        creatureDataWithActionFlag.allowActivePanelActions = true;
    } else if (creatureDataWithActionFlag.allowActivePanelActions === undefined) {
        creatureDataWithActionFlag.allowActivePanelActions = false;
    }


    if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creatureDataWithActionFlag.uniqueId && !isEvolutionDisplayUpdate) {
        activeCreatureInstance.userData.allowActivePanelActions = creatureDataWithActionFlag.allowActivePanelActions; // Ensure flag is current
        updateActiveCreatureDisplay();
        updateButtonState();
        updateStoredCreaturesDisplay(); // In case its status (like selection) needs refresh
        return;
    }

    if (activeCreatureInstance) { scene.remove(activeCreatureInstance); disposeGltf(activeCreatureInstance); activeCreatureInstance = null; }

    const modelURL = getModelURL(creatureDataWithActionFlag.modelKey); // From fileLoader
    const currentCreatureDataCopy = createCreatureObject({...creatureDataWithActionFlag}); // Ensure a full, fresh copy

    if (modelURL) {
        const loader = new GLTFLoader();
        loader.load(modelURL, (gltf) => {
            activeCreatureInstance = gltf.scene;
            activeCreatureInstance.userData = currentCreatureDataCopy;

            try {
                const box = new THREE.Box3().setFromObject(activeCreatureInstance);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const desiredSize = 0.9; // Target size for the model in the viewer
                const scale = maxDim === 0 ? desiredSize : desiredSize / maxDim;

                activeCreatureInstance.scale.set(scale, scale, scale);
                // Adjust position to be centered and sit on the ground
                activeCreatureInstance.position.set(-center.x * scale, -box.min.y * scale + 0.01, -center.z * scale);
            } catch (e) {
                console.error("Error sizing/positioning GLTF model:", e);
                activeCreatureInstance.position.set(0,0.5,0); // Fallback position
            }


            if(activeCreatureInstance.userData.color instanceof THREE.Color) {
                applyMaterialToCreature(activeCreatureInstance, activeCreatureInstance.userData.color, activeCreatureInstance.userData.hasSilverSheen);
            } else {
                 console.error("Cannot apply material, color is not a THREE.Color:", activeCreatureInstance.userData.color);
            }
            scene.add(activeCreatureInstance);


            if (sourceAction === 'hatch' || sourceAction === 'activation') {
                const existingStoredIndex = storedCreatures.findIndex(c => c.uniqueId === activeCreatureInstance.userData.uniqueId);
                if (existingStoredIndex === -1) { // If not already in storage
                    if (storedCreatures.length < cfg.MAX_STORED_CREATURES) {
                        storedCreatures.push({...activeCreatureInstance.userData}); // Add a copy
                    } else {
                         alert("Storage full. New creature is active but not saved. Store manually if desired.");
                    }
                } else { // If activating an existing stored creature, update its data in storage (especially allowActivePanelActions)
                    storedCreatures[existingStoredIndex] = {...activeCreatureInstance.userData};
                }
            }

            updateCreatureCanEvolveStatus(activeCreatureInstance.userData); // Update its evolvability
            updateActiveCreatureDisplay(); // From uiManager
            updateStoredCreaturesDisplay(); // From uiManager
            updateButtonState(); // From uiManager

        }, undefined, (error) => {
            console.error(`Error loading GLB for ${currentCreatureDataCopy.modelKey}:`, error);
            activeCreatureInstance = createPlaceholderModel(); // From threeSetup
            activeCreatureInstance.userData = currentCreatureDataCopy; // Assign our data
            scene.add(activeCreatureInstance);
            updateCreatureCanEvolveStatus(activeCreatureInstance.userData);
            updateActiveCreatureDisplay();
            updateStoredCreaturesDisplay();
            updateButtonState();
        });
    } else {
        console.warn(`No GLB file found for modelKey ${currentCreatureDataCopy.modelKey}. Using placeholder.`);
        activeCreatureInstance = createPlaceholderModel(); // From threeSetup
        activeCreatureInstance.userData = currentCreatureDataCopy; // Assign our data
        scene.add(activeCreatureInstance);
        updateCreatureCanEvolveStatus(activeCreatureInstance.userData);
        updateActiveCreatureDisplay();
        updateStoredCreaturesDisplay();
        updateButtonState();
    }
}


export function applyMaterialToCreature(model, baseColor, applySilverSheen = false) {
    if (!model || !(baseColor instanceof THREE.Color)) {
         console.warn("applyMaterialToCreature: Invalid model or baseColor.", {model, baseColor});
         return;
    }
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                const originalMaterial = child.material;
                let newMaterial;
                if (applySilverSheen) {
                    newMaterial = new THREE.MeshStandardMaterial({
                        color: cfg.SILVER_SHEEN_COLOR.clone(),
                        emissive: cfg.SILVER_SHEEN_COLOR.clone().multiplyScalar(0.1), // A bit of glow for sheen
                        metalness: 0.9,
                        roughness: 0.2,
                    });
                } else {
                     newMaterial = new THREE.MeshStandardMaterial({
                        color: baseColor.clone(),
                        roughness: originalMaterial.roughness !== undefined ? originalMaterial.roughness : 0.6,
                        metalness: originalMaterial.metalness !== undefined ? originalMaterial.metalness : 0.2,
                    });
                }
                // Preserve maps if they exist on original material
                if (originalMaterial.map) newMaterial.map = originalMaterial.map;
                if (originalMaterial.normalMap) newMaterial.normalMap = originalMaterial.normalMap;
                // Dispose old material if it's not shared and not a placeholder
                if (child.material !== newMaterial && typeof child.material.dispose === 'function') {
                    // Be cautious with disposing if materials might be shared by other non-visible parts
                    // For now, assume simple replacement is fine.
                }
                child.material = newMaterial;
            }
        }
    });
}

export function updateCreatureCanEvolveStatus(creatureData) {
    if (!creatureData) return;

    if (creatureData.isPurebred) {
        if (creatureData.currentEvolutionStage === 0) { // Base purebred
            creatureData.canEvolve = (creatureData.timeToNextEvolution <= 0);
        } else if (creatureData.currentEvolutionStage === 1) { // EV1 purebred
            creatureData.canEvolve = (creatureData.level >= cfg.MAX_LEVEL);
        } else { // EV2 purebred (max evolution)
            creatureData.canEvolve = false;
        }
    } else if (creatureData.isHybrid) {
        if (creatureData.currentEvolutionStage === 0) { // Base hybrid
            creatureData.canEvolve = (creatureData.level >= cfg.MAX_LEVEL); // Hybrids evolve to "Sheen" (stage 1) by level
        } else { // Sheen hybrid (max evolution for hybrids)
            creatureData.canEvolve = false;
        }
    } else { // Should not happen if data is correct
        creatureData.canEvolve = false;
    }
}


export function updateGameTimers() {
    let anyTimerReachedZeroThisTick = false;

    storedCreatures.forEach(creature => {
        if (creature && creature.isPurebred && creature.currentEvolutionStage === 0 && creature.timeToNextEvolution > 0) {
            creature.timeToNextEvolution--;
            if (creature.timeToNextEvolution === 0) {
                anyTimerReachedZeroThisTick = true;
            }
        }
        if (creature) { // Update canEvolve status based on new time/level
            updateCreatureCanEvolveStatus(creature);
        }
    });

    if (activeCreatureInstance && activeCreatureInstance.userData) {
        const activeData = activeCreatureInstance.userData;

        // Handle timer for active creature (if applicable)
        if (activeData.isPurebred && activeData.currentEvolutionStage === 0 && activeData.timeToNextEvolution > 0) {
            activeData.timeToNextEvolution--;
            if (activeData.timeToNextEvolution === 0) {
                anyTimerReachedZeroThisTick = true;
            }
        }

        // Sync active creature data back to storage if it exists there
        const storedVersionIndex = storedCreatures.findIndex(c => c.uniqueId === activeData.uniqueId);
        if (storedVersionIndex > -1) {
            // Preserve allowActivePanelActions from the active instance, copy the rest
            const { allowActivePanelActions, ...restOfActiveData } = activeData;
            storedCreatures[storedVersionIndex] = { ...storedCreatures[storedVersionIndex], ...restOfActiveData, allowActivePanelActions: activeData.allowActivePanelActions };
        }

        updateCreatureCanEvolveStatus(activeData); // Update active creature's evolvability
    }

    if (anyTimerReachedZeroThisTick) {
        updateStoredCreaturesDisplay(); // Refresh display if any timers hit zero
        updateActiveCreatureDisplay(); // Also refresh active display
    }

    // Always update button states as evolvability might change due to timers/level ups
    if (activeCreatureInstance || anyTimerReachedZeroThisTick) { // Or if any creature in storage changed
      updateButtonState();
    }
}


export function attemptNaturalEvolution() {
    if (!activeCreatureInstance || !activeCreatureInstance.userData) { alert("No active creature."); return; }
    const creatureData = activeCreatureInstance.userData;

    const isStored = storedCreatures.some(c => c && c.uniqueId === creatureData.uniqueId);
    if (!isStored || !creatureData.allowActivePanelActions) {
        alert("Creature must be stored and activated from the panel to evolve this way.");
        return;
    }

    if (!creatureData.isPurebred || creatureData.currentEvolutionStage !== 0) { alert(`${creatureData.name} is not eligible for natural evolution (must be purebred stage 0).`); return; }
    if (creatureData.timeToNextEvolution > 0) { alert(`${creatureData.name} is not ready for natural evolution. Time remaining: ${formatTimeGlobal(creatureData.timeToNextEvolution)}`); return; }

    const baseDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creatureData.baseSpeciesModelKey && m.evolutionStage === 0);
    if (!baseDef) { console.error("Base definition not found for purebred natural evolution:", creatureData); creatureData.canEvolve = false; updateActiveCreatureDisplay(); updateButtonState(); return; }

    // Find the EV1 model for this species and origin environment
    const ev1Def = ALL_MODEL_DEFINITIONS.find(m => m.speciesName === baseDef.speciesName && m.evolutionStage === 1 && m.originEnvironmentName === baseDef.originEnvironmentName);

    if (ev1Def) {
        creatureData.modelKey = ev1Def.modelKey;
        creatureData.currentEvolutionStage = 1;
        creatureData.level = 0; // Reset level for new stage
        creatureData.timeToNextEvolution = cfg.EVOLUTION_TIME_SECONDS; // Reset timer for next potential stage (though EV1->EV2 is by level)
        creatureData.evolvedInEnvironmentKey = dom.environmentSelect.value; // Record evolution environment
        const newColorEnv = ENVIRONMENTS_DATA.find(e => e.key === creatureData.evolvedInEnvironmentKey);
        if (newColorEnv && newColorEnv.ambiance && newColorEnv.ambiance.creatureColor) creatureData.color = newColorEnv.ambiance.creatureColor.clone();
        // allowActivePanelActions remains true as it's an evolution of an allowed creature

        // Update in storage
        const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
        if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData };

        loadAndDisplayCreature(creatureData, true, 'evolution'); // Reload model, true for evolution update
    } else {
        console.error(`EV1 definition not found for ${baseDef.speciesName} from ${baseDef.originEnvironmentName}. Cannot perform natural evolution.`);
        creatureData.canEvolve = false; // Mark as unable to evolve further this way
    }

    updateCreatureCanEvolveStatus(creatureData); // Recalculate based on new state
    updateStoredCreaturesDisplay();
    updateActiveCreatureDisplay();
    updateButtonState();
}

export function attemptLevelUpCreature() {
    if (!activeCreatureInstance || !activeCreatureInstance.userData) { alert("No active creature to level up."); return; }
    const creatureData = activeCreatureInstance.userData;

    const isStored = storedCreatures.some(c => c && c.uniqueId === creatureData.uniqueId);
    if (!isStored || !creatureData.allowActivePanelActions) {
        alert("Creature must be stored and activated from the panel to level up.");
        return;
    }

    if (creatureData.level >= cfg.MAX_LEVEL) {
         if (canTriggerEvolutionByLevel(creatureData)) {
             triggerEvolutionByLevel(creatureData);
         } else {
             alert(`${creatureData.name} is at max level (${cfg.MAX_LEVEL}) for its current stage and cannot evolve further by leveling at this time.`);
         }
        return;
    }

    // Check if creature is at max evolution stage already
    if ((creatureData.isPurebred && creatureData.currentEvolutionStage === 2) || (creatureData.isHybrid && creatureData.currentEvolutionStage === 1) ) {
        alert(`${creatureData.name} is at its maximum evolution stage and cannot level up further.`);
        creatureData.canEvolve = false; // Ensure canEvolve is false
        updateActiveCreatureDisplay();
        updateButtonState();
        return;
    }

    creatureData.level++;

    // If leveling up to MAX_LEVEL triggers an evolution
    if (creatureData.level >= cfg.MAX_LEVEL && canTriggerEvolutionByLevel(creatureData)) {
        triggerEvolutionByLevel(creatureData); // This will handle further updates
    } else { // Just a normal level up, no evolution triggered
        // Update in storage
        const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
        if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData };

        updateCreatureCanEvolveStatus(creatureData);
        updateStoredCreaturesDisplay();
        updateActiveCreatureDisplay();
        updateButtonState();
    }
}


export function canTriggerEvolutionByLevel(creatureData){
     if (!creatureData) return false;
     // Purebred EV1 at max level can evolve to EV2
     if (creatureData.isPurebred && creatureData.currentEvolutionStage === 1 && creatureData.level >= cfg.MAX_LEVEL) return true;
     // Hybrid Base (Stage 0) at max level can evolve to Sheen (Stage 1)
     if (creatureData.isHybrid && creatureData.currentEvolutionStage === 0 && creatureData.level >= cfg.MAX_LEVEL) return true;
    return false;
}

export function triggerEvolutionByLevel(creatureData) {
    if (!creatureData) return;
    // Assumes checks for allowActivePanelActions were done by the caller (attemptLevelUpCreature)

    const evolutionEnvKey = dom.environmentSelect.value; // Evolution happens in the current environment
    const newColorEnv = ENVIRONMENTS_DATA.find(e => e.key === evolutionEnvKey);
    const evolutionColor = (newColorEnv && newColorEnv.ambiance && newColorEnv.ambiance.creatureColor) ? newColorEnv.ambiance.creatureColor.clone() : creatureData.color.clone();

    let evolved = false;

    if (creatureData.isPurebred && creatureData.currentEvolutionStage === 1) { // EV1 Purebred -> EV2 Purebred
        const baseDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creatureData.baseSpeciesModelKey);
        if (!baseDef) { console.error("Base def not found for purebred level evolution:", creatureData); creatureData.canEvolve = false; return; }
        // Find EV2 model based on speciesName and originEnvironmentName of the base form
        const ev2Def = ALL_MODEL_DEFINITIONS.find(m => m.speciesName === baseDef.speciesName && m.evolutionStage === 2 && m.originEnvironmentName === baseDef.originEnvironmentName);
        if (ev2Def) {
            creatureData.modelKey = ev2Def.modelKey;
            creatureData.currentEvolutionStage = 2; // Now EV2
            creatureData.color = evolutionColor;
            creatureData.evolvedInEnvironmentKey = evolutionEnvKey;
            creatureData.level = 0; // Reset level for new stage
            evolved = true;
        } else {
            console.error(`EV2 definition not found for ${baseDef.speciesName} from ${baseDef.originEnvironmentName}. Cannot evolve by level.`);
            creatureData.canEvolve = false;
        }
    } else if (creatureData.isHybrid && creatureData.currentEvolutionStage === 0) { // Base Hybrid -> Sheen Hybrid (Stage 1)
        // Hybrids don't change modelKey for their "sheen" evolution, they just gain a status/look
        creatureData.currentEvolutionStage = 1; // Now "Sheen" stage
        creatureData.hasSilverSheen = true;
        creatureData.color = evolutionColor; // Can still change color based on evolution environment
        creatureData.evolvedInEnvironmentKey = evolutionEnvKey;
        creatureData.level = 0; // Reset level
        evolved = true;
    }

    if (evolved) {
        // allowActivePanelActions should remain true as it was an action on an active, permitted creature
        updateCreatureCanEvolveStatus(creatureData); // Recalculate evolvability

        // Update in storage
        const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
        if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData };

        loadAndDisplayCreature(creatureData, true, 'evolution'); // Reload model/appearance
    } else {
        // If no evolution happened but was expected, refresh UI elements
        updateCreatureCanEvolveStatus(creatureData);
        updateStoredCreaturesDisplay();
        updateActiveCreatureDisplay();
        updateButtonState();
    }
}


export function activateStoredCreature(uniqueId) {
    const creatureToActivate = storedCreatures.find(c => c && c.uniqueId === uniqueId);
    if (!creatureToActivate) { console.warn("Creature to activate not found in storage:", uniqueId); return; }

    if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === uniqueId) {
        console.log("Creature already active."); // Optionally refresh its panel actions flag
        activeCreatureInstance.userData.allowActivePanelActions = true;
        updateActiveCreatureDisplay();
        updateButtonState();
        return;
    }
    if (isIncubating && egg) { alert("Cannot activate a creature while an egg is incubating. Please wait or cancel incubation."); return; }

    // Before activating a new one, if there's a currently active creature, ensure its state is "inactive" for panel actions
    if (activeCreatureInstance && activeCreatureInstance.userData) {
        const currentActiveData = activeCreatureInstance.userData;
        currentActiveData.allowActivePanelActions = false; // Current active loses panel privileges
        const existingStoredIndex = storedCreatures.findIndex(c => c.uniqueId === currentActiveData.uniqueId);
        if (existingStoredIndex !== -1) {
            storedCreatures[existingStoredIndex] = { ...currentActiveData }; // Update its stored version
        }
        // No need to store if it wasn't in storage; it's being replaced.
    }

    // Prepare the creature to be activated with panel actions enabled
    const creatureDataForActivation = { ...creatureToActivate, allowActivePanelActions: true };

    // Clear mating selection when activating a creature, as focus shifts
    selectedForMating = [];

    loadAndDisplayCreature(creatureDataForActivation, false, 'activation');
    // loadAndDisplayCreature calls updateStoredCreaturesDisplay, updateActiveCreatureDisplay, updateButtonState
}


export function attemptStoreActiveCreature() {
    if (!activeCreatureInstance || !activeCreatureInstance.userData) {
        alert("No active creature to store.");
        return;
    }
    const creatureDataToStore = { ...activeCreatureInstance.userData };

    // When storing, the creature is no longer "active with panel actions"
    creatureDataToStore.allowActivePanelActions = false;

    updateCreatureCanEvolveStatus(creatureDataToStore); // Ensure its evolvability is current

    const existingStoredIndex = storedCreatures.findIndex(c => c && c.uniqueId === creatureDataToStore.uniqueId);
    if (existingStoredIndex === -1) { // Not in storage yet
        if (storedCreatures.length >= cfg.MAX_STORED_CREATURES) {
            alert("Storage is full. Cannot store new creature.");
            // If storage is full, we might not want to remove the active creature from the scene,
            // allowing the user to discard it instead if they wish.
            // For now, it remains active if storage is full.
            return;
        }
        storedCreatures.push(creatureDataToStore);
    } else { // Already in storage, update it
        storedCreatures[existingStoredIndex] = creatureDataToStore;
    }

    // Remove from viewer after successful store/update.
    scene.remove(activeCreatureInstance);
    disposeGltf(activeCreatureInstance);
    activeCreatureInstance = null;

    updateActiveCreatureDisplay(); // Clears active panel
    updateStoredCreaturesDisplay(); // Refreshes storage list
    updateButtonState();
}

export function discardActiveCreature() {
    if (!activeCreatureInstance || !activeCreatureInstance.userData) {
        alert("No active creature to discard.");
        return;
    }
    if (isIncubating) {
        alert("Cannot discard a creature during incubation.");
        return;
    }

    const creatureData = activeCreatureInstance.userData;
    const confirmDiscard = confirm(`Are you sure you want to discard ${creatureData.name || 'this creature'}? This action cannot be undone.`);
    if (!confirmDiscard) {
        return;
    }

    // Remove from storage if it was ever stored
    const storedIndex = storedCreatures.findIndex(c => c && c.uniqueId === creatureData.uniqueId);
    if (storedIndex > -1) {
        storedCreatures.splice(storedIndex, 1);
    }

    // Remove from viewer
    scene.remove(activeCreatureInstance);
    disposeGltf(activeCreatureInstance);
    activeCreatureInstance = null;

    // If the discarded creature was selected for mating, clear that selection part.
    const matingIndex = selectedForMating.indexOf(creatureData.uniqueId);
    if (matingIndex > -1) {
        selectedForMating.splice(matingIndex, 1);
    }
    // If mating was fully set up with this creature, reset mating setup
    if (parent1ForMating && parent1ForMating.uniqueId === creatureData.uniqueId ||
        parent2ForMating && parent2ForMating.uniqueId === creatureData.uniqueId) {
        parent1ForMating = null;
        parent2ForMating = null;
        isHybridIncubationSetup = false;
        // If an egg was representing this pending mating, remove it too
        if (egg && !isIncubating) { // only if not currently mid-timer
             scene.remove(egg); disposeGltf(egg); egg = null;
             if(dom.hybridEggMessage) dom.hybridEggMessage.style.display = 'none';
        }
    }


    updateActiveCreatureDisplay();
    updateStoredCreaturesDisplay();
    updateButtonState();
}

export function setupMating() {
    if (selectedForMating.length !== 2) { alert("Please select two BASE (Stage 0) creatures from storage to mate."); return; }

    parent1ForMating = storedCreatures.find(c => c.uniqueId === selectedForMating[0]);
    parent2ForMating = storedCreatures.find(c => c.uniqueId === selectedForMating[1]);

    if (!parent1ForMating || !parent2ForMating) {
        alert("One or both selected creatures for mating not found. Please try again.");
        selectedForMating = []; updateStoredCreaturesDisplay(); updateButtonState(); return;
    }
    if (parent1ForMating.currentEvolutionStage !== 0 || parent2ForMating.currentEvolutionStage !== 0) {
        alert("Only BASE creatures (Stage 0) can be mated. Please deselect evolved creatures.");
        selectedForMating = []; updateStoredCreaturesDisplay(); updateButtonState(); return; // Clear selection
    }
    if (activeCreatureInstance) { alert("An active creature is in the viewer. Please store it before starting mating."); return; }
    if (!areCreaturesCompatible(parent1ForMating, parent2ForMating)) {
        alert("These two creatures are not compatible for mating based on the defined hybrid rules.");
        selectedForMating = []; updateStoredCreaturesDisplay(); updateButtonState(); return;
    }

    isHybridIncubationSetup = true; // Mark that a mating pair is ready for incubation
    if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; } // Remove any existing egg

    // Determine if the pairing will result in a purebred (same base model) or hybrid
    const p1Def = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === parent1ForMating.modelKey);
    const p2Def = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === parent2ForMating.modelKey);
    const isPurebredPairing = (p1Def && p2Def && p1Def.isPurebredLine && p2Def.isPurebredLine && p1Def.modelKey === p2Def.modelKey);

    spawnEgg(!isPurebredPairing, false); // Spawn a hybrid-colored egg if not purebred, false = don't start incubation yet

    if(dom.startIncubationButton) dom.startIncubationButton.textContent = "Incubate Mated Egg";
    updateButtonState();
    // The UI for selected creatures (highlights) is handled by updateStoredCreaturesDisplay called by toggleMatingSelection.
}

export function areCreaturesCompatible(creature1, creature2) {
    if (!creature1 || !creature2) return false;
    const def1 = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creature1.modelKey);
    const def2 = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creature2.modelKey);
    if (!def1 || !def2) { console.warn("Definitions not found for compatibility check", creature1, creature2); return false; }

    // Rule 1: Purebreds of the exact same base model are compatible
    if (def1.isPurebredLine && def2.isPurebredLine && def1.modelKey === def2.modelKey && def1.evolutionStage === 0 && def2.evolutionStage === 0) {
        return true;
    }

    // Rule 2: Hybrid compatibility based on rules
    // Ensure both are base stage (stage 0) for hybrid mating
    if (def1.evolutionStage !== 0 || def2.evolutionStage !== 0) return false;

    const parentKeys = [def1.modelKey, def2.modelKey].sort().join('+'); // Sorted key for rule lookup

    // Intra-environment hybrid check
    if (creature1.originEnvironmentKey === creature2.originEnvironmentKey) {
        if (INTRA_ENV_HYBRID_RULES[creature1.originEnvironmentKey]?.[parentKeys]) {
            return true;
        }
    }
    // Inter-environment hybrid check
    else {
        const sortedEnvKeys = [creature1.originEnvironmentKey, creature2.originEnvironmentKey].sort().join('+');
        if (INTER_ENV_HYBRID_RULES[sortedEnvKeys]?.[parentKeys]) {
            return true;
        }
    }
    return false; // Not compatible by any rule
}

// Helper accessible globally for UI updates that need it
export function formatTimeGlobal(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

export function getCreatureManagerState() {
    // Ensure parent data is just the creature data, not the full instance
    const p1Data = parent1ForMating ? { ...parent1ForMating } : null;
    const p2Data = parent2ForMating ? { ...parent2ForMating } : null;

    // Create a serializable version of eggData, including its color
    let serializableEggData = null;
    if (egg && egg.userData) {
        serializableEggData = {
            isHybrid: egg.userData.isHybrid,
            // Color should be handled by the saveLoad serialization
        };
        if (egg.userData.color instanceof THREE.Color) {
           // This will be handled by serializeCreatureForSave in saveLoad.js if we pass the whole egg.userData
           // For now, we assume eggData in gameState is simple.
        }
    }


    return {
        // Primitives and simple objects first
        nextCreatureUniqueId: nextCreatureUniqueId,
        isIncubating: isIncubating,
        timeLeftForIncubation: timeLeftForIncubation,
        isHybridIncubationSetup: isHybridIncubationSetup,
        // currentEnvironmentKey will be saved by script.js as it's a global UI state

        // Complex objects that need serialization handled by saveLoad.js
        storedCreatures: storedCreatures.map(c => ({ ...c })), // Pass copies to be serialized
        activeCreatureData: activeCreatureInstance ? { ...activeCreatureInstance.userData } : null,
        eggData: serializableEggData,
        parent1ForMatingData: p1Data,
        parent2ForMatingData: p2Data,
    };
}

export function setCreatureManagerState(loadedState) {
    if (!loadedState) {
        console.error("No state provided to setCreatureManagerState");
        resetCreatureManagerState(); // Fallback to clean slate
        return;
    }

    console.log("Setting creature manager state from loaded data:", loadedState);

    // Clear current scene objects related to creatures/eggs before applying new state
    if (activeCreatureInstance) {
        scene.remove(activeCreatureInstance);
        disposeGltf(activeCreatureInstance);
        activeCreatureInstance = null;
    }
    if (egg) {
        scene.remove(egg);
        disposeGltf(egg);
        egg = null;
    }
    if (incubationInterval) {
        clearInterval(incubationInterval);
        incubationInterval = null;
    }

    // Restore state variables - use defaults if properties are missing
    nextCreatureUniqueId = loadedState.nextCreatureUniqueId || 0;
    isIncubating = loadedState.isIncubating || false;
    timeLeftForIncubation = loadedState.timeLeftForIncubation !== undefined ? loadedState.timeLeftForIncubation : cfg.EVOLUTION_TIME_SECONDS;
    isHybridIncubationSetup = loadedState.isHybridIncubationSetup || false;

    // Creatures: Use deserializeCreatureFromLoad for consistent object creation
    storedCreatures = (loadedState.storedCreatures || []).map(cData => deserializeCreatureFromLoad(cData)).filter(c => c);
    parent1ForMating = loadedState.parent1ForMatingData ? deserializeCreatureFromLoad(loadedState.parent1ForMatingData) : null;
    parent2ForMating = loadedState.parent2ForMatingData ? deserializeCreatureFromLoad(loadedState.parent2ForMatingData) : null;
    
    selectedForMating = []; // Reset on load, user can re-select. Mating selection is transient.

    // Restore active creature if data exists
    if (loadedState.activeCreatureData) {
        const activeData = deserializeCreatureFromLoad(loadedState.activeCreatureData);
        if (activeData) {
            // The 'allowActivePanelActions' flag for an active creature from a save
            // should probably default to true if it's being made active, or be based on game logic.
            // For simplicity, let's assume it becomes active with panel actions.
            activeData.allowActivePanelActions = true;
            loadAndDisplayCreature(activeData, false, 'load_activation');
        }
    }

    // Re-spawn egg if it was present and incubation was in progress or setup
    if (loadedState.eggData && (isIncubating || isHybridIncubationSetup)) {
        let eggColorFromLoad = null;
        if (loadedState.eggData.color && typeof loadedState.eggData.color === 'string') {
             eggColorFromLoad = new THREE.Color(loadedState.eggData.color.startsWith('#') ? loadedState.eggData.color : `#${loadedState.eggData.color}`);
        } else if (loadedState.eggData.color instanceof THREE.Color) {
            eggColorFromLoad = loadedState.eggData.color;
        }

        spawnEgg(loadedState.eggData.isHybrid || false, false, eggColorFromLoad); // Spawn but don't start incubation yet
        if (isIncubating) {
            // Ensure timer display is correct for ongoing incubation
            if(dom.timerDisplay) dom.timerDisplay.textContent = `Time: ${formatTimeGlobal(timeLeftForIncubation)}`;
            // Restart incubation interval if it was running
            if (timeLeftForIncubation > 0) {
                if (incubationInterval) clearInterval(incubationInterval); // Clear any old one
                incubationInterval = setInterval(() => {
                    timeLeftForIncubation--;
                    if(dom.timerDisplay) dom.timerDisplay.textContent = `Time: ${formatTimeGlobal(timeLeftForIncubation)}`;
                    if (timeLeftForIncubation <= 0) {
                        clearInterval(incubationInterval);
                        hatchCreature(); // This needs to be context-aware of loaded state
                    }
                }, 1000);
            } else { // Timer was at 0, should hatch immediately or be in a hatched state.
                 // This case might need more thought: if timeLeft is 0, hatchCreature should have occurred.
                 // For simplicity, if loading and timeLeftForIncubation is <=0, assume creature is already hatched and active.
                 // The activeCreatureData should reflect this.
                 isIncubating = false; // It should have hatched.
            }
        }
    } else if (loadedState.eggData && !isIncubating && isHybridIncubationSetup) { // Mating was set up, egg ready, but not incubating
         let eggColorFromLoad = null;
        if (loadedState.eggData.color && typeof loadedState.eggData.color === 'string') {
             eggColorFromLoad = new THREE.Color(loadedState.eggData.color.startsWith('#') ? loadedState.eggData.color : `#${loadedState.eggData.color}`);
        } else if (loadedState.eggData.color instanceof THREE.Color) {
            eggColorFromLoad = loadedState.eggData.color;
        }
        spawnEgg(loadedState.eggData.isHybrid || false, false, eggColorFromLoad);
        if(dom.startIncubationButton) dom.startIncubationButton.textContent = "Incubate Mated Egg";
    }


    // Update all UI elements
    updateActiveCreatureDisplay();
    updateStoredCreaturesDisplay();
    if (!isIncubating) resetIncubationTimerDisplay(); // Only reset if not actively incubating
    updateButtonState();
    console.log("Creature manager state has been set from loaded data.");
}