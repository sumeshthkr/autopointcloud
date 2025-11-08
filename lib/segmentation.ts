import { Point3D, Cluster } from './types'

/**
 * Advanced Segmentation Algorithms
 * Implements additional PCL and Open3D segmentation methods
 */

export interface CylinderModel {
  axis: [number, number, number]
  center: Point3D
  radius: number
  height: number
  inliers: number[]
}

export interface SphereModel {
  center: Point3D
  radius: number
  inliers: number[]
}

export class SegmentationProcessor {
  // ============================================================================
  // CYLINDER FITTING (RANSAC)
  // ============================================================================
  
  /**
   * Fit a cylinder to a point cloud using RANSAC
   * Based on PCL's SACSegmentation for cylinders
   */
  static fitCylinder(
    points: Point3D[],
    distanceThreshold: number = 0.01,
    maxIterations: number = 1000,
    minRadius: number = 0.01,
    maxRadius: number = 1.0
  ): CylinderModel | null {
    let bestModel: CylinderModel | null = null
    let maxInliers = 0
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Sample 3 points
      if (points.length < 3) break
      
      const samples = this.randomSample(points.length, 3)
      const p1 = points[samples[0]]
      const p2 = points[samples[1]]
      const p3 = points[samples[2]]
      
      // Estimate cylinder parameters
      const model = this.estimateCylinderFromPoints([p1, p2, p3], minRadius, maxRadius)
      if (!model) continue
      
      // Count inliers
      const inliers: number[] = []
      for (let i = 0; i < points.length; i++) {
        const dist = this.pointToCylinderDistance(points[i], model)
        if (dist < distanceThreshold) {
          inliers.push(i)
        }
      }
      
      if (inliers.length > maxInliers) {
        maxInliers = inliers.length
        model.inliers = inliers
        bestModel = model
      }
    }
    
