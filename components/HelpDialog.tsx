'use client'

import { X, Keyboard, Mouse, Info } from 'lucide-react'

interface HelpDialogProps {
  onClose: () => void
}

export default function HelpDialog({ onClose }: HelpDialogProps) {
  const shortcuts = [
    { key: 'Ctrl/Cmd + Z', action: 'Undo last operation' },
    { key: 'Ctrl/Cmd + Y', action: 'Redo operation' },
    { key: 'Ctrl/Cmd + S', action: 'Save project' },
    { key: 'Ctrl/Cmd + O', action: 'Open file' },
    { key: 'Delete', action: 'Delete selected point cloud' },
    { key: 'Space', action: 'Toggle animation' },
    { key: 'G', action: 'Toggle grid' },
    { key: 'A', action: 'Toggle axes' },
    { key: 'H', action: 'Toggle help' },
  ]

  const mouseControls = [
    { control: 'Left Click + Drag', action: 'Rotate camera (orbit)' },
    { control: 'Right Click + Drag', action: 'Pan camera' },
    { control: 'Middle Click + Drag', action: 'Pan camera (alternative)' },
    { control: 'Scroll Wheel', action: 'Zoom in/out' },
    { control: 'Double Click', action: 'Focus on point' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200">Help & Shortcuts</h3>
              <p className="text-xs text-slate-400">Quick reference guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-blue-400" />
              <h4 className="text-lg font-semibold text-slate-200">Keyboard Shortcuts</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <span className="text-sm text-slate-400">{shortcut.action}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-slate-950 text-slate-300 rounded border border-slate-700">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Mouse Controls */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mouse className="w-5 h-5 text-blue-400" />
              <h4 className="text-lg font-semibold text-slate-200">Mouse Controls</h4>
            </div>
            <div className="space-y-2">
              {mouseControls.map((control, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <span className="text-sm text-slate-400">{control.action}</span>
                  <span className="text-xs font-medium text-slate-300">
                    {control.control}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Guide */}
          <div>
            <h4 className="text-lg font-semibold text-slate-200 mb-4">Quick Start Guide</h4>
            <div className="space-y-3">
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="font-medium text-slate-200 mb-2">1. Upload Point Cloud</div>
                <p className="text-sm text-slate-400">
                  Click "Add Point Cloud" in the sidebar or drag and drop files onto the viewport.
                  For multiple files, use "Bulk Upload".
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="font-medium text-slate-200 mb-2">2. Manage Scene</div>
                <p className="text-sm text-slate-400">
                  Use the Scene Outliner to select, show/hide, duplicate, or delete point clouds.
                  Click on a point cloud name to select it.
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="font-medium text-slate-200 mb-2">3. Process & Filter</div>
                <p className="text-sm text-slate-400">
                  Use the Properties panel on the right to apply processing operations like
                  downsampling, outlier removal, and filtering.
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="font-medium text-slate-200 mb-2">4. Compare Results</div>
                <p className="text-sm text-slate-400">
                  Use the Side-by-Side Comparison tool to compare different point clouds or
                  before/after processing results.
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="font-medium text-slate-200 mb-2">5. Export</div>
                <p className="text-sm text-slate-400">
                  Export processed point clouds in various formats (PCD, PLY, XYZ, OBJ, STL)
                  from the Properties panel.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-semibold text-slate-200 mb-4">Available Features</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Bulk Upload',
                'Side-by-Side Comparison',
                'Undo/Redo',
                'Scene Management',
                'Camera Bookmarks',
                'Screenshot',
                'Measurement Tools',
                'Annotations',
                'Turntable Animation',
                'Grid & Axes Toggle',
                'Custom Background',
                'Advanced Filtering',
                'Export Presets',
                'Project Save/Load',
                '60+ Processing Operations'
              ].map((feature, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-slate-800 rounded text-sm text-slate-300 text-center"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 px-6 py-4 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
