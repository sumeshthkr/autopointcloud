import { Point3D, PointCloud, ProcessingOptions, ProcessingResult, Face } from './types'
import { AdvancedProcessor } from './advanced-processing'
import { MeshProcessor } from './mesh-processing'

export class PointCloudProcessor {
  static async process(pointCloud: PointCloud, options: ProcessingOptions): Promise<ProcessingResult> {
    let processedPoints: Point3D[] = []
    let processedFaces: Face[] | undefined = pointCloud.faces
    let metadata: ProcessingResult['metadata'] = {}
    
    switch (options.filterType) {
      case 'downsample':
        processedPoints = this.voxelDownsample(pointCloud.points, options.voxelSize || 0.1)
        break
      case 'statistical_outlier':
        processedPoints = this.statisticalOutlierRemoval(
          pointCloud.points,
          options.kNeighbors || 20,
          options.stdDevMultiplier || 2.0
        )
        break
      case 'radius_outlier':
        processedPoints = this.radiusOutlierRemoval(
          pointCloud.points,
          options.radius || 1.0,
          options.minNeighbors || 5
        )
        break
      case 'intensity':
        processedPoints = this.intensityFilter(pointCloud.points, options.threshold || 0.5)
        break
      case 'distance':
        processedPoints = this.distanceFilter(pointCloud.points, pointCloud.boundingBox.center, options.threshold || 10.0)
        break
      case 'passthrough_x':
      case 'passthrough_y':
      case 'passthrough_z':
        const axis = options.filterType.split('_')[1] as 'x' | 'y' | 'z'
        processedPoints = this.passthroughFilter(
          pointCloud.points,
          axis,
          options.minValue ?? -Infinity,
          options.maxValue ?? Infinity
        )
        break
      case 'bilateral':
        processedPoints = this.bilateralFilter(
          pointCloud.points,
          options.sigmaS || 0.1,
          options.sigmaR || 0.05
        )
        break
      case 'conditional':
        if (!options.condition) {
          throw new Error('Conditional filter requires a condition function')
        }
        processedPoints = pointCloud.points.filter(options.condition)
        break
      case 'crop_box':
        if (!options.minPoint || !options.maxPoint) {
          throw new Error('Crop box filter requires minPoint and maxPoint')
        }
        processedPoints = this.cropBox(pointCloud.points, options.minPoint, options.maxPoint)
        break
      case 'mls_smoothing':
        processedPoints = this.mlsSmoothing(
          pointCloud.points,
          options.searchRadius || 0.03,
          options.polynomialOrder || 2
        )
        break
      case 'normal_estimation':
        processedPoints = AdvancedProcessor.estimateNormals(
          pointCloud.points,
          options.kNeighbors || 30,
          options.normalRadius
        )
        break
      case 'plane_segmentation':
        const planeResult = AdvancedProcessor.segmentPlane(
          pointCloud.points,
          options.distanceThreshold || 0.01,
          options.maxIterations || 1000
        )
        processedPoints = planeResult.inliers.map(idx => pointCloud.points[idx])
        metadata.plane = planeResult.plane
        break
      case 'euclidean_clustering':
        const clusters = AdvancedProcessor.extractClusters(
          pointCloud.points,
          options.clusterTolerance || 0.02,
          options.minClusterSize || 100,
          options.maxClusterSize || 25000
        )
        // Assign cluster colors to points
        processedPoints = pointCloud.points.map(p => ({ ...p }))
        for (const cluster of clusters) {
          for (const idx of cluster.indices) {
            processedPoints[idx].color = cluster.color
          }
        }
        metadata.clusters = clusters
        break
      case 'region_growing':
        const regions = AdvancedProcessor.regionGrowingSegmentation(
          pointCloud.points,
          options.kNeighbors || 30,
          options.smoothnessThreshold || 5.0,
          options.curvatureThreshold || 1.0
        )
        processedPoints = pointCloud.points.map(p => ({ ...p }))
        for (const region of regions) {
          for (const idx of region.indices) {
            processedPoints[idx].color = region.color
          }
        }
        metadata.clusters = regions
        break
      case 'mesh_smoothing':
        if (!pointCloud.isMesh || !pointCloud.faces) {
          throw new Error('Mesh smoothing requires mesh data')
        }
        processedPoints = MeshProcessor.laplacianSmoothing(
          pointCloud.points,
          pointCloud.faces,
          options.iterations || 10,
          options.lambda || 0.5
        )
        break
      case 'mesh_decimation':
        if (!pointCloud.isMesh || !pointCloud.faces) {
          throw new Error('Mesh decimation requires mesh data')
        }
        const decimated = MeshProcessor.decimateMesh(
          pointCloud.points,
          pointCloud.faces,
          options.targetFaceCount || Math.floor(pointCloud.faces.length * 0.5)
        )
        processedPoints = decimated.vertices
        processedFaces = decimated.faces
        break
      case 'mesh_subdivision':
        if (!pointCloud.isMesh || !pointCloud.faces) {
          throw new Error('Mesh subdivision requires mesh data')
        }
        const subdivided = MeshProcessor.loopSubdivision(
          pointCloud.points,
          pointCloud.faces
        )
        processedPoints = subdivided.vertices
        processedFaces = subdivided.faces
        break
      case 'mesh_to_pointcloud':
        if (!pointCloud.isMesh || !pointCloud.faces) {
          throw new Error('Mesh to point cloud conversion requires mesh data')
        }
        processedPoints = MeshProcessor.meshToPointCloud(
          pointCloud.points,
          pointCloud.faces,
          options.threshold ? 'uniform' : 'vertices',
          options.threshold ? Math.floor(options.threshold) : undefined
        )
        processedFaces = undefined // Remove faces when converting to point cloud
        break
      case 'pointcloud_to_mesh':
        if (pointCloud.isMesh) {
          throw new Error('Point cloud to mesh conversion requires point cloud data (not mesh)')
        }
        const meshResult = MeshProcessor.pointCloudToMesh(
          pointCloud.points,
          options.threshold && options.threshold > 1 ? 'ball_pivoting' : 'greedy',
          {
            searchRadius: options.searchRadius || 0.1,
            maxNearestNeighbors: options.kNeighbors || 100,
            ballRadius: options.radius || 0.05
          }
        )
        processedPoints = meshResult.vertices
        processedFaces = meshResult.faces
        break
      default:
        throw new Error(`Unknown filter type: ${options.filterType}`)
    }
    
    // Create new point cloud with processed points
    const newPointCloud: PointCloud = {
      ...pointCloud,
      points: processedPoints,
      numPoints: processedPoints.length,
      boundingBox: this.calculateBoundingBox(processedPoints),
      faces: processedFaces,
      numFaces: processedFaces?.length,
    }
    
    return {
      id: pointCloud.id,
      originalPoints: pointCloud.numPoints,
      processedPoints: processedPoints.length,
      method: options.filterType,
      success: true,
      pointCloud: newPointCloud,
      metadata,
    }
  }

