import { Point3D, Face, PointCloud } from './types'

/**
 * Mesh Processing Operations
 * Implements PCL and Open3D-like mesh functionality
 */

export class MeshProcessor {
  // ============================================================================
  // MESH SMOOTHING
  // ============================================================================
  
  /**
   * Laplacian mesh smoothing
   * Based on PCL's MeshSmoothingLaplacianVTK
   */
  static laplacianSmoothing(
    vertices: Point3D[],
    faces: Face[],
    iterations: number = 10,
    lambda: number = 0.5
  ): Point3D[] {
    let smoothed = vertices.map(v => ({ ...v }))
    
    // Build adjacency list
    const adjacency = this.buildAdjacencyList(vertices.length, faces)
    
    for (let iter = 0; iter < iterations; iter++) {
      const newVertices: Point3D[] = []
      
      for (let i = 0; i < smoothed.length; i++) {
        const neighbors = adjacency[i]
        
        if (neighbors.length === 0) {
          newVertices.push({ ...smoothed[i] })
          continue
        }
        
        // Compute Laplacian
        let sumX = 0, sumY = 0, sumZ = 0
        for (const neighborIdx of neighbors) {
          sumX += smoothed[neighborIdx].x
          sumY += smoothed[neighborIdx].y
          sumZ += smoothed[neighborIdx].z
        }
        
        const n = neighbors.length
        const laplacian = {
          x: sumX / n - smoothed[i].x,
          y: sumY / n - smoothed[i].y,
          z: sumZ / n - smoothed[i].z
        }
        
        // Update vertex
        newVertices.push({
          ...smoothed[i],
          x: smoothed[i].x + lambda * laplacian.x,
          y: smoothed[i].y + lambda * laplacian.y,
          z: smoothed[i].z + lambda * laplacian.z
        })
      }
      
      smoothed = newVertices
    }
    
    return smoothed
  }

  /**
   * Taubin mesh smoothing (HC algorithm)
   * Prevents mesh shrinkage better than Laplacian
   */
  static taubinSmoothing(
    vertices: Point3D[],
    faces: Face[],
    iterations: number = 10,
    lambda: number = 0.5,
    mu: number = -0.53
  ): Point3D[] {
    let smoothed = vertices.map(v => ({ ...v }))
    const adjacency = this.buildAdjacencyList(vertices.length, faces)
    
    for (let iter = 0; iter < iterations; iter++) {
      // Smoothing step with lambda
      smoothed = this.smoothingStep(smoothed, adjacency, lambda)
      // Unshrinking step with mu
      smoothed = this.smoothingStep(smoothed, adjacency, mu)
    }
    
    return smoothed
  }

  private static smoothingStep(
    vertices: Point3D[],
    adjacency: number[][],
    weight: number
  ): Point3D[] {
    const newVertices: Point3D[] = []
    
    for (let i = 0; i < vertices.length; i++) {
      const neighbors = adjacency[i]
      
      if (neighbors.length === 0) {
        newVertices.push({ ...vertices[i] })
        continue
      }
      
      let sumX = 0, sumY = 0, sumZ = 0
      for (const neighborIdx of neighbors) {
        sumX += vertices[neighborIdx].x
        sumY += vertices[neighborIdx].y
        sumZ += vertices[neighborIdx].z
      }
      
      const n = neighbors.length
      const laplacian = {
        x: sumX / n - vertices[i].x,
        y: sumY / n - vertices[i].y,
        z: sumZ / n - vertices[i].z
      }
      
      newVertices.push({
        ...vertices[i],
        x: vertices[i].x + weight * laplacian.x,
        y: vertices[i].y + weight * laplacian.y,
        z: vertices[i].z + weight * laplacian.z
      })
    }
    
    return newVertices
  }

  // ============================================================================
  // MESH DECIMATION / SIMPLIFICATION
  // ============================================================================
  
