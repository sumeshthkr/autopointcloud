'use client'

import { useState } from 'react'
import { 
  Download, 
  FolderOpen,
  Cpu, 
  Info,
  Sliders,
  Zap,
  Filter,
  HelpCircle,
  X
} from 'lucide-react'
import { ProcessingOptions } from '@/lib/types'

interface SimplifiedMenuBarProps {
  onFileUpload: () => void
  onExport: (format: 'pcd' | 'ply' | 'xyz' | 'obj' | 'stl') => void
  onProcess: () => void
  hasPointCloud: boolean
  isMesh: boolean
  filterType: ProcessingOptions['filterType']
  onFilterTypeChange: (type: ProcessingOptions['filterType']) => void
  voxelSize: number
  onVoxelSizeChange: (size: number) => void
  threshold: number
  onThresholdChange: (threshold: number) => void
  onToggleStats?: () => void
}

// Processing categories for better organization
const processingCategories = {
  'Quick Filters': [
    { value: 'downsample', label: 'Reduce Points', description: 'Make your point cloud smaller and faster', icon: Zap },
    { value: 'statistical_outlier', label: 'Remove Noise', description: 'Clean up noisy points automatically', icon: Filter },
  ],
  'Advanced Filters': [
    { value: 'radius_outlier', label: 'Radius Filter', description: 'Remove sparse outliers by radius', icon: Filter },
    { value: 'passthrough_x', label: 'Crop X-axis', description: 'Keep only a range along X', icon: Sliders },
    { value: 'passthrough_y', label: 'Crop Y-axis', description: 'Keep only a range along Y', icon: Sliders },
    { value: 'passthrough_z', label: 'Crop Z-axis', description: 'Keep only a range along Z', icon: Sliders },
    { value: 'intensity', label: 'By Intensity', description: 'Filter by brightness values', icon: Filter },
    { value: 'distance', label: 'By Distance', description: 'Filter by distance from center', icon: Filter },
  ]
}

export default function SimplifiedMenuBar({
  onFileUpload,
  onExport,
  onProcess,
  hasPointCloud,
  isMesh,
  filterType,
  onFilterTypeChange,
  voxelSize,
  onVoxelSizeChange,
  threshold,
  onThresholdChange,
  onToggleStats,
}: SimplifiedMenuBarProps) {
  const [showProcessingDialog, setShowProcessingDialog] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      {/* Simplified Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={onFileUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <FolderOpen className="w-4 h-4" />
            Open File
          </button>

          {/* Process Button */}
          {hasPointCloud && !isMesh && (
            <button
              onClick={() => setShowProcessingDialog(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm"
            >
              <Cpu className="w-4 h-4" />
              Process
            </button>
          )}

          {/* Export Button */}
          {hasPointCloud && (
            <div className="relative group">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              {/* Export Dropdown */}
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl min-w-[180px] py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {!isMesh && (
                  <>
                    <button
                      onClick={() => onExport('pcd')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      PCD Format
                    </button>
                    <button
                      onClick={() => onExport('xyz')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      XYZ Format
                    </button>
                  </>
                )}
                <button
                  onClick={() => onExport('ply')}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  PLY Format
                </button>
                {isMesh && (
                  <>
                    <button
                      onClick={() => onExport('obj')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      OBJ Format
                    </button>
                    <button
                      onClick={() => onExport('stl')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      STL Format
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stats Toggle */}
          {hasPointCloud && onToggleStats && (
            <button
              onClick={onToggleStats}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle Statistics Panel"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help Banner */}
      {showHelp && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Quick Start Guide</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Open File:</strong> Upload PCD, PLY, XYZ, OBJ, or STL files (drag & drop supported)</li>
                <li>• <strong>Process:</strong> Apply filters to clean and optimize your point cloud</li>
                <li>• <strong>Export:</strong> Save your processed data in various formats</li>
                <li>• <strong>Mouse Controls:</strong> Left-drag to rotate, right-drag to pan, scroll to zoom</li>
              </ul>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Simplified Processing Dialog */}
      {showProcessingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Cpu className="w-6 h-6 text-purple-600" />
                Process Point Cloud
              </h3>
              <button
                onClick={() => setShowProcessingDialog(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Category Sections */}
              {Object.entries(processingCategories).map(([category, filters]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filters.map((filter) => {
                      const Icon = filter.icon
                      const isSelected = filterType === filter.value
                      return (
                        <button
                          key={filter.value}
                          onClick={() => onFilterTypeChange(filter.value as ProcessingOptions['filterType'])}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium mb-1 ${isSelected ? 'text-purple-900 dark:text-purple-100' : ''}`}>
                                {filter.label}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {filter.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Parameter Controls */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-4">
                  Settings
                </h4>
                
                {filterType === 'downsample' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Voxel Size</label>
                      <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                        {voxelSize.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={voxelSize}
                      onChange={(e) => onVoxelSizeChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-xs text-slate-500">
                      Smaller values = More points (slower), Larger values = Fewer points (faster)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Threshold</label>
                      <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                        {threshold.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={threshold}
                      onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-xs text-slate-500">
                      Higher values = More aggressive filtering
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    onProcess()
                    setShowProcessingDialog(false)
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg"
                >
                  Apply Processing
                </button>
                <button
                  onClick={() => setShowProcessingDialog(false)}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
