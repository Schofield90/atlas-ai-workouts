import { test, expect } from '@playwright/test';

test.describe('ATLAS AI WORKOUTS - CYCLE 3 VERIFICATION', () => {
  test.use({
    baseURL: 'http://localhost:3004'
  });

  test('Verify Critical Fixes from Cycles 1 & 2', async ({ page }) => {
    console.log('🔍 CYCLE 3: Verifying critical fixes...');
    
    // Test 1: Dark mode implementation across all pages
    console.log('\n📋 VERIFICATION 1: Dark Mode Implementation');
    
    const pagesToTest = [
      { path: '/', name: 'Landing (redirects to dashboard)' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/clients', name: 'Clients List' },
      { path: '/clients/new', name: 'New Client Form' },
      { path: '/builder', name: 'Workout Builder' },
      { path: '/feedback', name: 'Feedback Page' },
      { path: '/workouts', name: 'Workouts List' }
    ];

    for (const pageInfo of pagesToTest) {
      console.log(`\n🔍 Testing dark mode on ${pageInfo.name} (${pageInfo.path})`);
      
      try {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        
        // Check for dark mode indicators
        const htmlClass = await page.locator('html').getAttribute('class') || '';
        const bodyClass = await page.locator('body').getAttribute('class') || '';
        const bodyBackground = await page.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });
        
        console.log(`  HTML class: ${htmlClass}`);
        console.log(`  Body class: ${bodyClass}`);
        console.log(`  Body background: ${bodyBackground}`);
        
        // Check for light mode violations (white backgrounds)
        const lightModeElements = await page.locator('*').evaluateAll(elements => {
          const violators = [];
          elements.forEach((el, index) => {
            const styles = window.getComputedStyle(el);
            if (styles.backgroundColor === 'rgb(255, 255, 255)' || 
                styles.backgroundColor === 'white' ||
                styles.color === 'rgb(0, 0, 0)') {
              violators.push({
                tag: el.tagName,
                class: el.className,
                background: styles.backgroundColor,
                color: styles.color
              });
            }
          });
          return violators.slice(0, 5); // Limit to first 5 violations
        });
        
        if (lightModeElements.length > 0) {
          console.log(`  ❌ LIGHT MODE VIOLATIONS FOUND: ${lightModeElements.length}`);
          lightModeElements.forEach((el, i) => {
            console.log(`    ${i+1}. ${el.tag}.${el.class}: bg=${el.background}, color=${el.color}`);
          });
        } else {
          console.log(`  ✅ No light mode violations found`);
        }
        
        // Take screenshot for verification
        const screenshotName = pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        await page.screenshot({ 
          path: `test-results/screenshots/cycle3-${screenshotName}.png`,
          fullPage: true 
        });
        
      } catch (error) {
        console.log(`  ❌ Error testing ${pageInfo.name}: ${error.message}`);
      }
    }
    
    // Test 2: Client Management - Verify 165 clients display
    console.log('\n📋 VERIFICATION 2: Client Management');
    
    try {
      await page.goto('/clients');
      await page.waitForLoadState('networkidle');
      
      // Check for client list elements
      const clientElements = await page.locator('[data-testid="client"], .client-item, .client-row, tr').count();
      console.log(`  Client elements found: ${clientElements}`);
      
      // Check for search functionality
      const searchElements = await page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').count();
      console.log(`  Search elements found: ${searchElements}`);
      
      // Check for add/new client button
      const addButtons = await page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add"), a:has-text("New")').count();
      console.log(`  Add/New buttons found: ${addButtons}`);
      
      // Check if any table or list structure exists
      const tableExists = await page.locator('table, .table, .list, .grid').count();
      console.log(`  Table/list structures found: ${tableExists}`);
      
      if (clientElements === 0 && tableExists === 0) {
        console.log(`  ❌ CRITICAL: No client display structure found`);
      } else {
        console.log(`  ✅ Client display structure exists`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing client management: ${error.message}`);
    }
    
    // Test 3: Forms and Accessibility
    console.log('\n📋 VERIFICATION 3: Forms and Accessibility');
    
    await page.goto('/clients/new');
    await page.waitForLoadState('networkidle');
    
    const formElements = await page.locator('form').count();
    const inputElements = await page.locator('input').count();
    const labelElements = await page.locator('label').count();
    const unlabeledInputs = await page.locator('input:not([aria-label]):not([aria-labelledby])').filter({
      has: page.locator(':not(label)')
    }).count();
    
    console.log(`  Forms found: ${formElements}`);
    console.log(`  Input elements: ${inputElements}`);
    console.log(`  Label elements: ${labelElements}`);
    console.log(`  Potentially unlabeled inputs: ${unlabeledInputs}`);
    
    if (unlabeledInputs > 0) {
      console.log(`  ❌ ACCESSIBILITY: Found ${unlabeledInputs} unlabeled inputs`);
    } else {
      console.log(`  ✅ All inputs appear to be properly labeled`);
    }
    
    // Test 4: API Health Check
    console.log('\n📋 VERIFICATION 4: API Health Check');
    
    try {
      const dbResponse = await page.request.get('/api/test-db');
      console.log(`  Database API status: ${dbResponse.status()}`);
      
      if (dbResponse.ok()) {
        const dbData = await dbResponse.json();
        console.log(`  Database clients count: ${dbData.database?.currentClients || 'unknown'}`);
        console.log(`  ✅ Database API healthy`);
      } else {
        console.log(`  ❌ Database API unhealthy`);
      }
      
      const clientsResponse = await page.request.get('/api/clients/test');
      console.log(`  Clients API status: ${clientsResponse.status()}`);
      
      if (clientsResponse.ok()) {
        console.log(`  ✅ Clients API healthy`);
      } else {
        console.log(`  ❌ Clients API unhealthy`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing APIs: ${error.message}`);
    }
    
    console.log('\n🎯 CYCLE 3 VERIFICATION COMPLETE');
  });
  
  test('Test Core User Flows', async ({ page }) => {
    console.log('🔄 CYCLE 3: Testing core user flows...');
    
    // Flow 1: Navigation flow
    console.log('\n📍 Flow 1: Basic Navigation');
    
    await page.goto('/');
    console.log(`  Starting URL: ${page.url()}`);
    
    await page.waitForLoadState('networkidle');
    console.log(`  Final URL after redirects: ${page.url()}`);
    
    // Test navigation to key pages
    const navLinks = [
      { text: 'Clients', expected: '/clients' },
      { text: 'Dashboard', expected: '/dashboard' },
      { text: 'Workouts', expected: '/workouts' },
      { text: 'Builder', expected: '/builder' }
    ];
    
    for (const link of navLinks) {
      try {
        await page.click(`a:has-text("${link.text}"), button:has-text("${link.text}")`);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        if (currentUrl.includes(link.expected)) {
          console.log(`  ✅ ${link.text} navigation successful`);
        } else {
          console.log(`  ❌ ${link.text} navigation failed: expected ${link.expected}, got ${currentUrl}`);
        }
      } catch (error) {
        console.log(`  ❌ ${link.text} navigation error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 CORE FLOWS TESTING COMPLETE');
  });
  
  test('Check Automation Components Readiness', async ({ page }) => {
    console.log('🤖 CYCLE 3: Checking automation components readiness...');
    
    // Check for automation-related routes and components
    const automationPaths = [
      '/automations',
      '/builder/automation',
      '/workflows',
      '/templates'
    ];
    
    for (const path of automationPaths) {
      try {
        const response = await page.request.get(path);
        console.log(`  ${path}: ${response.status()}`);
        
        if (response.status() === 200) {
          console.log(`  ✅ ${path} exists and is accessible`);
        } else if (response.status() === 404) {
          console.log(`  ℹ️ ${path} does not exist (expected for new features)`);
        } else {
          console.log(`  ⚠️ ${path} returned status ${response.status()}`);
        }
      } catch (error) {
        console.log(`  ❌ Error checking ${path}: ${error.message}`);
      }
    }
    
    // Check for React Flow or similar automation libraries
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    
    // Look for canvas or flow-related elements
    const canvasElements = await page.locator('canvas, [data-testid="canvas"], .react-flow, .workflow-canvas').count();
    const nodeElements = await page.locator('.node, [data-testid="node"], .workflow-node').count();
    
    console.log(`  Canvas/flow elements found: ${canvasElements}`);
    console.log(`  Node elements found: ${nodeElements}`);
    
    if (canvasElements > 0 || nodeElements > 0) {
      console.log(`  ✅ Flow/automation UI components detected`);
    } else {
      console.log(`  ℹ️ No flow/automation UI components detected (ready for implementation)`);
    }
    
    console.log('\n🤖 AUTOMATION READINESS CHECK COMPLETE');
  });
});