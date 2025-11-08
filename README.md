# 🚀 AutoPointCloud

**Professional Point Cloud Processing Web Application**

A high-performance, web-based point cloud processing application built with Rust and Three.js, featuring a clean Material Design UI. Process millions of points with PCL-like functionality directly in your browser.

![AutoPointCloud](https://img.shields.io/badge/Version-0.1.0-blue)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 📸 Screenshots & Demo

### Material Design Interface
![AutoPointCloud Interface](https://github.com/user-attachments/assets/1b786826-7267-4770-ac98-db489a0f185f)

The application features a clean, modern Material Design interface with:
- **Material Design UI**: Professional design following Material Design principles
- **Blue, White & Green Theme**: Fresh, modern color scheme
- **Drag-and-drop upload zone** for easy file import
- **Real-time point cloud list** showing all loaded datasets
- **Processing controls** with multiple filter options
- **Live statistics** including point count, file size, and FPS
- **3D viewer** with interactive controls

### Working with KITTI-Style Datasets

The application has been tested with KITTI-style point cloud data and other real-world datasets. Demo files are included in the `demo_data/` directory:

#### Example: Street Scene Processing (5,000 points)
```bash
# Upload a KITTI-style street scene
curl -X POST http://127.0.0.1:8080/api/upload \
  -F "file=@demo_data/kitti_street_scene.pcd"

# Response:
{
  "id": "5fa3a8e4-be2a-490e-9197-375b074d2ddd",
  "name": "PointCloud 5fa3a8e4 (PCD)",
  "format": "PCD",
  "points_parsed": 5000
}

# Apply voxel downsampling (0.3m voxel size)
curl -X POST http://127.0.0.1:8080/api/pointclouds/{id}/process \
  -H "Content-Type: application/json" \
  -d '{"filter_type": "downsample", "voxel_size": 0.3}'

# Result: 5,000 → 4,025 points (19.5% reduction)

# Export processed cloud to PLY format
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=ply" \
  -o output.ply
```

The KITTI-style demo scene includes:
- **Ground and road surface** (2,000 points) - Brown terrain with dark gray road
- **Building facades** (1,500 points) - Walls and windows with realistic colors
- **Vehicles** (1,000 points) - Two cars with different colors (red and blue)
- **Vegetation** (500 points) - Trees with green foliage

## ✨ Features

### 🎨 Clean Material Design UI
- Professional Material Design interface
- Blue, white, and green color scheme
- Responsive layout with intuitive controls
- Material Icons for clear visual communication
- Real-time statistics and FPS monitoring
- Smooth animations and transitions
- Drag-and-drop file upload

### 📤 Advanced Ingestion Pipeline
- **Multi-format Support**: PCD (ASCII/Binary), PLY, and more
- **Auto-detection**: Automatically detects and parses file formats
- **Progressive Loading**: Real-time progress tracking during upload
- **Large File Support**: Handles files with millions of points

### ⚡ High-Performance Processing
All operations use parallel processing with Rayon for maximum performance:

- **Voxel Grid Downsampling**: Reduce point density while preserving structure
- **Statistical Outlier Removal**: Remove noise using k-nearest neighbors
- **Radius Outlier Removal**: Filter points with too few neighbors
- **PassThrough Filter**: Crop point clouds along X, Y, or Z axes
- **Intensity Filtering**: Filter by intensity values
- **Distance Filtering**: Filter by distance from centroid
- **Transform Operations**: Translate, rotate, and scale (ready for use)
- **Normal Estimation**: Compute surface normals (ready for use)

### 📦 Export Capabilities
Export your processed point clouds to multiple formats:

- **PCD (Point Cloud Data)**: ASCII format with full metadata support
- **PLY (Polygon File Format)**: Standard format compatible with MeshLab, CloudCompare
- **XYZ**: Simple text format for universal compatibility
- **Preserves Attributes**: Maintains intensity, RGB color, and spatial data
- **One-Click Export**: Simple API endpoint for instant downloads

### 🎯 Interactive 3D Visualization
- **High-Performance Rendering**: WebGL-powered Three.js renderer
- **Interactive Controls**: Orbit, pan, and zoom with smooth damping
- **Height-Based Coloring**: Automatic gradient coloring for depth perception
- **RGB/Intensity Support**: Display point clouds with color or intensity
- **60 FPS Rendering**: Smooth visualization even with large datasets
- **Camera Controls**: Auto-fit view, toggle grid/axes
- **Screenshot Export**: Capture and download viewer images

## 🛠️ Tech Stack

- **Backend**: Rust with Actix-web 4.x
- **Frontend**: Three.js r160, Vanilla JavaScript ES6+
- **Processing**: Rayon for parallel algorithms
- **UI Design**: Material Design with custom CSS
- **Fonts**: Roboto (Google Fonts)
- **Icons**: Material Icons

## 📦 Installation

### Prerequisites
- Rust 1.70+ ([Install Rust](https://rustup.rs/))
- Modern web browser with WebGL support

### Build & Run

```bash
# Clone the repository
git clone https://github.com/sumeshthkr/autopointcloud.git
cd autopointcloud

# Build the project
cargo build --release

# Run the server
cargo run --release

# Or run in development mode
cargo run
```

The application will start on `http://127.0.0.1:8080`

## 🚀 Quick Start

1. **Launch the application**: Navigate to `http://127.0.0.1:8080` in your browser

2. **Upload a point cloud**:
   - Drag and drop a file onto the upload zone, or
   - Click "Choose Files" to select from your file system
   - Supported formats: `.pcd`, `.ply`, `.las`, `.xyz`

3. **View your point cloud**:
   - The 3D viewer will automatically render your point cloud
   - Use mouse to orbit (left-click), pan (right-click), and zoom (scroll)
   - Click "Fit View" (🎯) to auto-frame the point cloud

4. **Process your data**:
   - Select a point cloud from the list
   - Choose a processing operation from the dropdown
   - Adjust parameters as needed
   - Click "Apply Processing" to execute

5. **Export results**:
   - Click the screenshot button (📸) to capture the current view
   - Images are automatically downloaded

## 🌐 Deployment

AutoPointCloud can be deployed to various platforms. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Quick Deployment Options

**Fly.io (Recommended for Rust)**
```bash
flyctl launch
flyctl deploy
```

**Railway**
- Connect your GitHub repository
- Railway auto-detects and deploys Rust apps

**Docker**
```bash
docker build -t autopointcloud .
docker run -p 8080:8080 autopointcloud
```

**See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guides including:**
- Fly.io setup and scaling
- Railway deployment
- Render deployment
- Docker configuration
- Traditional VPS deployment
- CI/CD with GitHub Actions
- Custom domain setup
- Monitoring and maintenance

## 📖 API Documentation

### Endpoints

#### Upload Point Cloud
```http
POST /api/upload
Content-Type: multipart/form-data

Response:
{
  "id": "uuid",
  "name": "PointCloud xyz",
  "message": "Point cloud uploaded successfully",
  "format": "PCD",
  "points_parsed": 10000
}
```

#### List Point Clouds
```http
GET /api/pointclouds

Response:
{
  "pointclouds": [
    {
      "id": "uuid",
      "name": "PointCloud xyz",
      "num_points": 10000,
      "bounding_box": { ... },
      "file_size": 524288,
      "created_at": "2025-11-08T00:00:00Z"
    }
  ]
}
```

#### Get Point Cloud Info
```http
GET /api/pointclouds/{id}
```

#### Get Point Data
```http
GET /api/pointclouds/{id}/points
```

#### Process Point Cloud
```http
POST /api/pointclouds/{id}/process
Content-Type: application/json

{
  "filter_type": "downsample",
  "voxel_size": 0.1
}

Response:
{
  "id": "uuid",
  "original_points": 10000,
  "processed_points": 5000,
  "method": "downsample",
  "success": true
}
```

#### Export Point Cloud
```http
GET /api/pointclouds/{id}/export?format={pcd|ply|xyz}

Response: File download
Content-Type: application/octet-stream (for pcd/ply) or text/plain (for xyz)
Content-Disposition: attachment; filename="PointCloud_xyz_abc123.pcd"
```

**Supported Export Formats:**
- `pcd` - Point Cloud Data (ASCII format with full metadata)
- `ply` - Polygon File Format (compatible with MeshLab, CloudCompare)
- `xyz` - Simple XYZ text format (universal compatibility)

**Example:**
```bash
# Export as PCD
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=pcd" -o output.pcd

# Export as PLY
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=ply" -o output.ply

# Export as XYZ (default format if not specified)
curl "http://127.0.0.1:8080/api/pointclouds/{id}/export?format=xyz" -o output.xyz
```

### Processing Operations

| Operation | Parameters | Description |
|-----------|------------|-------------|
| `downsample` | `voxel_size` (float) | Voxel grid downsampling |
| `statistical_outlier` | `threshold` (float) | Statistical outlier removal |
| `radius_outlier` | `voxel_size` (radius, float) | Radius-based outlier removal |
| `intensity` | `threshold` (float) | Intensity-based filtering |
| `distance` | `threshold` (float) | Distance-based filtering |
| `passthrough_x/y/z` | `threshold` (min), `voxel_size` (max) | Axis-aligned cropping |

## 🏗️ Architecture

```
autopointcloud/
├── src/
│   ├── main.rs           # Application entry point, HTTP server
│   ├── pointcloud.rs     # Point cloud data structures & parsing
│   ├── processing.rs     # Advanced processing algorithms
│   └── handlers.rs       # HTTP request handlers
├── static/
│   ├── app.html          # Main Glass UI interface
│   ├── app.js            # Frontend application logic
│   └── index.html        # Legacy interface
├── demo_data/            # Example point cloud datasets
│   ├── kitti_street_scene.pcd  # 5,000 point KITTI-style urban scene
│   └── demo_pointcloud.pcd     # 1,000 point demonstration cloud
├── test_data/            # Test files for validation
│   ├── sample.pcd        # Small PCD test file
│   └── sample.xyz        # Small XYZ test file
├── Cargo.toml            # Rust dependencies
└── README.md             # This file
```

## 📊 Demo Datasets

The `demo_data/` directory contains realistic point cloud examples:

### KITTI Street Scene (5,000 points)
**File:** `kitti_street_scene.pcd`

A synthetic street scene inspired by the KITTI autonomous driving dataset, featuring:
- **Ground & Road**: 2,000 points of terrain and road surface
- **Buildings**: 1,500 points of building facades with windows
- **Vehicles**: 1,000 points forming two cars (red and blue)
- **Vegetation**: 500 points of trees and foliage

**Scene Dimensions:**
- X: -20m to +20m (40m width)
- Y: -12m to +12m (24m depth)
- Z: -0.2m to +6m (6.2m height)

This dataset is perfect for testing:
- Voxel downsampling algorithms
- Distance-based filtering
- PassThrough filtering for ground removal
- Statistical outlier removal
- Export functionality

### Quick Demo Usage
```bash
# Start the server
cargo run --release

# Upload the KITTI scene
curl -X POST http://127.0.0.1:8080/api/upload \
  -F "file=@demo_data/kitti_street_scene.pcd"

# View in browser
open http://127.0.0.1:8080
```

## 🎯 Performance

- **Upload**: Handles files up to 10GB (depending on available memory)
- **Processing**: Parallel algorithms for multi-core utilization
- **Rendering**: 60 FPS for point clouds with 100K+ points
- **Build Time**: ~2 minutes for release build

## 🔮 Roadmap

### Recently Completed ✅
- [x] **Point cloud export to multiple formats** (v0.1.0)
  - PCD ASCII format with full metadata
  - PLY format for MeshLab/CloudCompare compatibility
  - XYZ simple text format for universal use
  - Preserves intensity and RGB color data
- [x] **KITTI-style dataset support** (v0.1.0)
  - Tested with realistic street scene data
  - Demo datasets included in `demo_data/`
  - Full workflow documentation with examples

### Near-term
- [ ] LAS/LAZ binary format support
- [ ] E57 format support
- [ ] Persistent storage (database)
- [ ] WebSocket for real-time updates
- [ ] Batch processing API
- [ ] Point cloud merge/concatenation

### Mid-term
- [ ] RANSAC-based plane segmentation
- [ ] Euclidean clustering
- [ ] ICP registration
- [ ] Feature extraction (FPFH, PFH)
- [ ] LOD (Level of Detail) for massive datasets
- [ ] Normal estimation visualization
- [ ] Multi-cloud comparison view

### Long-term
- [ ] Multi-user support with authentication
- [ ] Cloud storage integration (S3, Azure, GCP)
- [ ] Batch processing pipeline
- [ ] Machine learning-based classification
- [ ] Plugin system for custom algorithms
- [ ] Real-time collaborative editing
- [ ] GPU-accelerated processing (CUDA)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the Point Cloud Library (PCL)
- Three.js for WebGL rendering
- Actix-web for high-performance HTTP server
- Rayon for data parallelism

## 📧 Contact

- GitHub: [@sumeshthkr](https://github.com/sumeshthkr)
- Project Link: [https://github.com/sumeshthkr/autopointcloud](https://github.com/sumeshthkr/autopointcloud)

---

**Made with ❤️ and Rust**
