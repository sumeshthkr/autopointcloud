'use client'

import { 
  Save, 
  FolderOpen,
  Undo2,
  Redo2,
  SplitSquareVertical,
  Camera,
  Ruler,
  Tag,
  BookmarkPlus,
  Play,
  Grid3x3,
  HelpCircle
} from 'lucide-react'

interface ToolbarProps {
  hasPointCloud: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onToggleComparison: () => void
  onTakeScreenshot: () => void
  onToggleMeasurement: () => void
  onToggleAnnotation: () => void
  onAddCameraBookmark: () => void
  onToggleAnimation: () => void
  isAnimating: boolean
  showHelp: boolean
  onToggleHelp: () => void
}

export default function Toolbar({
  hasPointCloud,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveProject,
  onLoadProject,
  onToggleComparison,
  onTakeScreenshot,
  onToggleMeasurement,
  onToggleAnnotation,
  onAddCameraBookmark,
  onToggleAnimation,
  isAnimating,
  showHelp,
  onToggleHelp,
}: ToolbarProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section - File Operations */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
            <button
              onClick={onSaveProject}
              className="p-2 hover:bg-slate-800 rounded transition-colors group relative"
              disabled={!hasPointCloud}
              title="Save Project"
            >
              <Save className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <button
              onClick={onLoadProject}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              title="Load Project"
            >
              <FolderOpen className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* Edit Operations */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
            <button
              onClick={onUndo}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className={`w-4 h-4 ${canUndo ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <button
              onClick={onRedo}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className={`w-4 h-4 ${canRedo ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
          </div>

          {/* View Operations */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
            <button
              onClick={onToggleComparison}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!hasPointCloud}
              title="Side-by-Side Comparison"
            >
              <SplitSquareVertical className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <button
              onClick={onTakeScreenshot}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!hasPointCloud}
              title="Take Screenshot"
            >
              <Camera className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700">
            <button
              onClick={onToggleMeasurement}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!hasPointCloud}
              title="Measurement Tools"
            >
              <Ruler className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <button
              onClick={onToggleAnnotation}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!hasPointCloud}
              title="Annotation Tools"
            >
              <Tag className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <button
              onClick={onAddCameraBookmark}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
              disabled={!hasPointCloud}
              title="Save Camera Bookmark"
            >
              <BookmarkPlus className={`w-4 h-4 ${hasPointCloud ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
          </div>

          {/* Animation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleAnimation}
              className={`p-2 hover:bg-slate-800 rounded transition-colors ${isAnimating ? 'bg-blue-600' : ''}`}
              disabled={!hasPointCloud}
              title="Toggle Turntable Animation"
            >
              <Play className={`w-4 h-4 ${hasPointCloud ? (isAnimating ? 'text-white' : 'text-slate-300') : 'text-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* Right Section - Help */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleHelp}
            className={`p-2 hover:bg-slate-800 rounded transition-colors ${showHelp ? 'bg-blue-600' : ''}`}
            title="Help & Shortcuts"
          >
            <HelpCircle className={`w-4 h-4 ${showHelp ? 'text-white' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
