'use client'

import { useState } from 'react'
import { 
  FolderOpen, 
  FileUp,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Settings,
  X
} from 'lucide-react'

interface PointCloudItem {
  id: string
  name: string
  visible: boolean
  numPoints: number
}

interface SidebarProps {
  pointClouds: PointCloudItem[]
  selectedId: string | null
  onSelectPointCloud: (id: string) => void
  onToggleVisibility: (id: string) => void
  onDeletePointCloud: (id: string) => void
  onDuplicatePointCloud: (id: string) => void
  onFileUpload: () => void
  onBulkFileUpload: () => void
}

export default function Sidebar({
  pointClouds,
  selectedId,
  onSelectPointCloud,
  onToggleVisibility,
  onDeletePointCloud,
  onDuplicatePointCloud,
  onFileUpload,
  onBulkFileUpload,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedSection, setExpandedSection] = useState('scene')

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section)
  }

  return (
    <div className={`bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-slate-200">Scene Outliner</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Upload Buttons */}
          <div className="p-3 border-b border-slate-700 space-y-2">
            <button
              onClick={onFileUpload}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FolderOpen className="w-4 h-4" />
              Add Point Cloud
            </button>
            <button
              onClick={onBulkFileUpload}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FileUp className="w-4 h-4" />
              Bulk Upload
            </button>
          </div>

          {/* Scene Hierarchy */}
          <div className="flex-1 overflow-y-auto">
            {/* Scene Section */}
            <div className="border-b border-slate-700">
              <button
                onClick={() => toggleSection('scene')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">Point Clouds</span>
                  <span className="text-xs text-slate-500">({pointClouds.length})</span>
                </div>
                {expandedSection === 'scene' ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {expandedSection === 'scene' && (
                <div className="bg-slate-950">
                  {pointClouds.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No point clouds loaded
                    </div>
                  ) : (
                    pointClouds.map((pc) => (
                      <div
                        key={pc.id}
                        className={`group px-3 py-2 flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer ${
                          selectedId === pc.id ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                        }`}
                        onClick={() => onSelectPointCloud(pc.id)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleVisibility(pc.id)
                          }}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          {pc.visible ? (
                            <Eye className="w-4 h-4 text-blue-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-200 truncate">{pc.name}</div>
                          <div className="text-xs text-slate-500">{pc.numPoints.toLocaleString()} points</div>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDuplicatePointCloud(pc.id)
                            }}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeletePointCloud(pc.id)
                            }}
                            className="p-1 hover:bg-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400 hover:text-white" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
