// AutoPointCloud - Professional Point Cloud Processing Application
// Main Application Logic

// Global state
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    pointCloud: null,
    selectedCloudId: null,
    loadedClouds: new Map(),
    gridHelper: null,
    axesHelper: null,
    fps: 60,
    lastFrameTime: performance.now()
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing AutoPointCloud...');
    initViewer();
    initFileUpload();
    initEventListeners();
    loadPointClouds();
    animateViewer();
});

// ============= 3D VIEWER INITIALIZATION =============

function initViewer() {
    const container = document.getElementById('viewer');
    const overlay = document.getElementById('viewerOverlay');
    
    if (!container) {
        console.error('Viewer container not found');
        return;
    }

    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf8f9fa);
    state.scene.fog = new THREE.Fog(0xf8f9fa, 50, 200);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    state.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    state.camera.position.set(5, 5, 5);
    state.camera.lookAt(0, 0, 0);

    // Renderer
    state.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(state.renderer.domElement);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
        state.controls.enableDamping = true;
        state.controls.dampingFactor = 0.05;
        state.controls.screenSpacePanning = false;
        state.controls.minDistance = 0.5;
        state.controls.maxDistance = 500;
        state.controls.maxPolarAngle = Math.PI;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(10, 10, 5);
    dirLight1.castShadow = true;
    state.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-10, 5, -5);
    state.scene.add(dirLight2);

    // Grid and Axes
    state.gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee);
    state.scene.add(state.gridHelper);

    state.axesHelper = new THREE.AxesHelper(5);
    state.scene.add(state.axesHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Hide overlay
    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
    }, 1000);

    console.log('✅ 3D Viewer initialized');
}

function animateViewer() {
    requestAnimationFrame(animateViewer);
    
    // Update FPS
    const currentTime = performance.now();
    const deltaTime = currentTime - state.lastFrameTime;
    state.fps = Math.round(1000 / deltaTime);
    state.lastFrameTime = currentTime;
    
    // Update FPS display occasionally
    if (Math.random() < 0.1) {
        const fpsEl = document.getElementById('statFPS');
        if (fpsEl) fpsEl.textContent = state.fps;
    }

    // Update controls
    if (state.controls) state.controls.update();
    
    // Render scene
    if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
    }
}

function onWindowResize() {
    const container = document.getElementById('viewer');
    if (!container || !state.camera || !state.renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(width, height);
}

// ============= FILE UPLOAD & DRAG-DROP =============

function initFileUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    if (!uploadZone || !fileInput) return;

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            uploadFiles(files);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
}

async function uploadFiles(files) {
    const statusEl = document.getElementById('uploadStatus');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // Show progress
    if (progressContainer) progressContainer.style.display = 'block';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = `Uploading ${file.name} (${i + 1}/${files.length})`;

        try {
            await uploadFile(file);
        } catch (error) {
            console.error('Upload failed:', error);
            showStatus(statusEl, `❌ Failed to upload ${file.name}: ${error.message}`, 'error');
        }
    }

    // Hide progress
    if (progressContainer) progressContainer.style.display = 'none';
    
    // Reload cloud list
    await loadPointClouds();
    showStatus(statusEl, `✅ Successfully uploaded ${files.length} file(s)`, 'success');
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result;
}

// ============= POINT CLOUD MANAGEMENT =============

async function loadPointClouds() {
    try {
        const response = await fetch('/api/pointclouds');
        const data = await response.json();
        
        const clouds = data.pointclouds || [];
        displayPointCloudList(clouds);
        
        // Update stats
        const statEl = document.getElementById('statCloudCount');
        if (statEl) statEl.textContent = clouds.length;
        
        return clouds;
    } catch (error) {
        console.error('Failed to load point clouds:', error);
        return [];
    }
}

