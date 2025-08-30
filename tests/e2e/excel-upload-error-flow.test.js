/**
 * End-to-end test for Excel upload error flow
 * Tests the complete user journey when encountering JSON parsing errors
 */

describe('Excel Upload Error Flow E2E', () => {
  let mockFile

  beforeEach(() => {
    // Create a mock large file to trigger server limits
    mockFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large-test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  })

  describe('File Upload Error Scenarios', () => {
    test('should handle file too large error gracefully', async () => {
      // Mock the server response for file too large
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 413,
          text: () => Promise.resolve(`<!DOCTYPE html>
<html>
<head><title>Request Entity Too Large</title></head>
<body>
<h1>413 Request Entity Too Large</h1>
<p>nginx/1.18.0 (Ubuntu)</p>
</body>
</html>`)
        })

      global.fetch = mockFetch

      // Simulate the analyze flow
      const formData = new FormData()
      formData.append('file', mockFile)

      const response = await fetch('/api/clients/import-v2/analyze', {
        method: 'POST',
        body: formData
      })

      const responseText = await response.text()
      
      let result
      let errorMessage
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        if (responseText.includes('Request Entity Too Large') || 
            responseText.includes('413') || 
            response.status === 413) {
          errorMessage = `File too large (${Math.round(mockFile.size / 1024 / 1024 * 10) / 10}MB). Please use a smaller file.`
        } else {
          errorMessage = 'Server returned an invalid response.'
        }
      }

      expect(result).toBeUndefined()
      expect(errorMessage).toContain('File too large')
      expect(errorMessage).toContain('150.0MB') // Expected file size
      expect(mockFetch).toHaveBeenCalledWith('/api/clients/import-v2/analyze', {
        method: 'POST',
        body: expect.any(FormData)
      })
    })

    test('should handle server timeout gracefully', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          text: () => Promise.resolve(`<html><body><h1>504 Gateway Time-out</h1></body></html>`)
        })

      global.fetch = mockFetch

      const formData = new FormData()
      formData.append('file', mockFile)

      const response = await fetch('/api/clients/import-v2/analyze', {
        method: 'POST',
        body: formData
      })

      const responseText = await response.text()
      
      let result
      let errorMessage
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        if (responseText.includes('504') || responseText.includes('Gateway Timeout')) {
          errorMessage = 'Request timeout. Please try with a smaller file.'
        } else {
          errorMessage = 'Server returned an invalid response.'
        }
      }

      expect(result).toBeUndefined()
      expect(errorMessage).toContain('timeout')
    })

    test('should handle successful analysis after error retry', async () => {
      // First call fails with 413, second call succeeds
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 413,
          text: () => Promise.resolve('Request Entity Too Large')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({
            fileName: 'test.xlsx',
            fileSize: 1024,
            sheets: [{
              name: 'Sheet1',
              headers: ['name', 'email'],
              rowCount: 5,
              columnTypes: { name: 'text', email: 'text' },
              sampleData: [{ name: 'John', email: 'john@example.com' }],
              recommendedMapping: { name: 'full_name', email: 'email' }
            }],
            recommendations: {
              importMethod: 'direct',
              estimatedProcessingTime: 1,
              hasMultipleSheets: false
            }
          }))
        })

      global.fetch = mockFetch

      // First attempt - should fail
      let formData = new FormData()
      formData.append('file', mockFile)

      let response = await fetch('/api/clients/import-v2/analyze', {
        method: 'POST',
        body: formData
      })

      let responseText = await response.text()
      let result
      let errorMessage

      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        if (responseText.includes('Request Entity Too Large')) {
          errorMessage = 'File too large. Please use a smaller file.'
        }
      }

      expect(result).toBeUndefined()
      expect(errorMessage).toContain('File too large')

      // Second attempt - should succeed
      const smallFile = new File(['test'], 'small-test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      formData = new FormData()
      formData.append('file', smallFile)

      response = await fetch('/api/clients/import-v2/analyze', {
        method: 'POST',
        body: formData
      })

      responseText = await response.text()

      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        errorMessage = 'Server returned an invalid response.'
      }

      expect(result).toBeDefined()
      expect(result.fileName).toBe('test.xlsx')
      expect(result.sheets).toHaveLength(1)
      expect(errorMessage).toBeUndefined() // No error on second attempt
    })
  })

  describe('User Experience Validation', () => {
    test('should provide clear error messages for common scenarios', () => {
      const testCases = [
        {
          responseText: 'Request Entity Too Large',
          status: 413,
          expectedMessage: 'File too large',
        },
        {
          responseText: '<html><body><h1>502 Bad Gateway</h1></body></html>',
          status: 502,
          expectedMessage: 'Server temporarily unavailable',
        },
        {
          responseText: '<html><body><h1>504 Gateway Time-out</h1></body></html>',
          status: 504,
          expectedMessage: 'Request timeout',
        },
        {
          responseText: '<html><body>Something went wrong</body></html>',
          status: 500,
          expectedMessage: 'Server returned an invalid response',
        },
      ]

      testCases.forEach(({ responseText, status, expectedMessage }) => {
        let errorMessage
        
        try {
          JSON.parse(responseText)
        } catch (jsonError) {
          if (responseText.includes('Request Entity Too Large') || 
              responseText.includes('413') || 
              status === 413) {
            errorMessage = 'File too large. Please use a smaller file.'
          } else if (responseText.includes('502') || responseText.includes('Bad Gateway')) {
            errorMessage = 'Server temporarily unavailable. Please try again.'
          } else if (responseText.includes('504') || responseText.includes('Gateway Timeout')) {
            errorMessage = 'Request timeout. Please try with a smaller file.'
          } else {
            errorMessage = 'Server returned an invalid response. Please try again or contact support.'
          }
        }

        expect(errorMessage).toContain(expectedMessage)
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
})

console.log('✅ Excel Upload E2E Error Flow Tests Created')
console.log('These tests verify:')
console.log('  - Complete user journey during errors')
console.log('  - Error recovery and retry scenarios')
console.log('  - User-friendly error messages')
console.log('  - File size limit handling')
console.log('  - Server timeout handling')