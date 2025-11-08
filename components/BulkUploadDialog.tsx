'use client'

import { useState, useCallback } from 'react'
import { X, Upload, FileUp, Check, AlertCircle, Loader2 } from 'lucide-react'
import { PointCloudParser } from '@/lib/parser'
import { PointCloud } from '@/lib/types'

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  pointCloud?: PointCloud
}

interface BulkUploadDialogProps {
  onClose: () => void
  onUploadComplete: (pointClouds: PointCloud[]) => void
}

export default function BulkUploadDialog({ onClose, onUploadComplete }: BulkUploadDialogProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: FileUploadStatus[] = Array.from(selectedFiles).map(file => ({
      file,
      status: 'pending'
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    setIsProcessing(true)
    const updatedFiles = [...files]
    const successfulClouds: PointCloud[] = []

    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'pending') continue

      updatedFiles[i] = { ...updatedFiles[i], status: 'uploading' }
      setFiles([...updatedFiles])

      try {
        const pointCloud = await PointCloudParser.parseFile(updatedFiles[i].file)
        updatedFiles[i] = { 
          ...updatedFiles[i], 
          status: 'success',
          pointCloud 
        }
        successfulClouds.push(pointCloud)
      } catch (error) {
        updatedFiles[i] = { 
          ...updatedFiles[i], 
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to parse file'
        }
      }

      setFiles([...updatedFiles])
    }

    setIsProcessing(false)
    
    if (successfulClouds.length > 0) {
      onUploadComplete(successfulClouds)
      setTimeout(() => onClose(), 1000)
    }
  }

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return <FileUp className="w-4 h-4 text-slate-400" />
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200">Bulk Upload Point Clouds</h3>
              <p className="text-xs text-slate-400">Upload multiple files at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop Zone */}
          {files.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('bulk-file-input')?.click()}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-slate-500">
                Supports PCD, PLY, XYZ, OBJ, STL formats
              </p>
              <p className="text-xs text-slate-600 mt-2">
                You can select multiple files at once
              </p>
            </div>
          ) : (
            <>
              {/* Add More Files Button */}
              <div className="mb-4">
                <button
                  onClick={() => document.getElementById('bulk-file-input')?.click()}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors text-sm"
                  disabled={isProcessing}
                >
                  <FileUp className="w-4 h-4 inline mr-2" />
                  Add More Files
                </button>
              </div>

              {/* File List */}
              <div className="space-y-2">
                {files.map((fileStatus, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      fileStatus.status === 'success'
                        ? 'bg-green-950/20 border-green-800'
                        : fileStatus.status === 'error'
                        ? 'bg-red-950/20 border-red-800'
                        : fileStatus.status === 'uploading'
                        ? 'bg-blue-950/20 border-blue-800'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    {getStatusIcon(fileStatus.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {fileStatus.file.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                        {fileStatus.pointCloud && ` • ${fileStatus.pointCloud.numPoints.toLocaleString()} points`}
                      </div>
                      {fileStatus.error && (
                        <div className="text-xs text-red-400 mt-1">{fileStatus.error}</div>
                      )}
                    </div>

                    {fileStatus.status === 'pending' && !isProcessing && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <input
            id="bulk-file-input"
            type="file"
            multiple
            accept=".pcd,.ply,.xyz,.txt,.obj,.stl"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {files.length > 0 && (
              <span>
                {files.filter(f => f.status === 'success').length} / {files.length} processed
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            {files.length > 0 && (
              <button
                onClick={processFiles}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || files.every(f => f.status !== 'pending')}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 inline mr-2" />
                    Process Files
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
