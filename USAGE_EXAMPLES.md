# AutoPointCloud Usage Examples

This guide provides practical examples of using AutoPointCloud's 60+ point cloud processing algorithms.

## Table of Contents
- [Basic Workflow](#basic-workflow)
- [Filtering Examples](#filtering-examples)
- [Segmentation Examples](#segmentation-examples)
- [Registration Examples](#registration-examples)
- [Mesh Processing Examples](#mesh-processing-examples)
- [Visualization Examples](#visualization-examples)
- [Advanced Workflows](#advanced-workflows)

## Basic Workflow

### Loading and Saving Point Clouds

```typescript
import { PointCloudParser } from '@/lib/parser'
import { PointCloudProcessor } from '@/lib/processing'

// Load a point cloud
const file = /* File object from input */
const pointCloud = await PointCloudParser.parseFile(file)

console.log(`Loaded ${pointCloud.numPoints} points`)
console.log(`Format: ${pointCloud.format}`)
console.log(`Has colors: ${pointCloud.hasColor}`)
console.log(`Is mesh: ${pointCloud.isMesh}`)

// Export to different format
const pcdData = PointCloudProcessor.exportToFormat(pointCloud, 'pcd')
const plyData = PointCloudProcessor.exportToFormat(pointCloud, 'ply')
const xyzData = PointCloudProcessor.exportToFormat(pointCloud, 'xyz')
```

## Filtering Examples

### 1. Downsampling Large Point Clouds

```typescript
// Reduce point density while preserving structure
const result = await PointCloudProcessor.process(pointCloud, {
  filterType: 'downsample',
  voxelSize: 0.01  // 1cm voxels
})

console.log(`Reduced from ${result.originalPoints} to ${result.processedPoints} points`)
```

### 2. Removing Noise

```typescript
// Statistical outlier removal
const cleaned = await PointCloudProcessor.process(pointCloud, {
  filterType: 'statistical_outlier',
  kNeighbors: 20,
  stdDevMultiplier: 2.0
})

// Or use radius outlier removal
const cleaned2 = await PointCloudProcessor.process(pointCloud, {
  filterType: 'radius_outlier',
  radius: 0.05,
  minNeighbors: 5
})
```

### 3. Cropping Region of Interest

```typescript
// Crop along Z axis (e.g., remove ground plane)
const cropped = await PointCloudProcessor.process(pointCloud, {
  filterType: 'passthrough_z',
  minValue: 0.1,    // Keep points above 10cm
  maxValue: 2.5     // Keep points below 2.5m
})

// Crop with 3D bounding box
const boxCropped = await PointCloudProcessor.process(pointCloud, {
  filterType: 'crop_box',
  minPoint: { x: -1, y: -1, z: 0 },
  maxPoint: { x: 1, y: 1, z: 2 }
})
```

### 4. Smoothing Point Clouds

```typescript
// Bilateral filter (preserves edges)
const smoothed = await PointCloudProcessor.process(pointCloud, {
  filterType: 'bilateral',
  sigmaS: 0.1,  // Spatial sigma
  sigmaR: 0.05  // Range sigma
})

// Moving Least Squares smoothing
const mlsSmoothed = await PointCloudProcessor.process(pointCloud, {
  filterType: 'mls_smoothing',
  searchRadius: 0.03,
  polynomialOrder: 2
})
```

### 5. Custom Filtering

```typescript
import { AdvancedFilters } from '@/lib/filters'

// Filter based on custom condition
const highIntensity = AdvancedFilters.conditionalRemoval(
  pointCloud.points,
  (point) => (point.intensity ?? 0) > 0.5
)

// Random sampling
const sampled = AdvancedFilters.randomSample(
  pointCloud.points,
  1000  // Keep 1000 points
)

// Uniform spatial sampling
const uniformSampled = AdvancedFilters.uniformSampling(
  pointCloud.points,
  0.05  // 5cm minimum spacing
)
```

## Segmentation Examples

### 1. Ground Plane Detection

```typescript
import { AdvancedProcessor } from '@/lib/advanced-processing'

// Estimate normals first
const withNormals = await PointCloudProcessor.process(pointCloud, {
  filterType: 'normal_estimation',
  kNeighbors: 30
})

// Detect ground plane
const segmented = await PointCloudProcessor.process(withNormals.pointCloud, {
  filterType: 'plane_segmentation',
  distanceThreshold: 0.01,
  maxIterations: 1000
})

// Access plane model
const plane = segmented.metadata.plane
console.log('Plane coefficients:', plane.coefficients)
console.log('Plane normal:', plane.normal)
console.log('Number of inliers:', plane.inliers.length)

// Extract non-ground points
import { AdvancedFilters } from '@/lib/filters'
const objects = AdvancedFilters.extractIndices(
  pointCloud.points,
  plane.inliers,
  true  // negative = extract non-inliers
)
```

### 2. Object Detection with Clustering

```typescript
// Euclidean clustering
const clustered = await PointCloudProcessor.process(pointCloud, {
  filterType: 'euclidean_clustering',
  clusterTolerance: 0.02,     // 2cm
  minClusterSize: 100,
  maxClusterSize: 25000
})

// Access clusters
const clusters = clustered.metadata.clusters
clusters.forEach((cluster, i) => {
  console.log(`Cluster ${i}:`)
  console.log(`  Points: ${cluster.points.length}`)
  console.log(`  Centroid: (${cluster.centroid.x}, ${cluster.centroid.y}, ${cluster.centroid.z})`)
  console.log(`  Color: RGB(${cluster.color.join(', ')})`)
})
```

### 3. Region Growing Segmentation

```typescript
// Segment based on normal similarity
const regions = await PointCloudProcessor.process(pointCloud, {
  filterType: 'region_growing',
  kNeighbors: 30,
  smoothnessThreshold: 5.0,    // degrees
  curvatureThreshold: 1.0
})

const regionClusters = regions.metadata.clusters
console.log(`Found ${regionClusters.length} regions`)
```

### 4. Cylinder Detection

```typescript
import { SegmentationProcessor } from '@/lib/segmentation'

// Detect cylindrical objects (e.g., pipes, poles)
const cylinder = SegmentationProcessor.fitCylinder(
  pointCloud.points,
  0.01,    // distance threshold
  1000,    // max iterations
  0.05,    // min radius
  0.5      // max radius
)

if (cylinder) {
  console.log('Cylinder found:')
  console.log('  Center:', cylinder.center)
  console.log('  Axis:', cylinder.axis)
  console.log('  Radius:', cylinder.radius)
  console.log('  Height:', cylinder.height)
  console.log('  Inliers:', cylinder.inliers.length)
}
```

### 5. Sphere Detection

```typescript
import { SegmentationProcessor } from '@/lib/segmentation'

// Detect spherical objects
const sphere = SegmentationProcessor.fitSphere(
  pointCloud.points,
  0.01,    // distance threshold
  1000,    // max iterations
  0.05,    // min radius
  0.5      // max radius
)

if (sphere) {
  console.log('Sphere found:')
  console.log('  Center:', sphere.center)
  console.log('  Radius:', sphere.radius)
  console.log('  Inliers:', sphere.inliers.length)
}
```

## Registration Examples

### 1. Align Two Point Clouds (ICP)

```typescript
import { RegistrationProcessor } from '@/lib/registration'

// Point-to-point ICP
const result = RegistrationProcessor.icp(
  sourceCloud.points,
  targetCloud.points,
  50,      // max iterations
  1e-6,    // convergence tolerance
  0.05     // max correspondence distance
)

console.log('Registration results:')
console.log('  Fitness:', result.fitness)
console.log('  RMSE:', result.inlierRMSE)
console.log('  Transform matrix:', result.transformMatrix)

// Apply transformation to source cloud
// (transformation logic would be implemented separately)
```

### 2. Point-to-Plane ICP (More Robust)

```typescript
// Estimate normals for target cloud first
const targetWithNormals = AdvancedProcessor.estimateNormals(
  targetCloud.points,
  30
)

// Point-to-plane ICP
const result = RegistrationProcessor.pointToPlaneICP(
  sourceCloud.points,
  targetWithNormals,
  50,      // max iterations
  1e-6,    // convergence tolerance
  0.05     // max correspondence distance
)

console.log('Point-to-plane ICP fitness:', result.fitness)
```

### 3. RANSAC Registration (Robust to Outliers)

```typescript
// RANSAC-based registration
const result = RegistrationProcessor.ransacRegistration(
  sourceCloud.points,
  targetCloud.points,
  1000,    // max iterations
  0.05,    // inlier threshold
  100      // min inliers
)

console.log('RANSAC registration:')
console.log('  Fitness:', result.fitness)
console.log('  Correspondences:', result.correspondences.length)
```

## Mesh Processing Examples

### 1. Surface Reconstruction

```typescript
import { MeshProcessor } from '@/lib/mesh-processing'

// Estimate normals first
const withNormals = AdvancedProcessor.estimateNormals(
  pointCloud.points,
  30
)

// Greedy projection triangulation
const faces = MeshProcessor.greedyProjectionTriangulation(
  withNormals,
  0.025,  // search radius
  100     // max neighbors
)

console.log(`Created mesh with ${faces.length} faces`)

// Create mesh point cloud
const meshCloud: PointCloud = {
  ...pointCloud,
  points: withNormals,
  faces,
  numFaces: faces.length,
  isMesh: true
}

// Export as OBJ
const objData = PointCloudProcessor.exportToFormat(meshCloud, 'obj')
```

### 2. Ball Pivoting Reconstruction

```typescript
// Ball pivoting algorithm
const faces = MeshProcessor.ballPivoting(
  withNormals,
  0.025  // ball radius
)

console.log(`Ball pivoting created ${faces.length} faces`)
```

### 3. Mesh Smoothing

```typescript
// Laplacian smoothing
const smoothed = await PointCloudProcessor.process(meshCloud, {
  filterType: 'mesh_smoothing',
  iterations: 10,
  lambda: 0.5
})

// Or use Taubin smoothing (prevents shrinkage)
const taubinSmoothed = MeshProcessor.taubinSmoothing(
  meshCloud.points,
  meshCloud.faces,
  10,      // iterations
  0.5,     // lambda
  -0.53    // mu
)
```

### 4. Mesh Decimation (Simplification)

```typescript
// Reduce mesh complexity
const decimated = await PointCloudProcessor.process(meshCloud, {
  filterType: 'mesh_decimation',
  targetFaceCount: 5000  // Target number of faces
})

console.log(`Reduced from ${meshCloud.numFaces} to ${decimated.pointCloud.numFaces} faces`)
```

### 5. Mesh Subdivision (Refinement)

```typescript
// Loop subdivision for smoother mesh
const subdivided = await PointCloudProcessor.process(meshCloud, {
  filterType: 'mesh_subdivision'
})

console.log(`Increased from ${meshCloud.numFaces} to ${subdivided.pointCloud.numFaces} faces`)
```

### 6. Compute Mesh Normals

```typescript
// Compute face and vertex normals
const withNormals = MeshProcessor.computeMeshNormals(
  meshCloud.points,
  meshCloud.faces
)

// Access normals
withNormals.vertices.forEach((v, i) => {
  if (v.normal) {
    console.log(`Vertex ${i} normal:`, v.normal)
  }
})

withNormals.faces.forEach((f, i) => {
  if (f.normal) {
    console.log(`Face ${i} normal:`, f.normal)
  }
})
```

## Visualization Examples

### 1. Apply Color Maps

```typescript
import { VisualizationUtils } from '@/lib/visualization'

// Color by height (Z coordinate)
const colored = VisualizationUtils.applyColorMap(
  pointCloud.points,
  'jet',     // color map
  'height'   // color mode
)

// Available color maps:
// 'jet', 'viridis', 'rainbow', 'hot', 'cool', 'gray', 'turbo', 'plasma'

// Color by intensity
const intensityColored = VisualizationUtils.applyColorMap(
  pointCloud.points,
  'viridis',
  'intensity'
)

// Color by surface normal
const normalColored = VisualizationUtils.applyColorMap(
  pointCloud.points,
  'rainbow',
  'normal'
)
```

### 2. Color by Clusters

```typescript
// First cluster the points
const clustered = await PointCloudProcessor.process(pointCloud, {
  filterType: 'euclidean_clustering',
  clusterTolerance: 0.02,
  minClusterSize: 100,
  maxClusterSize: 25000
})

// Points are already colored by cluster!
const coloredCloud = clustered.pointCloud
```

### 3. Point Size Adjustment

```typescript
// Adjust point sizes based on distance
const cameraPos = { x: 0, y: 0, z: 5 }

const sized = VisualizationUtils.adjustPointSizes(
  pointCloud.points,
  1.0,      // base size
  true,     // enable distance scaling
  cameraPos
)

sized.forEach(({ point, size }) => {
  // Use 'size' for rendering
  console.log(`Point at (${point.x}, ${point.y}, ${point.z}) size: ${size}`)
})
```

### 4. Generate Statistics

```typescript
const stats = VisualizationUtils.generateStatistics(pointCloud.points)

console.log('Point Cloud Statistics:')
console.log('  Number of points:', stats.numPoints)
console.log('  Has colors:', stats.hasColor)
console.log('  Has intensity:', stats.hasIntensity)
console.log('  Has normals:', stats.hasNormals)
console.log('  Bounding box:')
console.log('    Min:', stats.boundingBox.min)
console.log('    Max:', stats.boundingBox.max)
console.log('    Size:', stats.boundingBox.size)
```

## Advanced Workflows

### 1. Complete Object Detection Pipeline

```typescript
// 1. Load point cloud
const pointCloud = await PointCloudParser.parseFile(file)

// 2. Downsample for faster processing
const downsampled = await PointCloudProcessor.process(pointCloud, {
  filterType: 'downsample',
  voxelSize: 0.01
})

// 3. Remove outliers
const cleaned = await PointCloudProcessor.process(downsampled.pointCloud, {
  filterType: 'statistical_outlier',
  kNeighbors: 20,
  stdDevMultiplier: 2.0
})

// 4. Estimate normals
const withNormals = await PointCloudProcessor.process(cleaned.pointCloud, {
  filterType: 'normal_estimation',
  kNeighbors: 30
})

// 5. Remove ground plane
const planeResult = await PointCloudProcessor.process(withNormals.pointCloud, {
  filterType: 'plane_segmentation',
  distanceThreshold: 0.01,
  maxIterations: 1000
})

// 6. Extract objects (non-ground points)
const objects = AdvancedFilters.extractIndices(
  withNormals.pointCloud.points,
  planeResult.metadata.plane.inliers,
  true
)

// 7. Cluster objects
const objectCloud = {
  ...pointCloud,
  points: objects,
  numPoints: objects.length
}

const clustered = await PointCloudProcessor.process(objectCloud, {
  filterType: 'euclidean_clustering',
  clusterTolerance: 0.02,
  minClusterSize: 100,
  maxClusterSize: 25000
})

// 8. Analyze each cluster
const clusters = clustered.metadata.clusters
clusters.forEach((cluster, i) => {
  console.log(`Object ${i + 1}:`)
  console.log(`  Points: ${cluster.points.length}`)
  console.log(`  Location: (${cluster.centroid.x.toFixed(2)}, ${cluster.centroid.y.toFixed(2)}, ${cluster.centroid.z.toFixed(2)})`)
  
  // Calculate object dimensions
  const bbox = calculateBoundingBox(cluster.points)
  console.log(`  Dimensions: ${bbox.size.x.toFixed(2)} x ${bbox.size.y.toFixed(2)} x ${bbox.size.z.toFixed(2)} m`)
})
```

### 2. Point Cloud Alignment and Merge

```typescript
// Load two point clouds
const cloud1 = await PointCloudParser.parseFile(file1)
const cloud2 = await PointCloudParser.parseFile(file2)

// Downsample both
const down1 = await PointCloudProcessor.process(cloud1, {
  filterType: 'downsample',
  voxelSize: 0.01
})

const down2 = await PointCloudProcessor.process(cloud2, {
  filterType: 'downsample',
  voxelSize: 0.01
})

// Estimate normals
const normals1 = AdvancedProcessor.estimateNormals(down1.pointCloud.points, 30)
const normals2 = AdvancedProcessor.estimateNormals(down2.pointCloud.points, 30)

// Register (align) the clouds
const registration = RegistrationProcessor.pointToPlaneICP(
  normals1,
  normals2,
  50,
  1e-6,
  0.05
)

console.log('Alignment quality:', registration.fitness)

// Apply transformation to cloud1
// (transformation application code here)

// Merge the clouds
const merged = {
  ...cloud1,
  points: [...transformedCloud1.points, ...cloud2.points],
  numPoints: transformedCloud1.points.length + cloud2.points.length
}

// Remove duplicate points
const cleaned = await PointCloudProcessor.process(merged, {
  filterType: 'downsample',
  voxelSize: 0.005
})
```

### 3. Full Mesh Generation Pipeline

```typescript
// 1. Load and prepare point cloud
const pointCloud = await PointCloudParser.parseFile(file)

// 2. Downsample
const downsampled = await PointCloudProcessor.process(pointCloud, {
  filterType: 'downsample',
  voxelSize: 0.01
})

// 3. Remove outliers
const cleaned = await PointCloudProcessor.process(downsampled.pointCloud, {
  filterType: 'statistical_outlier',
  kNeighbors: 20,
  stdDevMultiplier: 2.0
})

// 4. Smooth the surface
const smoothed = await PointCloudProcessor.process(cleaned.pointCloud, {
  filterType: 'mls_smoothing',
  searchRadius: 0.03,
  polynomialOrder: 2
})

// 5. Estimate normals
const withNormals = AdvancedProcessor.estimateNormals(
  smoothed.pointCloud.points,
  30
)

// 6. Reconstruct surface
const faces = MeshProcessor.greedyProjectionTriangulation(
  withNormals,
  0.025,
  100
)

// 7. Create mesh
const mesh: PointCloud = {
  ...smoothed.pointCloud,
  points: withNormals,
  faces,
  numFaces: faces.length,
  isMesh: true
}

// 8. Compute normals
const meshWithNormals = MeshProcessor.computeMeshNormals(
  mesh.points,
  mesh.faces!
)

// 9. Smooth mesh
const smoothedMesh = MeshProcessor.laplacianSmoothing(
  meshWithNormals.vertices,
  meshWithNormals.faces,
  10,
  0.5
)

// 10. Simplify if needed
const simplified = await PointCloudProcessor.process(
  { ...mesh, points: smoothedMesh },
  {
    filterType: 'mesh_decimation',
    targetFaceCount: 10000
  }
)

// 11. Export
const objData = PointCloudProcessor.exportToFormat(simplified.pointCloud, 'obj')
const stlData = PointCloudProcessor.exportToFormat(simplified.pointCloud, 'stl')
```

### 4. Feature Extraction and Matching

```typescript
// Load two point clouds to match
const cloud1 = await PointCloudParser.parseFile(file1)
const cloud2 = await PointCloudParser.parseFile(file2)

// Estimate normals
const normals1 = AdvancedProcessor.estimateNormals(cloud1.points, 30)
const normals2 = AdvancedProcessor.estimateNormals(cloud2.points, 30)

// Detect keypoints
const keypoints1 = AdvancedProcessor.detectHarrisKeypoints(normals1, 0.1, 0.01)
const keypoints2 = AdvancedProcessor.detectHarrisKeypoints(normals2, 0.1, 0.01)

console.log(`Cloud 1: ${keypoints1.length} keypoints`)
console.log(`Cloud 2: ${keypoints2.length} keypoints`)

// Extract features at keypoints
const features1 = AdvancedProcessor.computeFPFH(
  keypoints1.map(kp => kp.point),
  30
)
const features2 = AdvancedProcessor.computeFPFH(
  keypoints2.map(kp => kp.point),
  30
)

// Match features (custom matching logic would go here)
// Then use matched correspondences for registration
```

### 5. Spatial Query Optimization

```typescript
import { Octree, KDTree, SpatialIndex } from '@/lib/spatial-index'

// Build spatial index for fast queries
const octree = new Octree(pointCloud.points, 10)

// Or use KD-tree
const kdtree = new KDTree(pointCloud.points)

// Or let it choose automatically
const index = SpatialIndex.buildIndex(
  pointCloud.points,
  false  // prefer octree
)

// Perform fast radius search
const queryPoint = { x: 0, y: 0, z: 1 }
const neighborIndices = octree.radiusSearch(queryPoint, 0.1)

console.log(`Found ${neighborIndices.length} neighbors within 0.1m`)

// Perform fast k-nearest neighbor search
const kNearest = kdtree.kNearestSearch(queryPoint, 10)

console.log(`10 nearest neighbors:`, kNearest)

// Use in processing algorithms
kNearest.forEach(idx => {
  const neighbor = pointCloud.points[idx]
  console.log(`  Neighbor at (${neighbor.x}, ${neighbor.y}, ${neighbor.z})`)
})
```

## Performance Tips

1. **Use spatial indexing** for large point clouds (>10K points)
2. **Downsample first** before running expensive algorithms
3. **Estimate normals once** and reuse for multiple operations
4. **Use appropriate parameters** - smaller values = more detail but slower
5. **Process in steps** - break complex pipelines into stages
6. **Monitor memory** - very large clouds may need special handling

## Common Patterns

### Pattern 1: Prepare Point Cloud for Processing

```typescript
async function preparePointCloud(pointCloud: PointCloud) {
  // Downsample
  const downsampled = await PointCloudProcessor.process(pointCloud, {
    filterType: 'downsample',
    voxelSize: 0.01
  })
  
  // Remove outliers
  const cleaned = await PointCloudProcessor.process(downsampled.pointCloud, {
    filterType: 'statistical_outlier',
    kNeighbors: 20,
    stdDevMultiplier: 2.0
  })
  
  // Estimate normals
  const withNormals = await PointCloudProcessor.process(cleaned.pointCloud, {
    filterType: 'normal_estimation',
    kNeighbors: 30
  })
  
  return withNormals.pointCloud
}
```

### Pattern 2: Extract and Process Clusters

```typescript
async function extractObjects(pointCloud: PointCloud) {
  const clustered = await PointCloudProcessor.process(pointCloud, {
    filterType: 'euclidean_clustering',
    clusterTolerance: 0.02,
    minClusterSize: 100,
    maxClusterSize: 25000
  })
  
  return clustered.metadata.clusters.map(cluster => ({
    id: cluster.id,
    points: cluster.points,
    centroid: cluster.centroid,
    size: cluster.points.length,
    boundingBox: calculateBoundingBox(cluster.points)
  }))
}
```

### Pattern 3: Progressive Mesh Simplification

```typescript
async function simplifyMeshProgressive(
  mesh: PointCloud,
  targetReduction: number
) {
  const steps = 5
  let current = mesh
  
  for (let i = 0; i < steps; i++) {
    const targetFaces = Math.floor(
      current.numFaces! * (1 - targetReduction / steps)
    )
    
    current = (await PointCloudProcessor.process(current, {
      filterType: 'mesh_decimation',
      targetFaceCount: targetFaces
    })).pointCloud
    
    console.log(`Step ${i + 1}: ${current.numFaces} faces`)
  }
  
  return current
}
```

## Troubleshooting

### Issue: Out of Memory
- Downsample the point cloud first
- Process in smaller chunks
- Use spatial indexing for queries instead of brute force

### Issue: Slow Processing
- Reduce parameter values (k, radius, iterations)
- Use approximate algorithms where available
- Enable spatial indexing
- Downsample first

### Issue: Poor Results
- Increase neighbor count for normal estimation
- Adjust threshold parameters
- Remove outliers before processing
- Check input data quality

### Issue: No Clusters Found
- Reduce cluster tolerance
- Lower minimum cluster size
- Check if point cloud needs downsampling
- Verify distance units

## Next Steps

- Read [FEATURES.md](FEATURES.md) for complete API reference
- Check [README.md](README.md) for setup instructions
- Experiment with different parameter values
- Combine algorithms for custom workflows

## Support

For issues and questions:
- GitHub Issues: [https://github.com/sumeshthkr/autopointcloud/issues](https://github.com/sumeshthkr/autopointcloud/issues)
- Documentation: [https://github.com/sumeshthkr/autopointcloud](https://github.com/sumeshthkr/autopointcloud)
