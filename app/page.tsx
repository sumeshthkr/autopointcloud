'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Cloud, Upload } from 'lucide-react'
import { PointCloud, ProcessingOptions } from '@/lib/types'
import { PointCloudParser } from '@/lib/parser'
import { PointCloudProcessor } from '@/lib/processing'
import { formatNumber } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import PropertiesPanel from '@/components/PropertiesPanel'
import Toolbar from '@/components/Toolbar'
import ComparisonView from '@/components/ComparisonView'
import BulkUploadDialog from '@/components/BulkUploadDialog'
import HelpDialog from '@/components/HelpDialog'

const PointCloudViewer = dynamic(() => import('@/components/PointCloudViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="text-white">Loading viewer...</div>
    </div>
  )
})

interface PointCloudItem {
  id: string
  name: string
  visible: boolean
  pointCloud: PointCloud
}

interface HistoryEntry {
  pointClouds: PointCloudItem[]
  selectedId: string | null
}

export default function Home() {
  const [pointClouds, setPointClouds] = useState<PointCloudItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // UI State
  const [showComparison, setShowComparison] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [comparisonLeft, setComparisonLeft] = useState<PointCloud | null>(null)
  const [comparisonRight, setComparisonRight] = useState<PointCloud | null>(null)
  
  // Processing State
  const [filterType, setFilterType] = useState<ProcessingOptions['filterType']>('downsample')
  const [voxelSize, setVoxelSize] = useState(0.1)
  const [threshold, setThreshold] = useState(2.0)
  
  // Viewport State
  const [pointSize, setPointSize] = useState(3)
  const [backgroundColor, setBackgroundColor] = useState('#1e293b')
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  
  // New plas.io-inspired viewport states
  const [cameraMode, setCameraMode] = useState<'perspective' | 'orthographic' | 'top'>('perspective')
  const [fov, setFov] = useState(75)
  const [pointDensity, setPointDensity] = useState(100)
  const [colorMode, setColorMode] = useState<'height' | 'intensity' | 'rgb' | 'classification'>('height')
  const [intensityRange, setIntensityRange] = useState<[number, number]>([0, 1])
  const [zExaggeration, setZExaggeration] = useState(1.0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save to history
  const saveToHistory = useCallback((newPointClouds: PointCloudItem[], newSelectedId: string | null) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ pointClouds: JSON.parse(JSON.stringify(newPointClouds)), selectedId: newSelectedId })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])
  
  // Get selected point cloud
  const selectedPointCloud = pointClouds.find(pc => pc.id === selectedId)

  // File upload handler with chunked loading for large files
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setError(null)
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage('Loading file...')
    
    try {
      let cloud: PointCloud
      
      // Use chunked loading for large files (> 10MB)
      if (file.size > 10 * 1024 * 1024) {
        const { ChunkedFileLoader } = await import('@/lib/chunked-loader')
        cloud = await ChunkedFileLoader.loadFileInChunks(file, {
          chunkSize: 100000,
          onProgress: (progress, message) => {
            setLoadingProgress(progress)
            setLoadingMessage(message)
          }
        })
      } else {
        cloud = await PointCloudParser.parseFile(file)
      }
      
      const newItem: PointCloudItem = {
        id: Date.now().toString(),
        name: cloud.name,
        visible: true,
        pointCloud: cloud
      }
      const newPointClouds = [...pointClouds, newItem]
      setPointClouds(newPointClouds)
      setSelectedId(newItem.id)
      saveToHistory(newPointClouds, newItem.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      console.error('Parse error:', err)
    } finally {
      setIsLoading(false)
      setLoadingProgress(0)
      setLoadingMessage('')
    }
  }, [pointClouds, saveToHistory])

  // Bulk upload handler
  const handleBulkUpload = useCallback((uploadedClouds: PointCloud[]) => {
    const newItems = uploadedClouds.map(cloud => ({
      id: Date.now().toString() + Math.random(),
      name: cloud.name,
      visible: true,
      pointCloud: cloud
    }))
    const newPointClouds = [...pointClouds, ...newItems]
    setPointClouds(newPointClouds)
    if (newItems.length > 0) {
      setSelectedId(newItems[0].id)
      saveToHistory(newPointClouds, newItems[0].id)
    }
  }, [pointClouds, saveToHistory])

  // Process handler
  const handleProcess = useCallback(async () => {
    if (!selectedPointCloud) return
    
    setError(null)
    
    try {
      const options: ProcessingOptions = {
        filterType,
        voxelSize: filterType === 'downsample' ? voxelSize : undefined,
        threshold: filterType !== 'downsample' ? threshold : undefined,
      }
      
      const result = await PointCloudProcessor.process(selectedPointCloud.pointCloud, options)
      const updatedItem = {
        ...selectedPointCloud,
        pointCloud: result.pointCloud
      }
      const newPointClouds = pointClouds.map(pc => pc.id === selectedId ? updatedItem : pc)
      setPointClouds(newPointClouds)
      saveToHistory(newPointClouds, selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      console.error('Processing error:', err)
    }
  }, [selectedPointCloud, filterType, voxelSize, threshold, pointClouds, selectedId, saveToHistory])

  // Export handler
  const handleExport = useCallback((format: 'pcd' | 'ply' | 'xyz' | 'obj' | 'stl') => {
    if (!selectedPointCloud) return
    
    try {
      const data = PointCloudProcessor.exportToFormat(selectedPointCloud.pointCloud, format)
      const blob = new Blob([data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedPointCloud.pointCloud.name.split('.')[0]}_processed.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      console.error('Export error:', err)
    }
  }, [selectedPointCloud])

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      setPointClouds(entry.pointClouds)
      setSelectedId(entry.selectedId)
      setHistoryIndex(newIndex)
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      setPointClouds(entry.pointClouds)
      setSelectedId(entry.selectedId)
      setHistoryIndex(newIndex)
    }
  }, [history, historyIndex])

  // Point cloud operations
  const handleToggleVisibility = useCallback((id: string) => {
    const newPointClouds = pointClouds.map(pc =>
      pc.id === id ? { ...pc, visible: !pc.visible } : pc
    )
    setPointClouds(newPointClouds)
  }, [pointClouds])

  const handleDeletePointCloud = useCallback((id: string) => {
    const newPointClouds = pointClouds.filter(pc => pc.id !== id)
    setPointClouds(newPointClouds)
    if (selectedId === id) {
      setSelectedId(newPointClouds.length > 0 ? newPointClouds[0].id : null)
    }
    saveToHistory(newPointClouds, selectedId === id ? (newPointClouds.length > 0 ? newPointClouds[0].id : null) : selectedId)
  }, [pointClouds, selectedId, saveToHistory])

  const handleDuplicatePointCloud = useCallback((id: string) => {
    const pc = pointClouds.find(p => p.id === id)
    if (!pc) return
    
    const newItem: PointCloudItem = {
      id: Date.now().toString(),
      name: `${pc.name} (copy)`,
      visible: true,
      pointCloud: { ...pc.pointCloud, name: `${pc.pointCloud.name} (copy)` }
    }
    const newPointClouds = [...pointClouds, newItem]
    setPointClouds(newPointClouds)
    setSelectedId(newItem.id)
    saveToHistory(newPointClouds, newItem.id)
  }, [pointClouds, saveToHistory])

  // Comparison view
  const handleToggleComparison = useCallback(() => {
    if (!showComparison && pointClouds.length >= 1) {
      setComparisonLeft(selectedPointCloud?.pointCloud || pointClouds[0].pointCloud)
      setComparisonRight(pointClouds.length > 1 ? pointClouds[1].pointCloud : null)
    }
    setShowComparison(!showComparison)
  }, [showComparison, pointClouds, selectedPointCloud])

  // Project save/load (simplified - just downloads JSON)
  const handleSaveProject = useCallback(() => {
    const project = {
      pointClouds: pointClouds.map(pc => ({
        id: pc.id,
        name: pc.name,
        visible: pc.visible,
        // Note: In a real implementation, you'd need to serialize the point cloud data
      })),
      selectedId,
      timestamp: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autopointcloud_project_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [pointClouds, selectedId])

  const handleLoadProject = useCallback(() => {
    // Placeholder - would need file input to load
    alert('Project loading will be implemented with file selection')
  }, [])

  const handleTakeScreenshot = useCallback(() => {
    // Placeholder - would need canvas capture
    alert('Screenshot feature will capture the 3D viewport')
  }, [])

  const handleToggleMeasurement = useCallback(() => {
    alert('Measurement tools coming soon')
  }, [])

  const handleToggleAnnotation = useCallback(() => {
    alert('Annotation tools coming soon')
  }, [])

  const handleAddCameraBookmark = useCallback(() => {
    alert('Camera bookmark saved!')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveProject()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        fileInputRef.current?.click()
      } else if (e.key === 'Delete' && selectedId) {
        handleDeletePointCloud(selectedId)
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsAnimating(prev => !prev)
      } else if (e.key === 'g') {
        setShowGrid(prev => !prev)
      } else if (e.key === 'a') {
        setShowAxes(prev => !prev)
      } else if (e.key === 'h') {
        setShowHelp(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleSaveProject, handleDeletePointCloud, selectedId])

  // Drag and drop for main viewport
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="px-2 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                AutoPointCloud
              </h1>
              <p className="text-[10px] text-slate-500 hidden sm:block">Professional Point Cloud Processing</p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-400">
            {selectedPointCloud && (
              <span className="font-mono">
                {formatNumber(selectedPointCloud.pointCloud.numPoints)} {selectedPointCloud.pointCloud.isMesh ? 'vertices' : 'points'}
                {selectedPointCloud.pointCloud.isMesh && selectedPointCloud.pointCloud.numFaces && 
                  ` | ${formatNumber(selectedPointCloud.pointCloud.numFaces)} faces`}
              </span>
            )}
          </div>
        </div>
        
        {/* Toolbar */}
        <Toolbar
          hasPointCloud={pointClouds.length > 0}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
          onToggleComparison={handleToggleComparison}
          onTakeScreenshot={handleTakeScreenshot}
          onToggleMeasurement={handleToggleMeasurement}
          onToggleAnnotation={handleToggleAnnotation}
          onAddCameraBookmark={handleAddCameraBookmark}
          onToggleAnimation={() => setIsAnimating(!isAnimating)}
          isAnimating={isAnimating}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
        />
      </header>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pcd,.ply,.xyz,.txt,.obj,.stl"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          pointClouds={pointClouds.map(pc => ({
            id: pc.id,
            name: pc.name,
            visible: pc.visible,
            numPoints: pc.pointCloud.numPoints
          }))}
          selectedId={selectedId}
          onSelectPointCloud={setSelectedId}
          onToggleVisibility={handleToggleVisibility}
          onDeletePointCloud={handleDeletePointCloud}
          onDuplicatePointCloud={handleDuplicatePointCloud}
          onFileUpload={() => fileInputRef.current?.click()}
          onBulkFileUpload={() => setShowBulkUpload(true)}
        />

        {/* Main Viewer */}
        <div className="flex-1 flex flex-col relative">
          {pointClouds.length === 0 ? (
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex-1 flex items-center justify-center bg-slate-900"
            >
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  No point cloud loaded
                </p>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400 max-w-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 relative" style={{ backgroundColor }}>
                {pointClouds.filter(pc => pc.visible).map(pc => (
                  pc.id === selectedId && (
                    <PointCloudViewer
                      key={pc.id}
                      points={pc.pointCloud.points}
                      hasColor={pc.pointCloud.hasColor}
                      hasIntensity={pc.pointCloud.hasIntensity}
                      faces={pc.pointCloud.faces}
                      isMesh={pc.pointCloud.isMesh}
                      cameraMode={cameraMode}
                      fov={fov}
                      pointDensity={pointDensity}
                      colorMode={colorMode}
                      intensityRange={intensityRange}
                      zExaggeration={zExaggeration}
                      pointSize={pointSize}
                      showGrid={showGrid}
                      showAxes={showAxes}
                    />
                  )
                ))}
                
                {/* Loading Indicator */}
                {isLoading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-200">{loadingMessage}</p>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full transition-all duration-300"
                            style={{ width: `${loadingProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 text-right">{Math.round(loadingProgress)}%</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md p-3 bg-red-900/90 border border-red-800 rounded-lg text-sm text-red-400 shadow-lg">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel
          hasPointCloud={!!selectedPointCloud}
          isMesh={selectedPointCloud?.pointCloud.isMesh || false}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          voxelSize={voxelSize}
          onVoxelSizeChange={setVoxelSize}
          threshold={threshold}
          onThresholdChange={setThreshold}
          onProcess={handleProcess}
          onExport={handleExport}
          pointSize={pointSize}
          onPointSizeChange={setPointSize}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showAxes={showAxes}
          onToggleAxes={() => setShowAxes(!showAxes)}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
          fov={fov}
          onFovChange={setFov}
          pointDensity={pointDensity}
          onPointDensityChange={setPointDensity}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          intensityRange={intensityRange}
          onIntensityRangeChange={setIntensityRange}
          zExaggeration={zExaggeration}
          onZExaggerationChange={setZExaggeration}
        />
      </div>

      {/* Dialogs */}
      {showBulkUpload && (
        <BulkUploadDialog
          onClose={() => setShowBulkUpload(false)}
          onUploadComplete={handleBulkUpload}
        />
      )}

      {showComparison && (
        <ComparisonView
          leftCloud={comparisonLeft}
          rightCloud={comparisonRight}
          onClose={() => setShowComparison(false)}
        />
      )}

      {showHelp && (
        <HelpDialog onClose={() => setShowHelp(false)} />
      )}
    </div>
  )
}
