import { Point3D, Face, BoundingBox, PointCloud } from './types'
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
      case 'obj':
        return this.parseOBJ(file)
      case 'stl':
        return this.parseSTL(file)
      case 'las':
      case 'laz':
        throw new Error('LAS/LAZ format support coming soon. Please use PCD, PLY, XYZ, OBJ, or STL format.')
      default:
        throw new Error(`Unsupported file format: ${extension}`)
    }
  }

  private static async parsePCD(file: File): Promise<PointCloud> {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      let dataStart = 0
      let hasColor = false
      let hasIntensity = false
      let fields: string[] = []
      let isBinary = false
      let skippedLines = 0
      
      // Parse header with error recovery
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        if (line.startsWith('FIELDS')) {
          fields = line.split(' ').slice(1).filter(f => f.length > 0)
          hasColor = fields.includes('rgb') || (fields.includes('r') && fields.includes('g') && fields.includes('b'))
          hasIntensity = fields.includes('intensity')
        } else if (line.startsWith('DATA')) {
          const dataParts = line.split(' ')
          isBinary = dataParts.length > 1 && dataParts[1] === 'binary'
          dataStart = i + 1
          break
        }
      }
      
      if (isBinary) {
        throw new Error('Binary PCD format is not yet supported. Please use ASCII PCD format.')
      }
      
      // Parse points with error handling for corrupted data
      const points: Point3D[] = []
      for (let i = dataStart; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line || line.startsWith('#')) continue // Skip empty and comment lines
        
        try {
          const values = line.split(/\s+/).map(v => {
            const num = parseFloat(v)
            return isNaN(num) ? 0 : num // Replace NaN with 0
          })
          
          // Skip lines with insufficient data
          if (values.length < 3) {
            skippedLines++
            continue
          }
          
          // Validate coordinates (skip if invalid)
          if (!isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
            skippedLines++
            continue
          }
          
          const point: Point3D = {
            x: values[0],
            y: values[1],
            z: values[2],
          }
          
          // Handle intensity with validation
          if (hasIntensity && fields.length > 0) {
            const intensityIdx = fields.indexOf('intensity')
            if (intensityIdx >= 0 && intensityIdx < values.length && isFinite(values[intensityIdx])) {
              point.intensity = values[intensityIdx]
            }
          }
          
          // Handle RGB color with validation
          if (hasColor && fields.length > 0) {
            try {
              if (fields.includes('rgb')) {
                const rgbIdx = fields.indexOf('rgb')
                if (rgbIdx >= 0 && rgbIdx < values.length) {
                  const rgb = values[rgbIdx]
                  point.color = this.unpackRGB(rgb)
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
        } catch (e) {
          // Skip corrupted lines
          skippedLines++
          continue
        }
      }
      
      if (points.length === 0) {
        throw new Error('No valid points found in PCD file. File may be corrupted.')
      }
      
      if (skippedLines > 0) {
        console.warn(`Skipped ${skippedLines} corrupted or invalid lines during PCD parsing`)
      }
      
      return this.createPointCloud(file, points, 'PCD', hasColor, hasIntensity)
    } catch (error) {
      if (error instanceof Error && error.message.includes('No valid points')) {
        throw error
      }
      throw new Error(`Failed to parse PCD file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async parsePLY(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    let dataStart = 0
    let numVertices = 0
    let numFaces = 0
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
        numVertices = parseInt(line.split(' ')[2])
      } else if (line.startsWith('element face')) {
        numFaces = parseInt(line.split(' ')[2])
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
    
    // Parse vertices with error handling
    const points: Point3D[] = []
    let currentLine = dataStart
    let skippedVertices = 0
    
    for (let i = 0; i < numVertices && currentLine < lines.length; i++, currentLine++) {
      const line = lines[currentLine].trim()
      if (!line || line.startsWith('#')) {
        i--
        continue
      }
      
      try {
        const values = line.split(/\s+/).map(v => {
          const num = parseFloat(v)
          return isNaN(num) ? 0 : num
        })
        
        if (values.length < 3) {
          skippedVertices++
          continue
        }
        
        // Validate coordinates
        if (!isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
          skippedVertices++
          continue
        }
        
        const point: Point3D = {
          x: values[0],
          y: values[1],
          z: values[2],
        }
        
        // Handle color with validation
        if (hasColor && values.length >= 6) {
          point.color = [
            Math.min(255, Math.max(0, Math.floor(values[3]))),
            Math.min(255, Math.max(0, Math.floor(values[4]))),
            Math.min(255, Math.max(0, Math.floor(values[5])))
          ]
        }
        
        // Handle intensity with validation
        if (hasIntensity) {
          const intensityIdx = properties.indexOf('intensity')
          if (intensityIdx >= 0 && intensityIdx < values.length && isFinite(values[intensityIdx])) {
            point.intensity = values[intensityIdx]
          }
        }
        
        points.push(point)
      } catch (e) {
        skippedVertices++
        continue
      }
    }
    
    if (points.length === 0) {
      throw new Error('No valid vertices found in PLY file. File may be corrupted.')
    }
    
    if (skippedVertices > 0) {
      console.warn(`Skipped ${skippedVertices} corrupted vertices during PLY parsing`)
    }
    
    // Parse faces with error handling
    const faces: Face[] = []
    let skippedFaces = 0
    
    for (let i = 0; i < numFaces && currentLine < lines.length; i++, currentLine++) {
      const line = lines[currentLine].trim()
      if (!line || line.startsWith('#')) {
        i--
        continue
      }
      
      try {
        const values = line.split(/\s+/).map(v => {
          const num = parseInt(v)
          return isNaN(num) ? 0 : num
        })
        
        if (values.length < 4) {
          skippedFaces++
          continue
        }
        
        const numVerticesInFace = values[0]
        
        // Validate face indices
        const validateIndex = (idx: number) => idx >= 0 && idx < points.length
        
        if (numVerticesInFace === 3 && values.length >= 4) {
          if (validateIndex(values[1]) && validateIndex(values[2]) && validateIndex(values[3])) {
            faces.push({
              vertices: [values[1], values[2], values[3]]
            })
          } else {
            skippedFaces++
          }
        } else if (numVerticesInFace === 4 && values.length >= 5) {
          if (validateIndex(values[1]) && validateIndex(values[2]) && 
              validateIndex(values[3]) && validateIndex(values[4])) {
            // Quad face - split into two triangles
            faces.push({
              vertices: [values[1], values[2], values[3]]
            })
            faces.push({
              vertices: [values[1], values[3], values[4]]
            })
          } else {
            skippedFaces++
          }
        } else {
          skippedFaces++
        }
      } catch (e) {
        skippedFaces++
        continue
      }
    }
    
    if (skippedFaces > 0) {
      console.warn(`Skipped ${skippedFaces} corrupted faces during PLY parsing`)
    }
    
    return this.createPointCloud(file, points, 'PLY', hasColor, hasIntensity, faces.length > 0 ? faces : undefined)
  }

  private static async parseXYZ(file: File): Promise<PointCloud> {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      const points: Point3D[] = []
      let hasColor = false
      let hasIntensity = false
      let skippedLines = 0
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
        
        try {
          const values = trimmed.split(/\s+/).map(v => {
            const num = parseFloat(v)
            return isNaN(num) ? 0 : num
          })
          
          if (values.length < 3) {
            skippedLines++
            continue
          }
          
          // Validate coordinates
          if (!isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) {
            skippedLines++
            continue
          }
          
          const point: Point3D = {
            x: values[0],
            y: values[1],
            z: values[2],
          }
          
          // Check for intensity or color with validation
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
        } catch (e) {
          skippedLines++
          continue
        }
      }
      
      if (points.length === 0) {
        throw new Error('No valid points found in XYZ file. File may be corrupted.')
      }
      
      if (skippedLines > 0) {
        console.warn(`Skipped ${skippedLines} corrupted or invalid lines during XYZ parsing`)
      }
      
      return this.createPointCloud(file, points, 'XYZ', hasColor, hasIntensity)
    } catch (error) {
      if (error instanceof Error && error.message.includes('No valid points')) {
        throw error
      }
      throw new Error(`Failed to parse XYZ file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static createPointCloud(
    file: File,
    points: Point3D[],
    format: 'PCD' | 'PLY' | 'XYZ' | 'OBJ' | 'STL',
    hasColor: boolean,
    hasIntensity: boolean,
    faces?: Face[]
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
      faces,
      numFaces: faces?.length,
      isMesh: !!faces && faces.length > 0,
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

  private static async parseOBJ(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    const vertices: Point3D[] = []
    const normals: [number, number, number][] = []
    const faces: Face[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const parts = trimmed.split(/\s+/)
      const type = parts[0]
      
      if (type === 'v') {
        // Vertex position
        if (parts.length >= 4) {
          vertices.push({
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3]),
          })
        }
      } else if (type === 'vn') {
        // Vertex normal
        if (parts.length >= 4) {
          normals.push([
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
          ])
        }
      } else if (type === 'f') {
        // Face - can be f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
        if (parts.length >= 4) {
          const indices = parts.slice(1, 4).map(p => {
            const idx = parseInt(p.split('/')[0])
            // OBJ indices are 1-based, convert to 0-based
            return idx > 0 ? idx - 1 : vertices.length + idx
          })
          
          if (indices.length === 3) {
            faces.push({
              vertices: [indices[0], indices[1], indices[2]]
            })
          }
        }
      }
    }
    
    // Assign normals to vertices if available
    if (normals.length > 0) {
      vertices.forEach((v, i) => {
        if (i < normals.length) {
          v.normal = normals[i]
        }
      })
    }
    
    return this.createPointCloud(file, vertices, 'OBJ', false, false, faces)
  }

  private static async parseSTL(file: File): Promise<PointCloud> {
    const text = await file.text()
    const lines = text.split('\n')
    
    const vertices: Point3D[] = []
    const faces: Face[] = []
    const vertexMap = new Map<string, number>()
    
    let currentNormal: [number, number, number] | null = null
    const tempVertices: Point3D[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('facet normal')) {
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 4) {
          currentNormal = [
            parseFloat(parts[2]),
            parseFloat(parts[3]),
            parseFloat(parts[4])
          ]
        }
        tempVertices.length = 0
      } else if (trimmed.startsWith('vertex')) {
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 4) {
          const vertex: Point3D = {
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            z: parseFloat(parts[3]),
            normal: currentNormal || undefined
          }
          tempVertices.push(vertex)
        }
      } else if (trimmed === 'endfacet') {
        // Add vertices and create face
        if (tempVertices.length === 3) {
          const indices: [number, number, number] = [0, 0, 0]
          
          for (let i = 0; i < 3; i++) {
            const v = tempVertices[i]
            const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`
            
            let idx = vertexMap.get(key)
            if (idx === undefined) {
              idx = vertices.length
              vertices.push(v)
              vertexMap.set(key, idx)
            }
            indices[i] = idx
          }
          
          faces.push({
            vertices: indices,
            normal: currentNormal || undefined
          })
        }
        currentNormal = null
      }
    }
    
    return this.createPointCloud(file, vertices, 'STL', false, false, faces)
  }
}
