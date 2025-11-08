import { Point3D } from './types'

/**
 * Advanced Filtering Operations
 * Implements additional PCL and Open3D filters
 */

export class AdvancedFilters {
  /**
   * Conditional removal filter - removes points based on custom condition
   */
  static conditionalRemoval(
    points: Point3D[],
    condition: (point: Point3D) => boolean
  ): Point3D[] {
    return points.filter(condition)
  }

  /**
   * Extract indices - extract specific points by indices
   */
  static extractIndices(
    points: Point3D[],
    indices: number[],
    negative: boolean = false
  ): Point3D[] {
    const indexSet = new Set(indices)
    
    return points.filter((_, i) =>
      negative ? !indexSet.has(i) : indexSet.has(i)
    )
  }

  /**
   * Crop hull filter - removes points inside/outside a convex hull
   */
  static cropHull(
    points: Point3D[],
    hullPoints: Point3D[],
    cropOutside: boolean = false
  ): Point3D[] {
    // Simplified 2D convex hull cropping on XY plane
    const hull = this.computeConvexHull2D(hullPoints)
    
    return points.filter(p => {
      const isInside = this.isPointInPolygon2D(p, hull)
      return cropOutside ? !isInside : isInside
    })
  }

  /**
   * Random sampling filter
   */
  static randomSample(
    points: Point3D[],
    sampleSize: number
  ): Point3D[] {
    if (sampleSize >= points.length) return points
    
    const indices = new Set<number>()
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * points.length))
    }
    
    return Array.from(indices).map(i => points[i])
  }

  /**
   * Uniform sampling - maintains spatial distribution
   */
  static uniformSampling(
    points: Point3D[],
    radius: number
  ): Point3D[] {
    const sampled: Point3D[] = []
    const used = new Set<number>()
    
    for (let i = 0; i < points.length; i++) {
      if (used.has(i)) continue
      
      sampled.push(points[i])
      used.add(i)
      
      // Mark nearby points as used
      for (let j = 0; j < points.length; j++) {
        if (used.has(j)) continue
        
        const dist = this.distance(points[i], points[j])
        if (dist < radius) {
          used.add(j)
        }
      }
    }
    
    return sampled
  }

  /**
   * Approximate voxel grid filter - faster than standard voxel downsampling
   */
  static approximateVoxelGrid(
    points: Point3D[],
    leafSize: [number, number, number]
  ): Point3D[] {
    const voxelMap = new Map<string, Point3D>()
    
    for (const point of points) {
      const key = this.getVoxelKey(point, leafSize)
      
      // Keep first point in each voxel (approximate)
      if (!voxelMap.has(key)) {
        voxelMap.set(key, point)
      }
    }
    
    return Array.from(voxelMap.values())
  }

  /**
   * Median filter - smooths point cloud by replacing each point with median of neighbors
   */
  static medianFilter(
    points: Point3D[],
    windowSize: number
  ): Point3D[] {
    const result: Point3D[] = []
    
    for (let i = 0; i < points.length; i++) {
      const neighbors = this.findKNearestNeighbors(points, i, windowSize)
      
      if (neighbors.length === 0) {
        result.push({ ...points[i] })
        continue
      }
      
      // Compute median position
      const xValues = neighbors.map(idx => points[idx].x).sort((a, b) => a - b)
      const yValues = neighbors.map(idx => points[idx].y).sort((a, b) => a - b)
      const zValues = neighbors.map(idx => points[idx].z).sort((a, b) => a - b)
      
      const medianIdx = Math.floor(neighbors.length / 2)
      
      result.push({
        ...points[i],
        x: xValues[medianIdx],
        y: yValues[medianIdx],
        z: zValues[medianIdx]
      })
    }
    
    return result
  }

  /**
   * Shadow points removal - removes points likely to be shadows
   */
  static removeShadowPoints(
    points: Point3D[],
    threshold: number = 0.1
  ): Point3D[] {
    // Remove points with low intensity (likely shadows)
    return points.filter(p => {
      if (p.intensity === undefined) return true
      return p.intensity > threshold
    })
  }

  /**
   * Remove NaN points
   */
  static removeNaNPoints(points: Point3D[]): Point3D[] {
    return points.filter(p =>
      !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) &&
      isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
    )
  }

  /**
   * Voxel grid filter with centroid computation (accurate)
   */
  static voxelGridCentroid(
    points: Point3D[],
    leafSize: [number, number, number]
  ): Point3D[] {
    const voxelMap = new Map<string, Point3D[]>()
    
    for (const point of points) {
      const key = this.getVoxelKey(point, leafSize)
      const voxelPoints = voxelMap.get(key) || []
      voxelPoints.push(point)
      voxelMap.set(key, voxelPoints)
    }
    
    const result: Point3D[] = []
    
    for (const voxelPoints of voxelMap.values()) {
      // Compute centroid
      let sumX = 0, sumY = 0, sumZ = 0
      let sumIntensity = 0, sumR = 0, sumG = 0, sumB = 0
      let hasIntensity = false, hasColor = false
      
      for (const p of voxelPoints) {
        sumX += p.x
        sumY += p.y
        sumZ += p.z
        
        if (p.intensity !== undefined) {
          sumIntensity += p.intensity
          hasIntensity = true
        }
        
        if (p.color) {
          sumR += p.color[0]
          sumG += p.color[1]
          sumB += p.color[2]
          hasColor = true
        }
      }
      
      const n = voxelPoints.length
      const centroid: Point3D = {
        x: sumX / n,
        y: sumY / n,
        z: sumZ / n
      }
      
      if (hasIntensity) {
        centroid.intensity = sumIntensity / n
      }
      
      if (hasColor) {
        centroid.color = [
          Math.floor(sumR / n),
          Math.floor(sumG / n),
          Math.floor(sumB / n)
        ]
      }
      
      result.push(centroid)
    }
    
    return result
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

  private static findKNearestNeighbors(
    points: Point3D[],
    index: number,
    k: number
  ): number[] {
    const point = points[index]
    const distances: { index: number; distance: number }[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue
      distances.push({
        index: i,
        distance: this.distance(point, points[i])
      })
    }
    
    distances.sort((a, b) => a.distance - b.distance)
    return distances.slice(0, k).map(d => d.index)
  }

  private static getVoxelKey(
    point: Point3D,
    leafSize: [number, number, number]
  ): string {
    const x = Math.floor(point.x / leafSize[0])
    const y = Math.floor(point.y / leafSize[1])
    const z = Math.floor(point.z / leafSize[2])
    return `${x},${y},${z}`
  }

  private static computeConvexHull2D(points: Point3D[]): Point3D[] {
    // Graham scan algorithm for 2D convex hull (using x, y coordinates)
    if (points.length < 3) return points
    
    // Sort points by x, then y
    const sorted = [...points].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x
      return a.y - b.y
    })
    
    // Build lower hull
    const lower: Point3D[] = []
    for (const point of sorted) {
      while (
        lower.length >= 2 &&
        this.cross2D(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
      ) {
        lower.pop()
      }
      lower.push(point)
    }
    
    // Build upper hull
    const upper: Point3D[] = []
    for (let i = sorted.length - 1; i >= 0; i--) {
      const point = sorted[i]
      while (
        upper.length >= 2 &&
        this.cross2D(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
      ) {
        upper.pop()
      }
      upper.push(point)
    }
    
    // Remove last point of each half (duplicated)
    lower.pop()
    upper.pop()
    
    return lower.concat(upper)
  }

  private static cross2D(o: Point3D, a: Point3D, b: Point3D): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  }

  private static isPointInPolygon2D(point: Point3D, polygon: Point3D[]): boolean {
    // Ray casting algorithm
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y
      const xj = polygon[j].x, yj = polygon[j].y
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    
    return inside
  }
}
