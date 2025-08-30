import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// QA Test Suite: Comprehensive Application Testing
// This test suite covers all major functionality, dark mode consistency, 
// responsive design, and accessibility features

let context: BrowserContext;
let page: Page;

// Test data for forms and uploads
const testClient = {
  name: 'Test Client QA',
  email: 'qa-test@example.com',
  phone: '555-0123',
  age: 30,
  goals: 'Weight loss and muscle building'
};

// Track all issues found during testing
const qaIssues: Array<{
  page: string;
  type: 'functionality' | 'ui' | 'accessibility' | 'dark-mode' | 'responsive' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  screenshot?: string;
}> = [];

// Utility function to add issues to the tracking array
const addIssue = async (
  pageName: string, 
  type: typeof qaIssues[0]['type'], 
  severity: typeof qaIssues[0]['severity'], 
  description: string
) => {
  const screenshotPath = `qa-issue-${pageName.replace('/', '-')}-${Date.now()}.png`;
  await page.screenshot({ path: `test-results/screenshots/${screenshotPath}` });
  
  qaIssues.push({
    page: pageName,
    type,
    severity,
    description,
    screenshot: screenshotPath
  });
  
  console.log(`🚨 QA Issue Found: ${severity.toUpperCase()} - ${description} on ${pageName}`);
};

// Utility function to check dark mode consistency
const checkDarkMode = async (pageName: string) => {
  const htmlClassList = await page.getAttribute('html', 'class');
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color
    };
  });

  if (!htmlClassList?.includes('dark')) {
    await addIssue(pageName, 'dark-mode', 'critical', 'HTML element missing dark class');
  }

  // Check for light mode colors (should not be present)
  const lightModeElements = await page.locator('[style*="background: white"], [style*="background: #fff"], [style*="background-color: white"], [style*="background-color: #ffffff"], [style*="color: black"], [style*="color: #000"]').count();
  
  if (lightModeElements > 0) {
    await addIssue(pageName, 'dark-mode', 'high', `Found ${lightModeElements} elements with light mode styling`);
  }

  // Check body background - should be dark
  if (bodyStyles.backgroundColor === 'rgb(255, 255, 255)' || bodyStyles.backgroundColor === 'white') {
    await addIssue(pageName, 'dark-mode', 'critical', 'Body has light background instead of dark');
  }
};

// Utility function to check responsive design
const checkResponsive = async (pageName: string) => {
  const viewports = [
    { width: 320, height: 568, name: 'Mobile Portrait' },
    { width: 768, height: 1024, name: 'Tablet Portrait' },
    { width: 1024, height: 768, name: 'Tablet Landscape' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500); // Allow layout to stabilize

    // Check for horizontal scrolling (usually indicates responsive issues)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll && viewport.width < 1024) {
      await addIssue(pageName, 'responsive', 'medium', `Horizontal scrolling detected on ${viewport.name} (${viewport.width}x${viewport.height})`);
    }

    // Check for overlapping elements
    const overlappingElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      let overlaps = 0;
      for (let i = 0; i < elements.length; i++) {
        const rect1 = elements[i].getBoundingClientRect();
        if (rect1.width === 0 || rect1.height === 0) continue;
        
        for (let j = i + 1; j < elements.length; j++) {
          const rect2 = elements[j].getBoundingClientRect();
          if (rect2.width === 0 || rect2.height === 0) continue;
          
          if (rect1.left < rect2.right && rect2.left < rect1.right &&
              rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
            overlaps++;
          }
        }
      }
      return overlaps;
    });

    if (overlappingElements > 10) { // Some overlap is normal, but excessive overlap indicates issues
      await addIssue(pageName, 'responsive', 'low', `High number of overlapping elements (${overlappingElements}) on ${viewport.name}`);
    }
  }

  // Reset to desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
};

