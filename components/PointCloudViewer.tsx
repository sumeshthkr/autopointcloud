'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Point3D, Face } from '@/lib/types'

interface PointCloudViewerProps {
  points: Point3D[]
  hasColor: boolean
  hasIntensity: boolean
  faces?: Face[]
  isMesh?: boolean
}

function PointCloud({ points, hasColor, hasIntensity, faces, isMesh }: PointCloudViewerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pointsRef = useRef<THREE.Points>(null)
  
  const { positions, colors, indices, normals } = useMemo(() => {
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
    
    // Build indices for mesh faces
    let indices: number[] | undefined
    let normals: Float32Array | undefined
    
    if (isMesh && faces && faces.length > 0) {
      indices = []
      for (const face of faces) {
        indices.push(face.vertices[0], face.vertices[1], face.vertices[2])
      }
      
      // Compute normals if not provided
      normals = new Float32Array(points.length * 3)
      const tempNormals = new Array(points.length).fill(null).map(() => new THREE.Vector3())
      
      for (const face of faces) {
        const v0 = new THREE.Vector3(
          points[face.vertices[0]].x,
          points[face.vertices[0]].y,
          points[face.vertices[0]].z
        )
        const v1 = new THREE.Vector3(
          points[face.vertices[1]].x,
          points[face.vertices[1]].y,
          points[face.vertices[1]].z
        )
        const v2 = new THREE.Vector3(
          points[face.vertices[2]].x,
          points[face.vertices[2]].y,
          points[face.vertices[2]].z
        )
        
        const edge1 = v1.clone().sub(v0)
        const edge2 = v2.clone().sub(v0)
        const normal = edge1.cross(edge2).normalize()
        
        tempNormals[face.vertices[0]].add(normal)
        tempNormals[face.vertices[1]].add(normal)
        tempNormals[face.vertices[2]].add(normal)
      }
      
      for (let i = 0; i < points.length; i++) {
        const n = tempNormals[i].normalize()
        normals[i * 3] = n.x
        normals[i * 3 + 1] = n.y
        normals[i * 3 + 2] = n.z
      }
    }
    
    return { positions, colors, indices, normals }
  }, [points, hasColor, hasIntensity, faces, isMesh])
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    if (isMesh && indices && normals) {
      geom.setIndex(indices)
      geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    }
    
    return geom
  }, [positions, colors, indices, normals, isMesh])
  
  if (isMesh && indices) {
    return (
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          flatShading={false}
        />
      </mesh>
    )
  }
  
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

export default function PointCloudViewer({ points, hasColor, hasIntensity, faces, isMesh }: PointCloudViewerProps) {
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
          <PointCloud points={points} hasColor={hasColor} hasIntensity={hasIntensity} faces={faces} isMesh={isMesh} />
          <Grid />
          <FPSCounter setFps={setFps} />
        </Canvas>
      )}
    </div>
  )
}

function FPSCounter({ setFps }: { setFps: (fps: number) => void }) {
  const frameCount = useRef(0)
  const lastTime = useRef(0)
  
  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    
    if (lastTime.current === 0) {
      lastTime.current = now
    }
    
    const delta = now - lastTime.current
    
    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta))
      frameCount.current = 0
      lastTime.current = now
    }
  })
  
  return null
}
