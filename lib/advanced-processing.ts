import { Point3D, PointCloud, Cluster, PlaneModel, KeyPoint, FeatureDescriptor } from './types'

/**
 * Advanced Point Cloud Processing Algorithms
 * Implements PCL and Open3D-like functionality
 */

export class AdvancedProcessor {
  // ============================================================================
  // NORMAL ESTIMATION
  // ============================================================================
  
  /**
   * Estimate normals for each point using PCA on k-nearest neighbors
   * Based on PCL's NormalEstimation
   */
  static estimateNormals(
    points: Point3D[],
    kNeighbors: number = 30,
    radius?: number
  ): Point3D[] {
    const result: Point3D[] = []
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const neighbors = radius 
        ? this.findNeighborsWithinRadius(points, i, radius)
        : this.findKNearestNeighbors(points, i, kNeighbors)
      
      if (neighbors.length < 3) {
        result.push({ ...point, normal: [0, 0, 1] })
        continue
      }
      
      // Compute centroid of neighbors
      const centroid = this.computeCentroid(neighbors.map(idx => points[idx]))
      
      // Build covariance matrix
      const covariance = this.computeCovarianceMatrix(
        neighbors.map(idx => points[idx]),
        centroid
      )
      
      // Compute eigenvector for smallest eigenvalue (normal)
      const normal = this.computeSmallestEigenvector(covariance)
      
      // Orient normal towards viewpoint (0, 0, 0)
      if (this.dotProduct(normal, [point.x, point.y, point.z]) > 0) {
        normal[0] = -normal[0]
        normal[1] = -normal[1]
        normal[2] = -normal[2]
      }
      
      result.push({ ...point, normal })
    }
    
