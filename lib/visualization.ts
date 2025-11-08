import { Point3D } from './types'

/**
 * Visualization utilities and color mapping
 * Implements PCL and Open3D visualization features
 */

export type ColorMap = 'jet' | 'viridis' | 'rainbow' | 'hot' | 'cool' | 'gray' | 'turbo' | 'plasma'
export type ColorMode = 'height' | 'intensity' | 'normal' | 'curvature' | 'uniform'

export class VisualizationUtils {
  /**
   * Apply color map to points based on a scalar value
   */
  static applyColorMap(
    points: Point3D[],
    colorMap: ColorMap = 'jet',
    mode: ColorMode = 'height'
  ): Point3D[] {
    const values = this.extractScalarValues(points, mode)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    
    return points.map((point, i) => {
      const normalized = (values[i] - minValue) / (maxValue - minValue || 1)
      const color = this.getColorFromMap(normalized, colorMap)
      
      return {
        ...point,
        color
      }
    })
  }

  /**
   * Extract scalar values from points based on mode
   */
  private static extractScalarValues(points: Point3D[], mode: ColorMode): number[] {
    switch (mode) {
      case 'height':
        return points.map(p => p.z)
      
      case 'intensity':
        return points.map(p => p.intensity ?? 0)
      
      case 'normal':
        return points.map(p => {
          if (!p.normal) return 0
          // Use Z component of normal
          return p.normal[2]
        })
      
      case 'curvature':
        // Approximate curvature - would need neighbor analysis for accuracy
        return points.map(() => 0)
      
      case 'uniform':
      default:
        return points.map(() => 0.5)
    }
  }

  /**
   * Get RGB color from a normalized value (0-1) using specified color map
   */
  private static getColorFromMap(
    value: number,
    colorMap: ColorMap
  ): [number, number, number] {
    value = Math.max(0, Math.min(1, value)) // Clamp to [0, 1]
    
    switch (colorMap) {
      case 'jet':
        return this.jetColorMap(value)
      
      case 'viridis':
        return this.viridisColorMap(value)
      
      case 'rainbow':
        return this.rainbowColorMap(value)
      
      case 'hot':
        return this.hotColorMap(value)
      
      case 'cool':
        return this.coolColorMap(value)
      
      case 'gray':
        return this.grayColorMap(value)
      
      case 'turbo':
        return this.turboColorMap(value)
      
      case 'plasma':
        return this.plasmaColorMap(value)
      
      default:
        return this.jetColorMap(value)
    }
  }

  // ============================================================================
  // COLOR MAP IMPLEMENTATIONS
  // ============================================================================
  
