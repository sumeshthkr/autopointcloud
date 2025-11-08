import { Point3D, BoundingBox, PointCloud } from './types'
import { generateId } from './utils'

export class PointCloudParser {
  static async parseFile(file: File): Promise<PointCloud> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'pcd':
        return this.parsePCD(file)
      case 'ply':
        return this.parsePLY(file)
      case 'xyz':
      case 'txt':
        return this.parseXYZ(file)
      case 'las':
      case 'laz':
        throw new Error('LAS/LAZ format support coming soon. Please use PCD, PLY, or XYZ format.')
      default:
        throw new Error(`Unsupported file format: ${extension}`)
    }
  }

  private static async parsePCD(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    let dataStart = 0
    let numPoints = 0
    let hasColor = false
    let hasIntensity = false
    let fields: string[] = []
    let isBinary = false
    
    // Parse header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('FIELDS')) {
        fields = line.split(' ').slice(1)
        hasColor = fields.includes('rgb') || (fields.includes('r') && fields.includes('g') && fields.includes('b'))
        hasIntensity = fields.includes('intensity')
      } else if (line.startsWith('POINTS')) {
        numPoints = parseInt(line.split(' ')[1])
      } else if (line.startsWith('DATA')) {
        isBinary = line.split(' ')[1] === 'binary'
        dataStart = i + 1
        break
      }
    }
    
    if (isBinary) {
      throw new Error('Binary PCD format is not yet supported. Please use ASCII PCD format.')
    }
    
    // Parse points
    const points: Point3D[] = []
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(/\s+/).map(parseFloat)
      if (values.length < 3) continue
      
      const point: Point3D = {
        x: values[0],
        y: values[1],
        z: values[2],
      }
      
      // Handle intensity
      if (hasIntensity) {
        const intensityIdx = fields.indexOf('intensity')
        if (intensityIdx >= 0 && values[intensityIdx] !== undefined) {
          point.intensity = values[intensityIdx]
        }
      }
      
      // Handle RGB color
      if (hasColor) {
        if (fields.includes('rgb')) {
          const rgbIdx = fields.indexOf('rgb')
          const rgb = values[rgbIdx]
          point.color = this.unpackRGB(rgb)
        } else if (fields.includes('r') && fields.includes('g') && fields.includes('b')) {
          const rIdx = fields.indexOf('r')
          const gIdx = fields.indexOf('g')
          const bIdx = fields.indexOf('b')
          point.color = [
            Math.floor(values[rIdx]),
            Math.floor(values[gIdx]),
            Math.floor(values[bIdx])
          ]
        }
      }
      
      points.push(point)
    }
    
    return this.createPointCloud(file, points, 'PCD', hasColor, hasIntensity)
  }

  private static async parsePLY(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    let dataStart = 0
    let numPoints = 0
    let hasColor = false
    let hasIntensity = false
    let format = 'ascii'
    const properties: string[] = []
    
    // Parse header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('format')) {
        format = line.split(' ')[1]
      } else if (line.startsWith('element vertex')) {
        numPoints = parseInt(line.split(' ')[2])
      } else if (line.startsWith('property')) {
        const parts = line.split(' ')
        const propName = parts[parts.length - 1]
        properties.push(propName)
        
        if (propName === 'red' || propName === 'r') hasColor = true
        if (propName === 'intensity') hasIntensity = true
      } else if (line === 'end_header') {
        dataStart = i + 1
        break
      }
    }
    
    if (format !== 'ascii') {
      throw new Error('Binary PLY format is not yet supported. Please use ASCII PLY format.')
    }
    
    // Parse points
    const points: Point3D[] = []
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(/\s+/).map(parseFloat)
      if (values.length < 3) continue
      
      const point: Point3D = {
        x: values[0],
        y: values[1],
        z: values[2],
      }
      
      // Handle color
      if (hasColor && values.length >= 6) {
        point.color = [
          Math.floor(values[3]),
          Math.floor(values[4]),
          Math.floor(values[5])
        ]
      }
      
      // Handle intensity
      if (hasIntensity) {
        const intensityIdx = properties.indexOf('intensity')
        if (intensityIdx >= 0 && values[intensityIdx] !== undefined) {
          point.intensity = values[intensityIdx]
        }
      }
      
      points.push(point)
    }
    
    return this.createPointCloud(file, points, 'PLY', hasColor, hasIntensity)
  }

  private static async parseXYZ(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    const points: Point3D[] = []
    let hasColor = false
    let hasIntensity = false
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
      
      const values = trimmed.split(/\s+/).map(parseFloat)
      if (values.length < 3) continue
      
      const point: Point3D = {
        x: values[0],
        y: values[1],
        z: values[2],
      }
      
      // Check for intensity or color
      if (values.length === 4) {
        point.intensity = values[3]
        hasIntensity = true
      } else if (values.length >= 6) {
        point.color = [
          Math.floor(values[3]),
          Math.floor(values[4]),
          Math.floor(values[5])
        ]
        hasColor = true
      }
      
      points.push(point)
    }
    
    return this.createPointCloud(file, points, 'XYZ', hasColor, hasIntensity)
  }

  private static createPointCloud(
    file: File,
    points: Point3D[],
    format: 'PCD' | 'PLY' | 'XYZ',
    hasColor: boolean,
    hasIntensity: boolean
  ): PointCloud {
    const boundingBox = this.calculateBoundingBox(points)
    
    return {
      id: generateId(),
      name: file.name,
      points,
      numPoints: points.length,
      boundingBox,
      fileSize: file.size,
      format,
      createdAt: new Date(),
      hasColor,
      hasIntensity,
    }
  }

  private static calculateBoundingBox(points: Point3D[]): BoundingBox {
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

  private static unpackRGB(rgb: number): [number, number, number] {
    const r = (rgb >> 16) & 0xFF
    const g = (rgb >> 8) & 0xFF
    const b = rgb & 0xFF
    return [r, g, b]
  }
}
