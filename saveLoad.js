// saveLoad.js
import * as THREE from 'three'; // For THREE.Color deserialization if handled here

// Helper to serialize creature data, converting THREE.Color to hex
// Ensure this matches the structure your backend expects/sends
function serializeCreatureForSave(creatureData) {
    if (!creatureData) return null;
    const serialized = { ...creatureData };
    if (serialized.color && serialized.color instanceof THREE.Color) {
        serialized.color = serialized.color.getHexString(); // Store as 'RRGGBB'
    }
    // Remove any non-serializable or runtime-specific properties
    delete serialized.allowActivePanelActions;
    // Add any other transformations needed before sending to backend
    return serialized;
}

// Helper to deserialize creature data from backend, converting hex color back to THREE.Color
export function deserializeCreatureFromLoad(serializedData) {
    if (!serializedData) return null;
    const deserialized = { ...serializedData };
    if (deserialized.color && typeof deserialized.color === 'string') {
        // Ensure color string is prefixed with '#' if not already
        deserialized.color = new THREE.Color(deserialized.color.startsWith('#') ? deserialized.color : `#${deserialized.color}`);
    }
    deserialized.allowActivePanelActions = false; // Default for loaded creatures
    return deserialized;
}

export async function saveGameState(username, gameState) {
    if (!username || !gameState) {
        console.error("Username or gameState is missing for save.");
        return { success: false, message: "Missing username or game data." };
    }

    // Serialize parts of the game state that need it (like creatures)
    const stateToSave = {
        ...gameState, // Includes primitives like nextCreatureUniqueId, isIncubating, etc.
        storedCreatures: gameState.storedCreatures.map(c => serializeCreatureForSave(c)).filter(c => c !== null),
        activeCreatureData: serializeCreatureForSave(gameState.activeCreatureData),
        parent1ForMatingData: serializeCreatureForSave(gameState.parent1ForMatingData),
        parent2ForMatingData: serializeCreatureForSave(gameState.parent2ForMatingData),
        // Egg data might be just flags or simple serializable data
        eggData: gameState.eggData ? { ...gameState.eggData } : null,
    };
    // Ensure color isn't lost from eggData if it's a simple object and not a creature object
    if (stateToSave.eggData && stateToSave.eggData.color && stateToSave.eggData.color instanceof THREE.Color) {
        stateToSave.eggData.color = stateToSave.eggData.color.getHexString();
    }


    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, gameState: stateToSave }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to save game. Server error.' }));
            console.error('Save game error:', response.status, errorData.message);
            return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
        }
        console.log(`Game saved for user: ${username} via API`);
        return { success: true, message: 'Game saved successfully!' };
    } catch (error) {
        console.error("Network or other error saving game state:", error);
        return { success: false, message: `Network error: ${error.message}` };
    }
}

export async function loadGameState(username) {
    if (!username) return { success: false, data: null, message: "Username required for load." };
    try {
        const response = await fetch(`/api/load/${username}`);
        if (!response.ok) {
            if (response.status === 404) {
                 return { success: false, data: null, message: `No save game found for ${username}.` };
            }
            const errorData = await response.json().catch(() => ({ message: 'Failed to load game. Server error.' }));
            console.error('Load game error:', response.status, errorData.message);
            return { success: false, data: null, message: errorData.message || `HTTP error! status: ${response.status}` };
        }
        const rawLoadedState = await response.json();

        // Deserialize parts of the game state
        const deserializedState = {
            ...rawLoadedState,
            storedCreatures: rawLoadedState.storedCreatures.map(sc => deserializeCreatureFromLoad(sc)),
            activeCreatureData: deserializeCreatureFromLoad(rawLoadedState.activeCreatureData),
            parent1ForMatingData: deserializeCreatureFromLoad(rawLoadedState.parent1ForMatingData),
            parent2ForMatingData: deserializeCreatureFromLoad(rawLoadedState.parent2ForMatingData),
        };
         if (deserializedState.eggData && deserializedState.eggData.color && typeof deserializedState.eggData.color === 'string') {
            deserializedState.eggData.color = new THREE.Color(deserializedState.eggData.color.startsWith('#') ? deserializedState.eggData.color : `#${deserializedState.eggData.color}`);
        }

        console.log(`Game loaded for user: ${username} via API`);
        return { success: true, data: deserializedState, message: "Game loaded." };
    } catch (error) {
        console.error("Network or other error loading game state:", error);
        return { success: false, data: null, message: `Network error: ${error.message}` };
    }
}

export async function getSavedUsernames() {
    try {
        const response = await fetch('/api/games');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to get saved games. Server error.' }));
            console.error('Get saved usernames error:', response.status, errorData.message);
            return { success: false, data: [], message: errorData.message || `HTTP error! status: ${response.status}` };
        }
        const usernames = await response.json(); // Expects an array of strings e.g. ["user1", "user2"]
        return { success: true, data: usernames, message: "Usernames fetched." };
    } catch (error) {
        console.error("Network or other error getting saved usernames:", error);
        return { success: false, data: [], message: `Network error: ${error.message}` };
    }
}

// Optional: Delete function (if you implement this on the backend)
export async function deleteSaveGame(username) {
    try {
        const response = await fetch(`/api/delete/${username}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete game. Server error.' }));
            return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
        }
        console.log(`Save game for ${username} deleted via API.`);
        return { success: true, message: 'Game deleted successfully.' };
    } catch (error) {
        console.error(`Network or other error deleting save game for ${username}:`, error);
        return { success: false, message: `Network error: ${error.message}` };
    }
}