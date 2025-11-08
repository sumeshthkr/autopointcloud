'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Download, 
  FolderOpen,
  Cpu, 
  Info,
  Grid3x3,
  Filter,
  Maximize2,
  RotateCw,
  HelpCircle,
  FileText,
  Layers,
  Sliders
} from 'lucide-react'
import { ProcessingOptions } from '@/lib/types'

interface MenuBarProps {
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
  onResetView?: () => void
  onToggleGrid?: () => void
  onToggleStats?: () => void
}

interface MenuItemProps {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  shortcut?: string
  submenu?: SubmenuItemProps[]
  activeMenu: string | null
  onSubmenuClick: (action: () => void) => void
  onMenuClick: (menuName: string) => void
}

interface SubmenuItemProps {
  label?: string
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  shortcut?: string
  divider?: boolean
}

const MenuItem = ({ label, icon, onClick, disabled, submenu, activeMenu, onSubmenuClick, onMenuClick }: MenuItemProps) => {
  const isActive = activeMenu === label
  
  return (
    <div className="relative">
      <button
        onClick={() => onClick ? onSubmenuClick(onClick) : onMenuClick(label)}
        disabled={disabled}
        className={`px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md flex items-center gap-2 ${
          isActive ? 'bg-slate-100 dark:bg-slate-800' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {icon}
        <span>{label}</span>
      </button>
      
      {submenu && isActive && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[200px] py-1 z-50">
          {submenu.map((item, index) => (
            <div key={index}>
              {item.divider ? (
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
              ) : (
                <button
                  onClick={() => item.onClick && onSubmenuClick(item.onClick)}
                  disabled={item.disabled}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between gap-4 ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <span className="text-xs text-slate-500">{item.shortcut}</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MenuBar({
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
  onResetView,
  onToggleGrid,
  onToggleStats,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showProcessingDialog, setShowProcessingDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const handleSubmenuClick = (action: () => void) => {
    action()
    setActiveMenu(null)
  }

  const fileMenu: SubmenuItemProps[] = [
    {
      label: 'Open File...',
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: onFileUpload,
      shortcut: 'Ctrl+O',
    },
    {
      label: 'Recent Files',
      icon: <FileText className="w-4 h-4" />,
      disabled: true,
    },
    { divider: true },
    {
      label: 'Export as PCD',
      icon: <Download className="w-4 h-4" />,
      onClick: () => onExport('pcd'),
      disabled: !hasPointCloud || isMesh,
      shortcut: 'Ctrl+E',
    },
    {
      label: 'Export as PLY',
      icon: <Download className="w-4 h-4" />,
      onClick: () => onExport('ply'),
      disabled: !hasPointCloud,
    },
    {
      label: 'Export as XYZ',
      icon: <Download className="w-4 h-4" />,
      onClick: () => onExport('xyz'),
      disabled: !hasPointCloud || isMesh,
    },
    {
      label: 'Export as OBJ',
      icon: <Download className="w-4 h-4" />,
      onClick: () => onExport('obj'),
      disabled: !hasPointCloud || !isMesh,
    },
    {
      label: 'Export as STL',
      icon: <Download className="w-4 h-4" />,
      onClick: () => onExport('stl'),
      disabled: !hasPointCloud || !isMesh,
    },
  ]

  const viewMenu: SubmenuItemProps[] = [
    {
      label: 'Reset Camera',
      icon: <RotateCw className="w-4 h-4" />,
      onClick: onResetView || (() => {}),
      disabled: !hasPointCloud,
      shortcut: 'R',
    },
    {
      label: 'Fit to Screen',
      icon: <Maximize2 className="w-4 h-4" />,
      onClick: onResetView || (() => {}),
      disabled: !hasPointCloud,
      shortcut: 'F',
    },
    { divider: true },
    {
      label: 'Toggle Grid',
      icon: <Grid3x3 className="w-4 h-4" />,
      onClick: onToggleGrid || (() => {}),
      shortcut: 'G',
    },
    {
      label: 'Toggle Statistics',
      icon: <Layers className="w-4 h-4" />,
      onClick: onToggleStats || (() => {}),
      shortcut: 'S',
    },
  ]

  const processingMenu: SubmenuItemProps[] = [
    {
      label: 'Voxel Downsampling',
      icon: <Filter className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('downsample')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    {
      label: 'Statistical Outlier Removal',
      icon: <Filter className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('statistical_outlier')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    {
      label: 'Radius Outlier Removal',
      icon: <Filter className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('radius_outlier')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    { divider: true },
    {
      label: 'PassThrough Filter X',
      icon: <Sliders className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('passthrough_x')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    {
      label: 'PassThrough Filter Y',
      icon: <Sliders className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('passthrough_y')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    {
      label: 'PassThrough Filter Z',
      icon: <Sliders className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('passthrough_z')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    { divider: true },
    {
      label: 'Intensity Filter',
      icon: <Filter className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('intensity')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
    {
      label: 'Distance Filter',
      icon: <Filter className="w-4 h-4" />,
      onClick: () => {
        onFilterTypeChange('distance')
        setShowProcessingDialog(true)
      },
      disabled: !hasPointCloud,
    },
  ]

  const helpMenu: SubmenuItemProps[] = [
    {
      label: 'Documentation',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => window.open('https://github.com/sumeshthkr/autopointcloud', '_blank'),
    },
    {
      label: 'Keyboard Shortcuts',
      icon: <HelpCircle className="w-4 h-4" />,
      disabled: true,
    },
    { divider: true },
    {
      label: 'About',
      icon: <Info className="w-4 h-4" />,
      disabled: true,
    },
  ]

  return (
    <>
      <div ref={menuRef} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <MenuItem 
          label="File" 
          submenu={fileMenu} 
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onSubmenuClick={handleSubmenuClick}
        />
        <MenuItem 
          label="View" 
          submenu={viewMenu}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onSubmenuClick={handleSubmenuClick}
        />
        <MenuItem 
          label="Processing" 
          submenu={processingMenu}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onSubmenuClick={handleSubmenuClick}
        />
        <MenuItem 
          label="Help" 
          submenu={helpMenu}
          activeMenu={activeMenu}
          onMenuClick={handleMenuClick}
          onSubmenuClick={handleSubmenuClick}
        />
      </div>

      {/* Processing Dialog */}
      {showProcessingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Processing Options
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Filter Type</label>
                <select
                  value={filterType}
                  onChange={(e) => onFilterTypeChange(e.target.value as ProcessingOptions['filterType'])}
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
                    Voxel Size: {voxelSize.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={voxelSize}
                    onChange={(e) => onVoxelSizeChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              {filterType !== 'downsample' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Threshold: {threshold.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    onProcess()
                    setShowProcessingDialog(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowProcessingDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
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
