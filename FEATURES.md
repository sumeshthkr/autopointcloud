# AutoPointCloud - Complete Feature List

This document provides a comprehensive list of all point cloud and mesh processing features available in AutoPointCloud, matching and extending capabilities from PCL (Point Cloud Library) and Open3D.

## Table of Contents
- [File Format Support](#file-format-support)
- [Basic Filtering](#basic-filtering)
- [Advanced Filtering](#advanced-filtering)
- [Normal Estimation](#normal-estimation)
- [Segmentation](#segmentation)
- [Clustering](#clustering)
- [Registration](#registration)
- [Feature Extraction](#feature-extraction)
- [Keypoint Detection](#keypoint-detection)
- [Surface Reconstruction](#surface-reconstruction)
- [Mesh Processing](#mesh-processing)
- [Visualization](#visualization)
- [Spatial Indexing](#spatial-indexing)

## File Format Support

### Import Formats
- **PCD (Point Cloud Data)**: ASCII format with full metadata support
- **PLY (Polygon File Format)**: ASCII format for vertices and faces
- **XYZ**: Simple text format with optional intensity/color
- **OBJ (Wavefront)**: Industry-standard 3D mesh format
- **STL (STereoLithography)**: ASCII format for 3D meshes
- **LAS/LAZ**: *(Planned)* LIDAR data formats

### Export Formats
- **PCD**: With intensity and RGB color preservation
- **PLY**: With faces, colors, and normals
- **XYZ**: Simple format with attributes
- **OBJ**: Meshes with normals and faces
- **STL**: ASCII format for 3D printing

## Basic Filtering

### Voxel Downsampling
Reduces point density by dividing space into voxels and computing centroids.

```typescript
ProcessingOptions: {
  filterType: 'downsample',
  voxelSize: 0.01  // Size of voxel grid
}
```

**PCL Equivalent**: `pcl::VoxelGrid`
**Open3D Equivalent**: `voxel_down_sample()`

### Statistical Outlier Removal
Removes outliers based on statistical analysis of k-nearest neighbor distances.

```typescript
ProcessingOptions: {
  filterType: 'statistical_outlier',
  kNeighbors: 20,
  stdDevMultiplier: 2.0
}
```

**PCL Equivalent**: `pcl::StatisticalOutlierRemoval`
**Open3D Equivalent**: `remove_statistical_outliers()`

### Radius Outlier Removal
Filters points with fewer than a minimum number of neighbors within a given radius.

```typescript
ProcessingOptions: {
  filterType: 'radius_outlier',
  radius: 1.0,
  minNeighbors: 5
}
```

**PCL Equivalent**: `pcl::RadiusOutlierRemoval`
**Open3D Equivalent**: `remove_radius_outliers()`

### PassThrough Filter
Crops the point cloud along a specified axis within min/max bounds.

```typescript
ProcessingOptions: {
  filterType: 'passthrough_x',  // or 'passthrough_y', 'passthrough_z'
  minValue: -10,
  maxValue: 10
}
```

**PCL Equivalent**: `pcl::PassThrough`

### Intensity Filter
Filters points based on intensity values.

```typescript
ProcessingOptions: {
  filterType: 'intensity',
  threshold: 0.5
}
```

### Distance Filter
Filters points by distance from the centroid.

```typescript
ProcessingOptions: {
  filterType: 'distance',
  threshold: 10.0
}
```

## Advanced Filtering

### Bilateral Filter
Edge-preserving smoothing that preserves sharp features.

```typescript
ProcessingOptions: {
  filterType: 'bilateral',
  sigmaS: 0.1,  // Spatial standard deviation
  sigmaR: 0.05  // Range standard deviation
}
```

**Open3D Equivalent**: `filter_smooth_bilateral()`

### Conditional Filter
Removes points based on custom condition function.

```typescript
ProcessingOptions: {
  filterType: 'conditional',
  condition: (point) => point.z > 0  // Custom predicate
}
```

**PCL Equivalent**: `pcl::ConditionalRemoval`

### Crop Box Filter
Extracts points within a 3D bounding box.

```typescript
ProcessingOptions: {
  filterType: 'crop_box',
  minPoint: { x: -1, y: -1, z: -1 },
  maxPoint: { x: 1, y: 1, z: 1 }
}
```

**PCL Equivalent**: `pcl::CropBox`

### Moving Least Squares (MLS) Smoothing
Surface smoothing and upsampling using polynomial fitting.

```typescript
ProcessingOptions: {
  filterType: 'mls_smoothing',
  searchRadius: 0.03,
  polynomialOrder: 2
}
```

**PCL Equivalent**: `pcl::MovingLeastSquares`

### Additional Filters (via AdvancedFilters class)
- **Random Sampling**: Random point selection
- **Uniform Sampling**: Spatially distributed sampling
- **Median Filter**: Smoothing with median of neighbors
- **Shadow Point Removal**: Remove low-intensity shadow points
- **NaN Point Removal**: Remove invalid coordinates

## Normal Estimation

Estimates surface normals for each point using PCA on k-nearest neighbors.

```typescript
ProcessingOptions: {
  filterType: 'normal_estimation',
  kNeighbors: 30,
  normalRadius: 0.03  // Optional radius search
}
```

**PCL Equivalent**: `pcl::NormalEstimation`
**Open3D Equivalent**: `estimate_normals()`

**Features**:
- PCA-based normal computation
- Covariance matrix analysis
- Automatic normal orientation toward viewpoint

## Segmentation

### RANSAC Plane Segmentation
Detects and extracts planar surfaces using RANSAC.

```typescript
ProcessingOptions: {
  filterType: 'plane_segmentation',
  distanceThreshold: 0.01,
  maxIterations: 1000
}
```

**PCL Equivalent**: `pcl::SACSegmentation` with `SACMODEL_PLANE`
**Open3D Equivalent**: `segment_plane()`

**Returns**: Plane model with coefficients (ax + by + cz + d = 0) and inlier indices

### Cylinder Fitting
RANSAC-based cylinder detection.

```typescript
SegmentationProcessor.fitCylinder(points, {
  distanceThreshold: 0.01,
  maxIterations: 1000,
  minRadius: 0.01,
  maxRadius: 1.0
})
```

**PCL Equivalent**: `pcl::SACSegmentation` with `SACMODEL_CYLINDER`

### Sphere Fitting
RANSAC-based sphere detection.

```typescript
SegmentationProcessor.fitSphere(points, {
  distanceThreshold: 0.01,
  maxIterations: 1000,
  minRadius: 0.01,
  maxRadius: 1.0
})
```

**PCL Equivalent**: `pcl::SACSegmentation` with `SACMODEL_SPHERE`

### Min-Cut Segmentation
Graph-based binary segmentation using min-cut algorithm.

```typescript
SegmentationProcessor.minCutSegmentation(
  points,
  foregroundIndices,
  backgroundIndices,
  smoothWeight,
  radius
)
```

**PCL Equivalent**: `pcl::MinCutSegmentation`

## Clustering

### Euclidean Clustering
Groups nearby points into clusters for object detection.

```typescript
ProcessingOptions: {
  filterType: 'euclidean_clustering',
  clusterTolerance: 0.02,
  minClusterSize: 100,
  maxClusterSize: 25000
}
```

**PCL Equivalent**: `pcl::EuclideanClusterExtraction`
**Open3D Equivalent**: `cluster_dbscan()`

### Region Growing Segmentation
Segments based on normal similarity and smoothness.

```typescript
ProcessingOptions: {
  filterType: 'region_growing',
  kNeighbors: 30,
  smoothnessThreshold: 5.0,  // degrees
  curvatureThreshold: 1.0
}
```

**PCL Equivalent**: `pcl::RegionGrowing`

### Supervoxel Clustering
Over-segmentation into small consistent regions.

```typescript
SegmentationProcessor.supervoxelClustering(points, {
  voxelResolution: 0.008,
  seedResolution: 0.08,
  colorImportance: 0.2,
  spatialImportance: 0.4,
  normalImportance: 1.0
})
```

**PCL Equivalent**: `pcl::SupervoxelClustering`

### Conditional Euclidean Clustering
Clustering with custom constraints between points.

```typescript
SegmentationProcessor.conditionalClustering(
  points,
  clusterTolerance,
  minClusterSize,
  maxClusterSize,
  customCondition
)
```

**PCL Equivalent**: `pcl::ConditionalEuclideanClustering`

## Registration

### Point-to-Point ICP
Standard Iterative Closest Point registration.

```typescript
RegistrationProcessor.icp(
  sourcePoints,
  targetPoints,
  maxIterations: 50,
  tolerance: 1e-6,
  maxCorrespondenceDistance: 0.05
)
```

**PCL Equivalent**: `pcl::IterativeClosestPoint`
**Open3D Equivalent**: `registration_icp()`

**Returns**: Transformation matrix, fitness score, RMSE

### Point-to-Plane ICP
More robust ICP variant using surface normals.

```typescript
RegistrationProcessor.pointToPlaneICP(
  sourcePoints,
  targetPointsWithNormals,
  maxIterations: 50,
  tolerance: 1e-6,
  maxCorrespondenceDistance: 0.05
)
```

**PCL Equivalent**: `pcl::IterativeClosestPointWithNormals`
**Open3D Equivalent**: `registration_icp()` with `TransformationEstimationPointToPlane`

### RANSAC Registration
Outlier-robust registration using RANSAC.

```typescript
RegistrationProcessor.ransacRegistration(
  sourcePoints,
  targetPoints,
  maxIterations: 1000,
  inlierThreshold: 0.05,
  minInliers: 100
)
```

**Open3D Equivalent**: `registration_ransac_based_on_feature_matching()`

## Feature Extraction

### FPFH (Fast Point Feature Histograms)
Computes local geometric features for each point.

```typescript
AdvancedProcessor.computeFPFH(points, kNeighbors: 30)
```

**PCL Equivalent**: `pcl::FPFHEstimation`
**Open3D Equivalent**: `compute_fpfh_feature()`

**Output**: 33-dimensional feature descriptors for point matching and recognition

**Applications**:
- Object recognition
- Point cloud registration
- Feature matching

## Keypoint Detection

### Harris 3D Keypoints
Detects distinctive 3D corner points.

```typescript
AdvancedProcessor.detectHarrisKeypoints(
  points,
  radius: 0.1,
  threshold: 0.01
)
```

**PCL Equivalent**: `pcl::HarrisKeypoint3D`

**Features**:
- Response computation using covariance matrix
- Non-maximum suppression
- Adjustable detection threshold

## Surface Reconstruction

### Greedy Projection Triangulation
Fast surface reconstruction by projecting and connecting points.

```typescript
MeshProcessor.greedyProjectionTriangulation(
  points,
  searchRadius: 0.025,
  maxNearestNeighbors: 100
)
```

**PCL Equivalent**: `pcl::GreedyProjectionTriangulation`

### Ball Pivoting Algorithm
Surface reconstruction using virtual ball pivoting.

```typescript
MeshProcessor.ballPivoting(
  points,
  ballRadius: 0.025
)
```

**PCL Equivalent**: `pcl::BallPivoting`
**Open3D Equivalent**: `create_from_point_cloud_ball_pivoting()`

### Planned: Poisson Surface Reconstruction
High-quality watertight surface reconstruction (coming soon).

**PCL Equivalent**: `pcl::Poisson`
**Open3D Equivalent**: `create_from_point_cloud_poisson()`

## Mesh Processing

### Laplacian Smoothing
Simple mesh smoothing algorithm.

```typescript
ProcessingOptions: {
  filterType: 'mesh_smoothing',
  iterations: 10,
  lambda: 0.5
}
```

**PCL Equivalent**: `pcl::MeshSmoothingLaplacianVTK`
**Open3D Equivalent**: `filter_smooth_laplacian()`

### Taubin Smoothing
Improved smoothing that prevents mesh shrinkage.

```typescript
MeshProcessor.taubinSmoothing(
  vertices,
  faces,
  iterations: 10,
  lambda: 0.5,
  mu: -0.53
)
```

### Mesh Decimation
Reduces mesh complexity while preserving shape.

```typescript
ProcessingOptions: {
  filterType: 'mesh_decimation',
  targetFaceCount: 5000
}
```

**Open3D Equivalent**: `simplify_quadric_decimation()`

**Method**: Quadric Error Metrics (Garland-Heckbert algorithm)

### Loop Subdivision
Mesh refinement for smoother surfaces.

```typescript
ProcessingOptions: {
  filterType: 'mesh_subdivision'
}
```

**Open3D Equivalent**: `subdivide_loop()`

### Normal Computation
Computes face and vertex normals for meshes.

```typescript
MeshProcessor.computeMeshNormals(vertices, faces)
```

**Open3D Equivalent**: `compute_vertex_normals()`

## Visualization

### Color Maps
Apply scientific color gradients to point clouds.

**Available Color Maps**:
- **Jet**: Blue → Cyan → Green → Yellow → Red (classic)
- **Viridis**: Perceptually uniform color map
- **Rainbow**: Full spectrum visualization
- **Hot**: Black → Red → Yellow → White
- **Cool**: Cyan → Magenta gradient
- **Gray**: Grayscale visualization
- **Turbo**: Improved jet alternative (Google Turbo)
- **Plasma**: Matplotlib plasma color map

```typescript
VisualizationUtils.applyColorMap(
  points,
  colorMap: 'jet',
  mode: 'height'  // or 'intensity', 'normal', 'curvature', 'uniform'
)
```

**PCL Equivalent**: Various visualization handlers
**Open3D Equivalent**: Color map functionality in visualization

### Coloring Modes
- **Height-based**: Color by Z coordinate
- **Intensity-based**: Color by point intensity
- **Normal-based**: Color by surface orientation
- **Curvature-based**: Color by local curvature
- **Cluster-based**: Color by cluster ID
- **Uniform**: Single color

### Point Size Adjustment
Adjust rendering size based on distance or custom criteria.

```typescript
VisualizationUtils.adjustPointSizes(
  points,
  baseSize: 1,
  distanceScaling: true,
  cameraPosition
)
```

## Spatial Indexing

Efficient spatial queries for large point clouds.

### Octree
Hierarchical space partitioning for fast spatial queries.

```typescript
const octree = new Octree(points, maxPointsPerNode: 10)
const neighbors = octree.radiusSearch(center, radius)
const nearest = octree.kNearestSearch(query, k)
```

**PCL Equivalent**: `pcl::octree::OctreePointCloud`
**Open3D Equivalent**: `Octree`

**Features**:
- Adaptive subdivision
- Radius search O(log n)
- K-nearest neighbor search
- Configurable max points per node

### KD-Tree
Binary space partitioning for efficient nearest neighbor search.

```typescript
const kdtree = new KDTree(points)
const neighbors = kdtree.radiusSearch(center, radius)
const nearest = kdtree.kNearestSearch(query, k)
```

**PCL Equivalent**: `pcl::KdTree`
**Open3D Equivalent**: `KDTreeFlann`

**Advantages**:
- Very fast k-NN queries
- Memory efficient
- Optimal for high-dimensional data

### Automatic Index Selection

```typescript
const index = SpatialIndex.buildIndex(points, preferKDTree: false)
```

Automatically selects the best spatial index based on:
- Point cloud size
- Query type expected
- Memory constraints

## Performance Optimizations

### Spatial Indexing
- Octree for balanced spatial queries
- KD-tree for k-NN dominated workloads
- Automatic index selection

### Algorithm Optimizations
- Vectorized operations where possible
- Early termination in iterative algorithms
- Efficient neighbor search with spatial indexing
- Approximate methods for real-time processing

### Planned Optimizations
- **Web Workers**: Parallel processing for multi-core systems
- **WebAssembly**: Native performance for critical algorithms
- **WebGPU**: GPU acceleration for point cloud operations
- **LOD System**: Level-of-detail for massive datasets

## Comparison with PCL and Open3D

### Feature Coverage

| Feature Category | AutoPointCloud | PCL | Open3D |
|-----------------|----------------|-----|---------|
| File Formats | 6+ | 10+ | 8+ |
| Basic Filters | 8 | 15+ | 12+ |
| Advanced Filters | 10 | 20+ | 10+ |
| Segmentation | 6 | 10+ | 5+ |
| Registration | 3 | 8+ | 5+ |
| Surface Reconstruction | 2 | 5+ | 4+ |
| Mesh Processing | 5 | 8+ | 8+ |
| Keypoint Detection | 1 | 5+ | 2+ |
| Feature Descriptors | 1 | 10+ | 3+ |
| Spatial Indexing | 2 | 3+ | 2+ |
| Visualization | Full | Full | Full |

### Unique Advantages of AutoPointCloud

1. **Browser-Based**: No installation required, runs entirely in browser
2. **Real-Time Preview**: Immediate visual feedback
3. **Platform Independent**: Works on any device with a browser
4. **Client-Side Processing**: No server required, privacy-preserving
5. **Modern UI**: Beautiful, responsive interface with Tailwind CSS
6. **TypeScript**: Type-safe API with excellent IDE support

### When to Use Each Library

**Use PCL when**:
- Need C++ performance
- Working with ROS (Robot Operating System)
- Require specialized sensors/hardware integration
- Need maximum algorithm coverage

**Use Open3D when**:
- Python development preferred
- Need GPU acceleration
- Working with deep learning pipelines
- Require scientific visualization

**Use AutoPointCloud when**:
- Web-based application required
- Quick prototyping and visualization
- No installation/setup complexity
- Cross-platform compatibility essential
- Educational purposes
- Demonstration and sharing workflows

## Usage Examples

### Example 1: Basic Point Cloud Processing

```typescript
// Load point cloud
const file = await loadFile('pointcloud.pcd')
const pointCloud = await PointCloudParser.parseFile(file)

// Downsample
const downsampled = await PointCloudProcessor.process(pointCloud, {
  filterType: 'downsample',
  voxelSize: 0.01
})

// Remove outliers
const filtered = await PointCloudProcessor.process(downsampled.pointCloud, {
  filterType: 'statistical_outlier',
  kNeighbors: 20,
  stdDevMultiplier: 2.0
})

// Export result
const data = PointCloudProcessor.exportToFormat(filtered.pointCloud, 'ply')
```

### Example 2: Plane Detection and Removal

```typescript
// Estimate normals
const withNormals = await PointCloudProcessor.process(pointCloud, {
  filterType: 'normal_estimation',
  kNeighbors: 30
})

// Segment plane (e.g., ground plane)
const segmented = await PointCloudProcessor.process(withNormals.pointCloud, {
  filterType: 'plane_segmentation',
  distanceThreshold: 0.01,
  maxIterations: 1000
})

// Extract non-planar points (objects)
const objects = AdvancedFilters.extractIndices(
  pointCloud.points,
  segmented.metadata.plane.inliers,
  negative: true  // Extract points NOT in plane
)
```

### Example 3: Object Clustering

```typescript
// Cluster objects
const clustered = await PointCloudProcessor.process(pointCloud, {
  filterType: 'euclidean_clustering',
  clusterTolerance: 0.02,
  minClusterSize: 100,
  maxClusterSize: 25000
})

// Access individual clusters
const clusters = clustered.metadata.clusters
clusters.forEach(cluster => {
  console.log(`Cluster ${cluster.id}: ${cluster.points.length} points`)
  console.log(`Centroid:`, cluster.centroid)
})
```

### Example 4: Point Cloud Registration

```typescript
// Align two point clouds
const result = RegistrationProcessor.icp(
  sourceCloud.points,
  targetCloud.points,
  50,    // max iterations
  1e-6,  // tolerance
  0.05   // max correspondence distance
)

console.log('Registration fitness:', result.fitness)
console.log('RMSE:', result.inlierRMSE)
console.log('Transform matrix:', result.transformMatrix)
```

### Example 5: Surface Reconstruction

```typescript
// Estimate normals first
const withNormals = AdvancedProcessor.estimateNormals(points, 30)

// Reconstruct surface
const faces = MeshProcessor.greedyProjectionTriangulation(
  withNormals,
  0.025,  // search radius
  100     // max neighbors
)

// Create mesh point cloud
const mesh: PointCloud = {
  ...pointCloud,
  faces,
  numFaces: faces.length,
  isMesh: true
}
```

### Example 6: Visualization with Custom Colors

```typescript
// Apply color map
const colored = VisualizationUtils.applyColorMap(
  points,
  'viridis',  // color map
  'height'    // color by height
)

// Or color by clusters
const clusterColored = VisualizationUtils.colorByClusters(
  points,
  clusterIds
)
```

## API Reference

See individual library files for detailed API documentation:
- `lib/types.ts` - Type definitions
- `lib/processing.ts` - Basic processing operations
- `lib/advanced-processing.ts` - Advanced algorithms
- `lib/mesh-processing.ts` - Mesh operations
- `lib/registration.ts` - Registration algorithms
- `lib/filters.ts` - Advanced filters
- `lib/segmentation.ts` - Segmentation methods
- `lib/visualization.ts` - Visualization utilities
- `lib/spatial-index.ts` - Spatial indexing structures

## Future Roadmap

### Planned Features (v3.0+)
- Poisson surface reconstruction
- NDT (Normal Distributions Transform) registration
- GICP (Generalized ICP)
- More keypoint detectors (ISS, NARF, SIFT3D)
- Alpha shapes
- Mesh repair and hole filling
- WebAssembly acceleration
- WebGPU support
- Real-time collaboration
- Cloud storage integration

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! See CONTRIBUTING.md for guidelines.

## Acknowledgments

- Inspired by Point Cloud Library (PCL)
- Algorithms based on PCL and Open3D documentation
- Built with Next.js, Three.js, and TypeScript
