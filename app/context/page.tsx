'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Brain,
  Save,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  Book,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface SOP {
  id: string
  title: string
  content: string
  category: 'training' | 'nutrition' | 'assessment' | 'general'
  createdAt: string
}

export default function ContextPage() {
  const [sops, setSops] = useState<SOP[]>([])
  const [newSop, setNewSop] = useState({ title: '', content: '', category: 'general' as const })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadSops()
  }, [])

  function loadSops() {
    const saved = localStorage.getItem('workout-sops')
    if (saved) {
      setSops(JSON.parse(saved))
    }
  }

  function saveSop() {
    if (!newSop.title || !newSop.content) {
      setMessage({ type: 'error', text: 'Please fill in both title and content' })
      return
    }

    setSaving(true)
    
    const sop: SOP = {
      id: Date.now().toString(),
      title: newSop.title,
      content: newSop.content,
      category: newSop.category,
      createdAt: new Date().toISOString()
    }

    const updatedSops = [...sops, sop]
    setSops(updatedSops)
    localStorage.setItem('workout-sops', JSON.stringify(updatedSops))
    
    setNewSop({ title: '', content: '', category: 'general' })
    setMessage({ type: 'success', text: 'SOP saved successfully! The AI will use this context when generating workouts.' })
    setSaving(false)
  }

  function deleteSop(id: string) {
    if (!confirm('Are you sure you want to delete this SOP?')) return
    
    const updatedSops = sops.filter(s => s.id !== id)
    setSops(updatedSops)
    localStorage.setItem('workout-sops', JSON.stringify(updatedSops))
    setMessage({ type: 'success', text: 'SOP deleted' })
  }

  const categoryColors = {
    training: 'text-blue-400 bg-blue-900/30 border-blue-800',
    nutrition: 'text-green-400 bg-green-900/30 border-green-800',
    assessment: 'text-purple-400 bg-purple-900/30 border-purple-800',
    general: 'text-gray-400 bg-gray-700 border-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h1 className="text-xl font-semibold text-gray-100">AI Context & SOPs</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Standard Operating Procedures</h2>
          <p className="text-gray-400">
            Add your training protocols, assessment methods, and other SOPs here. 
            The AI will use this context when generating workouts and recommendations.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-2 ${
            message.type === 'success' 
              ? 'bg-green-900/30 text-green-400 border border-green-800' 
              : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add New SOP */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New SOP
          </h3>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="SOP Title (e.g., 'Beginner Assessment Protocol')"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              value={newSop.title}
              onChange={(e) => setNewSop({ ...newSop, title: e.target.value })}
            />
            
            <select
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              value={newSop.category}
              onChange={(e) => setNewSop({ ...newSop, category: e.target.value as any })}
            >
              <option value="general">General</option>
              <option value="training">Training Protocols</option>
              <option value="nutrition">Nutrition Guidelines</option>
              <option value="assessment">Assessment Methods</option>
            </select>
            
            <textarea
              placeholder="Enter your SOP content here. Be detailed - this helps the AI understand your methods and preferences..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg h-48 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              value={newSop.content}
              onChange={(e) => setNewSop({ ...newSop, content: e.target.value })}
            />
            
            <button
              onClick={saveSop}
              disabled={saving || !newSop.title || !newSop.content}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save SOP
            </button>
          </div>
        </div>

        {/* Existing SOPs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Book className="w-5 h-5" />
            Your SOPs ({sops.length})
          </h3>
          
          {sops.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">No SOPs Yet</h3>
              <p className="text-gray-400">
                Add your first SOP above to help the AI understand your training methods and preferences.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sops.map((sop) => (
                <div key={sop.id} className="bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-100">{sop.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${categoryColors[sop.category]}`}>
                          {sop.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Added {new Date(sop.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSop(sop.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-gray-700 rounded p-4">
                    <p className="text-gray-300 whitespace-pre-wrap">{sop.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-blue-900/30 border border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tips for Better AI Context
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Be specific about exercise progressions and regressions</li>
            <li>• Include injury considerations and modifications</li>
            <li>• Describe your preferred workout structure and timing</li>
            <li>• Add any unique methods or philosophies you follow</li>
            <li>• Include client assessment criteria and benchmarks</li>
          </ul>
        </div>
      </main>
    </div>
  )
}