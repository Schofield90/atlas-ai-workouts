// UUID validation utilities for ensuring data integrity

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface UUIDValidationResult {
  isValid: boolean
  cleanedId?: string
  error?: string
}

/**
 * Validates and cleans a UUID string
 * @param id - The UUID string to validate
 * @returns Validation result with cleaned ID if possible
 */
export function validateAndCleanUUID(id: string | null | undefined): UUIDValidationResult {
  if (!id) {
    return {
      isValid: false,
      error: 'UUID is required'
    }
  }

  // Trim whitespace
  let cleanedId = id.trim()

  // If ID is too long, attempt to truncate
  if (cleanedId.length > 36) {
    console.warn(`UUID too long (${cleanedId.length} chars), truncating: ${cleanedId}`)
    cleanedId = cleanedId.substring(0, 36)
  }

  // Validate format
  if (!UUID_REGEX.test(cleanedId)) {
    return {
      isValid: false,
      cleanedId,
      error: `Invalid UUID format: ${cleanedId}`
    }
  }

  return {
    isValid: true,
    cleanedId
  }
}

/**
 * Batch validates multiple UUIDs
 * @param ids - Array of UUID strings to validate
 * @returns Map of original ID to validation result
 */
export function validateUUIDBatch(ids: string[]): Map<string, UUIDValidationResult> {
  const results = new Map<string, UUIDValidationResult>()
  
  for (const id of ids) {
    results.set(id, validateAndCleanUUID(id))
  }
  
  return results
}

/**
 * Middleware helper to validate UUID in request params
 * @param id - The ID from request params
 * @returns Cleaned ID or throws error
 */
export function requireValidUUID(id: string | undefined): string {
  const validation = validateAndCleanUUID(id)
  
  if (!validation.isValid || !validation.cleanedId) {
    throw new Error(validation.error || 'Invalid UUID')
  }
  
  return validation.cleanedId
}

/**
 * Sanitizes client data to ensure valid UUIDs
 * @param client - Client object with potential invalid IDs
 * @returns Client object with cleaned IDs
 */
export function sanitizeClientData(client: any): any {
  if (!client) return client
  
  // Clean the main ID
  if (client.id) {
    const validation = validateAndCleanUUID(client.id)
    if (validation.cleanedId) {
      client.id = validation.cleanedId
    }
  }
  
  // Clean related IDs
  if (client.client_id) {
    const validation = validateAndCleanUUID(client.client_id)
    if (validation.cleanedId) {
      client.client_id = validation.cleanedId
    }
  }
  
  if (client.organization_id) {
    const validation = validateAndCleanUUID(client.organization_id)
    if (validation.cleanedId) {
      client.organization_id = validation.cleanedId
    }
  }
  
  if (client.user_id) {
    const validation = validateAndCleanUUID(client.user_id)
    if (validation.cleanedId) {
      client.user_id = validation.cleanedId
    }
  }
  
  return client
}

/**
 * Monitors and logs UUID issues for debugging
 * @param context - Context about where the validation occurred
 * @param id - The ID being validated
 * @param result - The validation result
 */
export function monitorUUIDIssue(context: string, id: string, result: UUIDValidationResult) {
  if (!result.isValid) {
    console.error(`[UUID Monitor] ${context}`, {
      originalId: id,
      cleanedId: result.cleanedId,
      error: result.error,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    })
    
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service like Sentry
    }
  }
}