// Utility function to check accessibility
const checkAccessibility = async (pageName: string) => {
  // Check for missing alt text on images
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    await addIssue(pageName, 'accessibility', 'medium', `${imagesWithoutAlt} images missing alt text`);
  }

  // Check for missing form labels
  const inputsWithoutLabels = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea, select'));
    return inputs.filter(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      return !hasLabel && !ariaLabel && !ariaLabelledby;
    }).length;
  });

  if (inputsWithoutLabels > 0) {
    await addIssue(pageName, 'accessibility', 'high', `${inputsWithoutLabels} form inputs missing labels or aria-labels`);
  }

  // Check for proper heading hierarchy
  const headings = await page.evaluate(() => {
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headingElements.map(h => parseInt(h.tagName.charAt(1)));
  });

  if (headings.length > 0) {
    const hasH1 = headings.includes(1);
    if (!hasH1) {
      await addIssue(pageName, 'accessibility', 'medium', 'Page missing H1 heading');
    }

    // Check for skipped heading levels
    const sortedHeadings = headings.sort((a, b) => a - b);
    for (let i = 1; i < sortedHeadings.length; i++) {
      if (sortedHeadings[i] - sortedHeadings[i-1] > 1) {
        await addIssue(pageName, 'accessibility', 'low', 'Heading hierarchy skips levels');
        break;
      }
    }
  }

  // Check color contrast (basic check - looking for low contrast combinations)
  const lowContrastElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    let lowContrastCount = 0;
    
    elements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const color = computed.color;
      const backgroundColor = computed.backgroundColor;
      
      // Basic check for obviously problematic combinations
      if ((color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') ||
          (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(230, 230, 230)')) {
        lowContrastCount++;
      }
    });
    
    return lowContrastCount;
  });

  if (lowContrastElements > 0) {
    await addIssue(pageName, 'accessibility', 'medium', `${lowContrastElements} elements may have low color contrast`);
  }
};

// Test functions for individual pages

