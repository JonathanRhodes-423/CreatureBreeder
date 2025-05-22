import * as dom from '../ui/domElements.js'; // You'll add terminal elements to domElements.js
import { STORY_DATA } from '../config.js'; // Or wherever you place story JSON

// (In domElements.js, add these)
// export const storyTerminalPanel = document.getElementById('story-terminal-panel');
// export const storyTextArea = document.getElementById('story-text-area');
// export const storyNextButton = document.getElementById('story-next-button');
// export const storyBackButton = document.getElementById('story-back-button');
// export const storyCloseButton = document.getElementById('story-close-button');

let storyData = STORY_DATA; // Load initial story data
let currentChapter;
let currentEntryIndex;

export function initializeStoryManager() {
    // Potentially load progress from localStorage if you implement saving
    loadChapter(storyData.playerProgress.currentChapterId, storyData.playerProgress.currentEntryIndex);

    dom.storyNextButton.addEventListener('click', nextStoryEntry);
    dom.storyBackButton.addEventListener('click', previousStoryEntry);
    dom.storyCloseButton.addEventListener('click', hideStoryTerminal);
    updateButtonStates();
}

function loadChapter(chapterId, entryIndex = 0) {
    const chapter = storyData.chapters.find(ch => ch.id === chapterId);
    if (chapter && storyData.playerProgress.unlockedChapters.includes(chapterId)) {
        currentChapter = chapter;
        currentEntryIndex = entryIndex;
        storyData.playerProgress.currentChapterId = chapterId;
        storyData.playerProgress.currentEntryIndex = entryIndex;
        displayCurrentEntry();
    } else {
        console.warn(`Chapter ${chapterId} not found or not unlocked.`);
        hideStoryTerminal(); // Hide if no valid chapter
    }
}

function displayCurrentEntry() {
    if (currentChapter && currentChapter.entries[currentEntryIndex]) {
        dom.storyTextArea.textContent = currentChapter.entries[currentEntryIndex].text;
        updateButtonStates();
    }
}

export function showStoryTerminal() {
    dom.storyTerminalPanel.classList.add('story-terminal-visible');
}

export function hideStoryTerminal() {
    dom.storyTerminalPanel.classList.remove('story-terminal-visible');
}

function nextStoryEntry() {
    if (!currentChapter) return;
    if (currentEntryIndex < currentChapter.entries.length - 1) {
        currentEntryIndex++;
        storyData.playerProgress.currentEntryIndex = currentEntryIndex;
        displayCurrentEntry();
    } else {
        // Potentially try to unlock and move to the next chapter if conditions are met
        // Or indicate end of current available story
        console.log("End of chapter or current story segment.");
    }
    updateButtonStates();
}

function previousStoryEntry() {
    if (!currentChapter) return;
    if (currentEntryIndex > 0) {
        currentEntryIndex--;
        storyData.playerProgress.currentEntryIndex = currentEntryIndex;
        displayCurrentEntry();
    }
    updateButtonStates();
}

function updateButtonStates() {
    if (!currentChapter) {
        dom.storyBackButton.disabled = true;
        dom.storyNextButton.disabled = true;
        return;
    }
    dom.storyBackButton.disabled = currentEntryIndex === 0;
    // Disable next if it's the last entry of the current chapter
    // AND no further chapters are unlocked or conditions aren't met for the next one.
    // This logic needs to be more robust based on your chapter progression rules.
    dom.storyNextButton.disabled = currentEntryIndex >= currentChapter.entries.length - 1;
}

export function triggerStoryEvent(eventName, eventData = {}) {
    console.log(`Story event triggered: ${eventName}`, eventData);
    if (!storyData.playerProgress.completedEvents.includes(eventName)) {
        storyData.playerProgress.completedEvents.push(eventName);
        // Save progress if you have localStorage
    }

    const nextChapter = storyData.chapters.find(ch => ch.triggerEvent === eventName && !storyData.playerProgress.unlockedChapters.includes(ch.id));

    if (nextChapter) {
        // Check other unlock conditions if any
        if (canUnlockChapter(nextChapter)) {
            unlockChapter(nextChapter.id);
            loadChapter(nextChapter.id);
            showStoryTerminal();
        }
    }
}

function canUnlockChapter(chapter) {
    // Implement more complex unlock logic here if needed
    // e.g., check if previous chapters are complete, or specific game criteria are met
    if (chapter.unlockConditionRequired && !storyData.playerProgress.completedEvents.includes(chapter.triggerEvent)) {
        return false;
    }
    // Check if previous chapters in a sequence are unlocked if that's a rule
    return true;
}

function unlockChapter(chapterId) {
    if (!storyData.playerProgress.unlockedChapters.includes(chapterId)) {
        storyData.playerProgress.unlockedChapters.push(chapterId);
        console.log(`Chapter ${chapterId} unlocked.`);
        // Save progress
    }
}

// Call this function when the game starts or after loading game state
export function checkAndLoadInitialStory() {
    loadChapter(storyData.playerProgress.currentChapterId, storyData.playerProgress.currentEntryIndex);
    // Decide if terminal should be shown on load based on game state
    // For example, if they are in the middle of an unclosed story segment
    //showStoryTerminal();
}