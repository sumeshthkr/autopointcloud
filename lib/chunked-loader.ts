import { Point3D, PointCloud } from './types'
import { generateId } from './utils'

/**
 * Chunked File Loader
 * Handles large point cloud files by loading and processing them in chunks
 * Provides progress feedback and allows parallel processing
 */

export interface ChunkLoadOptions {
  chunkSize?: number // Number of points per chunk (default: 100000)
  onProgress?: (progress: number, message: string) => void
  maxPoints?: number // Maximum number of points to load (optional limit)
}

export interface ChunkProcessingResult {
  points: Point3D[]
  totalProcessed: number
  totalSkipped: number
  hasMore: boolean
}

export class ChunkedFileLoader {
  /**
   * Load a large file in chunks with progress reporting
   */
  static async loadFileInChunks(
    file: File,
    options: ChunkLoadOptions = {}
  ): Promise<PointCloud> {
    const {
      chunkSize = 100000,
      onProgress = () => {},
      maxPoints = Infinity
    } = options

    const extension = file.name.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'pcd':
        return this.loadPCDInChunks(file, chunkSize, onProgress, maxPoints)
      case 'ply':
        return this.loadPLYInChunks(file, chunkSize, onProgress, maxPoints)
      case 'xyz':
      case 'txt':
        return this.loadXYZInChunks(file, chunkSize, onProgress, maxPoints)
      default:
        throw new Error(`Chunked loading not supported for ${extension} format`)
    }
  }

  /**
   * Load PCD file in chunks
   */
  private static async loadPCDInChunks(
    file: File,
    chunkSize: number,
    onProgress: (progress: number, message: string) => void,
    maxPoints: number
  ): Promise<PointCloud> {
    onProgress(0, 'Starting to load PCD file...')
    
    const text = await file.text()
    const lines = text.split('\n')
    
    // Parse header first
    let dataStart = 0
    let hasColor = false
    let hasIntensity = false
    let fields: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('FIELDS')) {
        fields = line.split(' ').slice(1).filter(f => f.length > 0)
        hasColor = fields.includes('rgb') || (fields.includes('r') && fields.includes('g') && fields.includes('b'))
        hasIntensity = fields.includes('intensity')
      } else if (line.startsWith('DATA')) {
        dataStart = i + 1
        break
      }
    }
    
    onProgress(10, 'Header parsed, loading points...')
    
    // Load points in chunks
    const points: Point3D[] = []
    let skippedLines = 0
    const totalLines = lines.length - dataStart
    
    for (let i = dataStart; i < lines.length && points.length < maxPoints; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#')) continue
      
      try {
        const values = line.split(/\s+/).map(v => {
          const num = parseFloat(v)
          return isNaN(num) ? 0 : num
        })
        
        if (values.length < 3 || !isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
          skippedLines++
          continue
        }
        
        const point: Point3D = {
          x: values[0],
          y: values[1],
          z: values[2],
        }
        
        if (hasIntensity && fields.length > 0) {
          const intensityIdx = fields.indexOf('intensity')
          if (intensityIdx >= 0 && intensityIdx < values.length && isFinite(values[intensityIdx])) {
            point.intensity = values[intensityIdx]
          }
        }
        
        if (hasColor && fields.length > 0) {
          try {
            if (fields.includes('rgb')) {
              const rgbIdx = fields.indexOf('rgb')
              if (rgbIdx >= 0 && rgbIdx < values.length) {
                const rgb = values[rgbIdx]
                const r = Math.floor((rgb >> 16) & 0xff)
                const g = Math.floor((rgb >> 8) & 0xff)
                const b = Math.floor(rgb & 0xff)
                point.color = [r, g, b]
              }
            } else if (fields.includes('r') && fields.includes('g') && fields.includes('b')) {
              const rIdx = fields.indexOf('r')
              const gIdx = fields.indexOf('g')
              const bIdx = fields.indexOf('b')
              if (rIdx < values.length && gIdx < values.length && bIdx < values.length) {
                point.color = [
                  Math.min(255, Math.max(0, Math.floor(values[rIdx]))),
                  Math.min(255, Math.max(0, Math.floor(values[gIdx]))),
                  Math.min(255, Math.max(0, Math.floor(values[bIdx])))
                ]
              }
            }
          } catch (e) {
            // Skip color if parsing fails
          }
        }
        
        points.push(point)
        
        // Report progress periodically
        if (points.length % chunkSize === 0) {
          const progress = 10 + ((i - dataStart) / totalLines) * 80
          onProgress(progress, `Loaded ${points.length} points...`)
        }
      } catch (e) {
        skippedLines++
        continue
      }
    }
    
    if (points.length === 0) {
      throw new Error('No valid points found in PCD file')
    }
    
    onProgress(90, 'Computing bounding box...')
    
    const boundingBox = this.calculateBoundingBox(points)
    
    onProgress(100, `Loaded ${points.length} points successfully`)
    
    if (skippedLines > 0) {
      console.warn(`Skipped ${skippedLines} corrupted lines during PCD loading`)
    }
    
    return {
      id: generateId(),
      name: file.name,
      points,
      numPoints: points.length,
      boundingBox,
      fileSize: file.size,
      format: 'PCD',
      createdAt: new Date(),
      hasColor,
      hasIntensity,
      isMesh: false,
      metadata: {
        originalFormat: 'PCD',
        compressionRatio: 1,
        processingTime: 0
      }
    }
  }

  /**
   * Load PLY file in chunks
   */
  private static async loadPLYInChunks(
    file: File,
    chunkSize: number,
    onProgress: (progress: number, message: string) => void,
    maxPoints: number
  ): Promise<PointCloud> {
    onProgress(0, 'Starting to load PLY file...')
    
    const text = await file.text()
    const lines = text.split('\n')
    
    // Parse header
    let dataStart = 0
    let numVertices = 0
    let hasColor = false
    let hasIntensity = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('element vertex')) {
        numVertices = parseInt(line.split(' ')[2])
      } else if (line.startsWith('property')) {
        const propName = line.split(' ').pop()
        if (propName === 'red' || propName === 'r') hasColor = true
        if (propName === 'intensity') hasIntensity = true
      } else if (line === 'end_header') {
        dataStart = i + 1
        break
      }
    }
    
    onProgress(10, 'Header parsed, loading points...')
    
    // Load points in chunks
    const points: Point3D[] = []
    let skippedLines = 0
    const maxToLoad = Math.min(numVertices, maxPoints)
    
    for (let i = 0; i < maxToLoad && dataStart + i < lines.length; i++) {
      const line = lines[dataStart + i].trim()
      if (!line || line.startsWith('#')) {
        continue
      }
      
      try {
        const values = line.split(/\s+/).map(v => {
          const num = parseFloat(v)
          return isNaN(num) ? 0 : num
        })
        
        if (values.length < 3 || !isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
          skippedLines++
          continue
        }
        
        const point: Point3D = {
          x: values[0],
          y: values[1],
          z: values[2],
        }
        
        if (hasColor && values.length >= 6) {
          point.color = [
            Math.min(255, Math.max(0, Math.floor(values[3]))),
            Math.min(255, Math.max(0, Math.floor(values[4]))),
            Math.min(255, Math.max(0, Math.floor(values[5])))
          ]
        }
        
        points.push(point)
        
        if (points.length % chunkSize === 0) {
          const progress = 10 + (i / maxToLoad) * 80
          onProgress(progress, `Loaded ${points.length} points...`)
        }
      } catch (e) {
        skippedLines++
        continue
      }
    }
    
    if (points.length === 0) {
      throw new Error('No valid points found in PLY file')
    }
    
    onProgress(90, 'Computing bounding box...')
    
    const boundingBox = this.calculateBoundingBox(points)
    
    onProgress(100, `Loaded ${points.length} points successfully`)
    
    if (skippedLines > 0) {
      console.warn(`Skipped ${skippedLines} corrupted lines during PLY loading`)
    }
    
    return {
      id: generateId(),
      name: file.name,
      points,
      numPoints: points.length,
      boundingBox,
      fileSize: file.size,
      format: 'PLY',
      createdAt: new Date(),
      hasColor,
      hasIntensity,
      isMesh: false,
      metadata: {
        originalFormat: 'PLY',
        compressionRatio: 1,
        processingTime: 0
      }
    }
  }

  /**
   * Load XYZ file in chunks
   */
  private static async loadXYZInChunks(
    file: File,
    chunkSize: number,
    onProgress: (progress: number, message: string) => void,
    maxPoints: number
  ): Promise<PointCloud> {
    onProgress(0, 'Starting to load XYZ file...')
    
    const text = await file.text()
    const lines = text.split('\n')
    
    const points: Point3D[] = []
    let hasColor = false
    let hasIntensity = false
    let skippedLines = 0
    
    for (let i = 0; i < lines.length && points.length < maxPoints; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#') || line.startsWith('//')) continue
      
      try {
        const values = line.split(/\s+/).map(v => {
          const num = parseFloat(v)
          return isNaN(num) ? 0 : num
        })
        
        if (values.length < 3 || !isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
          skippedLines++
          continue
        }
        
        const point: Point3D = {
          x: values[0],
          y: values[1],
          z: values[2],
        }
        
        if (values.length === 4 && isFinite(values[3])) {
          point.intensity = values[3]
          hasIntensity = true
        } else if (values.length >= 6) {
          if (isFinite(values[3]) && isFinite(values[4]) && isFinite(values[5])) {
            point.color = [
              Math.min(255, Math.max(0, Math.floor(values[3]))),
              Math.min(255, Math.max(0, Math.floor(values[4]))),
              Math.min(255, Math.max(0, Math.floor(values[5])))
            ]
            hasColor = true
          }
        }
        
        points.push(point)
        
        if (points.length % chunkSize === 0) {
          const progress = (i / lines.length) * 90
          onProgress(progress, `Loaded ${points.length} points...`)
        }
      } catch (e) {
        skippedLines++
        continue
      }
    }
    
    if (points.length === 0) {
      throw new Error('No valid points found in XYZ file')
    }
    
    onProgress(90, 'Computing bounding box...')
    
    const boundingBox = this.calculateBoundingBox(points)
    
    onProgress(100, `Loaded ${points.length} points successfully`)
    
    if (skippedLines > 0) {
      console.warn(`Skipped ${skippedLines} corrupted lines during XYZ loading`)
    }
    
    return {
      id: generateId(),
      name: file.name,
      points,
      numPoints: points.length,
      boundingBox,
      fileSize: file.size,
      format: 'XYZ',
      createdAt: new Date(),
      hasColor,
      hasIntensity,
      isMesh: false,
      metadata: {
        originalFormat: 'XYZ',
        compressionRatio: 1,
        processingTime: 0
      }
    }
  }

  /**
   * Calculate bounding box for points
   */
  private static calculateBoundingBox(points: Point3D[]) {
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
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2
      },
      size: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ
      }
    }
  }
}