  /**
   * Quadric Error Metrics mesh decimation
   * Based on Garland-Heckbert algorithm
   */
  static decimateMesh(
    vertices: Point3D[],
    faces: Face[],
    targetFaceCount: number
  ): { vertices: Point3D[]; faces: Face[] } {
    if (targetFaceCount >= faces.length) {
      return { vertices, faces }
    }
    
    // Build edge collapse priority queue
    const edges = this.extractEdges(faces)
    const quadrics = this.computeQuadrics(vertices, faces)
    
    let currentVertices = vertices.map(v => ({ ...v }))
    let currentFaces = faces.map(f => ({ ...f }))
    const vertexMap = new Map<number, number>() // old index -> new index
    
    // Compute edge costs
    const edgeCosts = edges.map(edge => ({
      v1: edge[0],
      v2: edge[1],
      cost: this.computeEdgeCollapseCost(
        currentVertices[edge[0]],
        currentVertices[edge[1]],
        quadrics[edge[0]],
        quadrics[edge[1]]
      )
    }))
    
    edgeCosts.sort((a, b) => a.cost - b.cost)
    
    // Collapse edges until target is reached
    const targetRemoval = faces.length - targetFaceCount
    let removed = 0
    
    for (const edge of edgeCosts) {
      if (removed >= targetRemoval) break
      
      // Mark one vertex for removal (collapse to the other)
      vertexMap.set(edge.v1, edge.v2)
      removed++
    }
    
    // Rebuild mesh
    const newVertices: Point3D[] = []
    const vertexIndexMap = new Map<number, number>()
    
    for (let i = 0; i < currentVertices.length; i++) {
      if (!vertexMap.has(i)) {
        vertexIndexMap.set(i, newVertices.length)
        newVertices.push(currentVertices[i])
      }
    }
    
    const newFaces: Face[] = []
    for (const face of currentFaces) {
      const newIndices: number[] = []
      
      for (const idx of face.vertices) {
        const mappedIdx = vertexMap.get(idx) ?? idx
        const newIdx = vertexIndexMap.get(mappedIdx)
        if (newIdx !== undefined) {
          newIndices.push(newIdx)
        }
      }
      
      // Only add face if it has 3 unique vertices
      if (
        newIndices.length === 3 &&
        newIndices[0] !== newIndices[1] &&
        newIndices[1] !== newIndices[2] &&
        newIndices[0] !== newIndices[2]
      ) {
        newFaces.push({
          vertices: [newIndices[0], newIndices[1], newIndices[2]]
        })
      }
    }
    
    return { vertices: newVertices, faces: newFaces }
  }

  // ============================================================================
  // MESH SUBDIVISION
  // ============================================================================
  
  /**
   * Loop subdivision for mesh refinement
   * Based on Loop's subdivision scheme
   */
  static loopSubdivision(
    vertices: Point3D[],
    faces: Face[]
  ): { vertices: Point3D[]; faces: Face[] } {
    const newVertices = [...vertices.map(v => ({ ...v }))]
    const newFaces: Face[] = []
    const edgeVertexMap = new Map<string, number>()
    
    // For each face, split into 4 sub-faces
    for (const face of faces) {
      const v0 = face.vertices[0]
      const v1 = face.vertices[1]
      const v2 = face.vertices[2]
      
      // Get or create edge midpoints
      const v01 = this.getOrCreateEdgeVertex(
        v0, v1, vertices, newVertices, edgeVertexMap
      )
      const v12 = this.getOrCreateEdgeVertex(
        v1, v2, vertices, newVertices, edgeVertexMap
      )
      const v20 = this.getOrCreateEdgeVertex(
        v2, v0, vertices, newVertices, edgeVertexMap
      )
      
      // Create 4 new faces
      newFaces.push({ vertices: [v0, v01, v20] })
      newFaces.push({ vertices: [v1, v12, v01] })
      newFaces.push({ vertices: [v2, v20, v12] })
      newFaces.push({ vertices: [v01, v12, v20] })
    }
    
    return { vertices: newVertices, faces: newFaces }
  }

