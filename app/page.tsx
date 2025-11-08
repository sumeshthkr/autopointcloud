'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Upload, Cloud, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PointCloud, ProcessingOptions } from '@/lib/types'
import { PointCloudParser } from '@/lib/parser'
import { PointCloudProcessor } from '@/lib/processing'
import { formatBytes, formatNumber } from '@/lib/utils'
import MenuBar from '@/components/MenuBar'

const PointCloudViewer = dynamic(() => import('@/components/PointCloudViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
      <div className="text-white">Loading viewer...</div>
    </div>
  )
})

export default function Home() {
  const [pointCloud, setPointCloud] = useState<PointCloud | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  
  const [filterType, setFilterType] = useState<ProcessingOptions['filterType']>('downsample')
  const [voxelSize, setVoxelSize] = useState(0.1)
  const [threshold, setThreshold] = useState(2.0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    setError(null)
    
    try {
      const cloud = await PointCloudParser.parseFile(file)
      setPointCloud(cloud)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      console.error('Parse error:', err)
    } finally {
      setIsUploading(false)
    }
  }, [])
  
  const handleProcess = useCallback(async () => {
    if (!pointCloud) return
    
    setError(null)
    
    try {
      const options: ProcessingOptions = {
        filterType,
        voxelSize: filterType === 'downsample' ? voxelSize : undefined,
        threshold: filterType !== 'downsample' ? threshold : undefined,
      }
      
      const result = await PointCloudProcessor.process(pointCloud, options)
      setPointCloud(result.pointCloud)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      console.error('Processing error:', err)
    }
  }, [pointCloud, filterType, voxelSize, threshold])
  
  const handleExport = useCallback((format: 'pcd' | 'ply' | 'xyz' | 'obj' | 'stl') => {
    if (!pointCloud) return
    
    try {
      const data = PointCloudProcessor.exportToFormat(pointCloud, format)
      const blob = new Blob([data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pointCloud.name.split('.')[0]}_processed.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      console.error('Export error:', err)
    }
  }, [pointCloud])
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      const input = document.createElement('input')
      input.type = 'file'
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      const changeEvent = new Event('change', { bubbles: true }) as unknown as React.ChangeEvent<HTMLInputElement>
      Object.defineProperty(changeEvent, 'target', { value: input, enumerable: true })
      handleFileUpload(changeEvent)
    }
  }, [handleFileUpload])
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])
  
  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header with Title and Logo */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                AutoPointCloud
              </h1>
              <p className="text-[10px] text-slate-500">Professional Point Cloud Processing</p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {pointCloud && (
              <span className="font-mono">
                {formatNumber(pointCloud.numPoints)} {pointCloud.isMesh ? 'vertices' : 'points'}
                {pointCloud.isMesh && pointCloud.numFaces && ` | ${formatNumber(pointCloud.numFaces)} faces`}
              </span>
            )}
          </div>
        </div>
        
        {/* Menu Bar */}
        <MenuBar
          onFileUpload={triggerFileUpload}
          onExport={handleExport}
          onProcess={handleProcess}
          hasPointCloud={!!pointCloud}
          isMesh={pointCloud?.isMesh || false}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          voxelSize={voxelSize}
          onVoxelSizeChange={setVoxelSize}
          threshold={threshold}
          onThresholdChange={setThreshold}
          onToggleStats={() => setShowInfoPanel(!showInfoPanel)}
        />
      </header>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pcd,.ply,.xyz,.txt,.obj,.stl"
        onChange={handleFileUpload}
        className="hidden"
        disabled={isUploading}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Info Panel - Collapsible */}
        {showInfoPanel && pointCloud && (
          <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="w-4 h-4" />
                    {pointCloud.isMesh ? '3D Mesh Info' : 'Point Cloud Info'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-medium truncate ml-2" title={pointCloud.name}>{pointCloud.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type:</span>
                    <span className="font-medium">{pointCloud.isMesh ? 'Mesh' : 'Point Cloud'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vertices:</span>
                    <span className="font-mono font-medium">{formatNumber(pointCloud.numPoints)}</span>
                  </div>
                  {pointCloud.isMesh && pointCloud.numFaces && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Faces:</span>
                      <span className="font-mono font-medium">{formatNumber(pointCloud.numFaces)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span className="font-mono">{formatBytes(pointCloud.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Format:</span>
                    <span className="font-medium">{pointCloud.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Has Color:</span>
                    <span>{pointCloud.hasColor ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Has Intensity:</span>
                    <span>{pointCloud.hasIntensity ? '✓' : '✗'}</span>
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-slate-500 mb-1">Bounding Box:</p>
                    <div className="font-mono text-xs space-y-1">
                      <div>Min: ({pointCloud.boundingBox.min.x.toFixed(2)}, {pointCloud.boundingBox.min.y.toFixed(2)}, {pointCloud.boundingBox.min.z.toFixed(2)})</div>
                      <div>Max: ({pointCloud.boundingBox.max.x.toFixed(2)}, {pointCloud.boundingBox.max.y.toFixed(2)}, {pointCloud.boundingBox.max.z.toFixed(2)})</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Main Viewer Area */}
        <div className="flex-1 flex flex-col relative">
          {!pointCloud ? (
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex-1 flex items-center justify-center p-8"
            >
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg">
                  <Cloud className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to AutoPointCloud</h2>
                <p className="text-slate-500 mb-6">
                  Professional point cloud and 3D mesh processing in your browser
                </p>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 hover:border-blue-400 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-sm font-medium mb-1">
                    {isUploading ? 'Uploading...' : 'Drop file here or use File > Open to upload'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports PCD, PLY, XYZ, OBJ, STL formats (max 100MB)
                  </p>
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 relative bg-slate-900">
              <PointCloudViewer
                points={pointCloud?.points || []}
                hasColor={pointCloud?.hasColor || false}
                hasIntensity={pointCloud?.hasIntensity || false}
                faces={pointCloud?.faces}
                isMesh={pointCloud?.isMesh || false}
              />
              
              {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md p-3 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 shadow-lg">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
