import { test, expect, Page } from '@playwright/test';

// Detailed page inspection to manually verify issues and take comprehensive screenshots
test.describe('Atlas AI Workouts - Detailed Page Inspection', () => {
  
  test('Comprehensive page-by-page visual inspection and functionality check', async ({ page }) => {
    console.log('🔍 Starting comprehensive page inspection...');
    
    const pages = [
      { url: '/', name: 'Landing Page (redirects to dashboard)' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/login', name: 'Login Page' },
      { url: '/clients', name: 'Clients List' },
      { url: '/clients/new', name: 'New Client Form' },
      { url: '/builder', name: 'Workout Builder' },
      { url: '/builder/bulk', name: 'Bulk Workout Builder' },
      { url: '/context', name: 'Context Management' },
      { url: '/feedback', name: 'Feedback Page' },
      { url: '/workouts', name: 'Workouts List' }
    ];

    for (const pageInfo of pages) {
      console.log(`\n📋 Inspecting: ${pageInfo.name} (${pageInfo.url})`);
      
      try {
        // Navigate to page
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Take full page screenshot
        const screenshotName = pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        await page.screenshot({ 
          path: `test-results/screenshots/inspection-${screenshotName}-full.png`, 
          fullPage: true 
        });
        
        // Check page title and URL
        const title = await page.title();
        const currentUrl = page.url();
        console.log(`  Title: ${title}`);
        console.log(`  Current URL: ${currentUrl}`);
        
        // Check dark mode implementation
        const htmlClass = await page.getAttribute('html', 'class');
        const bodyStyles = await page.evaluate(() => {
          const body = document.body;
          const computed = window.getComputedStyle(body);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            className: body.className
          };
        });
        
        console.log(`  HTML class: ${htmlClass}`);
        console.log(`  Body background: ${bodyStyles.backgroundColor}`);
        console.log(`  Body text color: ${bodyStyles.color}`);
        console.log(`  Body class: ${bodyStyles.className}`);
        
        // Check for obvious UI elements
        const elementCounts = {
          forms: await page.locator('form').count(),
          buttons: await page.locator('button').count(),
          links: await page.locator('a').count(),
          inputs: await page.locator('input').count(),
          images: await page.locator('img').count(),
          headings: await page.locator('h1, h2, h3, h4, h5, h6').count(),
        };
        
        console.log(`  UI Elements:`, elementCounts);
        
        // Check for error messages or empty states
        const errorElements = await page.locator('.error, [role="alert"], .alert, .danger, .warning').count();
        const emptyStates = await page.locator(':has-text("No data"), :has-text("Nothing to show"), :has-text("Empty"), :has-text("No items")').count();
        
        console.log(`  Error indicators: ${errorElements}`);
        console.log(`  Empty states: ${emptyStates}`);
        
        // Check for loading indicators
        const loadingElements = await page.locator('.loading, .spinner, .loader, [aria-label*="loading"]').count();
        console.log(`  Loading indicators: ${loadingElements}`);
        
        // Test responsive design on mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: `test-results/screenshots/inspection-${screenshotName}-mobile.png`, 
          fullPage: true 
        });
        
        // Check for horizontal scrolling on mobile
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        console.log(`  Mobile horizontal scroll: ${hasHorizontalScroll}`);
        
        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // Try to interact with the page
        try {
          // Look for primary action buttons
          const primaryButtons = await page.locator('button:not([disabled]), .btn:not([disabled])').all();
          console.log(`  Interactive buttons found: ${primaryButtons.length}`);
          
          if (primaryButtons.length > 0 && primaryButtons.length < 10) {
            for (let i = 0; i < Math.min(primaryButtons.length, 3); i++) {
              try {
                const buttonText = await primaryButtons[i].textContent();
                const isVisible = await primaryButtons[i].isVisible();
                console.log(`    Button ${i}: "${buttonText}" (visible: ${isVisible})`);
              } catch (e) {
                console.log(`    Button ${i}: Error getting info - ${e}`);
              }
            }
          }
        } catch (e) {
          console.log(`  Error testing interactions: ${e}`);
        }
        
        // Look for navigation elements
        const navElements = await page.locator('nav, .navigation, .menu, .navbar').count();
        console.log(`  Navigation elements: ${navElements}`);
        
        // Check accessibility basics
        const missingAltImages = await page.locator('img:not([alt])').count();
        const unlabledInputs = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea'));
          return inputs.filter(input => {
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const hasLabel = id && document.querySelector(`label[for="${id}"]`);
            return !hasLabel && !ariaLabel;
          }).length;
        });
        
        console.log(`  Images missing alt text: ${missingAltImages}`);
        console.log(`  Unlabeled form inputs: ${unlabledInputs}`);
        
        console.log(`✅ Completed inspection of ${pageInfo.name}`);
        
      } catch (error) {
        console.log(`❌ Error inspecting ${pageInfo.name}: ${error}`);
        
        // Take error screenshot
        const screenshotName = pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        await page.screenshot({ 
          path: `test-results/screenshots/inspection-${screenshotName}-error.png` 
        });
      }
      
      // Small delay between pages
      await page.waitForTimeout(1000);
    }
    
    console.log('\n🏁 Page inspection complete!');
  });

  test('Test critical user flows', async ({ page }) => {
    console.log('🔄 Testing critical user flows...');
    
    // Flow 1: Landing -> Dashboard -> Clients
    console.log('\n📍 Flow 1: Landing -> Dashboard -> Clients');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log(`  Step 1 - Landing URL: ${page.url()}`);
    
    // Should redirect to dashboard
    if (page.url().includes('/dashboard')) {
      console.log('  ✅ Landing page redirects to dashboard');
      
      // Look for navigation to clients
      const clientsLink = page.locator('a[href*="/clients"]').first();
      if (await clientsLink.count() > 0) {
        await clientsLink.click();
        await page.waitForLoadState('networkidle');
        console.log(`  Step 2 - Clients URL: ${page.url()}`);
        
        if (page.url().includes('/clients')) {
          console.log('  ✅ Successfully navigated to clients');
          await page.screenshot({ path: 'test-results/screenshots/flow1-clients-page.png' });
        } else {
          console.log('  ❌ Failed to navigate to clients');
        }
      } else {
        console.log('  ❌ No clients link found on dashboard');
      }
    } else {
      console.log('  ❌ Landing page does not redirect to dashboard');
    }
    
    // Flow 2: Try to create a new client
    console.log('\n📍 Flow 2: Create new client');
    await page.goto('/clients/new');
    await page.waitForLoadState('networkidle');
    console.log(`  New client URL: ${page.url()}`);
    
    // Check if form is present
    const form = page.locator('form').first();
    if (await form.count() > 0) {
      console.log('  ✅ New client form found');
      await page.screenshot({ path: 'test-results/screenshots/flow2-new-client-form.png' });
      
      // Look for form fields
      const nameField = page.locator('input[name*="name"], input[placeholder*="name"], input[id*="name"]').first();
      const emailField = page.locator('input[type="email"], input[name*="email"]').first();
      
      if (await nameField.count() > 0) {
        console.log('  ✅ Name field found');
      } else {
        console.log('  ❌ Name field not found');
      }
      
      if (await emailField.count() > 0) {
        console.log('  ✅ Email field found');
      } else {
        console.log('  ❌ Email field not found');
      }
    } else {
      console.log('  ❌ No form found on new client page');
    }
    
    // Flow 3: Test workout builder
    console.log('\n📍 Flow 3: Workout builder');
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    console.log(`  Workout builder URL: ${page.url()}`);
    
    await page.screenshot({ path: 'test-results/screenshots/flow3-workout-builder.png' });
    
    const builderElements = await page.locator('form, .builder, .workout').count();
    console.log(`  Builder elements found: ${builderElements}`);
    
    // Flow 4: Test context page
    console.log('\n📍 Flow 4: Context management');
    await page.goto('/context');
    await page.waitForLoadState('networkidle');
    console.log(`  Context page URL: ${page.url()}`);
    
    await page.screenshot({ path: 'test-results/screenshots/flow4-context-page.png' });
    
    const contextElements = await page.locator('form, .context, .upload').count();
    console.log(`  Context elements found: ${contextElements}`);
    
    console.log('\n✅ User flow testing complete');
  });

  test('Test API endpoints manually', async ({ page, request }) => {
    console.log('🔗 Testing API endpoints...');
    
    const endpoints = [
      { url: '/api/test-db', method: 'GET', description: 'Database connection test' },
      { url: '/api/clients/test', method: 'GET', description: 'Client API test' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🧪 Testing ${endpoint.method} ${endpoint.url}...`);
        
        const response = await request.fetch(endpoint.url, {
          method: endpoint.method
        });
        
        const status = response.status();
        console.log(`  Response status: ${status}`);
        
        try {
          const responseText = await response.text();
          console.log(`  Response length: ${responseText.length} chars`);
          
          if (responseText.length < 500) {
            console.log(`  Response preview: ${responseText.substring(0, 200)}...`);
          }
          
          // Try to parse as JSON
          try {
            const json = JSON.parse(responseText);
            console.log(`  Response type: JSON (${Object.keys(json).length} keys)`);
          } catch {
            console.log(`  Response type: Text/HTML`);
          }
        } catch (e) {
          console.log(`  Could not read response body: ${e}`);
        }
        
        if (status >= 200 && status < 300) {
          console.log(`  ✅ ${endpoint.description} - SUCCESS`);
        } else if (status >= 400 && status < 500) {
          console.log(`  ⚠️  ${endpoint.description} - CLIENT ERROR (may be expected for auth)`);
        } else if (status >= 500) {
          console.log(`  ❌ ${endpoint.description} - SERVER ERROR`);
        }
        
      } catch (error) {
        console.log(`  ❌ ${endpoint.description} - NETWORK ERROR: ${error}`);
      }
    }
    
    console.log('\n✅ API endpoint testing complete');
  });
});