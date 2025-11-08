'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Upload, Download, Cpu, Cloud, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PointCloud, ProcessingOptions } from '@/lib/types'
import { PointCloudParser } from '@/lib/parser'
import { PointCloudProcessor } from '@/lib/processing'
import { formatBytes, formatNumber } from '@/lib/utils'

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [filterType, setFilterType] = useState<ProcessingOptions['filterType']>('downsample')
  const [voxelSize, setVoxelSize] = useState(0.1)
  const [threshold, setThreshold] = useState(2.0)
  
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
    
    setIsProcessing(true)
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
    } finally {
      setIsProcessing(false)
    }
  }, [pointCloud, filterType, voxelSize, threshold])
  
  const handleExport = useCallback((format: 'pcd' | 'ply' | 'xyz') => {
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
      const changeEvent = new Event('change', { bubbles: true })
      Object.defineProperty(changeEvent, 'target', { value: input, enumerable: true })
      handleFileUpload(changeEvent as any)
    }
  }, [handleFileUpload])
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                AutoPointCloud
              </h1>
              <p className="text-xs text-slate-500">Professional Point Cloud Processing</p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {pointCloud && (
              <span className="font-mono">
                {formatNumber(pointCloud.numPoints)} points
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            {/* Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Point Cloud
                </CardTitle>
                <CardDescription>
                  Supports PCD, PLY, XYZ formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept=".pcd,.ply,.xyz,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Cloud className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm font-medium mb-1">
                      {isUploading ? 'Uploading...' : 'Drop file or click to upload'}
                    </p>
                    <p className="text-xs text-slate-500">
                      PCD, PLY, XYZ (max 100MB)
                    </p>
                  </label>
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Point Cloud Info */}
            {pointCloud && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Point Cloud Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-medium">{pointCloud.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Points:</span>
                    <span className="font-mono font-medium">{formatNumber(pointCloud.numPoints)}</span>
                  </div>
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
            )}

            {/* Processing Card */}
            {pointCloud && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Processing
                  </CardTitle>
                  <CardDescription>
                    Apply filters to your point cloud
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as ProcessingOptions['filterType'])}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="downsample">Voxel Downsampling</option>
                      <option value="statistical_outlier">Statistical Outlier Removal</option>
                      <option value="radius_outlier">Radius Outlier Removal</option>
                      <option value="intensity">Intensity Filter</option>
                      <option value="distance">Distance Filter</option>
                      <option value="passthrough_x">PassThrough X</option>
                      <option value="passthrough_y">PassThrough Y</option>
                      <option value="passthrough_z">PassThrough Z</option>
                    </select>
                  </div>
                  
                  {filterType === 'downsample' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Voxel Size: {voxelSize}
                      </label>
                      <input
                        type="range"
                        min="0.01"
                        max="1"
                        step="0.01"
                        value={voxelSize}
                        onChange={(e) => setVoxelSize(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {filterType !== 'downsample' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Threshold: {threshold}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : 'Apply Processing'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Export Card */}
            {pointCloud && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExport('pcd')} className="flex-1">
                    PCD
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('ply')} className="flex-1">
                    PLY
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('xyz')} className="flex-1">
                    XYZ
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - 3D Viewer */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <PointCloudViewer
                  points={pointCloud?.points || []}
                  hasColor={pointCloud?.hasColor || false}
                  hasIntensity={pointCloud?.hasIntensity || false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
