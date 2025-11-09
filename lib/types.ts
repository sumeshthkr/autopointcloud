export interface Point3D {
  x: number
  y: number
  z: number
  intensity?: number
  color?: [number, number, number]
  normal?: [number, number, number]
}

export interface Face {
  vertices: [number, number, number] // indices into the vertices array
  normal?: [number, number, number]
}

export interface BoundingBox {
  min: Point3D
  max: Point3D
  center: Point3D
  size: { x: number; y: number; z: number }
}

export interface PointCloud {
  id: string
  name: string
  points: Point3D[]
  numPoints: number
  boundingBox: BoundingBox
  fileSize: number
  format: 'PCD' | 'PLY' | 'XYZ' | 'LAS' | 'LAZ' | 'OBJ' | 'STL'
  createdAt: Date
  hasColor: boolean
  hasIntensity: boolean
  // Mesh-specific properties
  faces?: Face[]
  numFaces?: number
  isMesh: boolean
  // Transformation support
  transformMatrix?: number[][] // 4x4 transformation matrix
  metadata?: {
    originalFormat?: string
    compressionRatio?: number
    processingTime?: number
  }
}

export interface ProcessingOptions {
  filterType: 'downsample' | 'statistical_outlier' | 'radius_outlier' | 'intensity' | 'distance' | 'passthrough_x' | 'passthrough_y' | 'passthrough_z' | 
    'bilateral' | 'conditional' | 'crop_box' | 'mls_smoothing' | 
    'normal_estimation' | 'plane_segmentation' | 'euclidean_clustering' |
    'region_growing' | 'mesh_smoothing' | 'mesh_decimation' | 'mesh_subdivision' |
    'mesh_to_pointcloud' | 'pointcloud_to_mesh'
  voxelSize?: number
  threshold?: number
  minValue?: number
  maxValue?: number
  kNeighbors?: number
  stdDevMultiplier?: number
  radius?: number
  minNeighbors?: number
  // Bilateral filter
  sigmaS?: number
  sigmaR?: number
  // Crop box
  minPoint?: Point3D
  maxPoint?: Point3D
  // Conditional filter
  condition?: (point: Point3D) => boolean
  // MLS parameters
  searchRadius?: number
  polynomialOrder?: number
  // Normal estimation
  normalRadius?: number
  // Plane segmentation (RANSAC)
  distanceThreshold?: number
  maxIterations?: number
  // Clustering
  clusterTolerance?: number
  minClusterSize?: number
  maxClusterSize?: number
  // Region growing
  numberOfNeighbors?: number
  smoothnessThreshold?: number
  curvatureThreshold?: number
  // Mesh operations
  iterations?: number
  lambda?: number
  targetFaceCount?: number
}

export interface ProcessingResult {
  id: string
  originalPoints: number
  processedPoints: number
  method: string
  success: boolean
  pointCloud: PointCloud
  metadata?: {
    clusters?: Cluster[]
    plane?: PlaneModel
    features?: FeatureDescriptor[]
    transformMatrix?: number[][]
  }
}

export interface Cluster {
  id: number
  points: Point3D[]
  indices: number[]
  centroid: Point3D
  color: [number, number, number]
}

export interface PlaneModel {
  coefficients: [number, number, number, number] // ax + by + cz + d = 0
  inliers: number[]
  normal: [number, number, number]
  centroid: Point3D
}

export interface FeatureDescriptor {
  pointIndex: number
  descriptor: Float32Array
  type: 'FPFH' | 'PFH' | 'SHOT' | 'NARF'
}

export interface KeyPoint {
  point: Point3D
  index: number
  response: number
  type: 'Harris' | 'ISS' | 'SIFT'
}

export interface RegistrationResult {
  transformMatrix: number[][]
  fitness: number
  inlierRMSE: number
  correspondences: number[][]
}
