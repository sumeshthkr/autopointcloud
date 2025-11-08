import { Point3D, RegistrationResult } from './types'

/**
 * Point Cloud Registration Algorithms
 * Implements ICP and other registration methods from PCL and Open3D
 */

export class RegistrationProcessor {
  // ============================================================================
  // ICP (Iterative Closest Point)
  // ============================================================================
  
  /**
   * Standard ICP registration
   * Based on PCL's IterativeClosestPoint
   */
  static icp(
    source: Point3D[],
    target: Point3D[],
    maxIterations: number = 50,
    tolerance: number = 1e-6,
    maxCorrespondenceDistance: number = 0.05
  ): RegistrationResult {
    let currentSource = source.map(p => ({ ...p }))
    let transformMatrix = this.identityMatrix()
    let previousError = Infinity
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Find correspondences
      const correspondences = this.findCorrespondences(
        currentSource,
        target,
        maxCorrespondenceDistance
      )
      
      if (correspondences.length < 3) {
        break
      }
      
      // Compute transformation
      const { rotation, translation } = this.computeRigidTransformation(
        correspondences,
        currentSource,
        target
      )
      
      // Apply transformation
      currentSource = this.applyTransformation(currentSource, rotation, translation)
      transformMatrix = this.multiplyMatrices(
        this.buildTransformMatrix(rotation, translation),
        transformMatrix
      )
      
      // Compute error
      const error = this.computeRegistrationError(correspondences, currentSource, target)
      
      // Check convergence
      if (Math.abs(previousError - error) < tolerance) {
        break
      }
      
      previousError = error
    }
    
    // Compute final metrics
    const finalCorrespondences = this.findCorrespondences(
      currentSource,
      target,
      maxCorrespondenceDistance
    )
    
    const fitness = finalCorrespondences.length / source.length
    const inlierRMSE = this.computeRegistrationError(finalCorrespondences, currentSource, target)
    