test.describe('Atlas AI Workouts - Comprehensive QA Testing Cycle 1', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Create screenshots directory
    await page.evaluate(() => {
      // This runs in browser context, so we can't use fs directly
      // Playwright will handle screenshot directory creation
    });
  });

  test.afterAll(async () => {
    // Generate comprehensive QA report
    console.log('\n' + '='.repeat(80));
    console.log('ATLAS AI WORKOUTS - QA TEST REPORT - CYCLE 1 OF 3');
    console.log('='.repeat(80));
    console.log(`Total Issues Found: ${qaIssues.length}`);
    
    const issuesByType = qaIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const issuesBySeverity = qaIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nISSUES BY TYPE:');
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\nISSUES BY SEVERITY:');
    Object.entries(issuesBySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count}`);
    });
    
    console.log('\nDETAILED ISSUES:');
    qaIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type.toUpperCase()}`);
      console.log(`   Page: ${issue.page}`);
      console.log(`   Issue: ${issue.description}`);
      if (issue.screenshot) {
        console.log(`   Screenshot: ${issue.screenshot}`);
      }
    });
    
    await context.close();
  });

  test('Landing Page (/) - Complete Functionality and UI Test', async () => {
    console.log('🧪 Testing Landing Page (/)...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check page loads successfully
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check dark mode consistency
    await checkDarkMode('/');
    
    // Check for main navigation elements
    const nav = page.locator('nav, header').first();
    if (await nav.count() === 0) {
      await addIssue('/', 'functionality', 'medium', 'No navigation element found');
    }
    
    // Test all clickable elements
    const links = await page.locator('a').all();
    console.log(`Found ${links.length} links to test`);
    
    for (let i = 0; i < links.length; i++) {
      try {
        const href = await links[i].getAttribute('href');
        const text = await links[i].textContent();
        
        if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          // Test internal links
          try {
            await links[i].click({ timeout: 5000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            // Check if navigation was successful
            const currentUrl = page.url();
            if (currentUrl.includes('error') || currentUrl === 'about:blank') {
              await addIssue('/', 'functionality', 'high', `Link "${text}" (${href}) leads to error or blank page`);
            }
            
            // Go back to test next link
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } catch (error) {
            await addIssue('/', 'functionality', 'high', `Link "${text}" (${href}) failed to navigate: ${error}`);
          }
        }
      } catch (error) {
        await addIssue('/', 'functionality', 'medium', `Error testing link ${i}: ${error}`);
      }
    }
    
    // Test buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons to test`);
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const button = buttons[i];
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        const text = await button.textContent();
        
        if (!isVisible) {
          await addIssue('/', 'ui', 'low', `Button "${text}" is not visible`);
        }
        
        if (!isEnabled) {
          console.log(`Button "${text}" is disabled (this may be intentional)`);
        }
      } catch (error) {
        await addIssue('/', 'functionality', 'low', `Error testing button ${i}: ${error}`);
      }
    }
    
    // Check responsive design
    await checkResponsive('/');
    
    // Check accessibility
    await checkAccessibility('/');
    
    console.log('✅ Landing page testing completed');
  });

  test('Login Page (/login) - Authentication and Form Testing', async () => {
    console.log('🧪 Testing Login Page (/login)...');
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check dark mode consistency
    await checkDarkMode('/login');
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("sign in"), button:has-text("login")').first();
    
    if (await emailInput.count() === 0) {
      await addIssue('/login', 'functionality', 'critical', 'No email input field found');
    }
    
    if (await passwordInput.count() === 0) {
      await addIssue('/login', 'functionality', 'critical', 'No password input field found');
    }
    
    if (await submitButton.count() === 0) {
      await addIssue('/login', 'functionality', 'critical', 'No submit button found');
    }
    
    // Test form validation with invalid data
    if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
      // Test empty form submission
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Check for validation messages
      const validationMessages = await page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"]').count();
      if (validationMessages === 0) {
        await addIssue('/login', 'functionality', 'high', 'No validation messages shown for empty form submission');
      }
      
      // Test with invalid email
      await emailInput.fill('invalid-email');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Test with valid format but incorrect credentials
      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      // Check for authentication error message
      const errorMessage = await page.locator('.error, [role="alert"], .message').first();
      if (await errorMessage.count() > 0) {
        console.log('✅ Authentication error handling working');
      }
    }
    
    // Check responsive design
    await checkResponsive('/login');
    
    // Check accessibility
    await checkAccessibility('/login');
    
    console.log('✅ Login page testing completed');
  });

  test('Dashboard (/dashboard) - Data Loading and Navigation', async () => {
    console.log('🧪 Testing Dashboard (/dashboard)...');
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Dashboard redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/dashboard');
    
    // Look for dashboard components
    const dashboardElements = await page.locator('[class*="dashboard"], [id*="dashboard"], .card, .widget, .stats').count();
    if (dashboardElements === 0) {
      await addIssue('/dashboard', 'functionality', 'medium', 'No dashboard components found');
    }
    
    // Check for data loading indicators
    const loadingIndicators = await page.locator('.loading, .spinner, [aria-label*="loading"]').count();
    console.log(`Found ${loadingIndicators} loading indicators`);
    
    // Wait for any data to load
    await page.waitForTimeout(5000);
    
    // Check for error states
    const errorMessages = await page.locator('.error, [role="alert"]').count();
    if (errorMessages > 0) {
      await addIssue('/dashboard', 'functionality', 'high', `${errorMessages} error messages displayed on dashboard`);
    }
    
    // Test navigation links in dashboard
    const navLinks = await page.locator('a[href^="/"]').all();
    console.log(`Testing ${navLinks.length} navigation links`);
    
    for (let i = 0; i < Math.min(navLinks.length, 10); i++) { // Limit to 10 links to avoid excessive testing time
      try {
        const href = await navLinks[i].getAttribute('href');
        const text = await navLinks[i].textContent();
        
        if (href && href.startsWith('/')) {
          console.log(`Testing navigation to: ${href}`);
          await navLinks[i].click();
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          const newUrl = page.url();
          if (newUrl.includes('error')) {
            await addIssue('/dashboard', 'functionality', 'high', `Navigation link "${text}" (${href}) leads to error page`);
          }
          
          // Go back to dashboard
          await page.goBack();
          await page.waitForLoadState('networkidle');
        }
      } catch (error) {
        await addIssue('/dashboard', 'functionality', 'medium', `Error testing dashboard navigation link ${i}: ${error}`);
      }
    }
    
    // Check responsive design
    await checkResponsive('/dashboard');
    
    // Check accessibility
    await checkAccessibility('/dashboard');
    
    console.log('✅ Dashboard testing completed');
  });

  test('Clients Listing (/clients) - List Display and Client Management', async () => {
    console.log('🧪 Testing Clients Listing (/clients)...');
    
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Clients page redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/clients');
    
    // Wait for clients data to load
    await page.waitForTimeout(5000);
    
    // Check for client list or table
    const clientList = await page.locator('.client-list, table, .clients-grid, [data-testid="clients-list"]').count();
    if (clientList === 0) {
      await addIssue('/clients', 'functionality', 'high', 'No client list or table found');
    }
    
    // Check for search functionality
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').count();
    if (searchInput === 0) {
      await addIssue('/clients', 'functionality', 'medium', 'No search functionality found');
    } else {
      // Test search functionality
      const searchField = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').first();
      await searchField.fill('test');
      await page.waitForTimeout(2000);
      
      // Check if search results update
      console.log('✅ Search functionality tested');
    }
    
    // Check for pagination if there are many clients (165 expected)
    const paginationElements = await page.locator('.pagination, .pager, button:has-text("next"), button:has-text("previous")').count();
    console.log(`Found ${paginationElements} pagination elements`);
    
    // Check for "Add New Client" or similar button
    const addClientButton = await page.locator('button:has-text("add"), a[href*="/new"], button:has-text("create")').count();
    if (addClientButton === 0) {
      await addIssue('/clients', 'functionality', 'medium', 'No "Add Client" button found');
    }
    
    // Test client row/card clicks (if visible)
    const clientRows = await page.locator('tr:has(td), .client-card, .client-item').all();
    console.log(`Found ${clientRows.length} client rows/cards`);
    
    if (clientRows.length > 0) {
      try {
        // Test clicking the first client
        await clientRows[0].click();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        const newUrl = page.url();
        if (newUrl.includes('/clients/') && !newUrl.includes('error')) {
          console.log('✅ Client navigation working');
        } else if (newUrl.includes('error')) {
          await addIssue('/clients', 'functionality', 'high', 'Client row click leads to error page');
        }
        
        // Go back to clients list
        await page.goBack();
        await page.waitForLoadState('networkidle');
      } catch (error) {
        await addIssue('/clients', 'functionality', 'medium', `Error testing client row click: ${error}`);
      }
    } else if (clientList > 0) {
      await addIssue('/clients', 'functionality', 'high', 'Client list component exists but no client rows/cards found - data loading issue?');
    }
    
    // Check for sorting functionality
    const sortHeaders = await page.locator('th[role="button"], th[onclick], .sortable, .sort-header').count();
    console.log(`Found ${sortHeaders} sortable headers`);
    
    // Check responsive design
    await checkResponsive('/clients');
    
    // Check accessibility
    await checkAccessibility('/clients');
    
    console.log('✅ Clients listing testing completed');
  });

  test('Client Creation (/clients/new) - Form Functionality', async () => {
    console.log('🧪 Testing Client Creation (/clients/new)...');
    
    await page.goto('/clients/new');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Client creation page redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/clients/new');
    
    // Check for form elements
    const form = page.locator('form').first();
    if (await form.count() === 0) {
      await addIssue('/clients/new', 'functionality', 'critical', 'No form found on client creation page');
      return;
    }
    
    // Check for required form fields
    const nameField = page.locator('input[name*="name"], input[id*="name"], input[placeholder*="name"]').first();
    const emailField = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("save"), button:has-text("create")').first();
    
    if (await nameField.count() === 0) {
      await addIssue('/clients/new', 'functionality', 'high', 'No name field found in client form');
    }
    
    if (await emailField.count() === 0) {
      await addIssue('/clients/new', 'functionality', 'high', 'No email field found in client form');
    }
    
    if (await submitButton.count() === 0) {
      await addIssue('/clients/new', 'functionality', 'critical', 'No submit button found in client form');
    }
    
    // Test form validation
    if (await nameField.count() > 0 && await submitButton.count() > 0) {
      // Test empty form submission
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      const validationMessages = await page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"]').count();
      if (validationMessages === 0) {
        await addIssue('/clients/new', 'functionality', 'medium', 'No validation messages for empty form');
      }
      
      // Test form with valid data
      await nameField.fill(testClient.name);
      if (await emailField.count() > 0) {
        await emailField.fill(testClient.email);
      }
      
      // Fill other fields if they exist
      const phoneField = page.locator('input[type="tel"], input[name*="phone"], input[id*="phone"]').first();
      if (await phoneField.count() > 0) {
        await phoneField.fill(testClient.phone);
      }
      
      const ageField = page.locator('input[type="number"], input[name*="age"], input[id*="age"]').first();
      if (await ageField.count() > 0) {
        await ageField.fill(testClient.age.toString());
      }
      
      const goalsField = page.locator('textarea[name*="goal"], textarea[id*="goal"], input[name*="goal"]').first();
      if (await goalsField.count() > 0) {
        await goalsField.fill(testClient.goals);
      }
      
      console.log('✅ Form fields populated with test data');
      
      // Note: We won't actually submit to avoid creating test data
      // But we can check if the submit button becomes enabled
      const isSubmitEnabled = await submitButton.isEnabled();
      if (!isSubmitEnabled) {
        await addIssue('/clients/new', 'functionality', 'medium', 'Submit button remains disabled even with valid form data');
      }
    }
    
    // Check responsive design
    await checkResponsive('/clients/new');
    
    // Check accessibility
    await checkAccessibility('/clients/new');
    
    console.log('✅ Client creation testing completed');
  });

  test('Workout Builder (/builder) - AI Integration and Form Testing', async () => {
    console.log('🧪 Testing Workout Builder (/builder)...');
    
    await page.goto('/builder');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Workout builder redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/builder');
    
    // Check for workout builder components
    const builderForm = page.locator('form, .builder-form, .workout-form').first();
    if (await builderForm.count() === 0) {
      await addIssue('/builder', 'functionality', 'high', 'No workout builder form found');
    }
    
    // Check for AI-related elements
    const aiElements = await page.locator('[class*="ai"], [id*="ai"], button:has-text("generate"), button:has-text("ai")').count();
    console.log(`Found ${aiElements} AI-related elements`);
    
    // Check for workout parameters
    const workoutInputs = await page.locator('input, select, textarea').count();
    console.log(`Found ${workoutInputs} input elements in workout builder`);
    
    // Test dropdown/select elements if they exist
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      try {
        const options = await selects[i].locator('option').count();
        if (options <= 1) {
          await addIssue('/builder', 'functionality', 'medium', `Select dropdown ${i} has no options or only placeholder`);
        }
      } catch (error) {
        await addIssue('/builder', 'functionality', 'low', `Error testing select dropdown ${i}: ${error}`);
      }
    }
    
    // Check for generate button
    const generateButton = page.locator('button:has-text("generate"), button:has-text("create"), button[type="submit"]').first();
    if (await generateButton.count() === 0) {
      await addIssue('/builder', 'functionality', 'high', 'No generate/create workout button found');
    } else {
      // Test button click (but don't actually generate to avoid API calls)
      const isEnabled = await generateButton.isEnabled();
      console.log(`Generate button enabled: ${isEnabled}`);
    }
    
    // Check responsive design
    await checkResponsive('/builder');
    
    // Check accessibility
    await checkAccessibility('/builder');
    
    console.log('✅ Workout builder testing completed');
  });

  test('Bulk Workout Builder (/builder/bulk) - Bulk Operations', async () => {
    console.log('🧪 Testing Bulk Workout Builder (/builder/bulk)...');
    
    await page.goto('/builder/bulk');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Bulk builder redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/builder/bulk');
    
    // Check for bulk-specific elements
    const bulkElements = await page.locator('[class*="bulk"], [id*="bulk"], .batch, .multiple').count();
    console.log(`Found ${bulkElements} bulk-related elements`);
    
    // Check for file upload capability (likely needed for bulk)
    const fileInput = await page.locator('input[type="file"]').count();
    if (fileInput === 0) {
      await addIssue('/builder/bulk', 'functionality', 'medium', 'No file input found for bulk operations');
    }
    
    // Check responsive design
    await checkResponsive('/builder/bulk');
    
    // Check accessibility
    await checkAccessibility('/builder/bulk');
    
    console.log('✅ Bulk workout builder testing completed');
  });

  test('Context Management (/context) - AI Context Handling', async () => {
    console.log('🧪 Testing Context Management (/context)...');
    
    await page.goto('/context');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Context page redirects to login (authentication required) - this is expected behavior');
      return;
    }
    
    // Check dark mode consistency
    await checkDarkMode('/context');
    
    // Check for context-related elements
    const contextElements = await page.locator('[class*="context"], [id*="context"], .rag, .knowledge').count();
    console.log(`Found ${contextElements} context-related elements`);
    
    // Check for file upload (for context documents)
    const fileInput = await page.locator('input[type="file"]').count();
    console.log(`Found ${fileInput} file input elements`);
    
    // Check responsive design
    await checkResponsive('/context');
    
    // Check accessibility
    await checkAccessibility('/context');
    
    console.log('✅ Context management testing completed');
  });

  test('Feedback Page (/feedback) - Form Submission and Handling', async () => {
    console.log('🧪 Testing Feedback Page (/feedback)...');
    
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');
    
    // Check dark mode consistency
    await checkDarkMode('/feedback');
    
    // Check for feedback form
    const feedbackForm = page.locator('form').first();
    if (await feedbackForm.count() === 0) {
      await addIssue('/feedback', 'functionality', 'high', 'No feedback form found');
    }
    
    // Check for form elements
    const messageField = page.locator('textarea, input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
    
    if (await messageField.count() === 0) {
      await addIssue('/feedback', 'functionality', 'high', 'No message/feedback input field found');
    }
    
    if (await submitButton.count() === 0) {
      await addIssue('/feedback', 'functionality', 'high', 'No submit button found in feedback form');
    }
    
    // Test form validation
    if (await messageField.count() > 0 && await submitButton.count() > 0) {
      // Test empty submission
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      const validationMessage = await page.locator('[role="alert"], .error, .required').count();
      if (validationMessage === 0) {
        await addIssue('/feedback', 'functionality', 'medium', 'No validation for empty feedback form');
      }
    }
    
    // Check responsive design
    await checkResponsive('/feedback');
    
    // Check accessibility
    await checkAccessibility('/feedback');
    
    console.log('✅ Feedback page testing completed');
  });

  test('API Endpoints Testing', async () => {
    console.log('🧪 Testing API Endpoints...');
    
    const apiEndpoints = [
      { url: '/api/test-db', method: 'GET', description: 'Database connection test' },
      { url: '/api/clients/test', method: 'GET', description: 'Clients API test' },
      // Note: Won't test POST endpoints that modify data
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Testing ${endpoint.method} ${endpoint.url}...`);
        
        const response = await page.request.fetch(endpoint.url, {
          method: endpoint.method
        });
        
        if (response.status() >= 500) {
          await addIssue('API', 'functionality', 'critical', `${endpoint.url} returns ${response.status()} server error`);
        } else if (response.status() >= 400 && response.status() < 500) {
          console.log(`${endpoint.url} returns ${response.status()} (may be expected for auth-required endpoints)`);
        } else {
          console.log(`✅ ${endpoint.url} returns ${response.status()}`);
        }
      } catch (error) {
        await addIssue('API', 'functionality', 'high', `${endpoint.url} failed to respond: ${error}`);
      }
    }
    
    console.log('✅ API endpoints testing completed');
  });

  test('Excel/CSV Import Functionality Testing', async () => {
    console.log('🧪 Testing Excel/CSV Import Functionality...');
    
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Cannot test import - authentication required');
      return;
    }
    
    // Look for import button/functionality
    const importButton = await page.locator('button:has-text("import"), input[type="file"], .import, .upload').count();
    
    if (importButton === 0) {
      await addIssue('/clients', 'functionality', 'medium', 'No import functionality found on clients page');
    } else {
      console.log(`✅ Found ${importButton} import-related elements`);
      
      // Check for file input specifically
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        // Check accepted file types
        const accept = await fileInput.getAttribute('accept');
        console.log(`File input accepts: ${accept || 'any file type'}`);
        
        if (!accept || (!accept.includes('xlsx') && !accept.includes('csv') && !accept.includes('excel'))) {
          await addIssue('/clients', 'functionality', 'low', 'File input may not restrict to Excel/CSV files');
        }
      }
    }
    
    console.log('✅ Excel/CSV import testing completed');
  });
});