  private static jetColorMap(value: number): [number, number, number] {
    // Classic jet color map: blue -> cyan -> green -> yellow -> red
    let r = 0, g = 0, b = 0
    
    if (value < 0.125) {
      b = 0.5 + 0.5 * (value / 0.125)
    } else if (value < 0.375) {
      b = 1
      g = (value - 0.125) / 0.25
    } else if (value < 0.625) {
      g = 1
      b = 1 - (value - 0.375) / 0.25
    } else if (value < 0.875) {
      g = 1
      r = (value - 0.625) / 0.25
    } else {
      r = 1
      g = 1 - (value - 0.875) / 0.125
    }
    
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]
  }

  private static viridisColorMap(value: number): [number, number, number] {
    // Perceptually uniform color map
    const colors = [
      [68, 1, 84],
      [72, 40, 120],
      [62, 74, 137],
      [49, 104, 142],
      [38, 130, 142],
      [31, 158, 137],
      [53, 183, 121],
      [109, 205, 89],
      [180, 222, 44],
      [253, 231, 37]
    ]
    
    return this.interpolateColors(value, colors)
  }

  private static rainbowColorMap(value: number): [number, number, number] {
    // Rainbow: violet -> blue -> cyan -> green -> yellow -> orange -> red
    const hue = (1 - value) * 270 // 270 degrees for violet to red
    return this.hslToRgb(hue / 360, 1, 0.5)
  }

  private static hotColorMap(value: number): [number, number, number] {
    // Black -> red -> yellow -> white
    let r = 0, g = 0, b = 0
    
    if (value < 0.33) {
      r = value / 0.33
    } else if (value < 0.67) {
      r = 1
      g = (value - 0.33) / 0.34
    } else {
      r = 1
      g = 1
      b = (value - 0.67) / 0.33
    }
    
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]
  }

  private static coolColorMap(value: number): [number, number, number] {
    // Cyan to magenta
    const r = value
    const g = 1 - value
    const b = 1
    
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]
  }

  private static grayColorMap(value: number): [number, number, number] {
    const gray = Math.floor(value * 255)
    return [gray, gray, gray]
  }

  private static turboColorMap(value: number): [number, number, number] {
    // Google's Turbo color map - improved version of jet
    const colors = [
      [48, 18, 59],
      [62, 73, 137],
      [72, 126, 186],
      [87, 171, 191],
      [136, 206, 166],
      [189, 229, 122],
      [238, 241, 88],
      [252, 213, 49],
      [245, 152, 33],
      [220, 80, 27],
      [175, 23, 12],
      [122, 4, 2]
    ]
    
    return this.interpolateColors(value, colors)
  }

  private static plasmaColorMap(value: number): [number, number, number] {
    // Plasma color map from matplotlib
    const colors = [
      [13, 8, 135],
      [75, 3, 161],
      [125, 3, 168],
      [168, 34, 150],
      [203, 70, 121],
      [229, 107, 93],
      [248, 148, 65],
      [253, 195, 40],
      [240, 249, 33]
    ]
    
    return this.interpolateColors(value, colors)
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  private static interpolateColors(
    value: number,
    colors: number[][]
  ): [number, number, number] {
    const index = value * (colors.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const fraction = index - lower
    
    if (lower === upper) {
      return [colors[lower][0], colors[lower][1], colors[lower][2]]
    }
    
    const r = colors[lower][0] + fraction * (colors[upper][0] - colors[lower][0])
    const g = colors[lower][1] + fraction * (colors[upper][1] - colors[lower][1])
    const b = colors[lower][2] + fraction * (colors[upper][2] - colors[lower][2])
    
    return [Math.floor(r), Math.floor(g), Math.floor(b)]
  }

  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b
    
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]
  }

  // ============================================================================
  // POINT SIZE AND RENDERING OPTIONS
  // ============================================================================
  
  /**
   * Adjust point sizes based on distance or other criteria
   */
  static adjustPointSizes(
    points: Point3D[],
    baseSize: number = 1,
    distanceScaling: boolean = false,
    cameraPosition?: Point3D
  ): Array<{ point: Point3D; size: number }> {
    return points.map(point => {
      let size = baseSize
      
      if (distanceScaling && cameraPosition) {
        const distance = this.distance(point, cameraPosition)
        // Size decreases with distance
        size = baseSize * (1 / (1 + distance * 0.1))
      }
      
      return { point, size }
    })
  }

  /**
   * Color points by cluster ID
   */
  static colorByClusters(
    points: Point3D[],
    clusterIds: number[]
  ): Point3D[] {
    const colors = this.generateDistinctColors(Math.max(...clusterIds) + 1)
    
    return points.map((point, i) => ({
      ...point,
      color: colors[clusterIds[i]]
    }))
  }

  /**
   * Generate visually distinct colors
   */
  private static generateDistinctColors(count: number): Array<[number, number, number]> {
    const colors: Array<[number, number, number]> = []
    
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360 // Golden angle
      const rgb = this.hslToRgb(hue / 360, 0.8, 0.6)
      colors.push(rgb)
    }
    
    return colors
  }

  private static distance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  // ============================================================================
  // SCREENSHOT AND EXPORT
  // ============================================================================
  
  /**
   * Generate point cloud statistics for display
   */
  static generateStatistics(points: Point3D[]): {
    numPoints: number
    hasColor: boolean
    hasIntensity: boolean
    hasNormals: boolean
    boundingBox: {
      min: Point3D
      max: Point3D
      size: Point3D
    }
  } {
    if (points.length === 0) {
      return {
        numPoints: 0,
        hasColor: false,
        hasIntensity: false,
        hasNormals: false,
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
          size: { x: 0, y: 0, z: 0 }
        }
      }
    }
    
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
    let hasColor = false
    let hasIntensity = false
    let hasNormals = false
    
    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      minZ = Math.min(minZ, point.z)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
      maxZ = Math.max(maxZ, point.z)
      
      if (point.color) hasColor = true
      if (point.intensity !== undefined) hasIntensity = true
      if (point.normal) hasNormals = true
    }
    
    return {
      numPoints: points.length,
      hasColor,
      hasIntensity,
      hasNormals,
      boundingBox: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
      }
    }
  }
}
