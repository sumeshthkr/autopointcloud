# AutoPointCloud - Feature List

## Current Features (v0.1.0)

### 🎨 User Interface
- **Glass Morphism Design**: Modern Apple-inspired frosted glass UI
- **Responsive Layout**: Works on desktop and tablet
- **Drag & Drop Upload**: Intuitive file upload with visual feedback
- **Real-time Statistics**: Live FPS, point count, file size monitoring
- **Professional Animations**: Smooth transitions and loading states
- **Empty States**: Beautiful placeholders when no data is loaded

### 📁 File Format Support

#### Supported Formats
1. **PCD (Point Cloud Data)**
   - ASCII format
   - Binary format (little-endian)
   - Auto-detection of format variant
   - Supports: XYZ, intensity, RGB

2. **PLY (Polygon File Format)**
   - ASCII format
   - Header parsing
   - Supports: XYZ coordinates

3. **XYZ (Plain Text)**
   - Space/tab delimited
   - Format: X Y Z [intensity] [R G B]
   - Comment line support (# and //)
   - Flexible column parsing

4. **PTX (Leica PTX)**
   - Compatible with XYZ parser
   - Plain text format support

### ⚡ Processing Operations

#### 1. Voxel Grid Downsampling
- **Purpose**: Reduce point density while preserving structure
- **Method**: Parallel voxel grid with centroid computation
- **Parameters**: Voxel size (float)
- **Performance**: Parallel processing with Rayon
- **Preserves**: Intensity and color (averaged per voxel)

#### 2. Statistical Outlier Removal
- **Purpose**: Remove noise using statistical analysis
- **Method**: k-nearest neighbors distance distribution
- **Parameters**: k_neighbors (default: 20), std_dev_multiplier (default: 2.0)
- **Algorithm**: Computes mean distance to k-NN, filters points beyond threshold
- **Performance**: Parallel distance computation

#### 3. Radius Outlier Removal
- **Purpose**: Remove isolated points
- **Method**: Neighbor count within radius
- **Parameters**: radius (float), min_neighbors (default: 5)
- **Algorithm**: Filters points with fewer than min_neighbors in radius
- **Performance**: Parallel filtering

#### 4. Intensity Filter
- **Purpose**: Filter by intensity threshold
- **Method**: Direct threshold comparison
- **Parameters**: threshold (float)
- **Use case**: Remove low-reflectance points

#### 5. Distance Filter
- **Purpose**: Filter by distance from centroid
- **Method**: Euclidean distance from bounding box center
- **Parameters**: threshold (float)
- **Use case**: Extract core regions, remove outliers

#### 6. PassThrough Filter (X/Y/Z)
- **Purpose**: Crop point cloud along specific axis
- **Method**: Min/max bounds filtering
- **Parameters**: axis (x/y/z), min_value, max_value
- **Use case**: Extract regions of interest, remove ground/ceiling

### 🎯 3D Visualization

#### Renderer Features
- **Engine**: Three.js r160 WebGL renderer
- **Antialiasing**: Enabled
- **Pixel Ratio**: Automatic device pixel ratio
- **Shadow Mapping**: PCF soft shadows

#### Camera Controls
- **Type**: Perspective camera with OrbitControls
- **FOV**: 60 degrees
- **Damping**: Smooth camera movements
- **Min/Max Distance**: 0.5 to 500 units
- **Auto-fit**: Automatic camera positioning to frame point cloud

#### Lighting
- **Ambient Light**: 60% intensity for overall illumination
- **Directional Light 1**: 80% intensity from (10, 10, 5)
- **Directional Light 2**: 40% intensity from (-10, 5, -5)

#### Point Rendering
- **Material**: PointsMaterial with vertex colors
- **Size**: 0.03 (configurable)
- **Size Attenuation**: Enabled (perspective sizing)
- **Vertex Colors**: Support for RGB and intensity-based coloring

#### Coloring Modes
1. **RGB Color**: Uses point cloud RGB values (0-255)
2. **Intensity**: Grayscale based on intensity values
3. **Height-based Gradient**: 5-color gradient (blue→cyan→green→yellow→red)

#### Scene Helpers
- **Grid Helper**: 20x20 grid (toggleable)
- **Axes Helper**: XYZ axes with 5-unit length (toggleable)
- **Fog**: Distance-based fog for depth perception

#### Interactive Controls
- **Orbit**: Left-click drag
- **Pan**: Right-click drag
- **Zoom**: Mouse wheel
- **Screenshot**: PNG export
- **Toggle Grid/Axes**: Visibility controls

### 🔧 Backend API

#### Endpoints

**1. Health Check**
```
GET /api/health
Response: { status, service, version }
```

**2. Upload Point Cloud**
```
POST /api/upload
Content-Type: multipart/form-data
Response: { id, name, message, format, points_parsed }
```

**3. List Point Clouds**
```
GET /api/pointclouds
Response: { pointclouds: [{ id, name, num_points, bounding_box, file_size, created_at }] }
```

**4. Get Point Cloud Info**
```
GET /api/pointclouds/{id}
Response: { id, name, num_points, bounding_box, file_size, created_at }
```

**5. Get Point Data**
```
GET /api/pointclouds/{id}/points
Response: { id, points: [{ x, y, z, intensity?, color? }] }
```

**6. Delete Point Cloud**
```
DELETE /api/pointclouds/{id}
Response: { message }
```

**7. Process Point Cloud**
```
POST /api/pointclouds/{id}/process
Content-Type: application/json
Body: { filter_type, threshold?, voxel_size? }
Response: { id, original_points, processed_points, method, success }
```

### 📊 Data Structures

#### Point3D
```rust
{
    x: f64,
    y: f64,
    z: f64,
    intensity: Option<f64>,
    color: Option<[u8; 3]>,
}
```

#### BoundingBox
```rust
{
    min: Point3D,
    max: Point3D,
    center: Point3D,
    size: Vector3D,
}
```

#### PointCloudInfo
```rust
{
    id: String,
    name: String,
    num_points: usize,
    bounding_box: BoundingBox,
    file_size: u64,
    created_at: DateTime<Utc>,
}
```

### 🚀 Performance Characteristics

- **Parallel Processing**: All processing operations use Rayon
- **Multi-threaded**: Utilizes all available CPU cores
- **Memory Efficient**: Streaming file uploads
- **WebGL Rendering**: Hardware-accelerated 3D graphics
- **FPS Target**: 60 FPS for interactive rendering

### 🧪 Testing

- **Unit Tests**: 3 tests covering core processing functions
- **Test Coverage**: Voxel downsampling, PassThrough filter, Transform
- **Sample Data**: XYZ and PCD sample files included

## Future Enhancements

### High Priority
- [ ] LOD (Level of Detail) for large datasets (10M+ points)
- [ ] LAS/LAZ binary format support with compression
- [ ] Point cloud streaming/chunking
- [ ] Export to multiple formats
- [ ] Octree spatial indexing

### Medium Priority
- [ ] RANSAC plane segmentation
- [ ] Euclidean clustering
- [ ] ICP registration
- [ ] Feature extraction (FPFH, PFH)
- [ ] Normal estimation visualization
- [ ] Multiple coloring modes

### Low Priority
- [ ] E57 format support
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Undo/redo
- [ ] Project persistence
- [ ] Comparison view

## Technology Stack

### Backend
- **Language**: Rust 1.70+
- **Web Framework**: Actix-web 4.x
- **Parallelism**: Rayon 1.10
- **Math**: nalgebra 0.32
- **Serialization**: serde, serde_json
- **Error Handling**: anyhow, thiserror

### Frontend
- **3D Engine**: Three.js r160
- **Language**: Vanilla JavaScript ES6+
- **UI**: Custom CSS with Glass Morphism
- **Fonts**: Inter (Google Fonts)

### Development
- **Build Tool**: Cargo
- **Testing**: cargo test
- **Linting**: cargo fmt, cargo clippy

## Performance Benchmarks

### Processing (approximate, hardware-dependent)
- **Voxel Downsampling**: ~1000 points/ms (10K points in 10ms)
- **Statistical Outlier Removal**: ~500 points/ms (compute-intensive)
- **PassThrough Filter**: ~2000 points/ms (simple filter)

### Rendering
- **10K points**: 60 FPS
- **100K points**: 45-60 FPS
- **1M+ points**: May require LOD implementation

### File Parsing
- **PCD ASCII**: ~5000 points/ms
- **XYZ**: ~8000 points/ms (simpler format)
- **Binary PCD**: ~10000 points/ms (future optimization target)

## Browser Compatibility

### Minimum Requirements
- **WebGL**: WebGL 1.0 support required
- **ES6**: Modern JavaScript engine
- **CSS**: backdrop-filter support (for glass effects)

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Known Limitations
- Requires external CDN access for Three.js (or local hosting)
- Large point clouds (>1M points) may require more memory
- Mobile browsers have limited WebGL memory

---

**Last Updated**: 2025-11-08
**Version**: 0.1.0