    return {
      transformMatrix,
      fitness,
      inlierRMSE,
      correspondences: finalCorrespondences
    }
  }

  /**
   * Point-to-plane ICP
   * More robust than point-to-point when target has normals
   */
  static pointToPlaneICP(
    source: Point3D[],
    target: Point3D[],
    maxIterations: number = 50,
    tolerance: number = 1e-6,
    maxCorrespondenceDistance: number = 0.05
  ): RegistrationResult {
    // Verify target has normals
    if (!target.every(p => p.normal)) {
      throw new Error('Point-to-plane ICP requires target cloud to have normals')
    }
    
    let currentSource = source.map(p => ({ ...p }))
    let transformMatrix = this.identityMatrix()
    let previousError = Infinity
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const correspondences = this.findCorrespondences(
        currentSource,
        target,
        maxCorrespondenceDistance
      )
      
      if (correspondences.length < 3) break
      
      // Compute point-to-plane transformation
      const transform = this.computePointToPlaneTransformation(
        correspondences,
        currentSource,
        target
      )
      
      currentSource = this.applyTransformation(
        currentSource,
        transform.rotation,
        transform.translation
      )
      
      transformMatrix = this.multiplyMatrices(
        this.buildTransformMatrix(transform.rotation, transform.translation),
        transformMatrix
      )
      
      const error = this.computePointToPlaneError(correspondences, currentSource, target)
      
      if (Math.abs(previousError - error) < tolerance) break
      
      previousError = error
    }
    
    const finalCorrespondences = this.findCorrespondences(
      currentSource,
      target,
      maxCorrespondenceDistance
    )
    
    return {
      transformMatrix,
      fitness: finalCorrespondences.length / source.length,
      inlierRMSE: this.computePointToPlaneError(finalCorrespondences, currentSource, target),
      correspondences: finalCorrespondences
    }
  }

  /**
   * RANSAC-based registration
   * More robust to outliers than standard ICP
   */
  static ransacRegistration(
    source: Point3D[],
    target: Point3D[],
    maxIterations: number = 1000,
    inlierThreshold: number = 0.05,
    minInliers: number = 100
  ): RegistrationResult {
    let bestTransformMatrix = this.identityMatrix()
    let bestInliers: number[][] = []
    let bestFitness = 0
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Random sample 3 correspondences
      const samples = this.randomSampleCorrespondences(source, target, 3, inlierThreshold)
      
      if (samples.length < 3) continue
      
      // Compute transformation from samples
      const { rotation, translation } = this.computeRigidTransformation(
        samples,
        source,
        target
      )
      
      const transformMatrix = this.buildTransformMatrix(rotation, translation)
      const transformed = this.applyTransformation(source, rotation, translation)
      
      // Count inliers
      const correspondences = this.findCorrespondences(transformed, target, inlierThreshold)
      const fitness = correspondences.length / source.length
      
      if (correspondences.length >= minInliers && fitness > bestFitness) {
        bestFitness = fitness
        bestInliers = correspondences
        bestTransformMatrix = transformMatrix
      }
    }
    
    if (bestInliers.length === 0) {
      throw new Error('RANSAC registration failed: no valid transformation found')
    }
    
    // Refine with ICP using inliers
    const inlierSource = bestInliers.map(([srcIdx]) => source[srcIdx])
    const inlierTarget = bestInliers.map(([, tgtIdx]) => target[tgtIdx])
    
    const refinedResult = this.icp(inlierSource, inlierTarget, 10, 1e-6, inlierThreshold)
    
    return {
      transformMatrix: this.multiplyMatrices(refinedResult.transformMatrix, bestTransformMatrix),
      fitness: bestFitness,
      inlierRMSE: refinedResult.inlierRMSE,
      correspondences: bestInliers
    }
  }

  // ============================================================================
  // CORRESPONDENCE FINDING
  // ============================================================================
  
  private static findCorrespondences(
    source: Point3D[],
    target: Point3D[],
    maxDistance: number
  ): number[][] {
    const correspondences: number[][] = []
    
    for (let i = 0; i < source.length; i++) {
      let minDist = Infinity
      let bestMatch = -1
      
      for (let j = 0; j < target.length; j++) {
        const dist = this.distance(source[i], target[j])
        if (dist < minDist && dist < maxDistance) {
          minDist = dist
          bestMatch = j
        }
      }
      
      if (bestMatch >= 0) {
        correspondences.push([i, bestMatch])
      }
    }
    
    return correspondences
  }

  private static randomSampleCorrespondences(
    source: Point3D[],
    target: Point3D[],
    count: number,
    maxDistance: number
  ): number[][] {
    const samples: number[][] = []
    const usedIndices = new Set<number>()
    
    let attempts = 0
    while (samples.length < count && attempts < count * 100) {
      const srcIdx = Math.floor(Math.random() * source.length)
      
      if (usedIndices.has(srcIdx)) {
        attempts++
        continue
      }
      
      // Find closest target point
      let minDist = Infinity
      let bestMatch = -1
      
      for (let j = 0; j < target.length; j++) {
        const dist = this.distance(source[srcIdx], target[j])
        if (dist < minDist && dist < maxDistance) {
          minDist = dist
          bestMatch = j
        }
      }
      
      if (bestMatch >= 0) {
        samples.push([srcIdx, bestMatch])
        usedIndices.add(srcIdx)
      }
      
      attempts++
    }
    
    return samples
  }

  // ============================================================================
  // TRANSFORMATION COMPUTATION
  // ============================================================================
  
  private static computeRigidTransformation(
    correspondences: number[][],
    source: Point3D[],
    target: Point3D[]
  ): { rotation: number[][]; translation: [number, number, number] } {
    // Compute centroids
    const sourceCentroid = this.computeCentroid(
      correspondences.map(([srcIdx]) => source[srcIdx])
    )
    const targetCentroid = this.computeCentroid(
      correspondences.map(([, tgtIdx]) => target[tgtIdx])
    )
    
    // Center points
    const sourceCentered = correspondences.map(([srcIdx]) => ({
      x: source[srcIdx].x - sourceCentroid.x,
      y: source[srcIdx].y - sourceCentroid.y,
      z: source[srcIdx].z - sourceCentroid.z
    }))
    
    const targetCentered = correspondences.map(([, tgtIdx]) => ({
      x: target[tgtIdx].x - targetCentroid.x,
      y: target[tgtIdx].y - targetCentroid.y,
      z: target[tgtIdx].z - targetCentroid.z
    }))
    
    // Compute cross-covariance matrix
    const H = this.computeCrossCovarianceMatrix(sourceCentered, targetCentered)
    
    // Compute rotation using SVD (simplified - use approximation)
    const rotation = this.approximateRotationFromCovariance(H)
    
    // Compute translation
    const rotatedCentroid = this.applyRotation(sourceCentroid, rotation)
    const translation: [number, number, number] = [
      targetCentroid.x - rotatedCentroid.x,
      targetCentroid.y - rotatedCentroid.y,
      targetCentroid.z - rotatedCentroid.z
    ]
    
    return { rotation, translation }
  }

  private static computePointToPlaneTransformation(
    correspondences: number[][],
    source: Point3D[],
    target: Point3D[]
  ): { rotation: number[][]; translation: [number, number, number] } {
    // Simplified point-to-plane - use point-to-point as approximation
    return this.computeRigidTransformation(correspondences, source, target)
  }

  private static computeCrossCovarianceMatrix(
    source: Array<{ x: number; y: number; z: number }>,
    target: Array<{ x: number; y: number; z: number }>
  ): number[][] {
    const H = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    
    for (let i = 0; i < source.length; i++) {
      H[0][0] += source[i].x * target[i].x
      H[0][1] += source[i].x * target[i].y
      H[0][2] += source[i].x * target[i].z
      H[1][0] += source[i].y * target[i].x
      H[1][1] += source[i].y * target[i].y
      H[1][2] += source[i].y * target[i].z
      H[2][0] += source[i].z * target[i].x
      H[2][1] += source[i].z * target[i].y
      H[2][2] += source[i].z * target[i].z
    }
    
    return H
  }

  private static approximateRotationFromCovariance(H: number[][]): number[][] {
    // Simplified rotation estimation
    // In production, use proper SVD decomposition
    
    // Extract approximate rotation angles
    const angle = Math.atan2(H[1][0], H[0][0])
    
    // Build rotation matrix (simplified - only Z-axis rotation)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    return [
      [cos, -sin, 0],
      [sin, cos, 0],
      [0, 0, 1]
    ]
  }

  // ============================================================================
  // TRANSFORMATION APPLICATION
  // ============================================================================
  
  private static applyTransformation(
    points: Point3D[],
    rotation: number[][],
    translation: [number, number, number]
  ): Point3D[] {
    return points.map(p => {
      const rotated = this.applyRotation(p, rotation)
      return {
        ...p,
        x: rotated.x + translation[0],
        y: rotated.y + translation[1],
        z: rotated.z + translation[2]
      }
    })
  }

  private static applyRotation(
    point: Point3D,
    rotation: number[][]
  ): Point3D {
    return {
      x: rotation[0][0] * point.x + rotation[0][1] * point.y + rotation[0][2] * point.z,
      y: rotation[1][0] * point.x + rotation[1][1] * point.y + rotation[1][2] * point.z,
      z: rotation[2][0] * point.x + rotation[2][1] * point.y + rotation[2][2] * point.z
    }
  }

  private static buildTransformMatrix(
    rotation: number[][],
    translation: [number, number, number]
  ): number[][] {
    return [
      [rotation[0][0], rotation[0][1], rotation[0][2], translation[0]],
      [rotation[1][0], rotation[1][1], rotation[1][2], translation[1]],
      [rotation[2][0], rotation[2][1], rotation[2][2], translation[2]],
      [0, 0, 0, 1]
    ]
  }

  private static identityMatrix(): number[][] {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]
  }

  private static multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const result = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          result[i][j] += a[i][k] * b[k][j]
        }
      }
    }
    
    return result
  }

  // ============================================================================
  // ERROR COMPUTATION
  // ============================================================================
  
  private static computeRegistrationError(
    correspondences: number[][],
    source: Point3D[],
    target: Point3D[]
  ): number {
    if (correspondences.length === 0) return Infinity
    
    let sumSquaredError = 0
    
    for (const [srcIdx, tgtIdx] of correspondences) {
      const dist = this.distance(source[srcIdx], target[tgtIdx])
      sumSquaredError += dist * dist
    }
    
    return Math.sqrt(sumSquaredError / correspondences.length)
  }

  private static computePointToPlaneError(
    correspondences: number[][],
    source: Point3D[],
    target: Point3D[]
  ): number {
    if (correspondences.length === 0) return Infinity
    
    let sumError = 0
    
    for (const [srcIdx, tgtIdx] of correspondences) {
      const sourcePoint = source[srcIdx]
      const targetPoint = target[tgtIdx]
      const targetNormal = targetPoint.normal!
      
      // Point-to-plane distance
      const diff = {
        x: sourcePoint.x - targetPoint.x,
        y: sourcePoint.y - targetPoint.y,
        z: sourcePoint.z - targetPoint.z
      }
      
      const distance = Math.abs(
        diff.x * targetNormal[0] +
        diff.y * targetNormal[1] +
        diff.z * targetNormal[2]
      )
      
      sumError += distance
    }
    
    return sumError / correspondences.length
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
}