    return bestModel
  }

  private static estimateCylinderFromPoints(
    points: Point3D[],
    minRadius: number,
    maxRadius: number
  ): CylinderModel | null {
    if (points.length < 3) return null
    
    // Compute axis direction from two points
    const axis = this.normalize([
      points[1].x - points[0].x,
      points[1].y - points[0].y,
      points[1].z - points[0].z
    ])
    
    if (!axis) return null
    
    // Estimate radius from third point
    const center = points[0]
    const dist = this.pointToLineDistance(points[2], center, axis)
    
    if (dist < minRadius || dist > maxRadius) return null
    
    return {
      axis,
      center,
      radius: dist,
      height: this.distance(points[0], points[1]),
      inliers: []
    }
  }

  private static pointToCylinderDistance(
    point: Point3D,
    cylinder: CylinderModel
  ): number {
    // Distance from point to cylinder surface
    const dist = this.pointToLineDistance(point, cylinder.center, cylinder.axis)
    return Math.abs(dist - cylinder.radius)
  }

  private static pointToLineDistance(
    point: Point3D,
    linePoint: Point3D,
    lineDir: [number, number, number]
  ): number {
    const v = [
      point.x - linePoint.x,
      point.y - linePoint.y,
      point.z - linePoint.z
    ]
    
    const cross = this.crossProduct(v, lineDir)
    const crossMag = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2])
    
    return crossMag
  }

  // ============================================================================
  // SPHERE FITTING (RANSAC)
  // ============================================================================
  
  /**
   * Fit a sphere to a point cloud using RANSAC
   * Based on PCL's SACSegmentation for spheres
   */
  static fitSphere(
    points: Point3D[],
    distanceThreshold: number = 0.01,
    maxIterations: number = 1000,
    minRadius: number = 0.01,
    maxRadius: number = 1.0
  ): SphereModel | null {
    let bestModel: SphereModel | null = null
    let maxInliers = 0
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Sample 4 points
      if (points.length < 4) break
      
      const samples = this.randomSample(points.length, 4)
      const samplePoints = samples.map(i => points[i])
      
      // Estimate sphere parameters
      const model = this.estimateSphereFromPoints(samplePoints, minRadius, maxRadius)
      if (!model) continue
      
      // Count inliers
      const inliers: number[] = []
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(this.distance(points[i], model.center) - model.radius)
        if (dist < distanceThreshold) {
          inliers.push(i)
        }
      }
      
      if (inliers.length > maxInliers) {
        maxInliers = inliers.length
        model.inliers = inliers
        bestModel = model
      }
    }
    
    return bestModel
  }

  private static estimateSphereFromPoints(
    points: Point3D[],
    minRadius: number,
    maxRadius: number
  ): SphereModel | null {
    if (points.length < 4) return null
    
    // Solve for sphere center using least squares
    // Simplified: use centroid as approximation
    const center = this.computeCentroid(points)
    
    // Compute average radius
    let sumRadius = 0
    for (const point of points) {
      sumRadius += this.distance(point, center)
    }
    const radius = sumRadius / points.length
    
    if (radius < minRadius || radius > maxRadius) return null
    
    return {
      center,
      radius,
      inliers: []
    }
  }

  // ============================================================================
  // SUPERVOXEL CLUSTERING
  // ============================================================================
  
  /**
   * Supervoxel segmentation - over-segmentation into small consistent regions
   * Based on PCL's SupervoxelClustering
   */
  static supervoxelClustering(
    points: Point3D[],
    voxelResolution: number = 0.008,
    seedResolution: number = 0.08,
    colorImportance: number = 0.2,
    spatialImportance: number = 0.4,
    normalImportance: number = 1.0
  ): Cluster[] {
    // Build voxel grid
    const voxelMap = new Map<string, Point3D[]>()
    
    for (const point of points) {
      const key = this.getVoxelKey(point, voxelResolution)
      const voxelPoints = voxelMap.get(key) || []
      voxelPoints.push(point)
      voxelMap.set(key, voxelPoints)
    }
    
    // Select seed voxels
    const seeds: string[] = []
    const voxelKeys = Array.from(voxelMap.keys())
    
    for (let i = 0; i < voxelKeys.length; i += Math.floor(seedResolution / voxelResolution)) {
      if (i < voxelKeys.length) {
        seeds.push(voxelKeys[i])
      }
    }
    
    // Grow supervoxels from seeds
    const supervoxels = new Map<string, Cluster>()
    const assigned = new Set<string>()
    
    for (let i = 0; i < seeds.length; i++) {
      const seedKey = seeds[i]
      const seedPoints = voxelMap.get(seedKey) || []
      
      if (seedPoints.length === 0) continue
      
      const centroid = this.computeCentroid(seedPoints)
      const color = this.generateClusterColor(i)
      
      supervoxels.set(seedKey, {
        id: i,
        points: [...seedPoints],
        indices: [],
        centroid,
        color
      })
      
      assigned.add(seedKey)
    }
    
    // Assign remaining voxels to nearest supervoxel
    for (const [key, voxelPoints] of voxelMap.entries()) {
      if (assigned.has(key)) continue
      
      const centroid = this.computeCentroid(voxelPoints)
      let minDist = Infinity
      let nearestSeed = seeds[0]
      
      for (const seedKey of seeds) {
        const supervoxel = supervoxels.get(seedKey)
        if (!supervoxel) continue
        
        const dist = this.distance(centroid, supervoxel.centroid)
        if (dist < minDist) {
          minDist = dist
          nearestSeed = seedKey
        }
      }
      
      const supervoxel = supervoxels.get(nearestSeed)
      if (supervoxel) {
        supervoxel.points.push(...voxelPoints)
      }
    }
    
    return Array.from(supervoxels.values())
  }

  // ============================================================================
  // MIN-CUT SEGMENTATION
  // ============================================================================
  
  /**
   * Min-cut based segmentation
   * Based on graph cuts for binary segmentation
   */
  static minCutSegmentation(
    points: Point3D[],
    foregroundIndices: number[],
    backgroundIndices: number[],
    smoothWeight: number = 0.5,
    radius: number = 0.05
  ): { foreground: number[]; background: number[] } {
    // Build graph
    const graph = this.buildSegmentationGraph(
      points,
      foregroundIndices,
      backgroundIndices,
      smoothWeight,
      radius
    )
    
    // Perform min-cut (simplified - use iterative refinement)
    const foreground = new Set<number>(foregroundIndices)
    const background = new Set<number>(backgroundIndices)
    
    let changed = true
    let iterations = 0
    const maxIterations = 10
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      for (let i = 0; i < points.length; i++) {
        if (foreground.has(i) || background.has(i)) continue
        
        // Compute affinity to foreground and background
        let fgAffinity = 0
        let bgAffinity = 0
        let fgCount = 0
        let bgCount = 0
        
        for (let j = 0; j < points.length; j++) {
          const dist = this.distance(points[i], points[j])
          if (dist > radius) continue
          
          const weight = Math.exp(-dist * dist / (2 * radius * radius))
          
          if (foreground.has(j)) {
            fgAffinity += weight
            fgCount++
          } else if (background.has(j)) {
            bgAffinity += weight
            bgCount++
          }
        }
        
        // Assign to foreground or background
        if (fgCount > 0 && fgAffinity > bgAffinity) {
          foreground.add(i)
          changed = true
        } else if (bgCount > 0) {
          background.add(i)
          changed = true
        }
      }
    }
    
    return {
      foreground: Array.from(foreground),
      background: Array.from(background)
    }
  }

  private static buildSegmentationGraph(
    points: Point3D[],
    foregroundIndices: number[],
    backgroundIndices: number[],
    smoothWeight: number,
    radius: number
  ): Map<number, Map<number, number>> {
    const graph = new Map<number, Map<number, number>>()
    
    // Build adjacency graph with edge weights
    for (let i = 0; i < points.length; i++) {
      const neighbors = new Map<number, number>()
      
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        
        const dist = this.distance(points[i], points[j])
        if (dist <= radius) {
          const weight = smoothWeight * Math.exp(-dist * dist / (2 * radius * radius))
          neighbors.set(j, weight)
        }
      }
      
      graph.set(i, neighbors)
    }
    
    return graph
  }

  // ============================================================================
  // CONDITIONAL EUCLIDEAN CLUSTERING
  // ============================================================================
  
  /**
   * Conditional Euclidean clustering - clusters with custom constraints
   */
  static conditionalClustering(
    points: Point3D[],
    clusterTolerance: number = 0.02,
    minClusterSize: number = 100,
    maxClusterSize: number = 25000,
    condition?: (p1: Point3D, p2: Point3D) => boolean
  ): Cluster[] {
    const processed = new Set<number>()
    const clusters: Cluster[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue
      
      const cluster = this.growConditionalCluster(
        points,
        i,
        processed,
        clusterTolerance,
        maxClusterSize,
        condition
      )
      
      if (cluster.length >= minClusterSize && cluster.length <= maxClusterSize) {
        const clusterPoints = cluster.map(idx => points[idx])
        const centroid = this.computeCentroid(clusterPoints)
        const color = this.generateClusterColor(clusters.length)
        
        clusters.push({
          id: clusters.length,
          points: clusterPoints,
          indices: cluster,
          centroid,
          color
        })
      }
    }
    
    return clusters
  }

  private static growConditionalCluster(
    points: Point3D[],
    seedIndex: number,
    processed: Set<number>,
    tolerance: number,
    maxSize: number,
    condition?: (p1: Point3D, p2: Point3D) => boolean
  ): number[] {
    const cluster: number[] = []
    const queue: number[] = [seedIndex]
    processed.add(seedIndex)
    
    while (queue.length > 0 && cluster.length < maxSize) {
      const idx = queue.shift()!
      cluster.push(idx)
      
      for (let i = 0; i < points.length; i++) {
        if (processed.has(i)) continue
        
        const dist = this.distance(points[idx], points[i])
        if (dist > tolerance) continue
        
        // Check custom condition
        if (condition && !condition(points[idx], points[i])) continue
        
        processed.add(i)
        queue.push(i)
      }
    }
    
    return cluster
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  private static distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private static computeCentroid(points: Point3D[]): Point3D {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
      { x: 0, y: 0, z: 0 }
    )
    const n = points.length
    return { x: sum.x / n, y: sum.y / n, z: sum.z / n }
  }

  private static randomSample(n: number, k: number): number[] {
    const indices = Array.from({ length: n }, (_, i) => i)
    for (let i = 0; i < k; i++) {
      const j = Math.floor(Math.random() * (n - i)) + i
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices.slice(0, k)
  }

  private static generateClusterColor(index: number): [number, number, number] {
    const colors: Array<[number, number, number]> = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255],
      [255, 255, 0], [255, 0, 255], [0, 255, 255],
      [255, 128, 0], [128, 0, 255], [0, 255, 128], [255, 0, 128]
    ]
    return colors[index % colors.length]
  }

  private static getVoxelKey(point: Point3D, voxelSize: number): string {
    const x = Math.floor(point.x / voxelSize)
    const y = Math.floor(point.y / voxelSize)
    const z = Math.floor(point.z / voxelSize)
    return `${x},${y},${z}`
  }

  private static normalize(v: number[]): [number, number, number] | null {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if (len === 0) return null
    return [v[0] / len, v[1] / len, v[2] / len]
  }

  private static crossProduct(a: number[], b: number[] | [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ]
  }
}
