// threeSetup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dom from './domElements.js';
import { ENVIRONMENTS_DATA } from './initializers.js'; // For initial ambiance

export let scene, camera, renderer, controls, ground;
export let placeholderGeo, placeholderMat;

export function initializeScene() {
    if (!dom.viewerContainer) { console.error("FATAL: viewerContainer not found."); return; }

    scene = new THREE.Scene();
    const aspect = (dom.viewerContainer.clientWidth && dom.viewerContainer.clientHeight) ? (dom.viewerContainer.clientWidth / dom.viewerContainer.clientHeight) : 1;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, 1.5, 4.5);

    // Initial ambiance will be set by onEnvironmentChange after ENVIRONMENTS_DATA is populated
    // or use a default here if needed before that
    if (ENVIRONMENTS_DATA.length > 0 && ENVIRONMENTS_DATA[0] && ENVIRONMENTS_DATA[0].ambiance) {
        updateAmbiance(ENVIRONMENTS_DATA[0].ambiance);
    } else {
        scene.background = new THREE.Color(0x333333); // Fallback
        console.warn("Initial environments data not loaded for threeSetup, using fallback ambiance.");
    }


    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(dom.viewerContainer.clientWidth || 800, dom.viewerContainer.clientHeight || 600);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    dom.viewerContainer.appendChild(renderer.domElement);
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

    placeholderGeo = new THREE.DodecahedronGeometry(0.35, 0);
    placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000, roughness: 0.7, metalness: 0.1, wireframe: false });
}

export function updateAmbiance(ambiance) {
    if (!camera || !scene || !ambiance || !ambiance.backgroundColor || !ambiance.fogColor || !ambiance.lightColor) {
         console.warn("Cannot update ambiance, core components or ambiance data missing.", {ambiance});
         return;
    }
    scene.background = ambiance.backgroundColor.clone();
    if (typeof camera.near === 'number' && typeof camera.far === 'number' && camera.near < camera.far) {
         scene.fog = new THREE.Fog(ambiance.fogColor.clone(), camera.near + 5, camera.far / 10);
    } else {
         scene.fog = new THREE.Fog(ambiance.fogColor.clone(), 5, 50);
    }
    scene.children.forEach(child => {
        if (child.isLight && child.color) {
            child.color.set(ambiance.lightColor.clone());
        }
    });
}

export function onWindowResize() {
    if (camera && renderer && dom.viewerContainer) {
        const width = dom.viewerContainer.clientWidth;
        const height = dom.viewerContainer.clientHeight;
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        } else {
            console.warn("viewerContainer has zero width or height on resize.");
        }
    }
}

export function animate() {
    try {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    } catch (e) {
        console.error("Error in animation loop:", e);
    }
}

export function createPlaceholderModel() {
    console.warn("Creating placeholder model.");
    if (!placeholderGeo || !placeholderMat) {
        console.error("Placeholder geometry or material not initialized!");
        return new THREE.Mesh();
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
         placeholder.position.set(0, 0.5, 0);
    }
    return placeholder;
}

export function disposeGltf(gltfObject) {
    if (!gltfObject) return;
    gltfObject.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    if (mat !== placeholderMat && mat.uuid !== placeholderMat.uuid) {
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