    return result
  }

  // ============================================================================
  // PLANE SEGMENTATION (RANSAC)
  // ============================================================================
  
  /**
   * RANSAC-based plane segmentation
   * Based on PCL's SACSegmentation
   */
  static segmentPlane(
    points: Point3D[],
    distanceThreshold: number = 0.01,
    maxIterations: number = 1000
  ): { plane: PlaneModel; inliers: number[]; outliers: number[] } {
    let bestPlane: PlaneModel | null = null
    let bestInliers: number[] = []
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Randomly sample 3 points
      const samples = this.randomSample(points.length, 3)
      const p1 = points[samples[0]]
      const p2 = points[samples[1]]
      const p3 = points[samples[2]]
      
      // Compute plane equation
      const plane = this.fitPlaneToPoints([p1, p2, p3])
      if (!plane) continue
      
      // Count inliers
      const inliers: number[] = []
      for (let i = 0; i < points.length; i++) {
        const dist = this.pointToPlaneDistance(points[i], plane.coefficients)
        if (dist < distanceThreshold) {
          inliers.push(i)
        }
      }
      
      // Update best model
      if (inliers.length > bestInliers.length) {
        bestInliers = inliers
        bestPlane = plane
        bestPlane.inliers = inliers
      }
    }
    
    if (!bestPlane) {
      throw new Error('Failed to segment plane')
    }
    
    const outliers = Array.from({ length: points.length }, (_, i) => i)
      .filter(i => !bestInliers.includes(i))
    
    return { plane: bestPlane, inliers: bestInliers, outliers }
  }

  // ============================================================================
  // EUCLIDEAN CLUSTERING
  // ============================================================================
  
  /**
   * Euclidean clustering for object segmentation
   * Based on PCL's EuclideanClusterExtraction
   */
  static extractClusters(
    points: Point3D[],
    clusterTolerance: number = 0.02,
    minClusterSize: number = 100,
    maxClusterSize: number = 25000
  ): Cluster[] {
    const processed = new Set<number>()
    const clusters: Cluster[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue
      
      const cluster = this.growCluster(
        points,
        i,
        processed,
        clusterTolerance,
        maxClusterSize
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

  private static growCluster(
    points: Point3D[],
    seedIndex: number,
    processed: Set<number>,
    tolerance: number,
    maxSize: number
  ): number[] {
    const cluster: number[] = []
    const queue: number[] = [seedIndex]
    processed.add(seedIndex)
    
    while (queue.length > 0 && cluster.length < maxSize) {
      const idx = queue.shift()!
      cluster.push(idx)
      
      const neighbors = this.findNeighborsWithinRadius(points, idx, tolerance)
      
      for (const neighborIdx of neighbors) {
        if (!processed.has(neighborIdx)) {
          processed.add(neighborIdx)
          queue.push(neighborIdx)
        }
      }
    }
    
    return cluster
  }

  // ============================================================================
  // REGION GROWING SEGMENTATION
  // ============================================================================
  
  /**
   * Region growing segmentation based on normal similarity
   * Based on PCL's RegionGrowing
   */
  static regionGrowingSegmentation(
    points: Point3D[],
    kNeighbors: number = 30,
    smoothnessThreshold: number = 5.0, // degrees
    curvatureThreshold: number = 1.0
  ): Cluster[] {
    // Ensure normals are computed
    const pointsWithNormals = points.every(p => p.normal)
      ? points
      : this.estimateNormals(points, kNeighbors)
    
    const processed = new Set<number>()
    const clusters: Cluster[] = []
    
    // Sort points by curvature
    const curvatures = pointsWithNormals.map((p, i) => ({
      index: i,
      curvature: this.computeCurvature(pointsWithNormals, i, kNeighbors)
    }))
    curvatures.sort((a, b) => a.curvature - b.curvature)
    
    const smoothnessThresholdRad = (smoothnessThreshold * Math.PI) / 180
    
    for (const { index, curvature } of curvatures) {
      if (processed.has(index) || curvature > curvatureThreshold) continue
      
      const cluster = this.growRegion(
        pointsWithNormals,
        index,
        processed,
        kNeighbors,
        smoothnessThresholdRad
      )
      
      if (cluster.length > 0) {
        const clusterPoints = cluster.map(idx => pointsWithNormals[idx])
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

  private static growRegion(
    points: Point3D[],
    seedIndex: number,
    processed: Set<number>,
    kNeighbors: number,
    smoothnessThreshold: number
  ): number[] {
    const cluster: number[] = [seedIndex]
    const queue: number[] = [seedIndex]
    processed.add(seedIndex)
    
    while (queue.length > 0) {
      const idx = queue.shift()!
      const neighbors = this.findKNearestNeighbors(points, idx, kNeighbors)
      
      const currentNormal = points[idx].normal!
      
      for (const neighborIdx of neighbors) {
        if (processed.has(neighborIdx)) continue
        
        const neighborNormal = points[neighborIdx].normal!
        const angle = this.angleBetweenNormals(currentNormal, neighborNormal)
        
        if (angle < smoothnessThreshold) {
          processed.add(neighborIdx)
          cluster.push(neighborIdx)
          queue.push(neighborIdx)
        }
      }
    }
    
    return cluster
  }

  // ============================================================================
  // FEATURE EXTRACTION
  // ============================================================================
  
  /**
   * Compute FPFH (Fast Point Feature Histograms) descriptors
   * Based on PCL's FPFHEstimation
   */
  static computeFPFH(
    points: Point3D[],
    kNeighbors: number = 30
  ): FeatureDescriptor[] {
    // Ensure normals are computed
    const pointsWithNormals = points.every(p => p.normal)
      ? points
      : this.estimateNormals(points, kNeighbors)
    
    const descriptors: FeatureDescriptor[] = []
    
    for (let i = 0; i < pointsWithNormals.length; i++) {
      const descriptor = this.computeFPFHForPoint(
        pointsWithNormals,
        i,
        kNeighbors
      )
      
      descriptors.push({
        pointIndex: i,
        descriptor,
        type: 'FPFH'
      })
    }
    
    return descriptors
  }

  private static computeFPFHForPoint(
    points: Point3D[],
    index: number,
    kNeighbors: number
  ): Float32Array {
    const histogram = new Float32Array(33) // 3 features × 11 bins
    const point = points[index]
    const neighbors = this.findKNearestNeighbors(points, index, kNeighbors)
    
    if (neighbors.length === 0) return histogram
    
    // Compute SPFH (Simple Point Feature Histogram)
    for (const neighborIdx of neighbors) {
      const neighbor = points[neighborIdx]
      const features = this.computePointPairFeatures(point, neighbor)
      
      // Bin the features
      for (let f = 0; f < 3; f++) {
        const binIdx = Math.min(
          Math.floor((features[f] + 1) * 5.5),
          10
        )
        histogram[f * 11 + binIdx] += 1
      }
    }
    
    // Normalize
    const sum = histogram.reduce((a, b) => a + b, 0)
    if (sum > 0) {
      for (let i = 0; i < histogram.length; i++) {
        histogram[i] /= sum
      }
    }
    
    return histogram
  }

  private static computePointPairFeatures(
    p1: Point3D,
    p2: Point3D
  ): [number, number, number] {
    const n1 = p1.normal || [0, 0, 1]
    const n2 = p2.normal || [0, 0, 1]
    
    const d = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z]
    const dNorm = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2])
    
    if (dNorm === 0) return [0, 0, 0]
    
    const u = [d[0] / dNorm, d[1] / dNorm, d[2] / dNorm]
    
    const f1 = this.dotProduct(u, n1)
    const f2 = this.dotProduct(u, n2)
    const f3 = this.dotProduct(n1, n2)
    
    return [f1, f2, f3]
  }

  // ============================================================================
  // KEYPOINT DETECTION
  // ============================================================================
  
  /**
   * Harris 3D keypoint detection
   * Based on PCL's HarrisKeypoint3D
   */
  static detectHarrisKeypoints(
    points: Point3D[],
    radius: number = 0.1,
    threshold: number = 0.01
  ): KeyPoint[] {
    const keypoints: KeyPoint[] = []
    
    for (let i = 0; i < points.length; i++) {
      const response = this.computeHarrisResponse(points, i, radius)
      
      if (response > threshold) {
        keypoints.push({
          point: points[i],
          index: i,
          response,
          type: 'Harris'
        })
      }
    }
    
    // Non-maximum suppression
    return this.nonMaximumSuppression(keypoints, radius)
  }

  private static computeHarrisResponse(
    points: Point3D[],
    index: number,
    radius: number
  ): number {
    const neighbors = this.findNeighborsWithinRadius(points, index, radius)
    if (neighbors.length < 3) return 0
    
    const neighborPoints = neighbors.map(idx => points[idx])
    const centroid = this.computeCentroid(neighborPoints)
    const covariance = this.computeCovarianceMatrix(neighborPoints, centroid)
    
    // Compute Harris response: det(C) - k * trace(C)^2
    const det =
      covariance[0][0] * (covariance[1][1] * covariance[2][2] - covariance[1][2] * covariance[2][1]) -
      covariance[0][1] * (covariance[1][0] * covariance[2][2] - covariance[1][2] * covariance[2][0]) +
      covariance[0][2] * (covariance[1][0] * covariance[2][1] - covariance[1][1] * covariance[2][0])
    
    const trace = covariance[0][0] + covariance[1][1] + covariance[2][2]
    const k = 0.04
    
    return det - k * trace * trace
  }

  private static nonMaximumSuppression(
    keypoints: KeyPoint[],
    radius: number
  ): KeyPoint[] {
    const result: KeyPoint[] = []
    const sorted = [...keypoints].sort((a, b) => b.response - a.response)
    
    for (const kp of sorted) {
      let isMaximum = true
      
      for (const existing of result) {
        const dist = this.distance(kp.point, existing.point)
        if (dist < radius && kp.response <= existing.response) {
          isMaximum = false
          break
        }
      }
      
      if (isMaximum) {
        result.push(kp)
      }
    }
    
    return result
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
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

  private static findNeighborsWithinRadius(
    points: Point3D[],
    index: number,
    radius: number
  ): number[] {
    const point = points[index]
    const neighbors: number[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue
      if (this.distance(point, points[i]) <= radius) {
        neighbors.push(i)
      }
    }
    
    return neighbors
  }

  private static distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private static computeCentroid(points: Point3D[]): Point3D {
    const sum = points.reduce(
      (acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z
      }),
      { x: 0, y: 0, z: 0 }
    )
    
    const n = points.length
    return {
      x: sum.x / n,
      y: sum.y / n,
      z: sum.z / n
    }
  }

  private static computeCovarianceMatrix(
    points: Point3D[],
    centroid: Point3D
  ): number[][] {
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    
    for (const point of points) {
      const dx = point.x - centroid.x
      const dy = point.y - centroid.y
      const dz = point.z - centroid.z
      
      matrix[0][0] += dx * dx
      matrix[0][1] += dx * dy
      matrix[0][2] += dx * dz
      matrix[1][1] += dy * dy
      matrix[1][2] += dy * dz
      matrix[2][2] += dz * dz
    }
    
    // Symmetric matrix
    matrix[1][0] = matrix[0][1]
    matrix[2][0] = matrix[0][2]
    matrix[2][1] = matrix[1][2]
    
    const n = points.length
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        matrix[i][j] /= n
      }
    }
    
    return matrix
  }

  private static computeSmallestEigenvector(matrix: number[][]): [number, number, number] {
    // Power iteration for smallest eigenvalue/eigenvector
    // Simplified version - in production use proper eigendecomposition
    let v: [number, number, number] = [1, 1, 1]
    const iterations = 100
    
    // Inverse power iteration
    for (let iter = 0; iter < iterations; iter++) {
      // v = inv(A) * v (simplified - using approximation)
      const newV: [number, number, number] = [
        v[0] + 0.01 * (matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2]),
        v[1] + 0.01 * (matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2]),
        v[2] + 0.01 * (matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2])
      ]
      
      // Normalize
      const norm = Math.sqrt(newV[0] * newV[0] + newV[1] * newV[1] + newV[2] * newV[2])
      v = [newV[0] / norm, newV[1] / norm, newV[2] / norm]
    }
    
    return v
  }

  private static fitPlaneToPoints(points: Point3D[]): PlaneModel | null {
    if (points.length < 3) return null
    
    // Compute centroid
    const centroid = this.computeCentroid(points)
    
    // Compute normal using cross product
    const v1 = {
      x: points[1].x - points[0].x,
      y: points[1].y - points[0].y,
      z: points[1].z - points[0].z
    }
    const v2 = {
      x: points[2].x - points[0].x,
      y: points[2].y - points[0].y,
      z: points[2].z - points[0].z
    }
    
    const normal: [number, number, number] = [
      v1.y * v2.z - v1.z * v2.y,
      v1.z * v2.x - v1.x * v2.z,
      v1.x * v2.y - v1.y * v2.x
    ]
    
    // Normalize
    const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
    if (len === 0) return null
    
    normal[0] /= len
    normal[1] /= len
    normal[2] /= len
    
    // Plane equation: ax + by + cz + d = 0
    const d = -(normal[0] * centroid.x + normal[1] * centroid.y + normal[2] * centroid.z)
    
    return {
      coefficients: [normal[0], normal[1], normal[2], d],
      inliers: [],
      normal,
      centroid
    }
  }

  private static pointToPlaneDistance(point: Point3D, coefficients: [number, number, number, number]): number {
    return Math.abs(
      coefficients[0] * point.x +
      coefficients[1] * point.y +
      coefficients[2] * point.z +
      coefficients[3]
    )
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
    const colors: [number, number, number][] = [
      [255, 0, 0],     // Red
      [0, 255, 0],     // Green
      [0, 0, 255],     // Blue
      [255, 255, 0],   // Yellow
      [255, 0, 255],   // Magenta
      [0, 255, 255],   // Cyan
      [255, 128, 0],   // Orange
      [128, 0, 255],   // Purple
      [0, 255, 128],   // Spring Green
      [255, 0, 128],   // Rose
    ]
    
    return colors[index % colors.length]
  }

  private static dotProduct(v1: number[] | [number, number, number], v2: number[] | [number, number, number]): number {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
  }

  private static angleBetweenNormals(n1: [number, number, number], n2: [number, number, number]): number {
    const dot = this.dotProduct(n1, n2)
    return Math.acos(Math.max(-1, Math.min(1, dot)))
  }

  private static computeCurvature(points: Point3D[], index: number, kNeighbors: number): number {
    const neighbors = this.findKNearestNeighbors(points, index, kNeighbors)
    if (neighbors.length < 3) return 0
    
    const neighborPoints = neighbors.map(idx => points[idx])
    const centroid = this.computeCentroid(neighborPoints)
    const covariance = this.computeCovarianceMatrix(neighborPoints, centroid)
    
    // Curvature is approximated by ratio of smallest eigenvalue to sum of eigenvalues
    // Simplified: use trace as approximation
    const trace = covariance[0][0] + covariance[1][1] + covariance[2][2]
    const smallestEigenvalue = Math.min(covariance[0][0], covariance[1][1], covariance[2][2])
    
    return trace > 0 ? smallestEigenvalue / trace : 0
  }
}
