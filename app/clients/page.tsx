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
  User,
  Loader2
} from 'lucide-react'
import { simpleClientService as clientService } from '@/lib/services/workout-data-simple'

interface WorkoutClient {
  id: string
  full_name: string
  email?: string
  phone?: string
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  goals?: string
  injuries?: string
  equipment?: any[]
  preferences?: any
  notes?: string
  created_at: string
  updated_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<WorkoutClient[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClients()
    // Clear localStorage on mount
    clearLocalStorage()
  }, [])

  async function clearLocalStorage() {
    try {
      // Clear all workout-related localStorage
      localStorage.removeItem('ai-workout-clients')
      localStorage.removeItem('ai-workout-sessions')
      localStorage.removeItem('ai-workout-workouts')
      localStorage.removeItem('selected-client')
      console.log('✅ LocalStorage cleared - now using Supabase cloud storage')
    } catch (e) {
      console.log('LocalStorage not available')
    }
  }

  async function loadClients() {
    setLoading(true)
    try {
      const cloudClients = await clientService.getClients()
      setClients(cloudClients)
      console.log(`✅ Loaded ${cloudClients.length} clients from Supabase`)
      if (cloudClients.length === 0) {
        console.log('No clients found in database. Ready to add new clients.')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      setImportStatus({ type: 'error', message: `Error: ${error instanceof Error ? error.message : 'Failed to load clients'}` })
      setClients([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  async function deleteClient(clientId: string) {
    if (!confirm('Are you sure you want to delete this client?')) return
    
    try {
      await clientService.deleteClient(clientId)
      await loadClients() // Reload to get updated list
      setImportStatus({ type: 'success', message: 'Client deleted successfully' })
    } catch (error) {
      console.error('Error deleting client:', error)
      setImportStatus({ type: 'error', message: 'Failed to delete client' })
    }
  }

  function toggleSelectClient(clientId: string) {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
  }

  function selectAllVisible() {
    const visibleClientIds = filteredClients.map(c => c.id)
    setSelectedClients(new Set(visibleClientIds))
  }

  function clearSelection() {
    setSelectedClients(new Set())
  }

  async function deleteSelected() {
    if (selectedClients.size === 0) return
    
    const message = selectedClients.size === 1 
      ? 'Are you sure you want to delete this client?' 
      : `Are you sure you want to delete ${selectedClients.size} clients?`
    
    if (!confirm(message)) return
    
    try {
      setLoading(true)
      // Delete each selected client
      for (const clientId of selectedClients) {
        await clientService.deleteClient(clientId)
      }
      setSelectedClients(new Set())
      await loadClients()
      setImportStatus({ type: 'success', message: `Deleted ${selectedClients.size} clients` })
    } catch (error) {
      console.error('Error deleting clients:', error)
      setImportStatus({ type: 'error', message: 'Failed to delete some clients' })
    } finally {
      setLoading(false)
    }
  }

  async function deleteTestClients() {
    const testClients = clients.filter(c => 
      c.full_name.match(/^(Client \d+|Test Client|Sample Client)$/i)
    )
    
    if (testClients.length === 0) {
      setImportStatus({ type: 'error', message: 'No test clients found' })
      return
    }
    
    const message = `Delete ${testClients.length} test client${testClients.length === 1 ? '' : 's'}?`
    if (!confirm(message)) return
    
    try {
      setLoading(true)
      for (const client of testClients) {
        await clientService.deleteClient(client.id)
      }
      await loadClients()
      setImportStatus({ type: 'success', message: `Deleted ${testClients.length} test clients` })
    } catch (error) {
      console.error('Error deleting test clients:', error)
      setImportStatus({ type: 'error', message: 'Failed to delete test clients' })
    } finally {
      setLoading(false)
    }
  }

  async function importCSV(file: File) {
    setImporting(true)
    setImportStatus(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty')
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const nameIndex = headers.findIndex(h => h.includes('name'))
      const emailIndex = headers.findIndex(h => h.includes('email'))
      const phoneIndex = headers.findIndex(h => h.includes('phone'))
      const goalsIndex = headers.findIndex(h => h.includes('goal'))
      const injuriesIndex = headers.findIndex(h => h.includes('injur'))
      const equipmentIndex = headers.findIndex(h => h.includes('equipment'))
      const notesIndex = headers.findIndex(h => h.includes('note'))

      if (nameIndex === -1) {
        throw new Error('CSV must have a name column')
      }

      const newClients: Partial<WorkoutClient>[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (!values[nameIndex]) continue

        const client: Partial<WorkoutClient> = {
          full_name: values[nameIndex],
          email: emailIndex !== -1 ? values[emailIndex] : undefined,
          phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
          goals: goalsIndex !== -1 ? values[goalsIndex] : undefined,
          injuries: injuriesIndex !== -1 ? values[injuriesIndex] : undefined,
          equipment: equipmentIndex !== -1 && values[equipmentIndex] 
            ? values[equipmentIndex].split(';').map(e => e.trim())
            : [],
          notes: notesIndex !== -1 ? values[notesIndex] : undefined,
        }

        newClients.push(client)
      }

      // Import to Supabase
      let successCount = 0
      for (const client of newClients) {
        try {
          await clientService.createClient(client)
          successCount++
        } catch (error) {
          console.error('Error importing client:', client.full_name, error)
        }
      }

      await loadClients()
      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${successCount} of ${newClients.length} clients to cloud storage` 
      })
    } catch (error: any) {
      setImportStatus({ type: 'error', message: error.message })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function importExcel(file: File) {
    setImporting(true)
    setImportStatus(null)

    try {
      console.log('Processing Excel file:', file.name, 'Size:', file.size)
      
      // Process Excel file client-side to extract data
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule.default || xlsxModule
      
      if (!XLSX || !XLSX.read) {
        // Fallback to server processing for smaller files
        if (file.size < 1024 * 1024) { // Less than 1MB
          return importExcelViaServer(file)
        }
        throw new Error('Excel library not available. Please refresh the page.')
      }
      
      const arrayBuffer = await file.arrayBuffer()
      console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes')
      
      // Try reading with different options
      let workbook
      try {
        // Try with more permissive options
        workbook = XLSX.read(arrayBuffer, { 
          type: 'array', 
          cellDates: true,
          cellFormula: false,
          cellHTML: false,
          cellNF: false,
          cellStyles: false,
          cellText: false,
          WTF: true // Ignore errors
        })
      } catch (e) {
        console.error('Failed to read as array buffer, trying binary string')
        const binaryStr = String.fromCharCode(...new Uint8Array(arrayBuffer))
        workbook = XLSX.read(binaryStr, { type: 'binary', WTF: true })
      }
      
      console.log('Workbook sheets:', workbook.SheetNames)
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file')
      }
      
      const sheetName = workbook.SheetNames[0]
      console.log('Using sheet:', sheetName)
      
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`)
      }
      
      // Try different parsing methods
      let data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false, dateNF: 'YYYY-MM-DD' })
      console.log('Initial parse found', data.length, 'rows')
      
      // If no data, try with raw option
      if (!data || data.length === 0) {
        data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' })
        console.log('Raw parse found', data.length, 'rows')
      }
      
      // If still no data, try manual parsing
      if (!data || data.length === 0) {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        console.log('Sheet range:', range)
        
        // Manual parsing with header detection
        const headers = []
        const rows = []
        
        // Get headers from first row
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
          const cell = worksheet[cellAddress]
          headers.push(cell ? String(cell.v || '').trim() : `Column${col + 1}`)
        }
        console.log('Headers:', headers)
        
        // Get data rows
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          const rowData: any = {}
          let hasData = false
          
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]
            const header = headers[col - range.s.c]
            
            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
              rowData[header] = cell.v
              hasData = true
            }
          }
          
          if (hasData) rows.push(rowData)
        }
        
        data = rows
        console.log('Manual parse found', data.length, 'rows')
        
        if (data.length === 0) {
          throw new Error('No data found in Excel file. Please check the file format.')
        }
      }
      
      console.log(`Found ${data.length} rows in Excel file`)
      
      // Log first row to see column names
      if (data.length > 0) {
        console.log('First row keys:', Object.keys(data[0] as any))
        console.log('First row data:', data[0])
      }
      
      // Prepare clients data with flexible column matching
      const clients = data.map((row: any, index: number) => {
        // Log first few rows for debugging
        if (index < 3) {
          console.log(`Row ${index}:`, row)
        }
        
        // Try to find name in various possible column names (case-insensitive)
        const findValue = (keys: string[]) => {
          for (const key of keys) {
            // Check exact match
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return String(row[key]).trim()
            }
            // Check case-insensitive match
            const found = Object.keys(row).find(k => {
              const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
              const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
              return normalizedK === normalizedKey || normalizedK.includes(normalizedKey) || normalizedKey.includes(normalizedK)
            })
            if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
              return String(row[found]).trim()
            }
          }
          // If no specific column found, look for first non-empty value (might be name)
          if (keys.includes('Name') || keys.includes('Full Name')) {
            const firstValue = Object.values(row).find(v => v && String(v).trim() && !String(v).includes('@'))
            if (firstValue) return String(firstValue).trim()
          }
          return null
        }
        
        const name = findValue(['Name', 'Full Name', 'Client Name', 'Client', 'Customer', 'Member', 'First Name', 'Last Name', 'Person', 'Athlete'])
        const email = findValue(['Email', 'Email Address', 'E-mail', 'Mail', 'EmailAddress', 'Contact Email'])
        const phone = findValue(['Phone', 'Phone Number', 'Mobile', 'Cell', 'Contact', 'Tel', 'Telephone', 'Contact Number'])
        const goals = findValue(['Goals', 'Fitness Goals', 'Goal', 'Objectives', 'Training Goals', 'Targets'])
        const injuries = findValue(['Injuries', 'Medical History', 'Medical', 'Health Issues', 'Health', 'Conditions', 'Medical Conditions'])
        const equipment = findValue(['Equipment', 'Available Equipment', 'Gear', 'Tools', 'Resources'])
        const notes = findValue(['Notes', 'Comments', 'Additional Info', 'Info', 'Remarks', 'Additional Notes', 'Other'])
        
        // Handle special case where first/last name are separate
        let finalName = name
        if (!finalName) {
          const firstName = findValue(['First Name', 'FirstName', 'First', 'Given Name'])
          const lastName = findValue(['Last Name', 'LastName', 'Last', 'Surname', 'Family Name'])
          if (firstName || lastName) {
            finalName = [firstName, lastName].filter(Boolean).join(' ')
          }
        }
        
        return {
          name: finalName || '',
          email: email || null,
          phone: phone || null,
          goals: goals || null,
          injuries: injuries || null,
          equipment: equipment 
            ? String(equipment).split(/[,;|]/).map(e => e.trim()).filter(Boolean)
            : [],
          notes: notes || null
        }
      }).filter(c => c.name && String(c.name).trim() && c.name !== 'Name' && c.name !== 'Full Name')
      
      console.log(`Prepared ${clients.length} valid clients for import`)
      
      // Send in chunks to avoid payload size limits
      const chunkSize = 30 // Send 30 clients at a time
      let totalImported = 0
      
      for (let i = 0; i < clients.length; i += chunkSize) {
        const chunk = clients.slice(i, i + chunkSize)
        setImportStatus({ 
          type: 'success', 
          message: `Processing batch ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(clients.length/chunkSize)}...` 
        })
        
        const response = await fetch('/api/clients/import-chunked', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clients: chunk })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          console.error('Batch error:', result)
        } else {
          totalImported += result.imported
        }
      }
      
      await loadClients()
      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${totalImported} of ${clients.length} clients to cloud storage` 
      })
    } catch (error: any) {
      console.error('Import error:', error)
      setImportStatus({ type: 'error', message: error.message || 'Failed to import Excel file' })
    } finally {
      setImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ''
    }
  }
  
  async function importExcelViaServer(file: File) {
    // Fallback for small files
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/clients/import-simple', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to import file')
    }
    
    await loadClients()
    setImportStatus({ 
      type: 'success', 
      message: `Successfully imported ${result.imported} of ${result.total} clients` 
    })
  }

  function exportCSV() {
    const csv = [
      'Name,Email,Phone,Goals,Injuries,Equipment,Notes',
      ...clients.map(c => 
        `"${c.full_name}","${c.email || ''}","${c.phone || ''}","${c.goals || ''}","${c.injuries || ''}","${(c.equipment || []).join(';')}","${c.notes || ''}"`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  )

  if (loading && clients.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-2">Loading clients from cloud...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-8 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Clients (Cloud Storage)</h1>
            </div>
            <p className="text-purple-100">
              Manage your client database - All data saved to Supabase cloud
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{clients.length}</div>
            <div className="text-purple-200">Total Clients</div>
          </div>
        </div>
      </div>

      {importStatus && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          importStatus.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {importStatus.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <Link
              href="/clients/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Client
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Import Excel
            </button>
            <button
              onClick={exportCSV}
              disabled={clients.length === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importCSV(file)
          }}
        />

        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importExcel(file)
          }}
        />

        {selectedClients.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-blue-700">
              {selectedClients.size} client{selectedClients.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded"
              >
                Clear Selection
              </button>
              <button
                onClick={deleteSelected}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredClients.length > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <button
                onClick={selectAllVisible}
                className="hover:text-purple-600"
              >
                Select All ({filteredClients.length})
              </button>
              <button
                onClick={deleteTestClients}
                className="text-red-600 hover:text-red-700"
              >
                Delete Test Clients
              </button>
            </div>
          )}

          {filteredClients.map(client => (
            <div key={client.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={selectedClients.has(client.id)}
                onChange={() => toggleSelectClient(client.id)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <Link href={`/clients/${client.id}`} className="hover:text-purple-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold">{client.full_name}</h3>
                  </div>
                  {(client.email || client.phone) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {client.email} {client.email && client.phone && '•'} {client.phone}
                    </p>
                  )}
                  {client.goals && (
                    <p className="text-sm text-gray-500 mt-1">Goals: {client.goals}</p>
                  )}
                </Link>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => deleteClient(client.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No clients found matching your search' : 'No clients yet. Add your first client to get started!'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}