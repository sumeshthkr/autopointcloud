'use client'

import { useState } from 'react'
import { 
  Settings,
  Sliders,
  Palette,
  Camera,
  Ruler,
  Grid3x3,
  Sun,
  ChevronDown,
  ChevronRight,
  Maximize2,
  RotateCw,
  Download,
  Cpu
} from 'lucide-react'
import { ProcessingOptions } from '@/lib/types'

interface PropertiesPanelProps {
  hasPointCloud: boolean
  isMesh: boolean
  filterType: ProcessingOptions['filterType']
  onFilterTypeChange: (type: ProcessingOptions['filterType']) => void
  voxelSize: number
  onVoxelSizeChange: (size: number) => void
  threshold: number
  onThresholdChange: (threshold: number) => void
  onProcess: () => void
  onExport: (format: 'pcd' | 'ply' | 'xyz' | 'obj' | 'stl') => void
  pointSize: number
  onPointSizeChange: (size: number) => void
  backgroundColor: string
  onBackgroundColorChange: (color: string) => void
  showGrid: boolean
  onToggleGrid: () => void
  showAxes: boolean
  onToggleAxes: () => void
}

export default function PropertiesPanel({
  hasPointCloud,
  isMesh,
  filterType,
  onFilterTypeChange,
  voxelSize,
  onVoxelSizeChange,
  threshold,
  onThresholdChange,
  onProcess,
  onExport,
  pointSize,
  onPointSizeChange,
  backgroundColor,
  onBackgroundColorChange,
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
}: PropertiesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['viewport', 'processing'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const processingOptions = [
    { value: 'downsample', label: 'Voxel Downsample' },
    { value: 'statistical_outlier', label: 'Statistical Outlier' },
    { value: 'radius_outlier', label: 'Radius Outlier' },
    { value: 'passthrough_x', label: 'PassThrough X' },
    { value: 'passthrough_y', label: 'PassThrough Y' },
    { value: 'passthrough_z', label: 'PassThrough Z' },
    { value: 'intensity', label: 'Intensity Filter' },
    { value: 'distance', label: 'Distance Filter' },
    { value: 'mesh_to_pointcloud', label: 'Mesh → Point Cloud', disabled: !isMesh },
    { value: 'pointcloud_to_mesh', label: 'Point Cloud → Mesh', disabled: isMesh },
  ]

  return (
    <div className={`bg-slate-900 border-l border-slate-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80 md:w-80 w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-slate-200">Properties</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* Viewport Settings */}
          <div className="border-b border-slate-700">
            <button
              onClick={() => toggleSection('viewport')}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">Viewport</span>
              </div>
              {expandedSections.includes('viewport') ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {expandedSections.includes('viewport') && (
              <div className="px-3 py-3 space-y-4 bg-slate-950">
                {/* Point Size */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Point Size</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={pointSize}
                      onChange={(e) => onPointSizeChange(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs font-mono text-slate-300 w-8">{pointSize}</span>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => onBackgroundColorChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-slate-700"
                    />
                    <span className="text-xs font-mono text-slate-300">{backgroundColor}</span>
                  </div>
                </div>

                {/* Grid Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Show Grid</label>
                  <button
                    onClick={onToggleGrid}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      showGrid 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {showGrid ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Axes Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Show Axes</label>
                  <button
                    onClick={onToggleAxes}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      showAxes 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {showAxes ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Processing Settings */}
          {hasPointCloud && !isMesh && (
            <div className="border-b border-slate-700">
              <button
                onClick={() => toggleSection('processing')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">Processing</span>
                </div>
                {expandedSections.includes('processing') ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {expandedSections.includes('processing') && (
                <div className="px-3 py-3 space-y-4 bg-slate-950">
                  {/* Filter Type */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Operation</label>
                    <select
                      value={filterType}
                      onChange={(e) => onFilterTypeChange(e.target.value as ProcessingOptions['filterType'])}
                      className="w-full px-2 py-1.5 text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                    >
                      {processingOptions.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={'disabled' in opt && opt.disabled}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parameters */}
                  {filterType === 'downsample' ? (
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">Voxel Size</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.01"
                          max="1"
                          step="0.01"
                          value={voxelSize}
                          onChange={(e) => onVoxelSizeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs font-mono text-slate-300 w-12">{voxelSize.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">Threshold</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={threshold}
                          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs font-mono text-slate-300 w-12">{threshold.toFixed(1)}</span>
                      </div>
                    </div>
                  )}

                  {/* Apply Button */}
                  <button
                    onClick={onProcess}
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium"
                  >
                    <Cpu className="w-4 h-4 inline mr-2" />
                    Apply Processing
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Export Settings */}
          {hasPointCloud && (
            <div className="border-b border-slate-700">
              <button
                onClick={() => toggleSection('export')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">Export</span>
                </div>
                {expandedSections.includes('export') ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {expandedSections.includes('export') && (
                <div className="px-3 py-3 space-y-2 bg-slate-950">
                  {!isMesh && (
                    <>
                      <button
                        onClick={() => onExport('pcd')}
                        className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors text-sm"
                      >
                        Export PCD
                      </button>
                      <button
                        onClick={() => onExport('xyz')}
                        className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors text-sm"
                      >
                        Export XYZ
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onExport('ply')}
                    className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors text-sm"
                  >
                    Export PLY
                  </button>
                  {isMesh && (
                    <>
                      <button
                        onClick={() => onExport('obj')}
                        className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors text-sm"
                      >
                        Export OBJ
                      </button>
                      <button
                        onClick={() => onExport('stl')}
                        className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors text-sm"
                      >
                        Export STL
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
