# 🚀 AutoPointCloud

**Professional Point Cloud Processing Web Application**

A high-performance, web-based point cloud processing application built with Rust and Three.js, featuring a beautiful Glass Morphism UI design. Process millions of points with PCL-like functionality directly in your browser.

![AutoPointCloud](https://img.shields.io/badge/Version-0.1.0-blue)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎨 Professional Glass Morphism UI
- Beautiful Apple-inspired Glass UI design
- Responsive layout with intuitive controls
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
- **UI Design**: Custom Glass Morphism CSS
- **Fonts**: Inter (Google Fonts)

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
├── Cargo.toml            # Rust dependencies
└── README.md             # This file
```

## 🎯 Performance

- **Upload**: Handles files up to 10GB (depending on available memory)
- **Processing**: Parallel algorithms for multi-core utilization
- **Rendering**: 60 FPS for point clouds with 100K+ points
- **Build Time**: ~2 minutes for release build

## 🔮 Roadmap

### Near-term
- [ ] LAS/LAZ binary format support
- [ ] E57 format support
- [ ] Point cloud export to multiple formats
- [ ] Persistent storage (database)
- [ ] WebSocket for real-time updates

### Mid-term
- [ ] RANSAC-based plane segmentation
- [ ] Euclidean clustering
- [ ] ICP registration
- [ ] Feature extraction (FPFH, PFH)
- [ ] LOD (Level of Detail) for massive datasets

### Long-term
- [ ] Multi-user support with authentication
- [ ] Cloud storage integration
- [ ] Batch processing pipeline
- [ ] Machine learning-based classification
- [ ] Plugin system for custom algorithms

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
