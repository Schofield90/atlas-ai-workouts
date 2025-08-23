'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Upload, 
  Plus, 
  Trash2, 
  Edit, 
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react'

interface Client {
  id: string
  full_name: string
  email?: string
  phone?: string
  goals?: string
  injuries?: string
  equipment?: string
  notes?: string
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  function loadClients() {
    const saved = localStorage.getItem('ai-workout-clients')
    if (saved) {
      setClients(JSON.parse(saved))
    }
  }

  function saveClients(updatedClients: Client[]) {
    localStorage.setItem('ai-workout-clients', JSON.stringify(updatedClients))
    setClients(updatedClients)
  }

  function deleteClient(clientId: string) {
    if (!confirm('Are you sure you want to delete this client?')) return
    
    const updated = clients.filter(c => c.id !== clientId)
    saveClients(updated)
  }

  async function handleExcelImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportStatus(null)

    try {
      console.log(`Processing file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      
      // Convert file to base64 for large files to avoid upload size limits
      const MAX_DIRECT_SIZE = 3 * 1024 * 1024 // 3MB
      let data
      
      if (file.size > MAX_DIRECT_SIZE) {
        // For large files, convert to base64 and send as JSON
        console.log('Large file detected, converting to base64...')
        
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string
            // Remove the data:application/...;base64, prefix
            const base64Data = base64.split(',')[1]
            resolve(base64Data)
          }
          reader.onerror = reject
        })
        
        reader.readAsDataURL(file)
        const base64Data = await base64Promise
        
        console.log('Sending base64 data to server...')
        const response = await fetch('/api/clients/import-excel-base64', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64Data
          })
        })
        
        const contentType = response.headers.get('content-type')
        
        if (!response.ok) {
          if (contentType?.includes('application/json')) {
            const error = await response.json()
            throw new Error(error.error || error.details || 'Failed to import Excel file')
          } else {
            const text = await response.text()
            console.error('Non-JSON response:', text.substring(0, 200))
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }
        }
        
        data = await response.json()
      } else {
        // Use direct upload for small files
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/clients/import-excel', {
          method: 'POST',
          body: formData
        })

        const contentType = response.headers.get('content-type')
        
        if (!response.ok) {
          if (contentType?.includes('application/json')) {
            const error = await response.json()
            throw new Error(error.error || error.details || 'Failed to import Excel file')
          } else {
            const text = await response.text()
            console.error('Non-JSON response:', text.substring(0, 200))
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }
        }

        if (!contentType?.includes('application/json')) {
          const text = await response.text()
          console.error('Expected JSON but got:', text.substring(0, 200))
          throw new Error('Server returned non-JSON response')
        }

        data = await response.json()
      }
      
      // Show debug info
      if (data.debug) {
        console.log('Excel Import Debug:', data.debug)
      }
      
      // Merge imported clients
      const existingIds = new Set(clients.map(c => c.full_name))
      const newClients = data.clients.filter((c: Client) => 
        !existingIds.has(c.full_name)
      )
      
      const updated = [...clients, ...newClients]
      saveClients(updated)
      
      setImportStatus({ 
        type: 'success', 
        message: `Imported ${newClients.length} clients from ${data.debug?.processedClients || 0} Excel sheets` 
      })
    } catch (error) {
      console.error('Excel import error:', error)
      setImportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to import Excel file' 
      })
    } finally {
      setImporting(false)
      if (excelInputRef.current) {
        excelInputRef.current.value = ''
      }
    }
  }

  async function handleCSVImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData
      })

      const contentType = response.headers.get('content-type')
      
      if (!response.ok) {
        if (contentType?.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || error.details || 'Failed to import clients')
        } else {
          const text = await response.text()
          console.error('Non-JSON response:', text.substring(0, 200))
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
      }

      if (!contentType?.includes('application/json')) {
        const text = await response.text()
        console.error('Expected JSON but got:', text.substring(0, 200))
        throw new Error('Server returned non-JSON response')
      }

      const data = await response.json()
      
      // Show debug info if available
      if (data.debug) {
        console.log('Import Debug Info:', data.debug)
        if (data.debug.sampleColumns.length > 0) {
          console.log('CSV Columns found:', data.debug.sampleColumns.join(', '))
        }
        if (data.debug.sampleRecord) {
          console.log('Sample record:', data.debug.sampleRecord)
        }
      }
      
      // Merge imported clients with existing ones
      const existingIds = new Set(clients.map(c => c.email || c.full_name))
      const newClients = data.clients.filter((c: Client) => 
        !existingIds.has(c.email || c.full_name)
      )
      
      const updated = [...clients, ...newClients]
      saveClients(updated)
      
      let statusMessage = `Successfully imported ${newClients.length} new clients`
      if (data.clients.length - newClients.length > 0) {
        statusMessage += ` (${data.clients.length - newClients.length} duplicates skipped)`
      }
      if (data.debug && data.debug.sampleColumns.length > 0) {
        statusMessage += `. CSV columns detected: ${data.debug.sampleColumns.join(', ')}`
      }
      
      setImportStatus({ 
        type: 'success', 
        message: statusMessage
      })
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus({ 
        type: 'error', 
        message: 'Failed to import clients. Make sure the CSV has the correct format.' 
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function exportClients() {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Goals', 'Injuries', 'Equipment', 'Notes'],
      ...clients.map(c => [
        c.full_name,
        c.email || '',
        c.phone || '',
        c.goals || '',
        c.injuries || '',
        c.equipment || '',
        c.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadTemplate() {
    const templateContent = [
      ['Name', 'Email', 'Phone', 'Goals', 'Injuries', 'Equipment', 'Notes'],
      ['John Doe', 'john@example.com', '+1234567890', 'Build muscle, lose fat', 'Lower back pain', 'Dumbbells, barbell, pull-up bar', 'Prefers morning workouts'],
      ['Jane Smith', 'jane@example.com', '+0987654321', 'Improve cardio endurance', 'None', 'Full gym access', 'Training for marathon']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([templateContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredClients = clients.filter(client => 
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.goals?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                <Users className="h-5 w-5 mr-2" />
                Client Management
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadTemplate}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                Template
              </button>
              <button
                onClick={exportClients}
                disabled={clients.length === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4 inline mr-1" />
                Export
              </button>
              <Link
                href="/clients/new"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Client
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Import Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Import Clients</h2>
            
            {/* Excel Import */}
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 mb-4 bg-green-50">
              <input
                ref={excelInputRef}
                type="file"
                onChange={handleExcelImport}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Import from Excel (Your Format)
              </p>
              <p className="text-xs text-gray-600 mb-4">
                Upload your Excel file with individual client sheets
                <br />
                <span className="text-gray-500">
                  Each sheet tab = 1 client, with injuries in A1, goals in C1
                </span>
              </p>
              <button
                onClick={() => excelInputRef.current?.click()}
                disabled={importing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {importing ? 'Importing...' : 'Choose Excel File (.xlsx)'}
              </button>
            </div>

            {/* CSV Import */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleCSVImport}
                accept=".csv"
                className="hidden"
              />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Or upload a standard CSV file
              </p>
              <p className="text-xs text-gray-500 mb-4">
                CSV should have columns: Name, Email, Phone, Goals, Injuries, Equipment, Notes
                <br />
                <span className="text-gray-400">
                  (We'll try to detect your column names automatically)
                </span>
              </p>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {importing ? 'Importing...' : 'Choose CSV File'}
                </button>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Download Template
                </button>
              </div>
            </div>

            {importStatus && (
              <div className={`mt-4 p-3 rounded flex items-center ${
                importStatus.type === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {importStatus.type === 'success' 
                  ? <CheckCircle className="h-4 w-4 mr-2" />
                  : <AlertCircle className="h-4 w-4 mr-2" />
                }
                {importStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4">
            <input
              type="text"
              placeholder="Search clients by name, email, or goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              Clients ({filteredClients.length})
            </h2>
          </div>
          
          {filteredClients.length > 0 ? (
            <div className="divide-y">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{client.full_name}</h3>
                        {client.email && (
                          <p className="text-sm text-gray-500">{client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-sm text-gray-500">{client.phone}</p>
                        )}
                        {client.goals && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Goals:</span> {client.goals}
                          </p>
                        )}
                        {client.injuries && (
                          <p className="text-sm text-orange-600 mt-1">
                            <span className="font-medium">Injuries:</span> {client.injuries}
                          </p>
                        )}
                        {client.equipment && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Equipment:</span> {client.equipment}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Added {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No clients found matching your search' : 'No clients added yet'}
              </p>
              <div className="space-y-2">
                <Link
                  href="/clients/new"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Your First Client
                </Link>
                <p className="text-sm text-gray-500">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Import from CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}