'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  FileText, 
  Upload, 
  X, 
  Plus,
  Trash2,
  Download,
  Eye,
  Edit,
  Save,
  FileSpreadsheet,
  File,
  CheckCircle,
  AlertCircle,
  Brain
} from 'lucide-react'

interface ContextDocument {
  id: string
  name: string
  type: string
  content: string
  uploadedAt: string
  size: number
}

interface ProjectContext {
  id: string
  name: string
  description: string
  documents: ContextDocument[]
  textContext: string
  createdAt: string
  updatedAt: string
}

export default function ContextPage() {
  const [projects, setProjects] = useState<ProjectContext[]>([])
  const [activeProject, setActiveProject] = useState<ProjectContext | null>(null)
  const [textContext, setTextContext] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  function loadProjects() {
    const saved = localStorage.getItem('ai-workout-contexts')
    if (saved) {
      const contexts = JSON.parse(saved)
      setProjects(contexts)
      if (contexts.length > 0 && !activeProject) {
        setActiveProject(contexts[0])
        setTextContext(contexts[0].textContext || '')
      }
    }
  }

  function saveProjects(updatedProjects: ProjectContext[]) {
    localStorage.setItem('ai-workout-contexts', JSON.stringify(updatedProjects))
    setProjects(updatedProjects)
  }

  function createNewProject() {
    const projectName = prompt('Enter project name:')
    if (!projectName) return

    const newProject: ProjectContext = {
      id: `project-${Date.now()}`,
      name: projectName,
      description: '',
      documents: [],
      textContext: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updated = [...projects, newProject]
    saveProjects(updated)
    setActiveProject(newProject)
    setTextContext('')
  }

  function deleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    const updated = projects.filter(p => p.id !== projectId)
    saveProjects(updated)
    
    if (activeProject?.id === projectId) {
      setActiveProject(updated[0] || null)
      setTextContext(updated[0]?.textContext || '')
    }
  }

  function saveTextContext() {
    if (!activeProject) return

    const updated = projects.map(p => 
      p.id === activeProject.id 
        ? { ...p, textContext, updatedAt: new Date().toISOString() }
        : p
    )
    saveProjects(updated)
    setIsEditing(false)
    setUploadStatus({ type: 'success', message: 'Context saved successfully!' })
    setTimeout(() => setUploadStatus(null), 3000)
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0 || !activeProject) return

    setUploading(true)
    setUploadStatus(null)

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/context/extract', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to extract content from file')
        }

        const data = await response.json()
        
        const newDoc: ContextDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type || 'unknown',
          content: data.content,
          uploadedAt: new Date().toISOString(),
          size: file.size
        }

        // Add document to active project
        const updated = projects.map(p => 
          p.id === activeProject.id 
            ? { 
                ...p, 
                documents: [...p.documents, newDoc],
                updatedAt: new Date().toISOString()
              }
            : p
        )
        saveProjects(updated)
        setActiveProject(updated.find(p => p.id === activeProject.id)!)
        
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully uploaded ${file.name}` 
        })
      } catch (error) {
        console.error('Upload error:', error)
        setUploadStatus({ 
          type: 'error', 
          message: `Failed to upload ${file.name}` 
        })
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeDocument(docId: string) {
    if (!activeProject) return

    const updated = projects.map(p => 
      p.id === activeProject.id 
        ? { 
            ...p, 
            documents: p.documents.filter(d => d.id !== docId),
            updatedAt: new Date().toISOString()
          }
        : p
    )
    saveProjects(updated)
    setActiveProject(updated.find(p => p.id === activeProject.id)!)
  }

  function getFileIcon(type: string) {
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
      return <FileSpreadsheet className="h-4 w-4" />
    }
    if (type.includes('pdf')) {
      return <File className="h-4 w-4 text-red-500" />
    }
    if (type.includes('word') || type.includes('document')) {
      return <FileText className="h-4 w-4 text-blue-500" />
    }
    return <File className="h-4 w-4" />
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function exportContext() {
    if (!activeProject) return

    const contextData = {
      project: activeProject.name,
      textContext: activeProject.textContext,
      documents: activeProject.documents.map(d => ({
        name: d.name,
        content: d.content
      }))
    }

    const blob = new Blob([JSON.stringify(contextData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeProject.name}-context.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Context Management
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {activeProject && (
                <button
                  onClick={exportContext}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 inline mr-1" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Projects Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Projects</h2>
                <button
                  onClick={createNewProject}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="p-2">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">No projects yet</p>
                ) : (
                  <ul className="space-y-1">
                    {projects.map(project => (
                      <li key={project.id}>
                        <button
                          onClick={() => {
                            setActiveProject(project)
                            setTextContext(project.textContext || '')
                            setIsEditing(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded flex items-center justify-between group ${
                            activeProject?.id === project.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{project.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProject(project.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {activeProject ? (
              <>
                {/* Project Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-2">{activeProject.name}</h2>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(activeProject.createdAt).toLocaleDateString()}
                    {' • '}
                    Updated: {new Date(activeProject.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Text Context */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Text Context</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={saveTextContext}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {isEditing ? (
                      <textarea
                        value={textContext}
                        onChange={(e) => setTextContext(e.target.value)}
                        placeholder="Add context here... Include training philosophy, specific client needs, gym equipment available, preferred workout styles, injury considerations, etc."
                        className="w-full h-64 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="prose max-w-none">
                        {textContext ? (
                          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                            {textContext}
                          </pre>
                        ) : (
                          <p className="text-gray-500 italic">
                            No text context added yet. Click edit to add context.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Upload */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Documents</h3>
                  </div>
                  <div className="p-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        multiple
                        accept=".csv,.xlsx,.xls,.doc,.docx,.pdf,.txt,.json"
                        className="hidden"
                      />
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Upload documents to provide context
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Supports: CSV, Excel, Word, PDF, TXT, JSON
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {uploading ? 'Processing...' : 'Choose Files'}
                      </button>
                    </div>

                    {uploadStatus && (
                      <div className={`mt-4 p-3 rounded flex items-center ${
                        uploadStatus.type === 'success' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {uploadStatus.type === 'success' 
                          ? <CheckCircle className="h-4 w-4 mr-2" />
                          : <AlertCircle className="h-4 w-4 mr-2" />
                        }
                        {uploadStatus.message}
                      </div>
                    )}

                    {activeProject.documents.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Uploaded Documents ({activeProject.documents.length})
                        </h4>
                        <ul className="space-y-2">
                          {activeProject.documents.map(doc => (
                            <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                {getFileIcon(doc.type)}
                                <div>
                                  <p className="text-sm font-medium">{doc.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeDocument(doc.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Context Summary</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Text context: {textContext ? `${textContext.length} characters` : 'Not added'}</li>
                    <li>• Documents: {activeProject.documents.length} files</li>
                    <li>• Total content: {
                      (textContext.length + activeProject.documents.reduce((acc, d) => acc + d.content.length, 0)).toLocaleString()
                    } characters</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-3">
                    This context will be used to generate more personalized and accurate workouts
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
                <p className="text-gray-600 mb-4">
                  Create a project to start adding context for your workouts
                </p>
                <button
                  onClick={createNewProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create First Project
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}