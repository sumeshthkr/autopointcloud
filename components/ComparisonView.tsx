'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { SplitSquareVertical, Maximize2, X } from 'lucide-react'
import { PointCloud } from '@/lib/types'

const PointCloudViewer = dynamic(() => import('@/components/PointCloudViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
      <div className="text-white">Loading viewer...</div>
    </div>
  )
})

interface ComparisonViewProps {
  leftCloud: PointCloud | null
  rightCloud: PointCloud | null
  onClose: () => void
}

export default function ComparisonView({ leftCloud, rightCloud, onClose }: ComparisonViewProps) {
  const [splitRatio, setSplitRatio] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const container = e.currentTarget
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      setSplitRatio(Math.max(20, Math.min(80, percentage)))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-950 z-50 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <SplitSquareVertical className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-200">Side-by-Side Comparison</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Split View Container */}
      <div className="flex-1 flex relative">
        {/* Left Panel */}
        <div 
          className="relative border-r-2 border-blue-500"
          style={{ width: `${splitRatio}%` }}
        >
          <div className="absolute top-2 left-2 z-10 bg-slate-900/80 px-3 py-1 rounded text-sm font-medium text-slate-200">
            {leftCloud?.name || 'Empty'}
          </div>
          {leftCloud ? (
            <PointCloudViewer
              points={leftCloud.points}
              hasColor={leftCloud.hasColor}
              hasIntensity={leftCloud.hasIntensity}
              faces={leftCloud.faces}
              isMesh={leftCloud.isMesh}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
              No point cloud selected
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-col-resize z-20 hover:w-2 transition-all"
          style={{ left: `${splitRatio}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <SplitSquareVertical className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Right Panel */}
        <div 
          className="relative"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <div className="absolute top-2 right-2 z-10 bg-slate-900/80 px-3 py-1 rounded text-sm font-medium text-slate-200">
            {rightCloud?.name || 'Empty'}
          </div>
          {rightCloud ? (
            <PointCloudViewer
              points={rightCloud.points}
              hasColor={rightCloud.hasColor}
              hasIntensity={rightCloud.hasIntensity}
              faces={rightCloud.faces}
              isMesh={rightCloud.isMesh}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
              No point cloud selected
            </div>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-700 flex items-center justify-center gap-8 text-xs text-slate-400">
        {leftCloud && (
          <div className="flex items-center gap-4">
            <span>Left: {leftCloud.numPoints.toLocaleString()} points</span>
            {leftCloud.isMesh && leftCloud.numFaces && (
              <span>{leftCloud.numFaces.toLocaleString()} faces</span>
            )}
          </div>
        )}
        <div className="w-px h-4 bg-slate-700" />
        {rightCloud && (
          <div className="flex items-center gap-4">
            <span>Right: {rightCloud.numPoints.toLocaleString()} points</span>
            {rightCloud.isMesh && rightCloud.numFaces && (
              <span>{rightCloud.numFaces.toLocaleString()} faces</span>
            )}
          </div>
        )}
        {leftCloud && rightCloud && (
          <>
            <div className="w-px h-4 bg-slate-700" />
            <span className="text-blue-400">
              Difference: {Math.abs(leftCloud.numPoints - rightCloud.numPoints).toLocaleString()} points
            </span>
          </>
        )}
      </div>
    </div>
  )
}