  private static voxelDownsample(points: Point3D[], voxelSize: number): Point3D[] {
    const voxelMap = new Map<string, Point3D[]>()
    
    // Group points by voxel
    for (const point of points) {
      const voxelKey = this.getVoxelKey(point, voxelSize)
      const voxelPoints = voxelMap.get(voxelKey) || []
      voxelPoints.push(point)
      voxelMap.set(voxelKey, voxelPoints)
    }
    
    // Calculate centroid for each voxel
    const downsampled: Point3D[] = []
    for (const voxelPoints of voxelMap.values()) {
      downsampled.push(this.calculateCentroid(voxelPoints))
    }
    
    return downsampled
  }

  private static statisticalOutlierRemoval(
    points: Point3D[],
    kNeighbors: number,
    stdDevMultiplier: number
  ): Point3D[] {
    if (points.length < kNeighbors) return points
    
    // Calculate mean distance for each point
    const distances: number[] = []
    
    for (let i = 0; i < points.length; i++) {
      const nearestDistances = this.findKNearestDistances(points, i, kNeighbors)
      const meanDistance = nearestDistances.reduce((a, b) => a + b, 0) / nearestDistances.length
      distances.push(meanDistance)
    }
    
    // Calculate mean and standard deviation
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length
    const stdDev = Math.sqrt(variance)
    
    const threshold = mean + stdDevMultiplier * stdDev
    
    // Filter outliers
    return points.filter((_, i) => distances[i] <= threshold)
  }

