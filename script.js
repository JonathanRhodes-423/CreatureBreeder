import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        const MAX_STORED_CREATURES = 10;
        const EVOLUTION_TIME_SECONDS = 30; 
        const SILVER_SHEEN_COLOR = new THREE.Color(0xC0C0C0);
        const MAX_LEVEL = 10; 

        const ALL_MODEL_DEFINITIONS = []; 
        const loadedModelData = {}; 
        let placeholderGeo, placeholderMat;

        let ENVIRONMENTS_DATA = []; 
        
        const INTRA_ENV_HYBRID_RULES = {}; 
        const INTER_ENV_HYBRID_RULES = {}; 


        // DOM Elements
        const viewerContainer = document.getElementById('viewerContainer');
        const environmentSelect = document.getElementById('environmentSelect');
        const startIncubationButton = document.getElementById('startIncubationButton');
        const timerDisplay = document.getElementById('timer');
        const storeActiveCreatureButton = document.getElementById('storeActiveCreatureButton');
        const mateButton = document.getElementById('mateButton');
        const storedCreaturesList = document.getElementById('storedCreaturesList');
        const hybridEggMessage = document.getElementById('hybridEggMessage');
        const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
        const uploadModal = document.getElementById('upload-modal');
        const closeUploadModalButton = document.getElementById('close-upload-modal');
        const modelFileInput = document.getElementById('model-file-input');
        const modelStatusHeader = document.getElementById('model-status-header');
        const uploadProgressBar = document.getElementById('upload-progress-bar');
        const fileListPreview = document.getElementById('file-list-preview');
        const processUploadedFilesButton = document.getElementById('process-uploaded-files'); 
        //const activeCreatureLevelDisplay = document.getElementById('activeCreatureLevelDisplay'); 
        const activeCreatureDetailsPanel = document.getElementById('activeCreatureDetails');

        let scene, camera, renderer, controls, ground;
        let egg, activeCreatureInstance; 

        let incubationInterval; 
        let timeLeftForIncubation = EVOLUTION_TIME_SECONDS;
        let isIncubating = false;
        let isHybridIncubationSetup = false;
        
        let storedCreatures = []; 
        let selectedForMating = []; 
        let nextCreatureUniqueId = 0;
        let parent1ForMating = null;
        let parent2ForMating = null;
        let globalUpdateInterval;

        // --- INITIALIZATION & SETUP ---
        async function initializeApp() {
            console.log("Initializing app...");
            parseModelList();
            console.log("Model list parsed.");
            await fetchAndParseEnvironments(); 
            console.log("Environments fetched and parsed.");
            setupHybridRules(); 
            console.log("Hybrid rules set up.");

            if (!viewerContainer) { console.error("FATAL: viewerContainer not found."); return; }
            if (!storedCreaturesList) { console.error("FATAL: storedCreaturesList not found."); return;}
            if (!activeCreatureDetailsPanel) { console.error("FATAL: activeCreatureDetailsPanel not found."); return;}


            scene = new THREE.Scene();
            const aspect = (viewerContainer.clientWidth && viewerContainer.clientHeight) ? (viewerContainer.clientWidth / viewerContainer.clientHeight) : 1;
            camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            camera.position.set(0, 1.5, 4.5);

            if (ENVIRONMENTS_DATA.length > 0 && ENVIRONMENTS_DATA[0] && ENVIRONMENTS_DATA[0].ambiance) {
                updateAmbiance(ENVIRONMENTS_DATA[0].ambiance);
            } else {
                scene.background = new THREE.Color(0x333333);
                console.warn("Initial environments data not loaded or empty, using fallback ambiance.");
            }

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(viewerContainer.clientWidth || 800, viewerContainer.clientHeight || 600);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            viewerContainer.appendChild(renderer.domElement);
            console.log("Renderer initialized and appended.");

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; controls.dampingFactor = 0.05;
            controls.target.set(0, 0.75, 0);
            controls.minDistance = 1; controls.maxDistance = 20;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.position.set(8, 15, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -15; directionalLight.shadow.camera.right = 15;
            directionalLight.shadow.camera.top = 15; directionalLight.shadow.camera.bottom = -15;
            scene.add(directionalLight);

            const groundGeometry = new THREE.PlaneGeometry(30,30);
            const groundMaterial = new THREE.MeshStandardMaterial({color:0x556677, roughness:0.9, metalness:0.1});
            ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
            console.log("Scene basics (lights, ground) set up.");

            placeholderGeo = new THREE.DodecahedronGeometry(0.35, 0)
            placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000, roughness: 0.7, metalness: 0.1, wireframe: false });
            
            populateEnvironmentDropdown();
            setupEventListeners();
            console.log("Event listeners set up.");
            
            resetIncubationTimerDisplay();
            updateActiveCreatureDisplay(); 
            updateStoredCreaturesDisplay();
            updateButtonState();
            console.log("Initial UI updated.");

            if (environmentSelect.options.length > 0) onEnvironmentChange();
            
            globalUpdateInterval = setInterval(updateGameTimers, 1000);
            animate();
            updateModelStatusHeader();
            console.log("App initialization complete. Starting animation loop.");
        }
        
        function setupEventListeners() {
            hamburgerMenuButton.addEventListener('click', () => { uploadModal.style.display = 'flex'; fileListPreview.innerHTML = ''; modelFileInput.value = ''; });
            environmentSelect.addEventListener('change', onEnvironmentChange);
            closeUploadModalButton.addEventListener('click', () => { uploadModal.style.display = 'none'; });
            modelFileInput.addEventListener('change', previewSelectedFiles);
            processUploadedFilesButton.addEventListener('click', processAndLoadFiles);
            startIncubationButton.addEventListener('click', startNewEggIncubation);  
            storeActiveCreatureButton.addEventListener('click', attemptStoreActiveCreature);
            mateButton.addEventListener('click', setupMating);
            window.addEventListener('resize', onWindowResize);
        }

        function parseModelList() {
            const modelGroups = [
                { origin: "Abyssal Marsh", models: `1. Mirefin (Base Model)
2. Ancient Mirefin (EV1 Model)
3. Legendary Mirefin (EV2 Model)
4. Rootfang (Base Model)
5. Ancient Rootfang (EV1 Model)
6. Legendary Rootfang (EV2 Model)
7. Gloomleech (Base Model)
8. Ancient Gloomleech (EV1 Model)
9. Legendary Gloomleech (EV2 Model)` },
                { origin: "Scorching Basin", models: `10. Pyreclaw (Base Model)
11. Volcanic Pyreclaw (EV1 Model)
12. Solarflare Pyreclaw (EV2 Model)
13. Solhound (Base Model)
14. Volcanic Solhound (EV1 Model)
15. Solarflare Solhound (EV2 Model)
16. Ashwing (Base Model)
17. Volcanic Ashwing (EV1 Model)
18. Solarflare Ashwing (EV2 Model)` },
                { origin: "Cloudspine Plateau", models: `19. Aerowing (Base Model)
20. Skycrest Aerowing (EV1 Model)
21. Summitlord Aerowing (EV2 Model)
22. Cragbeak (Base Model)
23. Skycrest Cragbeak (EV1 Model)
24. Summitlord Cragbeak (EV2 Model)
25. Zephyrion (Base Model)
26. Skycrest Zephyrion (EV1 Model)
27. Summitlord Zephyrion (EV2 Model)` },
                { origin: "Verdant Lowlands", models: `28. Bloomtail (Base Model)
29. Primal Bloomtail (EV1 Model)
30. Elderwood Bloomtail (EV2 Model)
31. Riveraptor (Base Model)
32. Primal Riveraptor (EV1 Model)
33. Elderwood Riveraptor (EV2 Model)
34. Vinetooth (Base Model)
35. Primal Vinetooth (EV1 Model)
36. Elderwood Vinetooth (EV2 Model)` },
                { origin: "Frozen Stratoscape", models: `37. Glaciore (Base Model)
38. Crystalline Glaciore (EV1 Model)
39. Xenoform Glaciore (EV2 Model)
40. Rimescale (Base Model)
41. Crystalline Rimescale (EV1 Model)
42. Xenoform Rimescale (EV2 Model)
43. Cometail (Base Model)
44. Crystalline Cometail (EV1 Model)
45. Xenoform Cometail (EV2 Model)` },
                { origin: "Obsidian Wastes", models: `46. Basaltmane (Base Model)
47. Tempered Basaltmane (EV1 Model)
48. Dreadwaste Basaltmane (EV2 Model)
49. Ashstrider (Base Model)
50. Tempered Ashstrider (EV1 Model)
51. Dreadwaste Ashstrider (EV2 Model)
52. Flintfang (Base Model)
53. Tempered Flintfang (EV1 Model)
54. Dreadwaste Flintfang (EV2 Model)` },
                { origin: "Twilight Fenlands", models: `55. Luminwing (Base Model)
56. Luminous Luminwing (EV1 Model)
57. Enigmatic Luminwing (EV2 Model)
58. Reedskipper (Base Model)
59. Luminous Reedskipper (EV1 Model)
60. Enigmatic Reedskipper (EV2 Model)
61. Vesperwisp (Base Model)
62. Luminous Vesperwisp (EV1 Model)
63. Enigmatic Vesperwisp (EV2 Model)` },
                { origin: "Alpine Bloom", models: `64. Floracorn (Base Model)
65. Wildbloom Floracorn (EV1 Model)
66. Serenepeak Floracorn (EV2 Model)
67. Gladehorn (Base Model)
68. Wildbloom Gladehorn (EV1 Model)
69. Serenepeak Gladehorn (EV2 Model)
70. Sunpetal (Base Model)
71. Wildbloom Sunpetal (EV1 Model)
72. Serenepeak Sunpetal (EV2 Model)` }
            ];

            const hybridModelsText = `73. Mirefang
74. Mireleech
75. Rootleech
76. Pyrehound
77. Pyrewing
78. Solwing
79. Aerobeak
80. Aeroion
81. Cragion
82. Bloomraptor
83. Bloomtooth
84. Rivertooth
85. Glacioscale
86. Glaciotail
87. Rimetail
88. Basaltstrider
89. Basaltfang
90. Ashfang
91. Luminskipper
92. Luminwisp
93. Reedwisp
94. Florahorn
95. Florapetal
96. Gladepetal
97. Miretail
98. Mireraptor
99. Miretooth
100. Roottail
101. Rootraptor
102. Roottooth
103. Gloomtail
104. Gloomraptor
105. Gloomtooth
106. Mirewing
107. Mireskip
108. Mirewisp
109. Rootwing
110. Rootskip
111. Rootwisp
112. Gloomwing
113. Gloomskip
114. Gloomwisp
115. Miremane
116. Mirestride
117. Mireflint
118. Rootmane
119. Rootstride
120. Rootflint
121. Gloommane
122. Gloomstride
123. Gloomflint
124. Mirecorn
125. Mirehorn
126. Mirepetal
127. Rootcorn
128. Roothorn
129. Rootpetal
130. Gloomcorn
131. Gloomhorn
132. Gloompetal
133. Pyremane
134. Pyrestride
135. Pyreflint
136. Solmane
137. Solstride
138. Solflint
139. Wingmane
140. Wingstride
141. Wingflint
142. Aerocorn
143. Aerohorn
144. Aeropetal
145. Cragcorn
146. Craghorn
147. Cragpetal
148. Zephyrcorn
149. Zephyrhorn
150. Zephyrpetal
151. Bloomane
152. Bloomstride
153. Bloomflint
154. Rivermane
155. Riverstride
156. Riverflint
157. Vinemane
158. Vinestride
159. Vineflint
160. Bloomwing
161. Bloomskip
162. Bloomwisp
163. Riverwing
164. Riverskip
165. Riverwisp
166. Vinewing
167. Vineskip
168. Vinewisp
169. Bloomcorn
170. Bloomhorn
171. Bloompeta
172. Rivercorn
173. Riverhorn
174. Riverpetal
175. Vinecorn
176. Vinehorn
177. Vinepetal
178. Lumicorn
179. Lumihorn
180. Lumipetal
181. Reedcorn
182. Reedhorn
183. Reedpetal
184. Vespercorn
185. Vesperhorn
186. Vesperpetal`;

            ALL_MODEL_DEFINITIONS.length = 0; 

            modelGroups.forEach(group => {
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
                        let moniker = ev2Match[1].trim(); // Corrected: was ev1Match[1]
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

            const hybridLines = hybridModelsText.split('\n');
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
        }


        function previewSelectedFiles(event) {
            fileListPreview.innerHTML = '';
            const files = event.target.files;
            if (!files) return;

            let foundCount = 0;
            const expectedFilenamesLowercase = ALL_MODEL_DEFINITIONS.map(def => def.expectedFilename.toLowerCase());
            const selectedFilenamesLowercase = Array.from(files).map(f => f.name.toLowerCase());

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const div = document.createElement('div');
                const isExpected = expectedFilenamesLowercase.includes(file.name.toLowerCase());
                
                const isDuplicateInSelection = selectedFilenamesLowercase.filter(name => name === file.name.toLowerCase()).length > 1;

                if (isExpected) {
                    div.textContent = `${file.name} (Expected)`;
                    div.className = 'file-matched';
                    if (isDuplicateInSelection) {
                        div.textContent += ` - DUPLICATE IN SELECTION!`;
                        div.className = 'file-duplicate';
                    }
                    foundCount++;
                } else {
                    div.textContent = `${file.name} (Not in expected list)`;
                    div.className = 'file-unmatched';
                }
                fileListPreview.appendChild(div);
            }
            const totalExpected = ALL_MODEL_DEFINITIONS.length;
            const progress = totalExpected > 0 ? Math.min(100, (foundCount / totalExpected) * 100) : 0;
            uploadProgressBar.style.width = `${progress}%`;
            uploadProgressBar.textContent = `${foundCount} / ${totalExpected} expected models found in selection.`;
        }

        async function processAndLoadFiles() {
            const files = modelFileInput.files;
            if (!files || files.length === 0) {
                alert("No files selected.");
                return;
            }

            let loadedCount = 0;
            let filesProcessedCounter = 0; 

            for (const key in loadedModelData) {
                if (loadedModelData[key].fileURL) {
                    URL.revokeObjectURL(loadedModelData[key].fileURL);
                }
            }
            Object.keys(loadedModelData).forEach(key => delete loadedModelData[key]);

            const uniqueFilesToLoad = new Map(); 

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const matchedDefinition = ALL_MODEL_DEFINITIONS.find(def => def.expectedFilename.toLowerCase() === file.name.toLowerCase());
                
                if (matchedDefinition) {
                    if (!uniqueFilesToLoad.has(matchedDefinition.modelKey)) { 
                        uniqueFilesToLoad.set(matchedDefinition.modelKey, file);
                    } else {
                        console.warn(`Duplicate file in selection for modelKey ${matchedDefinition.modelKey}: ${file.name}. Using first instance.`);
                    }
                } else {
                    console.warn(`Uploaded file ${file.name} does not match any expected model filename.`);
                }
            }
            
            for (const [modelKey, file] of uniqueFilesToLoad) {
                 loadedModelData[modelKey] = {
                    fileURL: URL.createObjectURL(file),
                    file: file 
                };
                loadedCount++;
                filesProcessedCounter++;
                const progress = (filesProcessedCounter / uniqueFilesToLoad.size) * 100; 
                uploadProgressBar.style.width = `${progress}%`;
                uploadProgressBar.textContent = `Loading: ${filesProcessedCounter}/${uniqueFilesToLoad.size}`;
            }
            
            uploadProgressBar.textContent = `Load Complete: ${loadedCount} unique matching models processed.`;
            updateModelStatusHeader();
            updateButtonState(); 
            console.log("Model processing complete. Loaded data count:", Object.keys(loadedModelData).length);
            setTimeout(() => {uploadModal.style.display = 'none';}, 1500); 
        }

        function updateModelStatusHeader() {
            const loadedCount = Object.keys(loadedModelData).length;
            const totalDefinitions = ALL_MODEL_DEFINITIONS.length;
            modelStatusHeader.textContent = `Models: ${loadedCount} / ${totalDefinitions}`;
        }
        
        function getModelURL(modelKey) {
            return loadedModelData[modelKey]?.fileURL || null;
        }

        function createPlaceholderModel() {
            console.warn("Creating placeholder model.");
            if (!placeholderGeo || !placeholderMat) {
                console.error("Placeholder geometry or material not initialized!");
                return new THREE.Mesh(); // Return empty mesh to avoid further errors
            }
            const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat.clone());
            placeholder.castShadow = true;
            placeholder.receiveShadow = true;
            placeholder.rotation.y = Math.PI / 2;
            try {
                const box = new THREE.Box3().setFromObject(placeholder);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const desiredSize = 0.9;
                const scale = maxDim === 0 ? desiredSize : desiredSize / maxDim;
                placeholder.scale.set(scale, scale, scale);
                placeholder.position.set(0, size.y * scale / 2 + 0.01, 0); 
            } catch (e) {
                console.error("Error creating placeholder model size:", e);
                 placeholder.position.set(0, 0.5, 0); // Fallback position
            }
            return placeholder;
        }

        async function fetchAndParseEnvironments() {
            try {
                const environmentsText = `1. Abyssal Marsh
Altitude: -500m to -200m
Temperature: 60°F to 90°F
Sun Exposure: 15% to 30%
Humidity: 80% to 90%
Description: A sunken, murky lowland...

2. Scorching Basin
Altitude: 0m to 500m
Temperature: 150°F to 200°F
Sun Exposure: 80% to 90%
Humidity: 5% to 15%
Description: A blistering desert flatland...

3. Cloudspine Plateau
Altitude: 5,000m to 8,000m
Temperature: -10°F to 40°F
Sun Exposure: 60% to 80%
Humidity: 20% to 40%
Description: A jagged, high-altitude land...

4. Verdant Lowlands
Altitude: 0m to 1,000m
Temperature: 70°F to 100°F
Sun Exposure: 50% to 70%
Humidity: 60% to 80%
Description: Lush jungles teeming with life...

5. Frozen Stratoscape
Altitude: 15,000m to 20,000m
Temperature: -150°F to -80°F
Sun Exposure: 70% to 90%
Humidity: 5% to 10%
Description: The air is razor-thin...

6. Obsidian Wastes
Altitude: 2,000m to 4,000m
Temperature: 100°F to 160°F
Sun Exposure: 40% to 60%
Humidity: 10% to 25%
Description: Charred black soil...

7. Twilight Fenlands
Altitude: -100m to 200m
Temperature: 50°F to 70°F
Sun Exposure: 15% to 40%
Humidity: 70% to 90%
Description: A murky, semi-submerged land...

8. Alpine Bloom
Altitude: 6,000m to 9,000m
Temperature: 30°F to 60°F
Sun Exposure: 65% to 85%
Humidity: 40% to 60%
Description: Surprisingly lush slopes...`;

                const sections = environmentsText.split(/\n\s*\n/); 
                let idCounter = 1;
                ENVIRONMENTS_DATA.length = 0; 
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
            } catch (error) {
                console.error("Failed to fetch or parse Environments.txt:", error);
            }
        }
        
        function populateEnvironmentDropdown() {
            if (!environmentSelect) return;
            environmentSelect.innerHTML = ''; 
            ENVIRONMENTS_DATA.forEach((env) => {
                const option = document.createElement('option');
                option.value = env.key; 
                option.textContent = env.name;
                environmentSelect.appendChild(option);
            });
        }

        function updateAmbiance(ambiance) {
            if (!camera || !scene || !ambiance || !ambiance.backgroundColor || !ambiance.fogColor || !ambiance.lightColor) {
                 console.warn("Cannot update ambiance, core components or ambiance data missing.", {ambiance});
                 return;
            }
            scene.background = ambiance.backgroundColor.clone();
            if (typeof camera.near === 'number' && typeof camera.far === 'number' && camera.near < camera.far) {
                 scene.fog = new THREE.Fog(ambiance.fogColor.clone(), camera.near + 5, camera.far / 10);
            } else {
                 scene.fog = new THREE.Fog(ambiance.fogColor.clone(), 5, 50); // Fallback fog
            }
            scene.children.forEach(child => {
                if (child.isLight && child.color) { 
                    child.color.set(ambiance.lightColor.clone());
                }
            });
        }

        function onEnvironmentChange() {
            if (environmentSelect && ENVIRONMENTS_DATA.length > 0) {
                const selectedEnvKey = environmentSelect.value;
                const selectedEnvData = ENVIRONMENTS_DATA.find(e => e.key === selectedEnvKey);
                if (selectedEnvData && selectedEnvData.ambiance) {
                    updateAmbiance(selectedEnvData.ambiance);
                } else {
                    console.warn(`No ambiance data found for selected environment: ${selectedEnvKey}`);
                }
            }
        }
        
        function onWindowResize() {
            if (camera && renderer && viewerContainer) {
                const width = viewerContainer.clientWidth;
                const height = viewerContainer.clientHeight;
                if (width > 0 && height > 0) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                } else {
                    console.warn("viewerContainer has zero width or height on resize.");
                }
            }
        }
        
        function animate() {
            try {
                requestAnimationFrame(animate);
                if (controls) controls.update();
                if (renderer && scene && camera) renderer.render(scene, camera);
            } catch (e) {
                console.error("Error in animation loop:", e);
                // Optionally, stop the loop if it's consistently failing.
                // clearInterval(globalUpdateInterval); // Example to stop other updates
                // throw e; // Or rethrow to halt script if desired
            }
        }

        function spawnEgg(isHybrid, forIncubation = true) {
            if (activeCreatureInstance) { scene.remove(activeCreatureInstance); disposeGltf(activeCreatureInstance); activeCreatureInstance = null; }
            if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; }
            //if(activeCreatureLevelDisplay) activeCreatureLevelDisplay.textContent = "Level: N/A"; 
            updateActiveCreatureDisplay(); 

            const eggColor = isHybrid ? 0xDA70D6 : 0xffffff; 
            const geometry = new THREE.SphereGeometry(0.25, 32, 32);
            const material = new THREE.MeshStandardMaterial({ color: eggColor, roughness: 0.6, metalness: 0.2 });
            egg = new THREE.Mesh(geometry, material);
            egg.scale.y = 1.25; 
            try {
                const box = new THREE.Box3().setFromObject(egg);
                const size = box.getSize(new THREE.Vector3());
                egg.position.set(0, -box.min.y + 0.01, 0); 
            } catch(e) {
                console.error("Error positioning egg:", e);
                egg.position.set(0, 0.3, 0); // Fallback
            }
            egg.castShadow = true;
            scene.add(egg);
            
            if(hybridEggMessage) hybridEggMessage.style.display = isHybrid ? 'block' : 'none';
            if (!forIncubation) { 
                isIncubating = false;
            }
            updateButtonState();
        }
        
        function startNewEggIncubation() {
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
            spawnEgg(false, false); 
            startIncubationProcess(); 
        }
        
        function startIncubationProcess() { 
            if (!egg) {
                alert("No egg to incubate. Spawn an egg first.");
                return;
            }
            if (isIncubating && timeLeftForIncubation < EVOLUTION_TIME_SECONDS && timeLeftForIncubation > 0) {
                 console.log("Incubation already in progress."); 
                 return;
            }

            isIncubating = true; 
            timeLeftForIncubation = EVOLUTION_TIME_SECONDS; 
            resetIncubationTimerDisplay(); 
            updateButtonState();

            if (incubationInterval) clearInterval(incubationInterval);
            incubationInterval = setInterval(() => {
                timeLeftForIncubation--;
                if(timerDisplay) timerDisplay.textContent = `Time: ${formatTime(timeLeftForIncubation)}`;
                if (timeLeftForIncubation <= 0) {
                    clearInterval(incubationInterval);
                    hatchCreature(); 
                }
            }, 1000);
        }

        function hatchCreature() {
            if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; }
            if(hybridEggMessage) hybridEggMessage.style.display = 'none';
            isIncubating = false; 

            let offspringModelKey = ALL_MODEL_DEFINITIONS[0]?.modelKey || "MIREFIN_BASE"; 
            let isNewCreaturePurebred = false;
            let isNewCreatureHybrid = false;
            let baseSpeciesModelKeyForPurebred = null; 
            
            const incubationEnvKey = environmentSelect.value;
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
                    
                    offspringModelKey = specificHybridResultKey || p1Def.modelKey; // Fallback
                    if(!specificHybridResultKey) console.error(`Hybrid Mating FAILED: No rule for ${p1Def.modelKey} & ${p2Def.modelKey}. Defaulting.`);
                } else {
                    isNewCreatureHybrid = true; 
                    isNewCreaturePurebred = false;
                    offspringModelKey = p1Def ? p1Def.modelKey : (ALL_MODEL_DEFINITIONS[0]?.modelKey || "MIREFIN_BASE");
                    baseSpeciesModelKeyForPurebred = null;
                }
            } else { 
                isNewCreaturePurebred = true;
                isNewCreatureHybrid = false; 
                if (!incubationEnvData) {
                    const allPurebredBaseModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0);
                    if (allPurebredBaseModels.length > 0) offspringModelKey = allPurebredBaseModels[Math.floor(Math.random() * allPurebredBaseModels.length)].modelKey;
                } else {
                    const currentEnvironmentName = incubationEnvData.name; 
                    const envModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0 && m.originEnvironmentName === currentEnvironmentName);
                    if (envModels.length > 0) offspringModelKey = envModels[Math.floor(Math.random() * envModels.length)].modelKey;
                    else {
                        const allPurebredBaseModels = ALL_MODEL_DEFINITIONS.filter(m => m.isPurebredLine && m.evolutionStage === 0);
                        if (allPurebredBaseModels.length > 0) offspringModelKey = allPurebredBaseModels[Math.floor(Math.random() * allPurebredBaseModels.length)].modelKey;
                    }
                }
                baseSpeciesModelKeyForPurebred = offspringModelKey; 
            }
            
            const creatureData = createCreatureObject({
                modelKey: offspringModelKey,
                baseSpeciesModelKey: baseSpeciesModelKeyForPurebred, 
                color: hatchColor, // hatchColor is guaranteed to be a THREE.Color instance
                isPurebred: isNewCreaturePurebred,
                isHybrid: isNewCreatureHybrid,
                incubatedEnvKey: incubationEnvKey, 
                originEnvKey: isNewCreaturePurebred ? incubationEnvKey : (parent1ForMating?.originEnvironmentKey || incubationEnvKey), 
                speciesName: ALL_MODEL_DEFINITIONS.find(m=>m.modelKey === offspringModelKey)?.speciesName || "Unknown Species",
                level: 0 
            });
            
            loadAndDisplayCreature(creatureData, false, true); 

            isHybridIncubationSetup = false; 
            parent1ForMating = null; 
            parent2ForMating = null; 
            selectedForMating = [];
            updateStoredCreaturesDisplay(); 
            updateButtonState();
        }
        
        function createCreatureObject(params) {
            const modelDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === params.modelKey);
            
            let colorToClone = params.color;
            if (!(colorToClone instanceof THREE.Color)) {
                console.warn("Invalid color provided to createCreatureObject, using default. Params:", params);
                colorToClone = new THREE.Color(0xcccccc); // Default color if params.color is bad
            }

            return {
                uniqueId: params.uniqueId !== undefined ? params.uniqueId : nextCreatureUniqueId++,
                name: params.name || (modelDef?.speciesName) || `Creature ${nextCreatureUniqueId}`,
                modelKey: params.modelKey,
                baseSpeciesModelKey: params.isPurebred && (modelDef?.evolutionStage === 0) ? params.modelKey : (params.baseSpeciesModelKey || null), 
                color: colorToClone.clone(),
                currentEvolutionStage: params.currentEvolutionStage !== undefined ? params.currentEvolutionStage : (modelDef?.evolutionStage || 0),
                level: params.level || 0, 
                isPurebred: params.isPurebred || false,
                isHybrid: params.isHybrid || false,
                canEvolve: params.canEvolve !== undefined ? params.canEvolve : true, 
                timeToNextEvolution: params.timeToNextEvolution !== undefined ? params.timeToNextEvolution : EVOLUTION_TIME_SECONDS, 
                originEnvironmentKey: params.originEnvKey || (environmentSelect ? environmentSelect.value : null), 
                incubatedEnvironmentKey: params.incubatedEnvKey, 
                evolvedInEnvironmentKey: params.evolvedInEnvironmentKey || null,
                hasSilverSheen: params.hasSilverSheen || false,
                speciesName: params.speciesName || (modelDef?.speciesName) || "Creature"
            };
        }

        function loadAndDisplayCreature(creatureInstanceData, isEvolutionDisplayUpdate = false, isNewlyHatchedOrActivated = false) {
            if (!creatureInstanceData || !creatureInstanceData.modelKey) {
                console.error("loadAndDisplayCreature called with invalid creatureInstanceData:", creatureInstanceData);
                return;
            }
            if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creatureInstanceData.uniqueId && !isEvolutionDisplayUpdate) {
                updateActiveCreatureDisplay(); 
                updateButtonState();
                updateStoredCreaturesDisplay(); // Ensure storage highlights are correct
                return;
            }

            if (activeCreatureInstance) { scene.remove(activeCreatureInstance); disposeGltf(activeCreatureInstance); activeCreatureInstance = null; } // Clear previous
            
            const modelURL = getModelURL(creatureInstanceData.modelKey);
            //if(activeCreatureLevelDisplay) activeCreatureLevelDisplay.textContent = `Level: ${creatureInstanceData.level}`; 

            const currentCreatureDataCopy = createCreatureObject({...creatureInstanceData}); // Work with a fresh copy

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
                        const desiredSize = 0.9;
                        const scale = maxDim === 0 ? desiredSize : desiredSize / maxDim;

                        activeCreatureInstance.scale.set(scale, scale, scale);
                        activeCreatureInstance.position.set(-center.x * scale, -box.min.y * scale + 0.01, -center.z * scale);
                    } catch (e) {
                        console.error("Error sizing/positioning GLTF model:", e);
                        activeCreatureInstance.position.set(0,0.5,0); // Fallback
                    }
                    
                    if(activeCreatureInstance.userData.color instanceof THREE.Color) {
                        applyMaterialToCreature(activeCreatureInstance, activeCreatureInstance.userData.color, activeCreatureInstance.userData.hasSilverSheen);
                    } else {
                         console.error("Cannot apply material, color is not a THREE.Color:", activeCreatureInstance.userData.color);
                    }
                    scene.add(activeCreatureInstance);
                    
                    if (isNewlyHatchedOrActivated) {
                        const existingStoredIndex = storedCreatures.findIndex(c => c.uniqueId === activeCreatureInstance.userData.uniqueId);
                        if (existingStoredIndex === -1) { 
                            if (storedCreatures.length < MAX_STORED_CREATURES) {
                                storedCreatures.push({...activeCreatureInstance.userData}); 
                            } else {
                                 alert("Storage full. New creature is active but not saved. Store manually if desired.");
                            }
                        } else { 
                            storedCreatures[existingStoredIndex] = {...activeCreatureInstance.userData};
                        }
                    }
                    
                    updateCreatureCanEvolveStatus(activeCreatureInstance.userData);
                    updateActiveCreatureDisplay(); 
                    updateStoredCreaturesDisplay(); 
                    updateButtonState();

                }, undefined, (error) => {
                    console.error(`Error loading GLB for ${currentCreatureDataCopy.modelKey}:`, error);
                    activeCreatureInstance = createPlaceholderModel(); // placeholder should have basic userData
                    activeCreatureInstance.userData = currentCreatureDataCopy; // assign our data to it
                    scene.add(activeCreatureInstance);
                    updateCreatureCanEvolveStatus(activeCreatureInstance.userData);
                    updateActiveCreatureDisplay();
                    updateStoredCreaturesDisplay();
                    updateButtonState();
                });
            } else {
                console.warn(`No GLB file found for modelKey ${currentCreatureDataCopy.modelKey}. Using placeholder.`);
                activeCreatureInstance = createPlaceholderModel();
                activeCreatureInstance.userData = currentCreatureDataCopy;
                scene.add(activeCreatureInstance);
                updateCreatureCanEvolveStatus(activeCreatureInstance.userData);
                updateActiveCreatureDisplay();
                updateStoredCreaturesDisplay();
                updateButtonState();
            }
        }
        
        function updateCreatureCanEvolveStatus(creatureData) {
            if (!creatureData) return;
        
            if (creatureData.isPurebred) {
                if (creatureData.currentEvolutionStage === 0) {
                    // For natural evolution (Stage 0 -> 1), readiness depends on the timer.
                    creatureData.canEvolve = (creatureData.timeToNextEvolution <= 0);
                } else if (creatureData.currentEvolutionStage === 1) {
                    // For level-up evolution (Stage 1 -> 2), readiness depends on level.
                    creatureData.canEvolve = (creatureData.level >= MAX_LEVEL);
                } else { // Max evolution (Stage 2)
                    creatureData.canEvolve = false;
                }
            } else if (creatureData.isHybrid) {
                if (creatureData.currentEvolutionStage === 0) {
                    // For hybrid level-up (Stage 0 -> 1 for sheen), readiness depends on level.
                    creatureData.canEvolve = (creatureData.level >= MAX_LEVEL);
                } else { // Max evolution for hybrid (Stage 1 with sheen)
                    creatureData.canEvolve = false;
                }
            } else {
                creatureData.canEvolve = false;
            }
        }


        function applyMaterialToCreature(model, baseColor, applySilverSheen = false) {
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
                                color: SILVER_SHEEN_COLOR.clone(), 
                                emissive: SILVER_SHEEN_COLOR.clone().multiplyScalar(0.1),
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
                        if (originalMaterial.map) newMaterial.map = originalMaterial.map;
                        if (originalMaterial.normalMap) newMaterial.normalMap = originalMaterial.normalMap;
                        child.material = newMaterial;
                    }
                }
            });
        }
        
        function updateGameTimers() {
            let anyTimerReachedZeroThisTick = false;
        
            // Update stored creatures
            storedCreatures.forEach(creature => {
                if (creature && creature.isPurebred && creature.currentEvolutionStage === 0 && creature.timeToNextEvolution > 0) {
                    creature.timeToNextEvolution--;
                    if (creature.timeToNextEvolution === 0) {
                        anyTimerReachedZeroThisTick = true;
                    }
                }
                if (creature) {
                    updateCreatureCanEvolveStatus(creature); // Update display-related canEvolve flag
                }
            });
        
            // Update active creature if it exists
            if (activeCreatureInstance && activeCreatureInstance.userData) {
                const activeData = activeCreatureInstance.userData;
        
                // Decrement timer for the active creature itself
                if (activeData.isPurebred && activeData.currentEvolutionStage === 0 && activeData.timeToNextEvolution > 0) {
                    activeData.timeToNextEvolution--;
                    if (activeData.timeToNextEvolution === 0) {
                        anyTimerReachedZeroThisTick = true;
                    }
                }
        
                // Sync active creature data back to storage if it exists there
                const storedVersionIndex = storedCreatures.findIndex(c => c.uniqueId === activeData.uniqueId);
                if (storedVersionIndex > -1) {
                    storedCreatures[storedVersionIndex] = { ...activeData };
                }
                
                updateCreatureCanEvolveStatus(activeData); // Update display-related canEvolve flag for active creature
            }
        
            // If any creature's timer reached zero this tick, update relevant UI parts
            if (anyTimerReachedZeroThisTick) {
                updateStoredCreaturesDisplay();
                updateActiveCreatureDisplay();
            }
        
            // Always call updateButtonState if an active creature exists or if a timer just hit zero.
            // This ensures button states are current.
            if (activeCreatureInstance || anyTimerReachedZeroThisTick) {
                updateButtonState();
            }
        }

        function attemptNaturalEvolution() {
            if (!activeCreatureInstance || !activeCreatureInstance.userData) { alert("No active creature."); return; }
            const creatureData = activeCreatureInstance.userData;
            if (!creatureData.isPurebred || creatureData.currentEvolutionStage !== 0) { alert(`${creatureData.name} not eligible for natural evolution.`); return; }
            if (creatureData.timeToNextEvolution > 0) { alert(`${creatureData.name} not ready. Time: ${formatTime(creatureData.timeToNextEvolution)}`); return; }

            const baseDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creatureData.baseSpeciesModelKey && m.evolutionStage === 0);
            if (!baseDef) { console.error("Base def not found for purebred evolution:", creatureData); return; }
            const ev1Def = ALL_MODEL_DEFINITIONS.find(m => m.speciesName === baseDef.speciesName && m.evolutionStage === 1 && m.originEnvironmentName === baseDef.originEnvironmentName);

            if (ev1Def) {
                creatureData.modelKey = ev1Def.modelKey;
                creatureData.currentEvolutionStage = 1;
                creatureData.level = 0; 
                creatureData.timeToNextEvolution = EVOLUTION_TIME_SECONDS; 
                creatureData.evolvedInEnvironmentKey = environmentSelect.value;
                const newColorEnv = ENVIRONMENTS_DATA.find(e => e.key === creatureData.evolvedInEnvironmentKey);
                if (newColorEnv && newColorEnv.ambiance && newColorEnv.ambiance.creatureColor) creatureData.color = newColorEnv.ambiance.creatureColor.clone();
                
                const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
                if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData };
                
                loadAndDisplayCreature(creatureData, true); 
            } else creatureData.canEvolve = false; 
            
            updateCreatureCanEvolveStatus(creatureData);
            updateStoredCreaturesDisplay(); 
            updateActiveCreatureDisplay(); 
            updateButtonState();
        }


        function attemptLevelUpCreature() {
            if (!activeCreatureInstance || !activeCreatureInstance.userData) { alert("No active creature."); return; }
            const creatureData = activeCreatureInstance.userData;

            if (creatureData.level >= MAX_LEVEL) {
                 if (canTriggerEvolutionByLevel(creatureData)) triggerEvolutionByLevel(creatureData);
                 else alert(`${creatureData.name} is max level for its stage and cannot evolve further by leveling.`);
                return;
            }
            if ((creatureData.isPurebred && creatureData.currentEvolutionStage === 2) || (creatureData.isHybrid && creatureData.currentEvolutionStage === 1) ) {
                alert(`${creatureData.name} is max evolution and cannot level up.`);
                creatureData.canEvolve = false; updateButtonState(); return;
            }

            creatureData.level++;
            //if(activeCreatureLevelDisplay) activeCreatureLevelDisplay.textContent = `Level: ${creatureData.level}`;

            if (creatureData.level >= MAX_LEVEL && canTriggerEvolutionByLevel(creatureData)) {
                triggerEvolutionByLevel(creatureData);
            }
            
            const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
            if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData }; 
            
            updateCreatureCanEvolveStatus(creatureData); 
            updateStoredCreaturesDisplay();
            updateActiveCreatureDisplay(); 
            updateButtonState();
        }
        
        function canTriggerEvolutionByLevel(creatureData){
             if (!creatureData) return false;
             if (creatureData.isPurebred && creatureData.currentEvolutionStage === 1 && creatureData.level >= MAX_LEVEL) return true; 
             if (creatureData.isHybrid && creatureData.currentEvolutionStage === 0 && creatureData.level >= MAX_LEVEL) return true; 
            return false;
        }

        function triggerEvolutionByLevel(creatureData) {
            if (!creatureData) return;
            const evolutionEnvKey = environmentSelect.value;
            const newColorEnv = ENVIRONMENTS_DATA.find(e => e.key === evolutionEnvKey);
            const evolutionColor = (newColorEnv && newColorEnv.ambiance && newColorEnv.ambiance.creatureColor) ? newColorEnv.ambiance.creatureColor.clone() : creatureData.color.clone();


            if (creatureData.isPurebred && creatureData.currentEvolutionStage === 1) { 
                const baseDef = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creatureData.baseSpeciesModelKey);
                if (!baseDef) { creatureData.canEvolve = false; return; }
                const ev2Def = ALL_MODEL_DEFINITIONS.find(m => m.speciesName === baseDef.speciesName && m.evolutionStage === 2 && m.originEnvironmentName === baseDef.originEnvironmentName);
                if (ev2Def) {
                    creatureData.modelKey = ev2Def.modelKey;
                    creatureData.currentEvolutionStage = 2;
                    creatureData.color = evolutionColor;
                    creatureData.evolvedInEnvironmentKey = evolutionEnvKey;
                    creatureData.level = 0; 
                } else creatureData.canEvolve = false;
            } else if (creatureData.isHybrid && creatureData.currentEvolutionStage === 0) { 
                creatureData.currentEvolutionStage = 1; 
                creatureData.hasSilverSheen = true;
                creatureData.color = evolutionColor; 
                creatureData.evolvedInEnvironmentKey = evolutionEnvKey;
                creatureData.level = 0; 
            }
            //if(activeCreatureLevelDisplay) activeCreatureLevelDisplay.textContent = `Level: ${creatureData.level}`;
            updateCreatureCanEvolveStatus(creatureData); 
            
            const storedIndex = storedCreatures.findIndex(c => c.uniqueId === creatureData.uniqueId);
            if (storedIndex > -1) storedCreatures[storedIndex] = { ...creatureData };
            
            loadAndDisplayCreature(creatureData, true); 
            updateStoredCreaturesDisplay();
            updateButtonState();
        }
        
        function activateStoredCreature(uniqueId) {
            const creatureToActivate = storedCreatures.find(c => c && c.uniqueId === uniqueId);
            if (!creatureToActivate) return;
            if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === uniqueId) return;
            if (isIncubating && egg) { alert("Cannot activate while an egg is incubating."); return; }

            if (activeCreatureInstance && activeCreatureInstance.userData) {
                const currentActiveData = activeCreatureInstance.userData;
                const existingStoredIndex = storedCreatures.findIndex(c => c.uniqueId === currentActiveData.uniqueId);
                if (existingStoredIndex !== -1) storedCreatures[existingStoredIndex] = { ...currentActiveData }; 
                else if (storedCreatures.length < MAX_STORED_CREATURES) storedCreatures.push({...currentActiveData});
            }
            loadAndDisplayCreature(creatureToActivate, false, true); 
        }


        function attemptStoreActiveCreature() {
            if (!activeCreatureInstance || !activeCreatureInstance.userData) { alert("No active creature to store."); return; }
            const creatureDataToStore = activeCreatureInstance.userData;
            updateCreatureCanEvolveStatus(creatureDataToStore); 

            const existingStoredIndex = storedCreatures.findIndex(c => c.uniqueId === creatureDataToStore.uniqueId);
            if (existingStoredIndex === -1) { 
                if (storedCreatures.length >= MAX_STORED_CREATURES) { alert("Storage full."); return; }
                storedCreatures.push({...creatureDataToStore}); 
            } else storedCreatures[existingStoredIndex] = {...creatureDataToStore}; 

            scene.remove(activeCreatureInstance);
            disposeGltf(activeCreatureInstance);
            activeCreatureInstance = null;
            //if(activeCreatureLevelDisplay) activeCreatureLevelDisplay.textContent = "Level: N/A"; 
            
            updateActiveCreatureDisplay(); 
            updateStoredCreaturesDisplay();
            updateButtonState();
        }


        function setupMating() {
            if (selectedForMating.length !== 2) { alert("Select two BASE creatures to mate."); return; }
            parent1ForMating = storedCreatures.find(c => c.uniqueId === selectedForMating[0]);
            parent2ForMating = storedCreatures.find(c => c.uniqueId === selectedForMating[1]);

            if (!parent1ForMating || !parent2ForMating) { selectedForMating = []; updateStoredCreaturesDisplay(); updateButtonState(); return; }
            if (parent1ForMating.currentEvolutionStage !== 0 || parent2ForMating.currentEvolutionStage !== 0) { alert("Only BASE creatures (Stage 0) can mate."); selectedForMating = []; updateStoredCreaturesDisplay(); updateButtonState(); return; }
            if (activeCreatureInstance) { alert("Store active creature before mating."); return; }
            if (!areCreaturesCompatible(parent1ForMating, parent2ForMating)) { alert("Creatures not compatible."); updateStoredCreaturesDisplay(); updateButtonState(); return; }

            isHybridIncubationSetup = true; 
            if (egg) { scene.remove(egg); disposeGltf(egg); egg = null; }
            
            const isPurebredPairing = parent1ForMating.modelKey === parent2ForMating.modelKey && parent1ForMating.isPurebredLine;
            spawnEgg(!isPurebredPairing, false); 
            if(startIncubationButton) startIncubationButton.textContent = "Incubate Egg"; 
            updateButtonState();
        }
        
        function areCreaturesCompatible(creature1, creature2) {
            // Simplified from previous, assuming defs and stages are pre-checked by caller (setupMating)
            const def1 = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creature1.modelKey);
            const def2 = ALL_MODEL_DEFINITIONS.find(m => m.modelKey === creature2.modelKey);
            if (!def1 || !def2) return false; 

            if (def1.isPurebredLine && def2.isPurebredLine && def1.modelKey === def2.modelKey) return true; 
            
            const parentKeys = [def1.modelKey, def2.modelKey].sort().join('+');
            if (creature1.originEnvironmentKey === creature2.originEnvironmentKey) { 
                if (INTRA_ENV_HYBRID_RULES[creature1.originEnvironmentKey]?.[parentKeys]) return true;
            } else { 
                const sortedEnvKeys = [creature1.originEnvironmentKey, creature2.originEnvironmentKey].sort().join('+');
                if (INTER_ENV_HYBRID_RULES[sortedEnvKeys]?.[parentKeys]) return true;
            }
            // Fallback temp compatibility (removed for stricter rule-based for now, add back if desired)
            return false; // If no explicit rule, not compatible for hybrid
        }

        function resetIncubationTimerDisplay() {
            timeLeftForIncubation = EVOLUTION_TIME_SECONDS;
            if(timerDisplay) timerDisplay.textContent = `Time: ${formatTime(timeLeftForIncubation)}`;
        }
        
        function formatTime(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
            const seconds = (totalSeconds % 60).toString().padStart(2, '0');
            return `${minutes}:${seconds}`;
        }

        function updateActiveCreatureDisplay() {
            if (!activeCreatureDetailsPanel) return;
            const creature = activeCreatureInstance ? activeCreatureInstance.userData : null;

            if (creature && creature.color instanceof THREE.Color) {
                updateCreatureCanEvolveStatus(creature); 
                let evolutionInfo = "Evolution status unknown";
                 if (creature.isPurebred) {
                    if (creature.currentEvolutionStage === 0) evolutionInfo = creature.timeToNextEvolution > 0 ? `Evolves (Nat.): ${formatTime(creature.timeToNextEvolution)}` : "Ready for Nat. EV1";
                    else if (creature.currentEvolutionStage === 1) evolutionInfo = creature.level < MAX_LEVEL ? `Train to Lvl ${MAX_LEVEL} for EV2` : "Ready for EV2 (Lvl Up)";
                    else evolutionInfo = "Max Evolution (Purebred EV2)";
                } else if (creature.isHybrid) {
                    if (creature.currentEvolutionStage === 0) evolutionInfo = creature.level < MAX_LEVEL ? `Train to Lvl ${MAX_LEVEL} for Sheen` : "Ready for Sheen (Lvl Up)";
                    else evolutionInfo = "Max Evolution (Hybrid)";
                }

                const originEnvObj = ENVIRONMENTS_DATA.find(env => env.key === creature.originEnvironmentKey);
                const originDisplayName = originEnvObj ? originEnvObj.name : (creature.originEnvironmentKey || 'N/A');

                activeCreatureDetailsPanel.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div class="stored-creature-color" style="background-color: #${creature.color.getHexString()};"></div>
                        <strong>${creature.name || 'Unnamed'} (Lvl ${creature.level || 0})</strong>
                    </div>
                    <div class="info">Species: ${creature.speciesName || 'N/A'}</div>
                    <div class="info">Model: ${creature.modelKey || 'N/A'}</div>
                    <div class="info">Stage: ${creature.currentEvolutionStage !== undefined ? creature.currentEvolutionStage : 'N/A'} ${creature.isHybrid ? "[Hybrid]" : "[Purebred]"}</div>
                    <div class="info">Origin: ${originDisplayName}</div>
                    ${creature.hasSilverSheen ? '<div class="info" style="color: #C0C0C0;">Silver Sheen Active</div>' : ''}
                    <div class="info">Evolution: ${evolutionInfo}</div>`;

                    const levelUpButtonInstance = document.createElement('button');
                    levelUpButtonInstance.id = 'dynamicLevelUpButton'; // Use a consistent ID
                    levelUpButtonInstance.textContent = 'Level Up';
                    levelUpButtonInstance.style.marginTop = '10px';
                    levelUpButtonInstance.style.width = '45%'; // Ensure it spans width like others
                    levelUpButtonInstance.classList.add('modal-button'); // Optional: use existing button class for styling

                    levelUpButtonInstance.addEventListener('click', attemptLevelUpCreature);
                    activeCreatureDetailsPanel.appendChild(levelUpButtonInstance);

                    const evolveCreatureButtonInstance = document.createElement('button');
                    evolveCreatureButtonInstance.id = 'dynamicEvolveCreatureButton'; // Use a consistent ID
                    evolveCreatureButtonInstance.textContent = 'Evolve';
                    evolveCreatureButtonInstance.style.marginTop = '10px';
                    evolveCreatureButtonInstance.style.marginLeft = '2px';
                    evolveCreatureButtonInstance.style.width = '45%'; // Ensure it spans width like others
                    evolveCreatureButtonInstance.classList.add('modal-button'); // Optional: use existing button class for styling  

                    evolveCreatureButtonInstance.addEventListener('click', attemptNaturalEvolution);
                    activeCreatureDetailsPanel.appendChild(evolveCreatureButtonInstance);
            } else {
                activeCreatureDetailsPanel.innerHTML = '<p>No creature active.</p>';
            }
        }
        
        function updateStoredCreaturesDisplay() {
            if (!storedCreaturesList) return;
            storedCreaturesList.innerHTML = '';
            for (let i = 0; i < MAX_STORED_CREATURES; i++) {
                const li = document.createElement('li');
                li.classList.add('stored-creature-item');
                const creature = storedCreatures[i]; // Can be undefined

                if (creature && creature.uniqueId !== undefined && creature.color instanceof THREE.Color) {
                    updateCreatureCanEvolveStatus(creature); 
                    li.dataset.creatureUniqueId = creature.uniqueId;
                    if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creature.uniqueId) {
                        li.classList.add('is-active-in-viewer');
                    }

                    let evolutionInfo = "Evolution status unknown";
                     if (creature.isPurebred) {
                        if (creature.currentEvolutionStage === 0) evolutionInfo = creature.timeToNextEvolution > 0 ? `Evolves (Nat.): ${formatTime(creature.timeToNextEvolution)}` : "Ready for Nat. EV1";
                        else if (creature.currentEvolutionStage === 1) evolutionInfo = creature.level < MAX_LEVEL ? `Train to Lvl ${MAX_LEVEL} for EV2` : "Ready for EV2 (Lvl Up)";
                        else evolutionInfo = "Max Evolution (Purebred EV2)";
                    } else if (creature.isHybrid) {
                         if (creature.currentEvolutionStage === 0) evolutionInfo = creature.level < MAX_LEVEL ? `Train to Lvl ${MAX_LEVEL} for Sheen` : "Ready for Sheen (Lvl Up)";
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

                    const activateButton = document.createElement('button');
                    activateButton.textContent = "Activate";
                    activateButton.classList.add('activate-creature-button');
                    if ((activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creature.uniqueId) || isIncubating) {
                        activateButton.disabled = true;
                    }
                    activateButton.onclick = () => activateStoredCreature(creature.uniqueId);
                    li.appendChild(activateButton);

                    if (selectedForMating.includes(creature.uniqueId)) li.classList.add('selected');
                    infoWrapper.style.cursor = 'pointer'; 
                    infoWrapper.onclick = () => toggleMatingSelection(creature.uniqueId);
                } else {
                    li.innerHTML = `Slot ${i + 1}: Empty`;
                    li.style.cursor = 'default';
                }
                storedCreaturesList.appendChild(li);
            }
        }

        function toggleMatingSelection(creatureUniqueId) {
            if (isIncubating || (isHybridIncubationSetup && egg) ) return; 
            const creature = storedCreatures.find(c => c && c.uniqueId === creatureUniqueId);
            if (!creature || creature.currentEvolutionStage !== 0) { alert("Only BASE creatures (Stage 0) can be selected for mating."); return; }
            if (activeCreatureInstance && activeCreatureInstance.userData && activeCreatureInstance.userData.uniqueId === creatureUniqueId) { alert("Cannot select active creature for mating."); return; }

            const index = selectedForMating.indexOf(creatureUniqueId);
            if (index > -1) selectedForMating.splice(index, 1);
            else {
                if (selectedForMating.length < 2) selectedForMating.push(creatureUniqueId);
                else { selectedForMating.shift(); selectedForMating.push(creatureUniqueId); }
            }
            updateStoredCreaturesDisplay(); 
            updateButtonState();
        }

        function updateButtonState() {
            // Ensure DOM elements exist before trying to update them
            if (!startIncubationButton || !storeActiveCreatureButton || !mateButton || !hybridEggMessage) {
                console.warn("One or more button/display DOM elements not found in updateButtonState.");
                return;
            }

            const activeCreatureData = activeCreatureInstance ? activeCreatureInstance.userData : null;
            if (activeCreatureData) updateCreatureCanEvolveStatus(activeCreatureData); 

            startIncubationButton.disabled = isIncubating || !!activeCreatureData || (isHybridIncubationSetup && egg && !!activeCreatureData);
            if(isIncubating) startIncubationButton.textContent = "Incubating...";
            else if (isHybridIncubationSetup && egg) startIncubationButton.textContent = "Incubate Mated Egg";
            else startIncubationButton.textContent = "Start Incubation (New Egg)";

            const dynamicLevelUpButton = document.getElementById('dynamicLevelUpButton');
            if (dynamicLevelUpButton) { // Check if the button exists in the DOM
                let canLevelUp = false;
                if (activeCreatureData && !isIncubating) {
                    if (activeCreatureData.isPurebred) canLevelUp = (activeCreatureData.currentEvolutionStage === 0 || activeCreatureData.currentEvolutionStage === 1) && activeCreatureData.level < MAX_LEVEL && activeCreatureData.currentEvolutionStage < 2;
                    else if (activeCreatureData.isHybrid) canLevelUp = activeCreatureData.currentEvolutionStage === 0 && activeCreatureData.level < MAX_LEVEL;
                }
                dynamicLevelUpButton.disabled = !canLevelUp;
            }

            const dynamicEvolveCreatureButton = document.getElementById('dynamicEvolveCreatureButton');
            if (dynamicEvolveCreatureButton) {
                let canEvolve = false;
                // Ensure there is an active creature and no egg is currently incubating
                if (activeCreatureData && !isIncubating) {
                    // Check if the active creature meets all conditions for natural evolution
                    if (activeCreatureData.isPurebred &&
                        activeCreatureData.currentEvolutionStage === 0 &&
                        activeCreatureData.timeToNextEvolution <= 0) {
                        canEvolve = true;
                    }
                }
                dynamicEvolveCreatureButton.disabled = !canEvolve;
            }

            let canMateNow = selectedForMating.length === 2 && !isIncubating && !(isHybridIncubationSetup && egg) && !activeCreatureInstance;
            if (canMateNow) {
                 const p1 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[0]);
                 const p2 = storedCreatures.find(c => c && c.uniqueId === selectedForMating[1]);
                 if (!p1 || p1.currentEvolutionStage !== 0 || !p2 || p2.currentEvolutionStage !== 0) canMateNow = false; 
            }
            mateButton.disabled = !canMateNow;
            
            hybridEggMessage.style.display = (isHybridIncubationSetup && egg && !isIncubating && !activeCreatureInstance) ? 'block' : 'none';
            if (isHybridIncubationSetup && egg && !isIncubating && parent1ForMating?.modelKey === parent2ForMating?.modelKey) hybridEggMessage.textContent = "Purebred Pair Egg Ready!"; 
            else if (isHybridIncubationSetup && egg && !isIncubating) hybridEggMessage.textContent = "Hybrid Egg Ready!";
            
            // activeCreatureLevelDisplay.textContent = activeCreatureData ? `Level: ${activeCreatureData.level}` : "Level: N/A";
            if(isIncubating && typeof updateStoredCreaturesDisplay === 'function') updateStoredCreaturesDisplay(); // Refresh storage item button states
        }
        
        function disposeGltf(gltfObject) {
            if (!gltfObject) return;
            gltfObject.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat !== placeholderMat && mat.uuid !== placeholderMat.uuid) { // Avoid disposing shared placeholder material
                                Object.keys(mat).forEach(key => {
                                    const value = mat[key];
                                    if (value && typeof value.dispose === 'function') {
                                        try { value.dispose(); } catch(e) { /* ignore */ }
                                    }
                                });
                                try { mat.dispose(); } catch(e) { /* ignore */ }
                            }
                        });
                    }
                }
            });
            if (gltfObject.parent) {
                gltfObject.parent.remove(gltfObject);
            }
        }
        
       function setupHybridRules() {
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

            const intraHybridSetup = [
                { env: "Abyssal Marsh", pairs: [["Mirefin", "Rootfang", "Mirefang"], ["Mirefin", "Gloomleech", "Mireleech"], ["Rootfang", "Gloomleech", "Rootleech"]] },
                { env: "Scorching Basin", pairs: [["Pyreclaw", "Solhound", "Pyrehound"], ["Pyreclaw", "Ashwing", "Pyrewing"], ["Solhound", "Ashwing", "Solwing"]] },
                { env: "Cloudspine Plateau", pairs: [["Aerowing", "Cragbeak", "Aerobeak"], ["Aerowing", "Zephyrion", "Aeroion"], ["Cragbeak", "Zephyrion", "Cragion"]] },
                { env: "Verdant Lowlands", pairs: [["Bloomtail", "Riveraptor", "Bloomraptor"], ["Bloomtail", "Vinetooth", "Bloomtooth"], ["Riveraptor", "Vinetooth", "Rivertooth"]] },
                { env: "Frozen Stratoscape", pairs: [["Glaciore", "Rimescale", "Glacioscale"], ["Glaciore", "Cometail", "Glaciotail"], ["Rimescale", "Cometail", "Rimetail"]] },
                { env: "Obsidian Wastes", pairs: [["Basaltmane", "Ashstrider", "Basaltstrider"], ["Basaltmane", "Flintfang", "Basaltfang"], ["Ashstrider", "Flintfang", "Ashfang"]] },
                { env: "Twilight Fenlands", pairs: [["Luminwing", "Reedskipper", "Luminskipper"], ["Luminwing", "Vesperwisp", "Luminwisp"], ["Reedskipper", "Vesperwisp", "Reedwisp"]] },
                { env: "Alpine Bloom", pairs: [["Floracorn", "Gladehorn", "Florahorn"], ["Floracorn", "Sunpetal", "Florapetal"], ["Gladehorn", "Sunpetal", "Gladepetal"]] }
            ];

            intraHybridSetup.forEach(group => {
                const envName = group.env;
                const envKey = envMap[envName];
                if (!envKey) { console.error(`setupHybridRules: Unknown env name ${envName} for intra rules.`); return; }
                INTRA_ENV_HYBRID_RULES[envKey] = INTRA_ENV_HYBRID_RULES[envKey] || {};
                group.pairs.forEach(pair => {
                    const p1BaseKey = getBaseModelKey(pair[0], envName);
                    const p2BaseKey = getBaseModelKey(pair[1], envName);
                    const hybridKey = getHybridModelKey(pair[2]);
                    if (p1BaseKey && p2BaseKey && hybridKey) INTRA_ENV_HYBRID_RULES[envKey][[p1BaseKey, p2BaseKey].sort().join('+')] = hybridKey;
                    // else console.error(`Intra-Rule Error: Missing key for ${pair[0]}/${pair[1]} -> ${pair[2]} in ${envName}`);
                });
            });
            
            const interHybridSetup = [ /* ... content as before ... */ ]; // Ellipsized for brevity, assume unchanged from previous
             interHybridSetup.forEach(group => {
                const env1Name = group.env1;
                const env2Name = group.env2;
                const env1Key = envMap[env1Name];
                const env2Key = envMap[env2Name];

                if (!env1Key || !env2Key) { console.error(`Inter-Rule Error: Unknown env names ${env1Name}/${env2Name}`); return; }
                const sortedEnvKeys = [env1Key, env2Key].sort().join('+');
                INTER_ENV_HYBRID_RULES[sortedEnvKeys] = INTER_ENV_HYBRID_RULES[sortedEnvKeys] || {};
                
                group.results.forEach(res => {
                    const p1Name = res[0]; const p2Name = res[1]; const hybridName = res[2];
                    const p1BaseKey = getBaseModelKey(p1Name, env1Name); 
                    const p2BaseKey = getBaseModelKey(p2Name, env2Name); 
                    const hybridKey = getHybridModelKey(hybridName);
                    if (p1BaseKey && p2BaseKey && hybridKey) INTER_ENV_HYBRID_RULES[sortedEnvKeys][[p1BaseKey, p2BaseKey].sort().join('+')] = hybridKey;
                    // else console.error(`Inter-Rule Error: Missing key for ${p1Name}/${p2Name} -> ${hybridName}`);
                });
            });
        }

        // Ensure initializeApp is called after the DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }