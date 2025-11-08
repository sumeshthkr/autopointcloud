import { Point3D, BoundingBox } from './types'

/**
 * Spatial Indexing Data Structures
 * Implements Octree and KD-tree for efficient spatial queries
 */

// ============================================================================
// OCTREE
// ============================================================================

export class OctreeNode {
  bounds: BoundingBox
  points: Point3D[]
  indices: number[]
  children: OctreeNode[] | null
  maxPointsPerNode: number
  depth: number

  constructor(
    bounds: BoundingBox,
    points: Point3D[] = [],
    indices: number[] = [],
    maxPointsPerNode: number = 10,
    depth: number = 0
  ) {
    this.bounds = bounds
    this.points = points
    this.indices = indices
    this.children = null
    this.maxPointsPerNode = maxPointsPerNode
    this.depth = depth
  }

  isLeaf(): boolean {
    return this.children === null
  }

  subdivide(): void {
    if (!this.isLeaf()) return

    const center = this.bounds.center
    const halfSize = {
      x: this.bounds.size.x / 2,
      y: this.bounds.size.y / 2,
      z: this.bounds.size.z / 2
    }

    // Create 8 child octants
    this.children = []
    for (let i = 0; i < 8; i++) {
      const dx = (i & 1) ? halfSize.x : -halfSize.x
      const dy = (i & 2) ? halfSize.y : -halfSize.y
      const dz = (i & 4) ? halfSize.z : -halfSize.z

      const childCenter = {
        x: center.x + dx / 2,
        y: center.y + dy / 2,
        z: center.z + dz / 2
      }

      const childBounds: BoundingBox = {
        min: {
          x: childCenter.x - Math.abs(dx) / 2,
          y: childCenter.y - Math.abs(dy) / 2,
          z: childCenter.z - Math.abs(dz) / 2
        },
        max: {
          x: childCenter.x + Math.abs(dx) / 2,
          y: childCenter.y + Math.abs(dy) / 2,
          z: childCenter.z + Math.abs(dz) / 2
        },
        center: childCenter,
        size: { x: Math.abs(dx), y: Math.abs(dy), z: Math.abs(dz) }
      }

      this.children.push(
        new OctreeNode(childBounds, [], [], this.maxPointsPerNode, this.depth + 1)
      )
    }

    // Distribute points to children
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const childIdx = this.getChildIndex(point)
      if (childIdx >= 0 && this.children[childIdx]) {
        this.children[childIdx].points.push(point)
        this.children[childIdx].indices.push(this.indices[i])
      }
    }

    // Clear parent points
    this.points = []
    this.indices = []
  }

  private getChildIndex(point: Point3D): number {
    const center = this.bounds.center
    let idx = 0

    if (point.x >= center.x) idx |= 1
    if (point.y >= center.y) idx |= 2
    if (point.z >= center.z) idx |= 4

    return idx
  }

  insert(point: Point3D, index: number): void {
    if (!this.containsPoint(point)) return

    if (this.isLeaf()) {
      this.points.push(point)
      this.indices.push(index)

      if (this.points.length > this.maxPointsPerNode && this.depth < 10) {
        this.subdivide()
      }
    } else if (this.children) {
      const childIdx = this.getChildIndex(point)
      if (childIdx >= 0 && this.children[childIdx]) {
        this.children[childIdx].insert(point, index)
      }
    }
  }

  private containsPoint(point: Point3D): boolean {
    return (
      point.x >= this.bounds.min.x && point.x <= this.bounds.max.x &&
      point.y >= this.bounds.min.y && point.y <= this.bounds.max.y &&
      point.z >= this.bounds.min.z && point.z <= this.bounds.max.z
    )
  }

  radiusSearch(center: Point3D, radius: number): number[] {
    const result: number[] = []
    this.radiusSearchRecursive(center, radius, result)
    return result
  }

  private radiusSearchRecursive(center: Point3D, radius: number, result: number[]): void {
    if (!this.intersectsSphere(center, radius)) return

    if (this.isLeaf()) {
      for (let i = 0; i < this.points.length; i++) {
        const dist = this.distance(this.points[i], center)
        if (dist <= radius) {
          result.push(this.indices[i])
        }
      }
    } else if (this.children) {
      for (const child of this.children) {
        child.radiusSearchRecursive(center, radius, result)
      }
    }
  }

  kNearestSearch(query: Point3D, k: number): number[] {
    const distances: Array<{ index: number; distance: number }> = []
    this.kNearestSearchRecursive(query, k, distances)

    distances.sort((a, b) => a.distance - b.distance)
    return distances.slice(0, k).map(d => d.index)
  }

  private kNearestSearchRecursive(
    query: Point3D,
    k: number,
    distances: Array<{ index: number; distance: number }>
  ): void {
    if (this.isLeaf()) {
      for (let i = 0; i < this.points.length; i++) {
        const dist = this.distance(this.points[i], query)
        distances.push({ index: this.indices[i], distance: dist })
      }
    } else if (this.children) {
      // Sort children by distance to query point
      const childDistances = this.children.map((child, idx) => ({
        idx,
        distance: this.distanceToBox(query, child.bounds)
      }))
      childDistances.sort((a, b) => a.distance - b.distance)

      for (const { idx } of childDistances) {
        this.children[idx].kNearestSearchRecursive(query, k, distances)
      }
    }
  }

  private intersectsSphere(center: Point3D, radius: number): boolean {
    // Check if sphere intersects with bounding box
    const closestPoint = {
      x: Math.max(this.bounds.min.x, Math.min(center.x, this.bounds.max.x)),
      y: Math.max(this.bounds.min.y, Math.min(center.y, this.bounds.max.y)),
      z: Math.max(this.bounds.min.z, Math.min(center.z, this.bounds.max.z))
    }

    return this.distance(center, closestPoint) <= radius
  }

  private distanceToBox(point: Point3D, box: BoundingBox): number {
    const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x)
    const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y)
    const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}

export class Octree {
  root: OctreeNode

  constructor(points: Point3D[], maxPointsPerNode: number = 10) {
    const bounds = this.computeBoundingBox(points)
    this.root = new OctreeNode(bounds, [], [], maxPointsPerNode, 0)

    // Insert all points
    for (let i = 0; i < points.length; i++) {
      this.root.insert(points[i], i)
    }
  }

  private computeBoundingBox(points: Point3D[]): BoundingBox {
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

  radiusSearch(center: Point3D, radius: number): number[] {
    return this.root.radiusSearch(center, radius)
  }

  kNearestSearch(query: Point3D, k: number): number[] {
    return this.root.kNearestSearch(query, k)
  }
}

// ============================================================================
// KD-TREE
// ============================================================================

export class KDTreeNode {
  point: Point3D
  index: number
  axis: number
  left: KDTreeNode | null
  right: KDTreeNode | null

  constructor(point: Point3D, index: number, axis: number) {
    this.point = point
    this.index = index
    this.axis = axis
    this.left = null
    this.right = null
  }
}

export class KDTree {
  root: KDTreeNode | null
  dimensions = 3

  constructor(points: Point3D[]) {
    const indexedPoints = points.map((p, i) => ({ point: p, index: i }))
    this.root = this.buildTree(indexedPoints, 0)
  }

  private buildTree(
    points: Array<{ point: Point3D; index: number }>,
    depth: number
  ): KDTreeNode | null {
    if (points.length === 0) return null

    const axis = depth % this.dimensions
    const axisKey: 'x' | 'y' | 'z' = axis === 0 ? 'x' : axis === 1 ? 'y' : 'z'

    // Sort points along the axis
    points.sort((a, b) => a.point[axisKey] - b.point[axisKey])

    const medianIdx = Math.floor(points.length / 2)
    const medianPoint = points[medianIdx]

    const node = new KDTreeNode(medianPoint.point, medianPoint.index, axis)
    node.left = this.buildTree(points.slice(0, medianIdx), depth + 1)
    node.right = this.buildTree(points.slice(medianIdx + 1), depth + 1)

    return node
  }

