// config.js

import * as THREE from 'three';

export const MAX_STORED_CREATURES = 10;
export const EVOLUTION_TIME_SECONDS = 30;
export const SILVER_SHEEN_COLOR = new THREE.Color(0xC0C0C0);
export const MAX_LEVEL = 10;

// Raw data for model definitions (to be parsed by initializers.js)
export const RAW_MODEL_GROUPS_DATA = [
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

export const RAW_HYBRID_MODELS_TEXT = `73. Mirefang
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

// Raw data for environments (to be parsed by initializers.js)
export const RAW_ENVIRONMENTS_TEXT = `1. Abyssal Marsh
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

// Raw data for hybrid rules (to be processed by initializers.js)
export const INTRA_HYBRID_SETUP_DATA = [
    { env: "Abyssal Marsh", pairs: [["Mirefin", "Rootfang", "Mirefang"], ["Mirefin", "Gloomleech", "Mireleech"], ["Rootfang", "Gloomleech", "Rootleech"]] },
    { env: "Scorching Basin", pairs: [["Pyreclaw", "Solhound", "Pyrehound"], ["Pyreclaw", "Ashwing", "Pyrewing"], ["Solhound", "Ashwing", "Solwing"]] },
    { env: "Cloudspine Plateau", pairs: [["Aerowing", "Cragbeak", "Aerobeak"], ["Aerowing", "Zephyrion", "Aeroion"], ["Cragbeak", "Zephyrion", "Cragion"]] },
    { env: "Verdant Lowlands", pairs: [["Bloomtail", "Riveraptor", "Bloomraptor"], ["Bloomtail", "Vinetooth", "Bloomtooth"], ["Riveraptor", "Vinetooth", "Rivertooth"]] },
    { env: "Frozen Stratoscape", pairs: [["Glaciore", "Rimescale", "Glacioscale"], ["Glaciore", "Cometail", "Glaciotail"], ["Rimescale", "Cometail", "Rimetail"]] },
    { env: "Obsidian Wastes", pairs: [["Basaltmane", "Ashstrider", "Basaltstrider"], ["Basaltmane", "Flintfang", "Basaltfang"], ["Ashstrider", "Flintfang", "Ashfang"]] },
    { env: "Twilight Fenlands", pairs: [["Luminwing", "Reedskipper", "Luminskipper"], ["Luminwing", "Vesperwisp", "Luminwisp"], ["Reedskipper", "Vesperwisp", "Reedwisp"]] },
    { env: "Alpine Bloom", pairs: [["Floracorn", "Gladehorn", "Florahorn"], ["Floracorn", "Sunpetal", "Florapetal"], ["Gladehorn", "Sunpetal", "Gladepetal"]] }
];

export const INTER_HYBRID_SETUP_DATA = [ /* ... content as before ... */ ]; // Assuming this was populated in your original app.js

// Placeholder for initial values that will be populated by initializers.js
// These are exported so other modules can import the populated versions.
export let ALL_MODEL_DEFINITIONS = [];
export let ENVIRONMENTS_DATA = [];
export let INTRA_ENV_HYBRID_RULES = {};
export let INTER_ENV_HYBRID_RULES = {};

export const STORY_DATA = {
    "chapters": [
        {
            "id": "chapter1_intro",
            "entries": [
                { "id": "entry1", "text": "Welcome, Breeder. Your journey begins now...\nThis world is full of wonders and mysteries." },
                { "id": "entry2", "text": "Your first task is to understand the very essence of creation. Incubate your first egg." }
            ],
            "unlockCondition": null
        },
        {
            "id": "chapter2_first_evolution",
            "entries": [
                { "id": "entry1", "text": "You've successfully evolved a creature! This is a significant step.\nEvolution unlocks new potentials." },
                { "id": "entry2", "text": "Each creature carries a unique lineage. Some say the original forms hold ancient secrets..." }
            ],
            "triggerEvent": "firstEvolution",
            "unlockConditionRequired": true
        }
    ],
    "playerProgress": {
        "currentChapterId": "chapter1_intro",
        "currentEntryIndex": 0,
        "unlockedChapters": ["chapter1_intro"],
        "completedEvents": []
    }
};