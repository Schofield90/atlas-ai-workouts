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
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const analyzeInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const multiSheetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadClients()
  }, [])

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
      // Use the convert-excel endpoint which handles both CSV and Excel
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'import')
      
      const response = await fetch('/api/clients/convert-excel', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || result.suggestion || 'Failed to import file')
      }
      
      await loadClients()
      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${result.imported} of ${result.total} clients to cloud storage` 
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
  
  async function importMultiSheetExcel(file: File) {
    setImporting(true)
    setImportStatus(null)
    
    try {
      // Check file size before uploading - process client-side if > 4MB
      if (file.size > 4 * 1024 * 1024) { // 4MB
        setImportStatus({ 
          type: 'info', 
          message: `Large file detected (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Processing client-side...` 
        })
        return await processLargeExcelClientSide(file)
      }
      
      const formData = new FormData()
      formData.append('file', file)
      
      let response
      let responseText = ''
      let result
      
      try {
        response = await fetch('/api/clients/import-multi-sheet', {
          method: 'POST',
          body: formData
        })
        
        responseText = await response.text()
        
        // Try to parse as JSON
        try {
          result = JSON.parse(responseText)
        } catch (jsonError) {
          // Handle non-JSON error responses
          console.error('Non-JSON response:', responseText)
          
          if (responseText.includes('Request Entity Too Large') || 
              responseText.includes('413') || 
              response.status === 413) {
            setImportStatus({ 
              type: 'info', 
              message: `Request too large (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Switching to client-side processing...` 
            })
            return await processLargeExcelClientSide(file)
          }
          
          throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}`)
        }
        
      } catch (fetchError: any) {
        // Handle network errors and fetch failures
        console.error('Network/fetch error:', fetchError)
        
        if (fetchError.message.includes('Failed to fetch') || 
            fetchError.message.includes('network') || 
            fetchError.message.includes('timeout') ||
            fetchError.name === 'TypeError') {
          setImportStatus({ 
            type: 'info', 
            message: `Network error detected (likely file too large). Switching to client-side processing...` 
          })
          return await processLargeExcelClientSide(file)
        }
        
        throw fetchError
      }
      
      if (!response.ok) {
        // Check if we need to use chunked processing
        if (result.needsChunking || response.status === 413) {
          setImportStatus({ 
            type: 'info', 
            message: `File requires chunked processing (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB, ${result.sheetCount || 'many'} sheets). Switching to client-side processing...` 
          })
          return await processLargeExcelClientSide(file)
        }
        throw new Error(result.error || result.suggestion || 'Failed to import multi-sheet file')
      }
      
      await loadClients()
      
      let message = `Successfully imported ${result.imported} clients from ${result.total} sheets`
      if (result.errors && result.errors.length > 0) {
        message += `\n\nSome sheets had errors:\n${result.errors.map((e: any) => `- ${e.sheet || e.client}: ${e.error}`).join('\n')}`
      }
      
      setImportStatus({ 
        type: result.imported > 0 ? 'success' : 'error', 
        message 
      })
      
    } catch (error: any) {
      console.error('Import error:', error)
      setImportStatus({ type: 'error', message: error.message || 'Failed to import multi-sheet file' })
    } finally {
      setImporting(false)
      if (multiSheetInputRef.current) multiSheetInputRef.current.value = ''
    }
  }

  async function processLargeExcelClientSide(file: File) {
    try {
      setImportStatus({ type: 'info', message: 'Processing Excel file client-side...' })

      // Process file client-side using xlsx library
      const arrayBuffer = await file.arrayBuffer()
      
      // Import xlsx dynamically to avoid SSR issues
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule.default || xlsxModule
      
      if (!XLSX || !XLSX.read) {
        throw new Error('Excel library not available. Please refresh the page and try again.')
      }

      // Read workbook with optimized settings
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellFormula: false,
        cellHTML: false,
        cellNF: false,
        cellStyles: false,
        cellText: false,
        raw: false,
        dense: false,
        WTF: true // Ignore errors
      })

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file')
      }

      setImportStatus({ 
        type: 'info', 
        message: `Found ${workbook.SheetNames.length} sheets. Extracting client data...` 
      })

      // Extract client data from all sheets
      const allClients: any[] = []
      const sheetErrors: any[] = []

      for (const sheetName of workbook.SheetNames) {
        try {
          // Skip template/example sheets
          if (sheetName.toLowerCase().includes('template') || 
              sheetName.toLowerCase().includes('example') ||
              sheetName.toLowerCase().includes('instructions') ||
              sheetName.toLowerCase().includes('readme')) {
            continue
          }

          const worksheet = workbook.Sheets[sheetName]
          if (!worksheet) continue

          // Extract name from sheet name
          const clientName = sheetName.trim()
          
          // Extract injuries and goals from cells
          const getCellValue = (address: string) => {
            const cell = worksheet[address]
            if (!cell) return null
            return cell.v ? String(cell.v).trim() : null
          }

          const findValueAfterLabel = (label: string) => {
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100')
            
            for (let row = range.s.r; row <= Math.min(range.e.r, 20); row++) {
              for (let col = range.s.c; col <= Math.min(range.e.c, 10); col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
                const cell = worksheet[cellAddress]
                
                if (cell && cell.v) {
                  const cellValue = String(cell.v).toLowerCase()
                  if (cellValue.includes(label.toLowerCase())) {
                    // Check the cell to the right or below for the value
                    const rightAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 })
                    const belowAddress = XLSX.utils.encode_cell({ r: row + 1, c: col })
                    
                    const rightCell = worksheet[rightAddress]
                    const belowCell = worksheet[belowAddress]
                    
                    if (rightCell && rightCell.v) {
                      return String(rightCell.v).trim()
                    } else if (belowCell && belowCell.v) {
                      return String(belowCell.v).trim()
                    }
                  }
                }
              }
            }
            return null
          }

          // Try to extract injuries and goals from common locations
          let injuries = getCellValue('B1') || getCellValue('A2') || getCellValue('B2') || 
                        findValueAfterLabel('injur') || findValueAfterLabel('medical') || 
                        findValueAfterLabel('health')
          
          let goals = getCellValue('B2') || getCellValue('A3') || getCellValue('B3') ||
                     findValueAfterLabel('goal') || findValueAfterLabel('objective') || 
                     findValueAfterLabel('target')

          // If not found, try to parse the sheet more thoroughly
          if (!injuries || !goals) {
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            
            for (let i = 0; i < Math.min(sheetData.length, 15); i++) {
              const row = sheetData[i] as any[]
              if (!row) continue
              
              for (let j = 0; j < Math.min(row.length, 8); j++) {
                const cellValue = String(row[j]).toLowerCase()
                
                if ((cellValue.includes('injur') || cellValue.includes('medical') || cellValue.includes('health')) && !injuries) {
                  if (j + 1 < row.length && row[j + 1]) {
                    injuries = String(row[j + 1]).trim()
                  } else if (i + 1 < sheetData.length) {
                    const nextRow = sheetData[i + 1] as any[]
                    if (nextRow && nextRow[j]) {
                      injuries = String(nextRow[j]).trim()
                    }
                  }
                }
                
                if ((cellValue.includes('goal') || cellValue.includes('objective') || cellValue.includes('target')) && !goals) {
                  if (j + 1 < row.length && row[j + 1]) {
                    goals = String(row[j + 1]).trim()
                  } else if (i + 1 < sheetData.length) {
                    const nextRow = sheetData[i + 1] as any[]
                    if (nextRow && nextRow[j]) {
                      goals = String(nextRow[j]).trim()
                    }
                  }
                }
              }
            }
          }

          // Add client if we have at least a name
          if (clientName && clientName.length > 0) {
            allClients.push({
              full_name: clientName,
              goals: goals || 'No goals specified',
              injuries: injuries || 'No injuries reported',
              email: null,
              phone: null,
              equipment: [],
              notes: null,
              sheetName: sheetName
            })
          }

        } catch (sheetError) {
          console.error(`Error processing sheet ${sheetName}:`, sheetError)
          sheetErrors.push({ sheet: sheetName, error: String(sheetError) })
        }
      }

      if (allClients.length === 0) {
        throw new Error('No valid client data found in any sheets')
      }

      setImportStatus({ 
        type: 'info', 
        message: `Extracted ${allClients.length} clients. Sending to server in chunks...` 
      })

      // Send data in chunks of 20 clients to the server
      const chunkSize = 20
      const totalClients = allClients.length
      const totalChunks = Math.ceil(totalClients / chunkSize)
      
      let totalImported = 0
      const allErrors: any[] = [...sheetErrors]

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startIndex = chunkIndex * chunkSize
        const endIndex = Math.min(startIndex + chunkSize - 1, totalClients - 1)
        const chunk = allClients.slice(startIndex, endIndex + 1)
        
        // Show progress like "Processing chunk 1 of 9..."
        setImportStatus({ 
          type: 'info', 
          message: `Processing chunk ${chunkIndex + 1} of ${totalChunks}... (clients ${startIndex + 1}-${endIndex + 1})` 
        })

        try {
          const response = await fetch(`/api/clients/import-large-excel?startIndex=${startIndex}&endIndex=${endIndex}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clients: chunk })
          })

          let result
          try {
            const responseText = await response.text()
            result = JSON.parse(responseText)
          } catch (parseError) {
            throw new Error('Server returned invalid response format')
          }

          if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`)
          }

          totalImported += result.successCount || 0
          
          if (result.errors && result.errors.length > 0) {
            allErrors.push(...result.errors)
          }

          console.log(`✓ Chunk ${chunkIndex + 1}: Imported ${result.successCount} clients`)

        } catch (chunkError) {
          console.error(`Error importing chunk ${chunkIndex + 1}:`, chunkError)
          allErrors.push({ 
            chunk: chunkIndex + 1, 
            error: String(chunkError),
            clientRange: `${startIndex + 1}-${endIndex + 1}`
          })
        }

        // Add small delay between chunks to avoid overwhelming the server
        if (chunkIndex < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 250))
        }
      }

      // Refresh client list
      await loadClients()

      // Show final results
      let message = `Successfully processed ${totalClients} clients from ${workbook.SheetNames.length} sheets.`
      message += `\nImported: ${totalImported} clients`
      
      if (allErrors.length > 0) {
        const errorCount = allErrors.length
        message += `\nErrors encountered: ${errorCount}`
        
        // Show first few errors
        const errorsToShow = allErrors.slice(0, 5).map((e: any) => {
          if (e.sheet) return `- Sheet "${e.sheet}": ${e.error}`
          if (e.chunk) return `- Chunk ${e.chunk} (clients ${e.clientRange}): ${e.error}`
          return `- ${e.error || 'Unknown error'}`
        }).join('\n')
        
        message += `\n\nError details:\n${errorsToShow}`
        if (allErrors.length > 5) {
          message += `\n... and ${allErrors.length - 5} more errors`
        }
      }

      setImportStatus({
        type: totalImported > 0 ? 'success' : 'error',
        message
      })

    } catch (error: any) {
      console.error('Large file client-side processing error:', error)
      setImportStatus({ 
        type: 'error', 
        message: error.message || 'Failed to process Excel file client-side' 
      })
    }
  }

  
  async function analyzeExcel(file: File) {
    setImporting(true)
    setImportStatus(null)
    setAnalysisResult(null)
    
    try {
      // First try the simpler test endpoint
      const formData = new FormData()
      formData.append('file', file)
      
      let response = await fetch('/api/clients/test-excel', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        // Fallback to analyze endpoint
        response = await fetch('/api/clients/analyze-excel', {
          method: 'POST',
          body: formData
        })
      }
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze file')
      }
      
      console.log('Excel Analysis Result:', result)
      setAnalysisResult(result)
      
      // Display analysis in import status
      if (result.analysis && result.analysis.sheets.length > 0) {
        const sheet = result.analysis.sheets[0]
        const message = `
File: ${result.analysis.fileName}
Sheet: ${sheet.name}
Rows: ${sheet.rowCount}
Columns: ${sheet.columnCount}

Headers found:
${sheet.headers.map((h: any) => `- Column ${h.column}: ${h.value || '(empty)'}`).join('\n')}

Recommendations:
${result.recommendations.join('\n')}

Check browser console for full analysis.`
        
        setImportStatus({ 
          type: 'success', 
          message: message
        })
      } else {
        setImportStatus({ 
          type: 'error', 
          message: 'No data found in Excel file' 
        })
      }
    } catch (error: any) {
      console.error('Analysis error:', error)
      setImportStatus({ type: 'error', message: error.message || 'Failed to analyze Excel file' })
    } finally {
      setImporting(false)
      if (analyzeInputRef.current) analyzeInputRef.current.value = ''
    }
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
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-8 rounded-xl mb-6 shadow-xl">
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
        <div className={`mb-4 p-4 rounded-lg flex items-start gap-2 ${
          importStatus.type === 'success' 
            ? 'bg-green-900/30 text-green-400 border border-green-800' 
            : importStatus.type === 'info'
            ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
            : 'bg-red-900/30 text-red-400 border border-red-800'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : importStatus.type === 'info' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <pre className="whitespace-pre-wrap font-mono text-xs">{importStatus.message}</pre>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search clients..."
            className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <Link
              href="/clients/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Client
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={() => multiSheetInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center gap-2 disabled:opacity-50"
              title="Import Excel where each tab/sheet is a different client"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Import Multi-Tab
            </button>
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 flex items-center gap-2 disabled:opacity-50"
              title="Import Excel where clients are rows in a single sheet"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Import Excel
            </button>
            <button
              onClick={() => analyzeInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 flex items-center gap-2 disabled:opacity-50"
              title="Analyze your Excel file to see its structure"
            >
              <AlertCircle className="w-5 h-5" />
              Analyze File
            </button>
            <button
              onClick={exportCSV}
              disabled={clients.length === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
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

        <input
          ref={analyzeInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) analyzeExcel(file)
          }}
        />
        
        <input
          ref={multiSheetInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importMultiSheetExcel(file)
          }}
        />

        {selectedClients.size > 0 && (
          <div className="mb-4 p-3 bg-blue-900/30 rounded-lg flex items-center justify-between border border-blue-800">
            <span className="text-blue-700">
              {selectedClients.size} client{selectedClients.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-blue-400 hover:bg-blue-800/50 rounded"
              >
                Clear Selection
              </button>
              <button
                onClick={deleteSelected}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
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
            <div key={client.id} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={selectedClients.has(client.id)}
                onChange={() => toggleSelectClient(client.id)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <Link href={`/clients/${client.id}`} className="hover:text-purple-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-100">{client.full_name}</h3>
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
                  className="p-2 text-blue-400 hover:bg-blue-900/50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => deleteClient(client.id)}
                  className="p-2 text-red-400 hover:bg-red-900/50 rounded-lg"
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