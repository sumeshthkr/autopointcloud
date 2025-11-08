'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Point3D } from '@/lib/types'

interface PointCloudViewerProps {
  points: Point3D[]
  hasColor: boolean
  hasIntensity: boolean
}

function PointCloud({ points, hasColor, hasIntensity }: PointCloudViewerProps) {
  const pointsRef = useRef<THREE.Points>(null)
  
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)
    
    // Calculate bounding box for height-based coloring
    let minZ = Infinity, maxZ = -Infinity
    for (const point of points) {
      minZ = Math.min(minZ, point.z)
      maxZ = Math.max(maxZ, point.z)
    }
    const zRange = maxZ - minZ || 1
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
      
      if (hasColor && point.color) {
        // Use actual RGB color
        colors[i * 3] = point.color[0] / 255
        colors[i * 3 + 1] = point.color[1] / 255
        colors[i * 3 + 2] = point.color[2] / 255
      } else if (hasIntensity && point.intensity !== undefined) {
        // Use intensity as grayscale
        const intensity = point.intensity
        colors[i * 3] = intensity
        colors[i * 3 + 1] = intensity
        colors[i * 3 + 2] = intensity
      } else {
        // Height-based gradient coloring (blue to red)
        const t = (point.z - minZ) / zRange
        const r = Math.min(1, t * 2)
        const g = Math.min(1, 2 - Math.abs(t * 2 - 1) * 2)
        const b = Math.min(1, (1 - t) * 2)
        colors[i * 3] = r
        colors[i * 3 + 1] = g
        colors[i * 3 + 2] = b
      }
    }
    
    return { positions, colors }
  }, [points, hasColor, hasIntensity])
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geom
  }, [positions, colors])
  
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.05}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  )
}

function Grid() {
  return (
    <>
      <gridHelper args={[50, 50, '#888888', '#444444']} />
      <axesHelper args={[10]} />
    </>
  )
}

export default function PointCloudViewer({ points, hasColor, hasIntensity }: PointCloudViewerProps) {
  const [fps, setFps] = useState(60)
  
  // Calculate camera position based on bounding box
  const cameraPosition = useMemo(() => {
    if (points.length === 0) return [10, 10, 10] as [number, number, number]
    
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
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2
    
    const sizeX = maxX - minX
    const sizeY = maxY - minY
    const sizeZ = maxZ - minZ
    const maxSize = Math.max(sizeX, sizeY, sizeZ)
    
    const distance = maxSize * 2
    
    return [
      centerX + distance * 0.7,
      centerY + distance * 0.7,
      centerZ + distance * 0.7
    ] as [number, number, number]
  }, [points])
  
  const target = useMemo(() => {
    if (points.length === 0) return [0, 0, 0] as [number, number, number]
    
    let sumX = 0, sumY = 0, sumZ = 0
    for (const point of points) {
      sumX += point.x
      sumY += point.y
      sumZ += point.z
    }
    
    return [
      sumX / points.length,
      sumY / points.length,
      sumZ / points.length
    ] as [number, number, number]
  }, [points])
  
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md text-white text-sm">
        {fps} FPS
      </div>
      
      {points.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="text-center">
            <p className="text-xl mb-2">No point cloud loaded</p>
            <p className="text-sm">Upload a file to visualize</p>
          </div>
        </div>
      ) : (
        <Canvas>
          <PerspectiveCamera
            makeDefault
            position={cameraPosition}
            fov={60}
          />
          <OrbitControls
            target={target}
            enableDamping
            dampingFactor={0.05}
            minDistance={0.5}
            maxDistance={500}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <PointCloud points={points} hasColor={hasColor} hasIntensity={hasIntensity} />
          <Grid />
          <FPSCounter setFps={setFps} />
        </Canvas>
      )}
    </div>
  )
}

function FPSCounter({ setFps }: { setFps: (fps: number) => void }) {
  const frameCount = useRef(0)
  const lastTime = useRef(Date.now())
  
  useFrame(() => {
    frameCount.current++
    const now = Date.now()
    const delta = now - lastTime.current
    
    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta))
      frameCount.current = 0
      lastTime.current = now
    }
  })
  
  return null
}