  private static radiusOutlierRemoval(
    points: Point3D[],
    radius: number,
    minNeighbors: number
  ): Point3D[] {
    return points.filter((point, i) => {
      let neighbors = 0
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        if (this.distance(point, points[j]) <= radius) {
          neighbors++
          if (neighbors >= minNeighbors) return true
        }
      }
      return false
    })
  }

  private static intensityFilter(points: Point3D[], threshold: number): Point3D[] {
    return points.filter(p => (p.intensity ?? 1.0) >= threshold)
  }

  private static distanceFilter(points: Point3D[], center: Point3D, threshold: number): Point3D[] {
    return points.filter(p => this.distance(p, center) <= threshold)
  }

  private static passthroughFilter(
    points: Point3D[],
    axis: 'x' | 'y' | 'z',
    min: number,
    max: number
  ): Point3D[] {
    return points.filter(p => p[axis] >= min && p[axis] <= max)
  }

  private static bilateralFilter(
    points: Point3D[],
    sigmaS: number,
    sigmaR: number
  ): Point3D[] {
    // Edge-preserving smoothing
    const result: Point3D[] = []
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      let sumWeights = 0
      let sumX = 0, sumY = 0, sumZ = 0
      
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue
        
        const neighbor = points[j]
        const spatialDist = this.distance(point, neighbor)
        
        if (spatialDist > 3 * sigmaS) continue
        
        // Spatial weight
        const ws = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaS * sigmaS))
        
        // Range weight (based on intensity or Z value)
        const rangeDiff = point.intensity !== undefined && neighbor.intensity !== undefined
          ? Math.abs(point.intensity - neighbor.intensity)
          : Math.abs(point.z - neighbor.z)
        
        const wr = Math.exp(-(rangeDiff * rangeDiff) / (2 * sigmaR * sigmaR))
        
        const weight = ws * wr
        sumWeights += weight
        sumX += weight * neighbor.x
        sumY += weight * neighbor.y
        sumZ += weight * neighbor.z
      }
      
      if (sumWeights > 0) {
        result.push({
          ...point,
          x: sumX / sumWeights,
          y: sumY / sumWeights,
          z: sumZ / sumWeights
        })
      } else {
        result.push({ ...point })
      }
    }
    
    return result
  }

  private static cropBox(
    points: Point3D[],
    minPoint: Point3D,
    maxPoint: Point3D
  ): Point3D[] {
    return points.filter(p =>
      p.x >= minPoint.x && p.x <= maxPoint.x &&
      p.y >= minPoint.y && p.y <= maxPoint.y &&
      p.z >= minPoint.z && p.z <= maxPoint.z
    )
  }

  private static mlsSmoothing(
    points: Point3D[],
    searchRadius: number,
    polynomialOrder: number
  ): Point3D[] {
    // Moving Least Squares surface smoothing
    const result: Point3D[] = []
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const neighbors: Point3D[] = []
      
      for (let j = 0; j < points.length; j++) {
        if (this.distance(point, points[j]) <= searchRadius) {
          neighbors.push(points[j])
        }
      }
      
      if (neighbors.length < 3) {
        result.push({ ...point })
        continue
      }
      
      // Fit local plane (simplified MLS)
      const centroid = this.calculateCentroid(neighbors)
      
      // Project point onto local surface
      result.push({
        ...point,
        z: centroid.z + (point.z - centroid.z) * 0.5
      })
    }
    
    return result
  }

  private static getVoxelKey(point: Point3D, voxelSize: number): string {
    const x = Math.floor(point.x / voxelSize)
    const y = Math.floor(point.y / voxelSize)
    const z = Math.floor(point.z / voxelSize)
    return `${x},${y},${z}`
  }

  private static calculateCentroid(points: Point3D[]): Point3D {
    let sumX = 0, sumY = 0, sumZ = 0
    let sumIntensity = 0
    let sumR = 0, sumG = 0, sumB = 0
    let hasIntensity = false
    let hasColor = false
    
    for (const point of points) {
      sumX += point.x
      sumY += point.y
      sumZ += point.z
      
      if (point.intensity !== undefined) {
        sumIntensity += point.intensity
        hasIntensity = true
      }
      
      if (point.color) {
        sumR += point.color[0]
        sumG += point.color[1]
        sumB += point.color[2]
        hasColor = true
      }
    }
    
    const n = points.length
    const centroid: Point3D = {
      x: sumX / n,
      y: sumY / n,
      z: sumZ / n,
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
    
    return centroid
  }

  private static findKNearestDistances(points: Point3D[], index: number, k: number): number[] {
    const point = points[index]
    const distances: number[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue
      distances.push(this.distance(point, points[i]))
    }
    
    distances.sort((a, b) => a - b)
    return distances.slice(0, k)
  }

  private static distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private static calculateBoundingBox(points: Point3D[]) {
    if (points.length === 0) {
      const zero = { x: 0, y: 0, z: 0 }
      return {
        min: zero,
        max: zero,
        center: zero,
        size: { x: 0, y: 0, z: 0 }
      }
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      minZ = Math.min(minZ, point.z)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
      maxZ = Math.max(maxZ, point.z)
    }
    
    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center,
      size: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ
      }
    }
  }

  static exportToFormat(pointCloud: PointCloud, format: 'pcd' | 'ply' | 'xyz' | 'obj' | 'stl'): string {
    switch (format) {
      case 'pcd':
        return this.exportToPCD(pointCloud)
      case 'ply':
        return this.exportToPLY(pointCloud)
      case 'xyz':
        return this.exportToXYZ(pointCloud)
      case 'obj':
        return this.exportToOBJ(pointCloud)
      case 'stl':
        return this.exportToSTL(pointCloud)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  private static exportToPCD(pointCloud: PointCloud): string {
    const { points, hasColor, hasIntensity } = pointCloud
    
    let fields = 'x y z'
    if (hasIntensity) fields += ' intensity'
    if (hasColor) fields += ' rgb'
    
    const header = `# .PCD v0.7 - Point Cloud Data file format
VERSION 0.7
FIELDS ${fields}
SIZE 4 4 4${hasIntensity ? ' 4' : ''}${hasColor ? ' 4' : ''}
TYPE F F F${hasIntensity ? ' F' : ''}${hasColor ? ' U' : ''}
COUNT 1 1 1${hasIntensity ? ' 1' : ''}${hasColor ? ' 1' : ''}
WIDTH ${points.length}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS ${points.length}
DATA ascii\n`
    
    const data = points.map(p => {
      let line = `${p.x} ${p.y} ${p.z}`
      if (hasIntensity) line += ` ${p.intensity ?? 0}`
      if (hasColor && p.color) {
        const rgb = (p.color[0] << 16) | (p.color[1] << 8) | p.color[2]
        line += ` ${rgb}`
      }
      return line
    }).join('\n')
    
    return header + data
  }

  private static exportToPLY(pointCloud: PointCloud): string {
    const { points, hasColor, hasIntensity, faces, isMesh } = pointCloud
    
    let properties = 'property float x\nproperty float y\nproperty float z\n'
    if (hasIntensity) properties += 'property float intensity\n'
    if (hasColor) properties += 'property uchar red\nproperty uchar green\nproperty uchar blue\n'
    
    const faceSection = isMesh && faces ? `element face ${faces.length}\nproperty list uchar int vertex_indices\n` : ''
    
    const header = `ply
format ascii 1.0
element vertex ${points.length}
${properties}${faceSection}end_header\n`
    
    const vertexData = points.map(p => {
      let line = `${p.x} ${p.y} ${p.z}`
      if (hasIntensity) line += ` ${p.intensity ?? 0}`
      if (hasColor && p.color) {
        line += ` ${p.color[0]} ${p.color[1]} ${p.color[2]}`
      }
      return line
    }).join('\n')
    
    let faceData = ''
    if (isMesh && faces) {
      faceData = '\n' + faces.map(f => `3 ${f.vertices[0]} ${f.vertices[1]} ${f.vertices[2]}`).join('\n')
    }
    
    return header + vertexData + faceData
  }

  private static exportToXYZ(pointCloud: PointCloud): string {
    const { points, hasColor, hasIntensity } = pointCloud
    
    return points.map(p => {
      let line = `${p.x} ${p.y} ${p.z}`
      if (hasIntensity) line += ` ${p.intensity ?? 0}`
      if (hasColor && p.color) {
        line += ` ${p.color[0]} ${p.color[1]} ${p.color[2]}`
      }
      return line
    }).join('\n')
  }

  private static exportToOBJ(pointCloud: PointCloud): string {
    const { points, faces, isMesh } = pointCloud
    
    let output = '# Wavefront OBJ file exported from AutoPointCloud\n'
    output += `# Vertices: ${points.length}\n`
    if (isMesh && faces) {
      output += `# Faces: ${faces.length}\n`
    }
    output += '\n'
    
    // Export vertices
    for (const p of points) {
      output += `v ${p.x} ${p.y} ${p.z}\n`
    }
    
    // Export normals if available
    const hasNormals = points.some(p => p.normal)
    if (hasNormals) {
      output += '\n'
      for (const p of points) {
        if (p.normal) {
          output += `vn ${p.normal[0]} ${p.normal[1]} ${p.normal[2]}\n`
        }
      }
    }
    
    // Export faces if this is a mesh
    if (isMesh && faces) {
      output += '\n'
      for (const f of faces) {
        // OBJ uses 1-based indexing
        output += `f ${f.vertices[0] + 1} ${f.vertices[1] + 1} ${f.vertices[2] + 1}\n`
      }
    }
    
    return output
  }

  private static exportToSTL(pointCloud: PointCloud): string {
    const { points, faces, isMesh } = pointCloud
    
    if (!isMesh || !faces || faces.length === 0) {
      throw new Error('STL export requires mesh data with faces')
    }
    
    let output = 'solid AutoPointCloud\n'
    
    for (const face of faces) {
      const v0 = points[face.vertices[0]]
      const v1 = points[face.vertices[1]]
      const v2 = points[face.vertices[2]]
      
      // Calculate face normal
      const u = {
        x: v1.x - v0.x,
        y: v1.y - v0.y,
        z: v1.z - v0.z
      }
      const v = {
        x: v2.x - v0.x,
        y: v2.y - v0.y,
        z: v2.z - v0.z
      }
      const normal = {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x
      }
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z)
      if (len > 0) {
        normal.x /= len
        normal.y /= len
        normal.z /= len
      }
      
      output += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`
      output += '    outer loop\n'
      output += `      vertex ${v0.x} ${v0.y} ${v0.z}\n`
      output += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`
      output += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`
      output += '    endloop\n'
      output += '  endfacet\n'
    }
    
    output += 'endsolid AutoPointCloud\n'
    
    return output
  }
}
