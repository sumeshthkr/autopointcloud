export interface Point3D {
  x: number
  y: number
  z: number
  intensity?: number
  color?: [number, number, number]
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
  format: 'PCD' | 'PLY' | 'XYZ' | 'LAS' | 'LAZ'
  createdAt: Date
  hasColor: boolean
  hasIntensity: boolean
}

export interface ProcessingOptions {
  filterType: 'downsample' | 'statistical_outlier' | 'radius_outlier' | 'intensity' | 'distance' | 'passthrough_x' | 'passthrough_y' | 'passthrough_z'
  voxelSize?: number
  threshold?: number
  minValue?: number
  maxValue?: number
  kNeighbors?: number
  stdDevMultiplier?: number
  radius?: number
  minNeighbors?: number
}

export interface ProcessingResult {
  id: string
  originalPoints: number
  processedPoints: number
  method: string
  success: boolean
  pointCloud: PointCloud
}