  private static getOrCreateEdgeVertex(
    v1: number,
    v2: number,
    originalVertices: Point3D[],
    newVertices: Point3D[],
    edgeVertexMap: Map<string, number>
  ): number {
    const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`
    
    if (edgeVertexMap.has(key)) {
      return edgeVertexMap.get(key)!
    }
    
    // Create new vertex at edge midpoint
    const p1 = originalVertices[v1]
    const p2 = originalVertices[v2]
    
    const newVertex: Point3D = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      z: (p1.z + p2.z) / 2
    }
    
    if (p1.color && p2.color) {
      newVertex.color = [
        Math.floor((p1.color[0] + p2.color[0]) / 2),
        Math.floor((p1.color[1] + p2.color[1]) / 2),
        Math.floor((p1.color[2] + p2.color[2]) / 2)
      ]
    }
    
    const newIdx = newVertices.length
    newVertices.push(newVertex)
    edgeVertexMap.set(key, newIdx)
    
    return newIdx
  }

  // ============================================================================
  // SURFACE RECONSTRUCTION
  // ============================================================================
  
  /**
   * Greedy projection triangulation
   * Based on PCL's GreedyProjectionTriangulation
   */
  static greedyProjectionTriangulation(
    points: Point3D[],
    searchRadius: number = 0.025,
    maxNearestNeighbors: number = 100
  ): Face[] {
    // Ensure normals are computed
    const pointsWithNormals = points.every(p => p.normal) ? points : points
    
    const faces: Face[] = []
    const processed = new Set<number>()
    const frontier: number[] = []
    
    // Start with a seed triangle
    if (points.length < 3) return faces
    
    // Find initial seed
    const seedIdx = 0
    const neighbors = this.findKNearestNeighbors(points, seedIdx, maxNearestNeighbors, searchRadius)
    
    if (neighbors.length < 2) return faces
    
    // Create initial triangle
    faces.push({ vertices: [seedIdx, neighbors[0], neighbors[1]] })
    processed.add(seedIdx)
    processed.add(neighbors[0])
    processed.add(neighbors[1])
    
    frontier.push(seedIdx, neighbors[0], neighbors[1])
    
    // Grow mesh from frontier
    while (frontier.length > 0 && faces.length < points.length * 2) {
      const currentIdx = frontier.shift()!
      const currentNeighbors = this.findKNearestNeighbors(
        points, currentIdx, maxNearestNeighbors, searchRadius
      )
      
      for (const neighborIdx of currentNeighbors) {
        if (processed.has(neighborIdx)) continue
        
        // Try to form triangle with existing vertices
        const existingNeighbors = currentNeighbors.filter(idx => processed.has(idx))
        
        for (const existingIdx of existingNeighbors) {
          if (existingIdx === neighborIdx) continue
          
          // Check if this would be a valid triangle
          if (this.isValidTriangle(
            points[currentIdx],
            points[existingIdx],
            points[neighborIdx]
          )) {
            faces.push({ vertices: [currentIdx, existingIdx, neighborIdx] })
            processed.add(neighborIdx)
            frontier.push(neighborIdx)
            break
          }
        }
      }
    }
    
    return faces
  }

  /**
   * Ball pivoting algorithm for surface reconstruction
   * Based on Bernardini et al.'s algorithm
   */
  static ballPivoting(
    points: Point3D[],
    ballRadius: number = 0.025
  ): Face[] {
    const faces: Face[] = []
    const usedEdges = new Set<string>()
    const frontier: Array<[number, number]> = []
    
    if (points.length < 3) return faces
    
    // Find seed triangle
    for (let i = 0; i < points.length - 2; i++) {
      for (let j = i + 1; j < points.length - 1; j++) {
        for (let k = j + 1; k < points.length; k++) {
          if (this.canFormBallTriangle(
            points[i], points[j], points[k], ballRadius
          )) {
            faces.push({ vertices: [i, j, k] })
            frontier.push([i, j], [j, k], [k, i])
            usedEdges.add(this.getEdgeKey(i, j))
            usedEdges.add(this.getEdgeKey(j, k))
            usedEdges.add(this.getEdgeKey(k, i))
            i = points.length // Break all loops
            break
          }
        }
      }
    }
    
    // Expand from frontier
    while (frontier.length > 0 && faces.length < points.length * 2) {
      const edge = frontier.shift()!
      const [v1, v2] = edge
      
      // Find point that forms valid triangle with ball pivoting
      for (let i = 0; i < points.length; i++) {
        if (i === v1 || i === v2) continue
        
        const edge1Key = this.getEdgeKey(v1, i)
        const edge2Key = this.getEdgeKey(v2, i)
        
        if (usedEdges.has(edge1Key) && usedEdges.has(edge2Key)) continue
        
        if (this.canFormBallTriangle(
          points[v1], points[v2], points[i], ballRadius
        )) {
          faces.push({ vertices: [v1, v2, i] })
          
          if (!usedEdges.has(edge1Key)) {
            frontier.push([v1, i])
            usedEdges.add(edge1Key)
          }
          if (!usedEdges.has(edge2Key)) {
            frontier.push([v2, i])
            usedEdges.add(edge2Key)
          }
          
          break
        }
      }
    }
    
    return faces
  }

  // ============================================================================
  // NORMAL COMPUTATION
  // ============================================================================
  
  /**
   * Compute normals for mesh faces and vertices
   */
  static computeMeshNormals(
    vertices: Point3D[],
    faces: Face[]
  ): { vertices: Point3D[]; faces: Face[] } {
    // Compute face normals
    const faceNormals: Array<[number, number, number]> = []
    
    for (const face of faces) {
      const v0 = vertices[face.vertices[0]]
      const v1 = vertices[face.vertices[1]]
      const v2 = vertices[face.vertices[2]]
      
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
      
      const normal: [number, number, number] = [
        u.y * v.z - u.z * v.y,
        u.z * v.x - u.x * v.z,
        u.x * v.y - u.y * v.x
      ]
      
      // Normalize
      const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
      if (len > 0) {
        normal[0] /= len
        normal[1] /= len
        normal[2] /= len
      }
      
      faceNormals.push(normal)
    }
    
    // Compute vertex normals by averaging adjacent face normals
    const vertexNormals: Array<[number, number, number]> = Array(vertices.length)
      .fill(null)
      .map(() => [0, 0, 0] as [number, number, number])
    
    const vertexFaceCount = Array(vertices.length).fill(0)
    
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i]
      const normal = faceNormals[i]
      
      for (const vertexIdx of face.vertices) {
        vertexNormals[vertexIdx][0] += normal[0]
        vertexNormals[vertexIdx][1] += normal[1]
        vertexNormals[vertexIdx][2] += normal[2]
        vertexFaceCount[vertexIdx]++
      }
    }
    
    // Average and normalize
    for (let i = 0; i < vertexNormals.length; i++) {
      if (vertexFaceCount[i] > 0) {
        vertexNormals[i][0] /= vertexFaceCount[i]
        vertexNormals[i][1] /= vertexFaceCount[i]
        vertexNormals[i][2] /= vertexFaceCount[i]
        
        const len = Math.sqrt(
          vertexNormals[i][0] * vertexNormals[i][0] +
          vertexNormals[i][1] * vertexNormals[i][1] +
          vertexNormals[i][2] * vertexNormals[i][2]
        )
        
        if (len > 0) {
          vertexNormals[i][0] /= len
          vertexNormals[i][1] /= len
          vertexNormals[i][2] /= len
        }
      }
    }
    
    // Apply to vertices and faces
    const newVertices = vertices.map((v, i) => ({
      ...v,
      normal: vertexNormals[i]
    }))
    
    const newFaces = faces.map((f, i) => ({
      ...f,
      normal: faceNormals[i]
    }))
    
    return { vertices: newVertices, faces: newFaces }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  private static buildAdjacencyList(numVertices: number, faces: Face[]): number[][] {
    const adjacency: number[][] = Array(numVertices)
      .fill(null)
      .map(() => [])
    
    for (const face of faces) {
      const [v0, v1, v2] = face.vertices
      
      if (!adjacency[v0].includes(v1)) adjacency[v0].push(v1)
      if (!adjacency[v0].includes(v2)) adjacency[v0].push(v2)
      if (!adjacency[v1].includes(v0)) adjacency[v1].push(v0)
      if (!adjacency[v1].includes(v2)) adjacency[v1].push(v2)
      if (!adjacency[v2].includes(v0)) adjacency[v2].push(v0)
      if (!adjacency[v2].includes(v1)) adjacency[v2].push(v1)
    }
    
    return adjacency
  }

  private static extractEdges(faces: Face[]): [number, number][] {
    const edgeSet = new Set<string>()
    const edges: [number, number][] = []
    
    for (const face of faces) {
      const pairs: [number, number][] = [
        [face.vertices[0], face.vertices[1]],
        [face.vertices[1], face.vertices[2]],
        [face.vertices[2], face.vertices[0]]
      ]
      
      for (const [v1, v2] of pairs) {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push([Math.min(v1, v2), Math.max(v1, v2)])
        }
      }
    }
    
    return edges
  }

  private static computeQuadrics(vertices: Point3D[], faces: Face[]): number[][][] {
    // Initialize quadric matrices (4x4) for each vertex
    const quadrics: number[][][] = vertices.map(() =>
      Array(4).fill(null).map(() => Array(4).fill(0))
    )
    
    // Add quadrics from each face
    for (const face of faces) {
      const v0 = vertices[face.vertices[0]]
      const v1 = vertices[face.vertices[1]]
      const v2 = vertices[face.vertices[2]]
      
      // Compute plane equation
      const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z }
      const v = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z }
      
      const n = {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x
      }
      
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
      if (len === 0) continue
      
      n.x /= len
      n.y /= len
      n.z /= len
      
      const d = -(n.x * v0.x + n.y * v0.y + n.z * v0.z)
      const p = [n.x, n.y, n.z, d]
      
      // Build quadric matrix K = p * p^T
      const K = Array(4).fill(null).map(() => Array(4).fill(0))
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          K[i][j] = p[i] * p[j]
        }
      }
      
      // Add to vertex quadrics
      for (const vertexIdx of face.vertices) {
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            quadrics[vertexIdx][i][j] += K[i][j]
          }
        }
      }
    }
    
    return quadrics
  }

  private static computeEdgeCollapseCost(
    v1: Point3D,
    v2: Point3D,
    q1: number[][],
    q2: number[][]
  ): number {
    // Simplified cost: distance between vertices
    const dx = v1.x - v2.x
    const dy = v1.y - v2.y
    const dz = v1.z - v2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private static findKNearestNeighbors(
    points: Point3D[],
    index: number,
    k: number,
    maxDistance?: number
  ): number[] {
    const point = points[index]
    const distances: { index: number; distance: number }[] = []
    
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue
      
      const dist = this.distance(point, points[i])
      if (maxDistance === undefined || dist <= maxDistance) {
        distances.push({ index: i, distance: dist })
      }
    }
    
    distances.sort((a, b) => a.distance - b.distance)
    return distances.slice(0, k).map(d => d.index)
  }

  private static distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private static isValidTriangle(p1: Point3D, p2: Point3D, p3: Point3D): boolean {
    // Check if triangle has sufficient area
    const u = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z }
    const v = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z }
    
    const cross = {
      x: u.y * v.z - u.z * v.y,
      y: u.z * v.x - u.x * v.z,
      z: u.x * v.y - u.y * v.x
    }
    
    const area = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) / 2
    return area > 1e-6
  }

  private static canFormBallTriangle(
    p1: Point3D,
    p2: Point3D,
    p3: Point3D,
    radius: number
  ): boolean {
    // Check if a ball of given radius can touch all three points
    const d12 = this.distance(p1, p2)
    const d23 = this.distance(p2, p3)
    const d31 = this.distance(p3, p1)
    
    // All edges must be less than 2 * radius
    return d12 < 2 * radius && d23 < 2 * radius && d31 < 2 * radius
  }

  private static getEdgeKey(v1: number, v2: number): string {
    return v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`
  }
}
