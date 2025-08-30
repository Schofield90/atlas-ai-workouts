'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'
import { createClient } from '@/lib/db/client'

interface UploadResult {
  success: boolean
  imported?: number
  failed?: number
  total?: number
  errors?: Array<{ row: number; error: string }>
  message?: string
}

interface AnalysisResult {
  fileName: string
  fileSize: number
  sheets: Array<{
    name: string
    clientName: string
    clientMetadata: Record<string, any>
    workoutData: any[]
    headers: string[]
    columnTypes: Record<string, string>
    rowCount: number
    sampleData: any[]
    recommendedMapping: Record<string, string>
    isClientSheet: boolean
    workoutCount: number
  }>
  recommendations: {
    importMethod: 'direct' | 'chunked'
    estimatedProcessingTime: number
    hasMultipleSheets: boolean
    clientSheets: number
    totalWorkouts: number
  }
}

export function ExcelUploadV2({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [userContext, setUserContext] = useState<{ userId: string; organizationId: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function analyzeFileClientSide(file: File): Promise<AnalysisResult> {
    // Parse Excel file client-side
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    const sheets = []
    let totalWorkouts = 0
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false }) as any[][]
      
      if (data.length === 0) continue
      
      // Extract client name from sheet name
      const clientName = sheetName.trim()
      
      // Find where workout data starts
      let dataStartRow = 0
      let metadataRows = 0
      
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i] || []
        if (row.some(cell => String(cell).toLowerCase().includes('date') || 
                              String(cell).toLowerCase().includes('workout'))) {
          dataStartRow = i
          metadataRows = i
          break
        }
      }
      
      // Extract metadata
      const metadata: Record<string, any> = {}
      for (let i = 0; i < metadataRows; i++) {
        const row = data[i] || []
        if (row.length >= 2 && row[0] && row[1]) {
          const key = String(row[0]).toLowerCase().trim()
          const value = String(row[1]).trim()
          
          if (key.includes('membership') || key.includes('goal') || key.includes('type')) {
            metadata[key] = value
          }
        }
      }
      
      const headers = data[dataStartRow] || []
      const workoutData = data.slice(dataStartRow + 1).filter(row => 
        row && !row.every(cell => !cell)
      )
      
      totalWorkouts += workoutData.length
      
      sheets.push({
        name: sheetName,
        clientName,
        clientMetadata: {
          membershipType: metadata['membership type'] || metadata['membership'],
          goals: metadata['goal'] || metadata['transformation goal'] || metadata['goals']
        },
        workoutData,
        headers: headers.map(h => String(h || '')),
        columnTypes: {},
        rowCount: workoutData.length,
        sampleData: workoutData.slice(0, 3),
        recommendedMapping: {},
        isClientSheet: true,
        workoutCount: workoutData.length
      })
    }
    
    return {
      fileName: file.name,
      fileSize: file.size,
      sheets,
      recommendations: {
        importMethod: 'direct',
        estimatedProcessingTime: sheets.length * 2,
        hasMultipleSheets: sheets.length > 1,
        clientSheets: sheets.length,
        totalWorkouts
      }
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset states
    setResult(null)
    setAnalysis(null)
    setProgress(0)

    // Skip user context check - bypass endpoint handles authentication internally

    // Analyze file first
    await analyzeFile(file)
  }

  async function getUserContext() {
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Authentication required')
      }
      
      // Get user's organization
      const { data: workoutUser, error: userError } = await supabase
        .from('workout_users')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (userError || !workoutUser?.organization_id) {
        throw new Error('User organization not found. Please ensure you are properly set up in the system.')
      }
      
      setUserContext({
        userId: user.id,
        organizationId: workoutUser.organization_id
      })
    } catch (error) {
      setResult({
        success: false,
        message: `Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  async function analyzeFile(file: File) {
    setAnalyzing(true)
    try {
      // Check file size - if larger than 4MB, process client-side
      const fileSizeMB = file.size / 1024 / 1024
      const isLargeFile = fileSizeMB > 4
      
      if (isLargeFile) {
        // Process file client-side for large files
        const analysisResult = await analyzeFileClientSide(file)
        setAnalysis(analysisResult)
      } else {
        // Use server-side analysis for smaller files
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/clients/import-v2/analyze', {
          method: 'POST',
          body: formData
        })

        // Get response as text first to handle non-JSON responses
        const responseText = await response.text()
        
        let result: any
        try {
          result = JSON.parse(responseText)
        } catch (jsonError) {
          // Handle non-JSON responses (like HTML error pages)
          console.error('Non-JSON response:', responseText)
          
          if (responseText.includes('Request Entity Too Large') || 
              responseText.includes('413') || 
              response.status === 413) {
            throw new Error(`File too large (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Please use a smaller file.`)
          }
          
          if (responseText.includes('502') || responseText.includes('Bad Gateway')) {
            throw new Error('Server temporarily unavailable. Please try again.')
          }
          
          if (responseText.includes('504') || responseText.includes('Gateway Timeout')) {
            throw new Error('Request timeout. Please try with a smaller file.')
          }
          
          throw new Error(`Server returned an invalid response. Please try again or contact support.`)
        }

        if (!response.ok) {
          throw new Error(result.error || result.message || 'Analysis failed')
        }

        const analysisResult: AnalysisResult = result
        setAnalysis(analysisResult)
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setAnalyzing(false)
    }
  }

  async function processFile(sheetIndex: number = 0) {
    if (!analysis || !fileInputRef.current?.files?.[0]) return

    const file = fileInputRef.current.files[0]
    const sheet = analysis.sheets[sheetIndex]
    const fileSizeMB = file.size / 1024 / 1024
    const isLargeFile = fileSizeMB > 4
    
    setUploading(true)
    setProgress(0)

    try {
      if (isLargeFile) {
        // Process large files client-side
        await processSingleSheetClientSide(sheetIndex)
      } else {
        // Use existing server-side processing for smaller files
        const useStreaming = analysis.recommendations.importMethod === 'chunked' || file.size > 5 * 1024 * 1024

        if (useStreaming) {
          await processWithStreaming(file, sheet.name)
        } else {
          await processDirectly(file, sheet.name)
        }
      }
      
      onUploadComplete()
    } catch (error) {
      setResult({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setUploading(false)
    }
  }

  async function processAllSheets() {
    console.log('processAllSheets called', { analysis, hasFile: !!fileInputRef.current?.files?.[0] })
    
    if (!analysis || !fileInputRef.current?.files?.[0]) {
      console.error('Missing analysis or file')
      return
    }

    const file = fileInputRef.current.files[0]
    const fileSizeMB = file.size / 1024 / 1024
    const isLargeFile = fileSizeMB > 4
    
    console.log('File details:', { sizeMB: fileSizeMB, isLargeFile, sheetsCount: analysis.sheets.length })
    
    setUploading(true)
    setProgress(0)

    try {
      if (isLargeFile) {
        console.log('Processing large file client-side')
        // Process large files client-side and send extracted data
        await processAllSheetsClientSide()
      } else {
        // Use existing server-side processing for smaller files
        const formData = new FormData()
        formData.append('file', file)
        formData.append('options', JSON.stringify({
          processAllSheets: true,
          skipRows: 0,
          dryRun: false
        }))

        const response = await fetch('/api/clients/import-v2/process', {
          method: 'POST',
          body: formData
        })

        const responseText = await response.text()
        
        let result: any
        try {
          result = JSON.parse(responseText)
        } catch (jsonError) {
          console.error('Non-JSON response:', responseText)
          
          if (responseText.includes('Request Entity Too Large') || 
              responseText.includes('413') || 
              response.status === 413) {
            throw new Error(`File too large (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Please use a smaller file.`)
          }
          
          throw new Error('Server returned an invalid response. Please try again or contact support.')
        }

        if (!response.ok) {
          throw new Error(result.error || result.message || 'Import failed')
        }

        const uploadResult: UploadResult = result
        setResult(uploadResult)
        setProgress(100)
      }
      
      onUploadComplete()
    } catch (error) {
      setResult({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setUploading(false)
    }
  }

  async function processDirectly(file: File, sheetName: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('options', JSON.stringify({
      sheetName,
      skipRows: 0,
      dryRun: false
    }))

    const response = await fetch('/api/clients/import-v2/process', {
      method: 'POST',
      body: formData
    })

    // Get response as text first to handle non-JSON responses
    const responseText = await response.text()
    
    let result: any
    try {
      result = JSON.parse(responseText)
    } catch (jsonError) {
      // Handle non-JSON responses (like HTML error pages)
      console.error('Non-JSON response:', responseText)
      
      if (responseText.includes('Request Entity Too Large') || 
          responseText.includes('413') || 
          response.status === 413) {
        throw new Error(`File too large (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Please use a smaller file.`)
      }
      
      if (responseText.includes('502') || responseText.includes('Bad Gateway')) {
        throw new Error('Server temporarily unavailable. Please try again.')
      }
      
      if (responseText.includes('504') || responseText.includes('Gateway Timeout')) {
        throw new Error('Request timeout. Please try with a smaller file.')
      }
      
      throw new Error(`Server returned an invalid response. Please try again or contact support.`)
    }

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Import failed')
    }

    const uploadResult: UploadResult = result
    setResult(uploadResult)
    setProgress(100)
  }

  async function processWithStreaming(file: File, sheetName: string) {
    // Parse file client-side and send in chunks
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const CHUNK_SIZE = 20
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE)
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    let totalImported = 0
    let totalFailed = 0
    const errors: Array<{ row: number; error: string }> = []

    for (let i = 0; i < totalChunks; i++) {
      const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      const isLastChunk = i === totalChunks - 1

      const response = await fetch('/api/clients/import-v2/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          chunkIndex: i,
          totalChunks,
          clients: chunk,
          isLastChunk
        })
      })

      // Handle response with robust error checking
      const responseText = await response.text()
      
      let chunkResult: any
      try {
        chunkResult = JSON.parse(responseText)
      } catch (jsonError) {
        // Handle non-JSON responses
        console.error('Non-JSON response in chunk processing:', responseText)
        const errorMessage = responseText.includes('Request Entity Too Large') || 
                            responseText.includes('413') || 
                            response.status === 413
          ? 'Chunk too large' 
          : 'Server error'
        errors.push({ row: i * CHUNK_SIZE + 1, error: errorMessage })
        totalFailed += chunk.length
        continue
      }
      
      if (!response.ok) {
        errors.push({ row: i * CHUNK_SIZE + 1, error: chunkResult.error || 'Chunk failed' })
        totalFailed += chunk.length
      } else {
        if (chunkResult.complete) {
          totalImported = chunkResult.totalImported
          if (chunkResult.errors) {
            errors.push(...chunkResult.errors)
          }
        } else {
          setProgress(chunkResult.progress || Math.round(((i + 1) / totalChunks) * 100))
        }
      }
    }

    setResult({
      success: totalImported > 0,
      imported: totalImported,
      failed: totalFailed,
      total: data.length,
      errors
    })
    setProgress(100)
  }

  async function processAllSheetsClientSide() {
    if (!analysis) {
      console.error('No analysis data available')
      return
    }
    
    // Skip user context check for bypass endpoint - it handles defaults internally
    
    console.log('Processing all sheets client-side:', analysis.sheets.length, 'sheets')
    
    try {
      // Extract client data from all sheets
      const clientsData = []
      for (const sheet of analysis.sheets) {
        console.log('Processing sheet:', sheet.name, sheet)
        
        const clientData = {
          full_name: sheet.clientName || sheet.name,
          goals: sheet.clientMetadata?.goals,
          preferences: {
            membershipType: sheet.clientMetadata?.membershipType,
            workoutHistory: (sheet.workoutData || []).map((row: any) => {
              const record = {} as Record<string, any>
              (sheet.headers || []).forEach((header, index) => {
                if (header && row[index] !== null && row[index] !== undefined) {
                  const headerStr = String(header).trim().toLowerCase()
                  const value = row[index]
                  
                  if (headerStr.includes('date')) {
                    record.date = value
                  } else if (headerStr.includes('workout') && headerStr.includes('completed')) {
                    record.completed = value
                  } else if (headerStr.includes('type')) {
                    record.workoutType = value
                  } else {
                    record[headerStr] = value
                  }
                }
              })
              return record
            })
          },
        notes: `Imported from sheet: ${sheet.name}. ${sheet.workoutData?.length || 0} workout records.`
        // user_id and organization_id will be handled by bypass endpoint with defaults
      }
      clientsData.push(clientData)
    }

    console.log('Sending', clientsData.length, 'clients to server in chunks')
    
    // Send data in chunks to avoid payload size limits
    const CHUNK_SIZE = 20 // Send 20 clients at a time
    let totalImported = 0
    let totalFailed = 0
    const allErrors: any[] = []
    
    for (let i = 0; i < clientsData.length; i += CHUNK_SIZE) {
      const chunk = clientsData.slice(i, i + CHUNK_SIZE)
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
      const totalChunks = Math.ceil(clientsData.length / CHUNK_SIZE)
      
      console.log(`Sending chunk ${chunkNum}/${totalChunks} (${chunk.length} clients)`)
      
      const response = await fetch('/api/clients/import-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: chunk
        })
      })

      let result: any
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error(`Chunk ${chunkNum} JSON parse error:`, jsonError)
        allErrors.push({ chunk: chunkNum, error: 'Failed to parse response' })
        totalFailed += chunk.length
        continue
      }
      
      console.log(`Chunk ${chunkNum} response:`, {
        status: response.status,
        ok: response.ok,
        imported: result.imported,
        failed: result.failed
      })
      
      if (!response.ok) {
        console.error(`Chunk ${chunkNum} failed:`, result)
        allErrors.push({ chunk: chunkNum, error: result.error || result.message })
        totalFailed += chunk.length
      } else {
        totalImported += result.imported || 0
        totalFailed += result.failed || 0
        if (result.errors) {
          allErrors.push(...result.errors)
        }
      }
      
      // Update progress after processing chunk (but avoid frequent state updates)
      const progressPercent = Math.round(((i + CHUNK_SIZE) / clientsData.length) * 90)
      if (chunkNum % 2 === 0 || chunkNum === totalChunks) { // Update every 2nd chunk or last chunk
        setProgress(progressPercent)
      }
      
      // Small delay between chunks to avoid overwhelming the server
      if (chunkNum < totalChunks) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log(`Completed chunk ${chunkNum}/${totalChunks}. Total imported so far: ${totalImported}`)
    }
    
    console.log(`All chunks processed. Total chunks: ${Math.ceil(clientsData.length / CHUNK_SIZE)}, Total clients: ${clientsData.length}`)
    
    setResult({
      success: totalImported > 0,
      imported: totalImported,
      failed: totalFailed,
      total: clientsData.length,
      errors: allErrors
    })
    setProgress(100)
    
    // Log final result
    console.log('Import completed:', {
      imported: totalImported,
      failed: totalFailed,
      total: clientsData.length,
      errors: allErrors
    })
    } catch (error) {
      console.error('Error in processAllSheetsClientSide:', error)
      throw error
    }
  }

  async function processSingleSheetClientSide(sheetIndex: number) {
    if (!analysis) return
    
    const sheet = analysis.sheets[sheetIndex]
    const clientData = {
      full_name: sheet.clientName || sheet.name,
      goals: sheet.clientMetadata?.goals,
      preferences: {
        membershipType: sheet.clientMetadata?.membershipType,
        workoutHistory: (sheet.workoutData || []).map((row: any) => {
          const record = {} as Record<string, any>
          (sheet.headers || []).forEach((header, index) => {
            if (header && row[index] !== null && row[index] !== undefined) {
              const headerStr = String(header).trim().toLowerCase()
              const value = row[index]
              
              if (headerStr.includes('date')) {
                record.date = value
              } else if (headerStr.includes('workout') && headerStr.includes('completed')) {
                record.completed = value
              } else if (headerStr.includes('type')) {
                record.workoutType = value
              } else {
                record[headerStr] = value
              }
            }
          })
          return record
        })
      },
      notes: `Imported from sheet: ${sheet.name}. ${sheet.workoutData?.length || 0} workout records.`
      // user_id and organization_id will be handled by bypass endpoint with defaults
    }

    // Send extracted data to server
    const response = await fetch('/api/clients/import-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clients: [clientData]
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || result.message || 'Import failed')
    }

    setResult({
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      total: result.total,
      errors: result.errors || []
    })
    setProgress(100)
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!analysis && !analyzing && (
        <div className="text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            Upload Excel or CSV file with client data
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Upload className="h-4 w-4 mr-2" />
            Select File
          </button>
        </div>
      )}

      {analyzing && (
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm text-gray-600">Analyzing file structure...</p>
        </div>
      )}

      {analysis && !uploading && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">File Analysis Complete</h3>
            <p className="text-sm text-blue-700">
              File: {analysis.fileName} ({Math.round(analysis.fileSize / 1024)}KB)
            </p>
            <p className="text-sm text-blue-700">
              Sheets found: {analysis.sheets.length}
            </p>
            <p className="text-sm text-blue-700">
              Recommended method: {analysis.recommendations.importMethod}
            </p>
          </div>

          {analysis.recommendations.hasMultipleSheets && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Multi-Client File Detected</h4>
              <p className="text-sm text-blue-700 mb-3">
                This file contains {analysis.sheets.length} clients, each in their own sheet.
                You can import all clients at once or select individual sheets.
              </p>
              <button
                onClick={() => processAllSheets()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mr-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import All Clients ({analysis.sheets.length})
                  </>
                )}
              </button>
            </div>
          )}

          {analysis.sheets.map((sheet, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">
                Client: {sheet.clientName}
                {(sheet as any).metadata?.membershipType && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({(sheet as any).metadata.membershipType})
                  </span>
                )}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {sheet.rowCount} workout records
                {(sheet as any).metadata?.goals && (
                  <span className="block text-xs text-gray-500">
                    Goals: {(sheet as any).metadata.goals}
                  </span>
                )}
              </p>
              <button
                onClick={() => processFile(index)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import This Client
              </button>
            </div>
          ))}

          <button
            onClick={() => {
              setAnalysis(null)
              setResult(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Choose Different File
          </button>
        </div>
      )}

      {uploading && (
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            {progress < 100 ? `Processing clients... (${progress}%)` : 'Finalizing import...'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {analysis && `Processing ${analysis.sheets.length} clients from Excel file`}
          </p>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'Import Successful' : 'Import Failed'}
              </p>
              {result.imported !== undefined && (
                <p className="text-sm text-gray-600 mt-1">
                  Imported: {result.imported} / {result.total} clients
                </p>
              )}
              {result.message && (
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-red-700 cursor-pointer">
                    {result.errors.length} errors occurred
                  </summary>
                  <ul className="mt-1 text-xs text-red-600 space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}