function displayPointCloudList(clouds) {
    const listEl = document.getElementById('cloudList');
    if (!listEl) return;

    if (clouds.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p class="empty-text">No point clouds uploaded yet</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = clouds.map(cloud => {
        const isActive = cloud.id === state.selectedCloudId;
        const pointsFormatted = formatNumber(cloud.num_points);
        const sizeFormatted = formatFileSize(cloud.file_size);
        const date = new Date(cloud.created_at).toLocaleDateString();
        
        return `
            <div class="cloud-item ${isActive ? 'active' : ''}" onclick="selectPointCloud('${cloud.id}')">
                <div class="cloud-name">${escapeHtml(cloud.name)}</div>
                <div class="cloud-meta">
                    <span class="cloud-meta-item">📍 ${pointsFormatted} pts</span>
                    <span class="cloud-meta-item">💾 ${sizeFormatted}</span>
                    <span class="cloud-meta-item">📅 ${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function selectPointCloud(id) {
    console.log('Selecting point cloud:', id);
    state.selectedCloudId = id;

    try {
        // Fetch cloud info
        const response = await fetch(`/api/pointclouds/${id}`);
        const cloud = await response.json();
        
        // Update UI
        displayPointCloudList(await loadPointClouds());
        displayCloudInfo(cloud);
        updateStats(cloud);
        
        // Render cloud
        await renderPointCloud(cloud);
        
        // Enable processing
        const processBtn = document.getElementById('processBtn');
        if (processBtn) processBtn.disabled = false;
        
    } catch (error) {
        console.error('Failed to select point cloud:', error);
    }
}

function displayCloudInfo(cloud) {
    const infoEl = document.getElementById('selectedInfo');
    if (!infoEl) return;

    const pointsFormatted = formatNumber(cloud.num_points);
    const bbox = cloud.bounding_box;
    
    infoEl.innerHTML = `
        <strong>Selected:</strong> ${escapeHtml(cloud.name)}<br>
        <strong>Points:</strong> ${pointsFormatted}<br>
        <strong>Center:</strong> (${bbox.center.x.toFixed(2)}, ${bbox.center.y.toFixed(2)}, ${bbox.center.z.toFixed(2)})<br>
        <strong>Size:</strong> ${bbox.size.x.toFixed(2)} × ${bbox.size.y.toFixed(2)} × ${bbox.size.z.toFixed(2)}
    `;
}

function updateStats(cloud) {
    const totalPointsEl = document.getElementById('statTotalPoints');
    const fileSizeEl = document.getElementById('statFileSize');
    
    if (totalPointsEl) totalPointsEl.textContent = formatNumber(cloud.num_points);
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(cloud.file_size);
}

// ============= POINT CLOUD RENDERING =============

async function renderPointCloud(cloud) {
    console.log('Rendering point cloud:', cloud.id);
    
    // Remove existing point cloud
    if (state.pointCloud) {
        state.scene.remove(state.pointCloud);
        state.pointCloud.geometry.dispose();
        state.pointCloud.material.dispose();
        state.pointCloud = null;
    }

    try {
        // Fetch point data
        const response = await fetch(`/api/pointclouds/${cloud.id}/points`);
        const data = await response.json();
        const points = data.points;

        if (!points || points.length === 0) {
            throw new Error('No point data received');
        }

        console.log(`Rendering ${points.length} points`);

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);

        // Compute color based on height for better visualization
        let minZ = Infinity, maxZ = -Infinity;
        points.forEach(p => {
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
        });
        const zRange = maxZ - minZ || 1;

        points.forEach((point, i) => {
            // Position
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;

            // Color
            if (point.color) {
                // Use RGB if available
                colors[i * 3] = point.color[0] / 255;
                colors[i * 3 + 1] = point.color[1] / 255;
                colors[i * 3 + 2] = point.color[2] / 255;
            } else if (point.intensity !== undefined && point.intensity !== null) {
                // Use intensity
                const intensity = point.intensity / 255;
                colors[i * 3] = intensity;
                colors[i * 3 + 1] = intensity;
                colors[i * 3 + 2] = intensity;
            } else {
                // Height-based coloring
                const t = (point.z - minZ) / zRange;
                const color = heightToColor(t);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        });

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();

        // Create material
        const material = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            sizeAttenuation: true
        });

        // Create point cloud
        state.pointCloud = new THREE.Points(geometry, material);
        state.scene.add(state.pointCloud);

        // Fit camera to view
        fitView();

        console.log('✅ Point cloud rendered successfully');
        
    } catch (error) {
        console.error('Failed to render point cloud:', error);
        throw error;
    }
}

function heightToColor(t) {
    // Color gradient: blue -> cyan -> green -> yellow -> red
    const colors = [
        { r: 0.0, g: 0.0, b: 1.0 }, // Blue
        { r: 0.0, g: 1.0, b: 1.0 }, // Cyan
        { r: 0.0, g: 1.0, b: 0.0 }, // Green
        { r: 1.0, g: 1.0, b: 0.0 }, // Yellow
        { r: 1.0, g: 0.0, b: 0.0 }  // Red
    ];

    const segment = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2);
    const localT = (t * (colors.length - 1)) - segment;

    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    return {
        r: c1.r + (c2.r - c1.r) * localT,
        g: c1.g + (c2.g - c1.g) * localT,
        b: c1.b + (c2.b - c1.b) * localT
    };
}

// ============= POINT CLOUD PROCESSING =============

async function processPointCloud() {
    if (!state.selectedCloudId) return;

    const operationType = document.getElementById('operationType').value;
    const paramValue = parseFloat(document.getElementById('paramValue').value);
    const statusEl = document.getElementById('processStatus');

    if (!operationType) {
        showStatus(statusEl, '⚠️ Please select an operation', 'error');
        return;
    }

    showStatus(statusEl, '⏳ Processing...', 'info');

    try {
        const requestBody = { filter_type: operationType };

        if (operationType === 'downsample') {
            requestBody.voxel_size = paramValue;
        } else if (operationType === 'intensity' || operationType === 'distance') {
            requestBody.threshold = paramValue;
        }

        const response = await fetch(`/api/pointclouds/${state.selectedCloudId}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (response.ok) {
            showStatus(statusEl, 
                `✅ Processing complete! ${formatNumber(result.original_points)} → ${formatNumber(result.processed_points)} points`, 
                'success'
            );
        } else {
            showStatus(statusEl, `❌ ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Processing failed:', error);
        showStatus(statusEl, `❌ Processing failed: ${error.message}`, 'error');
    }
}

// ============= UI EVENT HANDLERS =============

function initEventListeners() {
    // Operation type change
    const opType = document.getElementById('operationType');
    const paramGroup = document.getElementById('paramGroup');
    const paramLabel = document.getElementById('paramLabel');
    const paramValue = document.getElementById('paramValue');

    if (opType && paramGroup && paramLabel && paramValue) {
        opType.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (!value) {
                paramGroup.style.display = 'none';
                return;
            }

            paramGroup.style.display = 'block';

            switch (value) {
                case 'downsample':
                    paramLabel.textContent = 'Voxel Size';
                    paramValue.value = '0.1';
                    paramValue.step = '0.01';
                    break;
                case 'intensity':
                    paramLabel.textContent = 'Intensity Threshold';
                    paramValue.value = '100';
                    paramValue.step = '1';
                    break;
                case 'distance':
                    paramLabel.textContent = 'Distance Threshold';
                    paramValue.value = '5.0';
                    paramValue.step = '0.1';
                    break;
                case 'statistical_outlier':
                    paramLabel.textContent = 'Std Dev Multiplier';
                    paramValue.value = '2.0';
                    paramValue.step = '0.1';
                    break;
            }
        });
    }
}

function fitView() {
    if (!state.pointCloud || !state.camera || !state.controls) return;

    const box = new THREE.Box3().setFromObject(state.pointCloud);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = state.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2));

    state.camera.position.copy(center);
    state.camera.position.z += distance * 1.5;
    state.camera.position.y += distance * 0.3;
    state.camera.lookAt(center);

    if (state.controls.target) {
        state.controls.target.copy(center);
    }
}

function toggleGrid() {
    if (state.gridHelper) {
        state.gridHelper.visible = !state.gridHelper.visible;
    }
    if (state.axesHelper) {
        state.axesHelper.visible = !state.axesHelper.visible;
    }
}

function takeScreenshot() {
    if (!state.renderer) return;

    state.renderer.render(state.scene, state.camera);
    const dataURL = state.renderer.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `pointcloud-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

// ============= UTILITY FUNCTIONS =============

function showStatus(element, message, type = 'info') {
    if (!element) return;
    
    const className = `status status-${type}`;
    element.innerHTML = `<div class="${className}">${message}</div>`;
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for global access
window.selectPointCloud = selectPointCloud;
window.processPointCloud = processPointCloud;
window.loadPointClouds = loadPointClouds;
window.fitView = fitView;
window.toggleGrid = toggleGrid;
window.takeScreenshot = takeScreenshot;

console.log('✅ AutoPointCloud application loaded');