  kNearestSearch(query: Point3D, k: number): number[] {
    const nearest: Array<{ index: number; distance: number }> = []
    this.kNearestSearchRecursive(this.root, query, k, nearest)

    nearest.sort((a, b) => a.distance - b.distance)
    return nearest.slice(0, k).map(n => n.index)
  }

  private kNearestSearchRecursive(
    node: KDTreeNode | null,
    query: Point3D,
    k: number,
    nearest: Array<{ index: number; distance: number }>
  ): void {
    if (!node) return

    const distance = this.distance(node.point, query)
    const axisKey: 'x' | 'y' | 'z' = node.axis === 0 ? 'x' : node.axis === 1 ? 'y' : 'z'

    // Add current node to nearest neighbors
    if (nearest.length < k) {
      nearest.push({ index: node.index, distance })
    } else {
      nearest.sort((a, b) => b.distance - a.distance)
      if (distance < nearest[0].distance) {
        nearest[0] = { index: node.index, distance }
      }
    }

    // Determine which side to search first
    const diff = query[axisKey] - node.point[axisKey]
    const nearNode = diff < 0 ? node.left : node.right
    const farNode = diff < 0 ? node.right : node.left

    // Search near side
    this.kNearestSearchRecursive(nearNode, query, k, nearest)

    // Check if we need to search far side
    if (nearest.length < k || Math.abs(diff) < nearest[0].distance) {
      this.kNearestSearchRecursive(farNode, query, k, nearest)
    }
  }

  radiusSearch(center: Point3D, radius: number): number[] {
    const result: number[] = []
    this.radiusSearchRecursive(this.root, center, radius, result)
    return result
  }

  private radiusSearchRecursive(
    node: KDTreeNode | null,
    center: Point3D,
    radius: number,
    result: number[]
  ): void {
    if (!node) return

    const distance = this.distance(node.point, center)
    if (distance <= radius) {
      result.push(node.index)
    }

    const axisKey: 'x' | 'y' | 'z' = node.axis === 0 ? 'x' : node.axis === 1 ? 'y' : 'z'
    const diff = center[axisKey] - node.point[axisKey]

    // Search near side
    if (diff < 0) {
      this.radiusSearchRecursive(node.left, center, radius, result)
      if (Math.abs(diff) <= radius) {
        this.radiusSearchRecursive(node.right, center, radius, result)
      }
    } else {
      this.radiusSearchRecursive(node.right, center, radius, result)
      if (Math.abs(diff) <= radius) {
        this.radiusSearchRecursive(node.left, center, radius, result)
      }
    }
  }

  private distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export class SpatialIndex {
  /**
   * Build the appropriate spatial index based on point cloud size
   */
  static buildIndex(
    points: Point3D[],
    preferKDTree: boolean = false
  ): Octree | KDTree {
    // For very large point clouds, KD-tree is usually faster
    // For smaller clouds or when spatial queries are common, Octree is better
    if (preferKDTree || points.length > 100000) {
      return new KDTree(points)
    } else {
      return new Octree(points)
    }
  }

  /**
   * Perform efficient radius search using spatial index
   */
  static radiusSearch(
    index: Octree | KDTree,
    center: Point3D,
    radius: number
  ): number[] {
    return index.radiusSearch(center, radius)
  }

  /**
   * Perform efficient k-nearest neighbors search using spatial index
   */
  static kNearestSearch(
    index: Octree | KDTree,
    query: Point3D,
    k: number
  ): number[] {
    return index.kNearestSearch(query, k)
  }
}
