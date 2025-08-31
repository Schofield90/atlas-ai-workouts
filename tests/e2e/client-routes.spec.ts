import { test, expect } from '@playwright/test'

const VALID_UUID = 'a3b7d016-350f-443e-8ccb-f751ac4f9a9c'
const MALFORMED_UUID = 'a3b7d016-350f-443e-8ccb-f751ac4f9a9c1' // 37 chars
const INVALID_UUID = 'not-a-valid-uuid'

test.describe('Client Routes UUID Handling', () => {
  test('should redirect malformed UUID to cleaned UUID', async ({ page }) => {
    // Navigate to a client page with malformed UUID (37 chars)
    const response = await page.goto(`/clients/${MALFORMED_UUID}`)
    
    // Should redirect to the cleaned UUID (36 chars)
    await expect(page).toHaveURL(`/clients/${VALID_UUID}`)
  })

  test('should handle /p/clients redirect', async ({ page }) => {
    // Navigate to old /p/clients path
    await page.goto(`/p/clients/${VALID_UUID}`)
    
    // Should redirect to new /clients path
    await expect(page).toHaveURL(`/clients/${VALID_UUID}`)
  })

  test('should handle /p/clients with malformed UUID', async ({ page }) => {
    // Navigate to old path with malformed UUID
    await page.goto(`/p/clients/${MALFORMED_UUID}`)
    
    // Should redirect to new path with cleaned UUID
    await expect(page).toHaveURL(`/clients/${VALID_UUID}`)
  })

  test('should show error for completely invalid UUID', async ({ page }) => {
    // Navigate to client page with invalid UUID
    await page.goto(`/clients/${INVALID_UUID}`)
    
    // Should show error message
    await expect(page.locator('text=Invalid client ID format')).toBeVisible()
  })

  test('should load client data with valid UUID', async ({ page }) => {
    // Navigate to valid client page
    await page.goto(`/clients/${VALID_UUID}`)
    
    // Wait for loading to complete
    await page.waitForSelector('text=Client Profile', { timeout: 10000 })
    
    // Should display client information
    const clientName = page.locator('h2')
    await expect(clientName).toBeVisible()
  })

  test('should handle client deletion with UUID validation', async ({ page }) => {
    // Navigate to client page
    await page.goto(`/clients/${VALID_UUID}`)
    
    // Wait for page to load
    await page.waitForSelector('text=Client Profile')
    
    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")')
    
    // Check if delete button exists (client might not exist)
    const deleteExists = await deleteButton.isVisible().catch(() => false)
    if (deleteExists) {
      // Set up dialog handler
      page.on('dialog', dialog => dialog.accept())
      
      // Click delete
      await deleteButton.click()
      
      // Should redirect to clients list
      await expect(page).toHaveURL('/clients')
    }
  })

  test('should clean UUID in workout routes', async ({ page }) => {
    // Navigate to workout with malformed UUID
    await page.goto(`/workouts/${MALFORMED_UUID}`)
    
    // Should redirect to cleaned UUID
    await expect(page).toHaveURL(`/workouts/${VALID_UUID}`)
  })

  test('should handle bulk client navigation', async ({ page }) => {
    // Go to clients list
    await page.goto('/clients')
    
    // Wait for clients to load
    await page.waitForSelector('h1:has-text("Clients")')
    
    // Check if any client links exist
    const clientLinks = page.locator('a[href^="/clients/"]')
    const count = await clientLinks.count()
    
    if (count > 0) {
      // Click first client link
      await clientLinks.first().click()
      
      // Should navigate to client page with valid UUID format
      await expect(page.url()).toMatch(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    }
  })

  test('should validate UUID in API calls', async ({ page }) => {
    // Test API endpoint with malformed UUID
    const response = await page.request.get(`/api/clients/${MALFORMED_UUID}`)
    
    // API should handle malformed UUID gracefully
    expect([200, 404]).toContain(response.status())
  })

  test('should monitor UUID issues in console', async ({ page }) => {
    const consoleLogs: string[] = []
    
    // Capture console messages
    page.on('console', msg => {
      if (msg.text().includes('UUID')) {
        consoleLogs.push(msg.text())
      }
    })
    
    // Navigate with malformed UUID
    await page.goto(`/clients/${MALFORMED_UUID}`)
    
    // Check if UUID cleaning was logged
    const hasUUIDLog = consoleLogs.some(log => 
      log.includes('Cleaning client ID') || 
      log.includes('Invalid UUID')
    )
    
    expect(hasUUIDLog).toBeTruthy()
  })
})

test.describe('Client Page Error Handling', () => {
  test('should show user-friendly error for 404', async ({ page }) => {
    // Use a UUID that likely doesn't exist
    const nonExistentUUID = '00000000-0000-0000-0000-000000000000'
    
    await page.goto(`/clients/${nonExistentUUID}`)
    
    // Should show error message
    const errorMessage = page.locator('text=Client not found')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
    
    // Should show back link
    const backLink = page.locator('a:has-text("Back to Clients")')
    await expect(backLink).toBeVisible()
  })

  test('should maintain data integrity during navigation', async ({ page }) => {
    // Navigate to clients list
    await page.goto('/clients')
    
    // Get initial client count
    await page.waitForSelector('h1:has-text("Clients")')
    const initialLinks = await page.locator('a[href^="/clients/"]').count()
    
    // Navigate to a client and back
    if (initialLinks > 0) {
      await page.locator('a[href^="/clients/"]').first().click()
      await page.waitForSelector('text=Client Profile')
      await page.goBack()
      
      // Client count should remain the same
      const finalLinks = await page.locator('a[href^="/clients/"]').count()
      expect(finalLinks).toBe(initialLinks)
    }
  })
})