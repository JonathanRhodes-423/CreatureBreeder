// initializers.js
import * as THREE from 'three'; // For Color objects in ambiance
import * as cfg from './config.js';
import * as dom from './domElements.js';

// These will be populated and then exported for other modules to use
export let ALL_MODEL_DEFINITIONS = [];
export let ENVIRONMENTS_DATA = [];
export let INTRA_ENV_HYBRID_RULES = {};
export let INTER_ENV_HYBRID_RULES = {};


export function parseModelList() {
    ALL_MODEL_DEFINITIONS.length = 0; // Clear existing before parsing

    cfg.RAW_MODEL_GROUPS_DATA.forEach(group => {
        const currentOrigin = group.origin;
        const lines = group.models.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            const itemMatch = line.match(/^(\d+)\.\s*(.+)/);
            if (!itemMatch) return;

            const id = parseInt(itemMatch[1]);
            let fullName = itemMatch[2].trim();
            let modelKey = "";
            let expectedFilename = "";
            let speciesName = "";
            let evolutionStage = 0;

            const baseMatch = fullName.match(/^([^\(]+?)\s*\(Base Model\)/i);
            const ev1Match = fullName.match(/^([A-Za-z\s]+?)\s+([A-Za-z]+?)\s*\(EV1 Model\)/i);
            const ev2Match = fullName.match(/^([A-Za-z\s]+?)\s+([A-Za-z]+?)\s*\(EV2 Model\)/i);

            if (baseMatch) {
                speciesName = baseMatch[1].trim();
                evolutionStage = 0;
                modelKey = `${speciesName.toUpperCase().replace(/\s+/g, '_')}_BASE`;
                expectedFilename = `${speciesName}.glb`;
            } else if (ev1Match) {
                speciesName = ev1Match[2].trim();
                let moniker = ev1Match[1].trim();
                evolutionStage = 1;
                modelKey = `${moniker.toUpperCase().replace(/\s+/g, '_')}_${speciesName.toUpperCase().replace(/\s+/g, '_')}_EV1`;
                expectedFilename = `${moniker} ${speciesName}.glb`;
            } else if (ev2Match) {
                speciesName = ev2Match[2].trim();
                let moniker = ev2Match[1].trim();
                evolutionStage = 2;
                modelKey = `${moniker.toUpperCase().replace(/\s+/g, '_')}_${speciesName.toUpperCase().replace(/\s+/g, '_')}_EV2`;
                expectedFilename = `${moniker} ${speciesName}.glb`;
            } else {
                console.warn(`Could not parse purebred line: ${fullName}`);
                speciesName = fullName;
                modelKey = `${speciesName.toUpperCase().replace(/\s+/g, '_')}_UNKNOWN`;
                expectedFilename = `${speciesName}.glb`;
            }

            modelKey = modelKey.replace(/[^A-Z0-9_]/gi, '').toUpperCase();
            if (!expectedFilename.toLowerCase().endsWith('.glb')) {
                 expectedFilename += ".glb";
            }
            ALL_MODEL_DEFINITIONS.push({
                id, fullName, modelKey, expectedFilename, speciesName, evolutionStage,
                originEnvironmentName: currentOrigin,
                isPurebredLine: true, isSpecificHybrid: false, hybridType: null,
            });
        });
    });

    const hybridLines = cfg.RAW_HYBRID_MODELS_TEXT.split('\n');
    hybridLines.forEach(line => {
        line = line.trim();
        if (!line) return;
        const itemMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (!itemMatch) return;

        const id = parseInt(itemMatch[1]);
        const fullName = itemMatch[2].trim();
        const modelKey = `${fullName.toUpperCase().replace(/\s+/g, '_')}_HYBRID_BASE`;
        const expectedFilename = `${fullName}.glb`;

        ALL_MODEL_DEFINITIONS.push({
            id, fullName, modelKey, expectedFilename,
            speciesName: fullName,
            evolutionStage: 0,
            originEnvironmentName: null,
            isPurebredLine: false,
            isSpecificHybrid: true,
            hybridType: (id >= 73 && id <= 96) ? 'intra' : 'inter',
        });
    });
    console.log("Model list parsed and ALL_MODEL_DEFINITIONS populated.");
}

