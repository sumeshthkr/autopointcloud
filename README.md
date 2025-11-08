# 🚀 AutoPointCloud

**Professional Point Cloud & 3D Mesh Processing Web Application**

A high-performance, web-based point cloud and 3D mesh processing application built with Next.js and Three.js. Process millions of points and render complex 3D meshes with PCL-like functionality directly in your browser, optimized for deployment on Vercel and Netlify.

![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎨 Modern UI
- **Professional Design**: Clean, modern interface with gradient effects
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Support**: Automatic dark mode based on system preferences
- **Drag & Drop**: Intuitive file upload with drag-and-drop support for point clouds and meshes
- **Real-time Statistics**: Live FPS monitoring and data metrics (vertices, faces, format type)
- **Smart UI**: Automatically adapts to show relevant options based on data type (point cloud vs mesh)

### 📤 File Format Support

**Point Cloud Formats:**
- **PCD (Point Cloud Data)**: ASCII format with full metadata support
- **PLY (Polygon File Format)**: Vertices and faces with full metadata
- **XYZ**: Simple text format for universal compatibility

**3D Mesh Formats:**
- **OBJ (Wavefront)**: Industry-standard 3D mesh format
- **STL (STereoLithography)**: ASCII format for 3D printing and CAD
- **PLY with Faces**: Triangle mesh support with color data

**Features:**
- **Auto-detection**: Automatically detects and parses file formats
- **Large File Support**: Handles files with millions of points/vertices
- **Mesh Rendering**: Full support for triangulated 3D meshes with proper lighting

### ⚡ High-Performance Processing
All operations run client-side with optimized algorithms:

- **Voxel Grid Downsampling**: Reduce point density while preserving structure
- **Statistical Outlier Removal**: Remove noise using k-nearest neighbors
- **Radius Outlier Removal**: Filter points with too few neighbors
- **PassThrough Filter**: Crop point clouds along X, Y, or Z axes
- **Intensity Filtering**: Filter by intensity values
- **Distance Filtering**: Filter by distance from centroid

### 📦 Export Capabilities

**Point Cloud Export:**
- **PCD (Point Cloud Data)**: ASCII format with full metadata support
- **PLY**: Vertices with optional color/intensity data
- **XYZ**: Simple text format for universal compatibility

**Mesh Export:**
- **OBJ**: Vertices and faces with normals
- **STL**: ASCII format with computed normals for 3D printing
- **PLY with Faces**: Complete mesh geometry with triangle data

**Features:**
- **Smart Export**: Automatically shows relevant formats based on data type
- **Preserves Attributes**: Maintains intensity, RGB color, normals, and spatial data
- **Standard Compliance**: Compatible with MeshLab, CloudCompare, Blender, and other 3D tools

### 🎯 Interactive 3D Visualization
- **High-Performance Rendering**: WebGL-powered Three.js renderer via React Three Fiber
- **Dual Rendering Modes**: Point cloud visualization and solid mesh rendering
- **Interactive Controls**: Orbit, pan, and zoom with smooth damping
- **Height-Based Coloring**: Automatic gradient coloring for depth perception
- **RGB/Intensity Support**: Display point clouds with color or intensity
- **Mesh Lighting**: Realistic lighting and shading for 3D meshes with computed normals
- **60 FPS Rendering**: Smooth visualization even with large datasets
- **Auto-fit View**: Automatically frames the data in view

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **3D Rendering**: Three.js with React Three Fiber & Drei
- **UI**: Tailwind CSS 4.0
- **Icons**: Lucide React
- **Processing**: Client-side JavaScript (optimized for performance)
- **Deployment**: Vercel / Netlify optimized

## 📦 Installation

### Prerequisites
- Node.js 20+ ([Install Node.js](https://nodejs.org/))
- npm or yarn package manager

### Development Setup

```bash
# Clone the repository
git clone https://github.com/sumeshthkr/autopointcloud.git
cd autopointcloud

# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sumeshthkr/autopointcloud)

1. Push your code to GitHub
2. Import project in Vercel
3. Vercel will automatically detect Next.js and deploy

Or via CLI:
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/sumeshthkr/autopointcloud)

1. Push your code to GitHub
2. Connect repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`

Or via CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables

No environment variables required! The application runs entirely client-side.

## 🎯 Quick Start Guide

### 1. Upload a Point Cloud or 3D Mesh

- **Drag & Drop**: Drag a `.pcd`, `.ply`, `.xyz`, `.obj`, or `.stl` file onto the upload zone
- **Click to Upload**: Click the upload zone to browse and select a file
- **Demo Files**: Use the demo files in `/demo_data/` directory
  - Point clouds: `kitti_street_scene.pcd`, `demo_pointcloud.pcd`
  - Meshes: `cube.obj`, `cube.stl`

### 2. View Your Data

- The 3D viewer automatically displays your data
- **Point clouds** are rendered as colored points
- **Meshes** are rendered as solid surfaces with lighting
- Use mouse controls:
  - **Left-click + drag**: Rotate view (orbit)
  - **Right-click + drag**: Pan view
  - **Scroll wheel**: Zoom in/out
- Point clouds are colored by height (blue = low, red = high)
- RGB and intensity data are automatically detected and displayed
- Meshes show proper shading based on surface normals

### 3. Process Your Data

- Processing operations work on point cloud data
- Select a processing operation from the dropdown
- Adjust parameters using the sliders
- Click "Apply Processing" to execute
- View results instantly in the 3D viewer
- **Note**: Currently, processing operations are designed for point clouds

### 4. Export Results

**For Point Clouds:**
- Export as PCD, PLY, or XYZ format
- All color and intensity data is preserved

**For Meshes:**
- Export as OBJ, STL, or PLY format
- Geometry, normals, and faces are preserved
- File downloads automatically to your computer

## 📖 Processing Operations

### Voxel Downsampling
Reduces point density by dividing space into voxels and computing the centroid of points in each voxel.

- **Parameter**: Voxel Size (0.01 - 1.0)
- **Use case**: Reduce file size, improve rendering performance
- **Example**: 5,000 points → 4,025 points (19.5% reduction)

### Statistical Outlier Removal
Removes outliers based on statistical analysis of k-nearest neighbor distances.

- **Parameter**: Threshold (standard deviation multiplier)
- **Use case**: Remove noise and isolated points
- **Algorithm**: Computes mean distance to k-NN, filters beyond threshold

### Radius Outlier Removal
Filters points with fewer than a minimum number of neighbors within a given radius.

- **Parameter**: Radius and minimum neighbors
- **Use case**: Remove sparse outliers
- **Algorithm**: Counts neighbors within radius sphere

### PassThrough Filter
Crops the point cloud along a specified axis within min/max bounds.

- **Parameter**: Axis (X/Y/Z) and range
- **Use case**: Extract regions of interest, remove ground/ceiling
- **Example**: Remove all points below Z=0 (ground removal)

### Intensity Filter
Filters points based on intensity values.

- **Parameter**: Minimum intensity threshold
- **Use case**: Remove low-reflectance points
- **Requires**: Point cloud with intensity data

### Distance Filter
Filters points by distance from the centroid.

- **Parameter**: Maximum distance threshold
- **Use case**: Extract core regions, remove far outliers
- **Algorithm**: Euclidean distance from bounding box center

## 🏗️ Architecture

```
autopointcloud/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/
│   │   ├── button.tsx      # Button component
│   │   └── card.tsx        # Card components
│   └── PointCloudViewer.tsx # 3D visualization component
├── lib/
│   ├── types.ts            # TypeScript type definitions
│   ├── utils.ts            # Utility functions
│   ├── parser.ts           # File parsing logic
│   └── processing.ts       # Point cloud processing algorithms
├── public/
│   ├── demo_data/          # Demo point cloud files
│   └── test_data/          # Test files
└── package.json            # Dependencies and scripts
```

## 🎨 Demo Datasets

The `/demo_data/` directory contains example files:

### Point Clouds

**KITTI Street Scene (5,000 points)**
- **File:** `kitti_street_scene.pcd`
- A synthetic street scene inspired by the KITTI autonomous driving dataset
- **Ground & Road**: 2,000 points
- **Buildings**: 1,500 points (facades with windows)
- **Vehicles**: 1,000 points (two cars)
- **Vegetation**: 500 points (trees)
- **Dimensions**: X: -20m to +20m, Y: -12m to +12m, Z: -0.2m to +6m
- Perfect for testing downsampling, filtering, and visualization

**Demo Point Cloud**
- **File:** `demo_pointcloud.pcd`
- Small sample point cloud for quick testing

### 3D Meshes

**Cube Mesh**
- **Files:** `cube.obj`, `cube.stl`
- Simple cube geometry (8 vertices, 12 triangular faces)
- Perfect for testing mesh rendering, export, and visualization
- Demonstrates both OBJ and STL format support

## 📊 Performance

### Client-Side Processing
- **Upload**: Instant (no server round-trip)
- **Parsing**: ~5,000 points/ms for PCD/XYZ
- **Processing**: Optimized JavaScript algorithms
- **Rendering**: 60 FPS for 100K+ points

### Scalability
- **Small files** (1K-10K points): Instant processing
- **Medium files** (10K-100K points): < 1 second processing
- **Large files** (100K-1M points): 1-5 seconds processing
- **Very large files** (1M+ points): Consider downsampling first

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Mobile: Limited by device memory

## 🔮 Roadmap

### v2.1 (Coming Soon)
- [ ] LAS/LAZ binary format support
- [ ] Web Workers for parallel processing
- [ ] Multiple point clouds in single view
- [ ] Advanced colorization modes
- [ ] Screenshot/image export

### v2.2 (Future)
- [ ] RANSAC-based plane segmentation
- [ ] Euclidean clustering
- [ ] ICP registration
- [ ] Feature extraction (FPFH, PFH)
- [ ] Normal estimation visualization

### v3.0 (Long-term)
- [ ] WebAssembly for critical algorithms
- [ ] GPU-accelerated processing (WebGPU)
- [ ] Level of Detail (LOD) for massive datasets
- [ ] Real-time collaboration features
- [ ] Cloud storage integration

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
- Next.js for the excellent framework
- React Three Fiber for React + Three.js integration
- Tailwind CSS for styling

## 📧 Contact

- GitHub: [@sumeshthkr](https://github.com/sumeshthkr)
- Project Link: [https://github.com/sumeshthkr/autopointcloud](https://github.com/sumeshthkr/autopointcloud)

---

**Built with ❤️ using Next.js, TypeScript, and Three.js**