export async function fetchAndParseEnvironments() { // Changed to async if actual fetching happens
    try {
        const sections = cfg.RAW_ENVIRONMENTS_TEXT.split(/\n\s*\n/);
        let idCounter = 1;
        ENVIRONMENTS_DATA.length = 0; // Clear existing
        sections.forEach(section => {
            const lines = section.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 3) return;

            const nameMatch = lines[0].match(/^\d*\.?\s*(.+)/);
            const tempMatch = lines.find(l => l.startsWith("Temperature:"))?.match(/Temperature:\s*(-?\d+)°F to (-?\d+)°F/);

            if (nameMatch && tempMatch) {
                const name = nameMatch[1].trim();
                const baseAmbianceData = [
                    { namePrefix: "Abyssal Marsh", colors: { backgroundColor: new THREE.Color(0x101810), fogColor: new THREE.Color(0x182818), lightColor: new THREE.Color(0x405040), creatureColor: new THREE.Color(0x334433) } },
                    { namePrefix: "Scorching Basin", colors: { backgroundColor: new THREE.Color(0xD2691E), fogColor: new THREE.Color(0xFFB732), lightColor: new THREE.Color(0xFFFACD), creatureColor: new THREE.Color(0x8B4513) } },
                    { namePrefix: "Cloudspine Plateau", colors: { backgroundColor: new THREE.Color(0xADD8E6), fogColor: new THREE.Color(0xF0F8FF), lightColor: new THREE.Color(0xFFFFFF), creatureColor: new THREE.Color(0xB0C4DE) } },
                    { namePrefix: "Verdant Lowlands", colors: { backgroundColor: new THREE.Color(0x228B22), fogColor: new THREE.Color(0x3CB371), lightColor: new THREE.Color(0xFFFFE0), creatureColor: new THREE.Color(0x006400) } },
                    { namePrefix: "Frozen Stratoscape", colors: { backgroundColor: new THREE.Color(0x4A708B), fogColor: new THREE.Color(0xCAE1FF), lightColor: new THREE.Color(0xFFFFFF), creatureColor: new THREE.Color(0x7AC5CD) } },
                    { namePrefix: "Obsidian Wastes", colors: { backgroundColor: new THREE.Color(0x282828), fogColor: new THREE.Color(0x383838), lightColor: new THREE.Color(0xA9A9A9), creatureColor: new THREE.Color(0x483D8B) } },
                    { namePrefix: "Twilight Fenlands", colors: { backgroundColor: new THREE.Color(0x191970), fogColor: new THREE.Color(0x2F2F8F), lightColor: new THREE.Color(0x00FFFF), creatureColor: new THREE.Color(0x505090) } },
                    { namePrefix: "Alpine Bloom", colors: { backgroundColor: new THREE.Color(0xE6E6FA), fogColor: new THREE.Color(0xFFFFFF), lightColor: new THREE.Color(0xFFFFF0), creatureColor: new THREE.Color(0xFFB6C1) } }
                ].find(e => name.startsWith(e.namePrefix));

                ENVIRONMENTS_DATA.push({
                    id: idCounter++,
                    key: name.toUpperCase().replace(/\s+/g, '_'),
                    name: name,
                    tempMin: parseInt(tempMatch[1]),
                    tempMax: parseInt(tempMatch[2]),
                    ambiance: baseAmbianceData ? baseAmbianceData.colors : { backgroundColor: new THREE.Color(0x555555), fogColor: new THREE.Color(0x666666), lightColor: new THREE.Color(0xffffff), creatureColor: new THREE.Color(0x888888) }
                });
            }
        });
        console.log("Environments fetched/parsed and ENVIRONMENTS_DATA populated.");
    } catch (error) {
        console.error("Failed to fetch or parse Environments.txt:", error);
    }
}

export function setupHybridRules() {
    const getBaseModelKey = (speciesName, originEnvName) => {
        const model = ALL_MODEL_DEFINITIONS.find(m => m.speciesName === speciesName && m.evolutionStage === 0 && m.originEnvironmentName === originEnvName && m.isPurebredLine);
        return model ? model.modelKey : null;
    };
    const getHybridModelKey = (hybridFullName) => {
        const model = ALL_MODEL_DEFINITIONS.find(m => m.fullName === hybridFullName && m.isSpecificHybrid);
        return model ? model.modelKey : null;
    };

    const envMap = {};
    ENVIRONMENTS_DATA.forEach(env => envMap[env.name] = env.key);

    // Clear existing rules
    for (const key in INTRA_ENV_HYBRID_RULES) delete INTRA_ENV_HYBRID_RULES[key];
    for (const key in INTER_ENV_HYBRID_RULES) delete INTER_ENV_HYBRID_RULES[key];


    cfg.INTRA_HYBRID_SETUP_DATA.forEach(group => {
        const envName = group.env;
        const envKey = envMap[envName];
        if (!envKey) { console.error(`setupHybridRules: Unknown env name ${envName} for intra rules.`); return; }
        INTRA_ENV_HYBRID_RULES[envKey] = INTRA_ENV_HYBRID_RULES[envKey] || {};
        group.pairs.forEach(pair => {
            const p1BaseKey = getBaseModelKey(pair[0], envName);
            const p2BaseKey = getBaseModelKey(pair[1], envName);
            const hybridKey = getHybridModelKey(pair[2]);
            if (p1BaseKey && p2BaseKey && hybridKey) INTRA_ENV_HYBRID_RULES[envKey][[p1BaseKey, p2BaseKey].sort().join('+')] = hybridKey;
            else console.warn(`Could not establish intra-hybrid rule for ${pair[0]}/${pair[1]} -> ${pair[2]} in ${envName}`);
        });
    });

    cfg.INTER_HYBRID_SETUP_DATA.forEach(group => {
        const env1Name = group.env1;
        const env2Name = group.env2;
        const env1Key = envMap[env1Name];
        const env2Key = envMap[env2Name];

        if (!env1Key || !env2Key) { console.error(`Inter-Rule Error: Unknown env names ${env1Name}/${env2Name}`); return; }
        const sortedEnvKeys = [env1Key, env2Key].sort().join('+');
        INTER_ENV_HYBRID_RULES[sortedEnvKeys] = INTER_ENV_HYBRID_RULES[sortedEnvKeys] || {};

        group.results.forEach(res => {
            const p1Name = res[0]; const p2Name = res[1]; const hybridName = res[2];
            // Important: Determine which parent comes from which environment for getBaseModelKey
            // This logic might need adjustment if your INTER_HYBRID_SETUP_DATA structure implies specific parent-env linkage
            const p1BaseKey = getBaseModelKey(p1Name, env1Name) || getBaseModelKey(p1Name, env2Name);
            const p2BaseKey = getBaseModelKey(p2Name, env2Name) || getBaseModelKey(p2Name, env1Name);
            const hybridKey = getHybridModelKey(hybridName);

            if (p1BaseKey && p2BaseKey && hybridKey) INTER_ENV_HYBRID_RULES[sortedEnvKeys][[p1BaseKey, p2BaseKey].sort().join('+')] = hybridKey;
            else console.warn(`Could not establish inter-hybrid rule for ${p1Name}/${p2Name} -> ${hybridName} between ${env1Name}/${env2Name}`);
        });
    });
    console.log("Hybrid rules set up.");
}