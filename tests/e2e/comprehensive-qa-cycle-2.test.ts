import { test, expect, Page, BrowserContext } from '@playwright/test';
import { chromium } from '@playwright/test';

// ATLAS AI WORKOUTS - QA TESTING CYCLE 2 OF 3
// Focus: Verify cycle 1 fixes and identify new critical issues
// This test suite specifically validates that all dark mode violations,
// accessibility issues, and functionality gaps have been resolved

let context: BrowserContext;
let page: Page;

// Track cycle 2 issues with comparison to cycle 1
const cycle2Issues: Array<{
  page: string;
  type: 'functionality' | 'ui' | 'accessibility' | 'dark-mode' | 'responsive' | 'performance' | 'api';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  screenshot?: string;
  status: 'new' | 'regression' | 'persisting';
  cycle1Reference?: string;
}> = [];

// Cycle 1 critical issues to verify fixes
const cycle1CriticalIssues = [
  { page: '/clients/new', issue: 'Complete Dark Mode Violation', fixed: false },
  { page: '/feedback', issue: 'Complete Dark Mode Violation', fixed: false },
  { page: '/builder', issue: 'Dark Mode Violation', fixed: false },
  { page: '/clients', issue: 'Core Functionality Missing - No client display', fixed: false },
  { page: '/login', issue: 'Missing Form Validation', fixed: false },
  { page: 'all', issue: 'Body Background Color Inconsistency (white instead of dark)', fixed: false }
];

// Enhanced issue tracking with fix verification
const addIssue = async (
  pageName: string, 
  type: typeof cycle2Issues[0]['type'], 
  severity: typeof cycle2Issues[0]['severity'], 
  description: string,
  status: typeof cycle2Issues[0]['status'] = 'new',
  cycle1Reference?: string
) => {
  const screenshotPath = `cycle2-issue-${pageName.replace('/', '-')}-${Date.now()}.png`;
  await page.screenshot({ path: `test-results/screenshots/${screenshotPath}` });
  
  cycle2Issues.push({
    page: pageName,
    type,
    severity,
    description,
    screenshot: screenshotPath,
    status,
    cycle1Reference
  });
  
  const statusEmoji = status === 'new' ? '🆕' : status === 'regression' ? '⚠️' : '🔄';
  console.log(`${statusEmoji} CYCLE 2 Issue [${severity.toUpperCase()}]: ${description} on ${pageName}`);
};

// Enhanced dark mode checking with cycle 1 comparison
const checkDarkModeVerification = async (pageName: string) => {
  console.log(`🌙 Verifying dark mode implementation on ${pageName}...`);
  
  const htmlClassList = await page.getAttribute('html', 'class');
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      backgroundImage: computed.backgroundImage
    };
  });

  // Critical: Check for HTML dark class
  if (!htmlClassList?.includes('dark')) {
    await addIssue(pageName, 'dark-mode', 'critical', 'HTML element missing dark class', 'persisting', 'CRITICAL #6: Body Background Color Inconsistency');
  } else {
    console.log(`✅ ${pageName}: HTML has dark class`);
  }

  // Critical: Check body background (cycle 1 critical issue)
  if (bodyStyles.backgroundColor === 'rgb(255, 255, 255)' || bodyStyles.backgroundColor === 'white') {
    await addIssue(pageName, 'dark-mode', 'critical', 'Body has white background instead of dark', 'persisting', 'CRITICAL #6: Body Background Color Inconsistency');
    
    // Mark cycle 1 issue as not fixed
    const cycle1Issue = cycle1CriticalIssues.find(issue => issue.issue.includes('Body Background'));
    if (cycle1Issue) cycle1Issue.fixed = false;
  } else {
    console.log(`✅ ${pageName}: Body has dark background: ${bodyStyles.backgroundColor}`);
  }

  // Check for light mode elements (specific to cycle 1 violations)
  const lightModeElements = await page.evaluate(() => {
    const lightSelectors = [
      '[style*="background: white"]',
      '[style*="background: #fff"]', 
      '[style*="background-color: white"]',
      '[style*="background-color: #ffffff"]',
      '.bg-white',
      '.bg-gray-50',
      '.bg-gray-100',
      '[class*="bg-white"]',
      '[class*="bg-gray-50"]'
    ];
    
    let foundElements = [];
    lightSelectors.forEach(selector => {
      const elements = Array.from(document.querySelectorAll(selector));
      foundElements.push(...elements.map(el => ({
        selector: selector,
        tag: el.tagName,
        classes: el.className,
        styles: el.getAttribute('style')
      })));
    });
    
    return foundElements;
  });
  
  if (lightModeElements.length > 0) {
    console.log(`Found ${lightModeElements.length} light mode elements:`, lightModeElements.slice(0, 3));
    await addIssue(pageName, 'dark-mode', 'critical', `Found ${lightModeElements.length} elements with light mode styling (bg-white, bg-gray-50, etc.)`, 'persisting', `CRITICAL #1-3: Dark Mode Violations`);
  } else {
    console.log(`✅ ${pageName}: No light mode elements detected`);
  }

  // Comprehensive CSS check for common light mode patterns
  const cssViolations = await page.evaluate(() => {
    const violations = [];
    const allElements = Array.from(document.querySelectorAll('*'));
    
    allElements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const bg = computed.backgroundColor;
      const color = computed.color;
      
      // Check for white backgrounds
      if (bg === 'rgb(255, 255, 255)' || bg === 'white' || bg === '#ffffff') {
        violations.push({
          tag: el.tagName,
          classes: el.className,
          issue: 'White background',
          value: bg
        });
      }
      
      // Check for very light grays
      if (bg === 'rgb(249, 250, 251)' || bg === 'rgb(243, 244, 246)') {
        violations.push({
          tag: el.tagName,
          classes: el.className,
          issue: 'Light gray background',
          value: bg
        });
      }
      
      // Check for black text on potentially light backgrounds
      if (color === 'rgb(0, 0, 0)' || color === 'black') {
        violations.push({
          tag: el.tagName,
          classes: el.className,
          issue: 'Black text color',
          value: color
        });
      }
    });
    
    return violations;
  });

  if (cssViolations.length > 5) { // Allow some violations for icons, etc.
    console.log(`Found ${cssViolations.length} CSS dark mode violations:`, cssViolations.slice(0, 5));
    await addIssue(pageName, 'dark-mode', 'high', `${cssViolations.length} computed CSS violations of dark mode`, cssViolations.length > 20 ? 'persisting' : 'new');
  }
};

// Enhanced accessibility check focused on cycle 1 issues
const checkAccessibilityVerification = async (pageName: string) => {
  console.log(`♿ Verifying accessibility fixes on ${pageName}...`);
  
  // Specific cycle 1 issue: Missing form labels/aria-labels
  const inputsWithoutLabels = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], textarea, select'));
    const unlabeled = inputs.filter(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const placeholder = input.getAttribute('placeholder');
      
      // More lenient check - consider placeholder as acceptable labeling for some cases
      return !hasLabel && !ariaLabel && !ariaLabelledby && (!placeholder || placeholder.length < 3);
    });
    
    return unlabeled.map(input => ({
      tag: input.tagName,
      type: input.getAttribute('type'),
      name: input.getAttribute('name'),
      id: input.getAttribute('id'),
      classes: input.className,
      placeholder: input.getAttribute('placeholder')
    }));
  });

  if (inputsWithoutLabels.length > 0) {
    console.log(`Found ${inputsWithoutLabels.length} unlabeled inputs:`, inputsWithoutLabels);
    await addIssue(pageName, 'accessibility', 'high', `${inputsWithoutLabels.length} form inputs still missing proper labels or aria-labels`, 'persisting', 'HIGH #5-9: Accessibility Violations');
  } else {
    console.log(`✅ ${pageName}: All form inputs have proper labels`);
  }

  // Check heading hierarchy
  const headings = await page.evaluate(() => {
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headingElements.map(h => ({
      level: parseInt(h.tagName.charAt(1)),
      text: h.textContent?.substring(0, 50),
      tag: h.tagName
    }));
  });

  const hasH1 = headings.some(h => h.level === 1);
  if (!hasH1 && headings.length > 0) {
    await addIssue(pageName, 'accessibility', 'medium', 'Page missing H1 heading', 'persisting');
  } else if (hasH1) {
    console.log(`✅ ${pageName}: Has proper H1 heading`);
  }

  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    await addIssue(pageName, 'accessibility', 'medium', `${imagesWithoutAlt} images missing alt text`, 'persisting');
  }
};

// Enhanced functionality check focused on cycle 1 issues
const checkFunctionalityVerification = async (pageName: string) => {
  console.log(`⚙️ Verifying functionality fixes on ${pageName}...`);
  
  if (pageName === '/clients') {
    // CRITICAL CYCLE 1 ISSUE: Check if 165 clients are displaying
    await page.waitForTimeout(3000); // Allow time for data loading
    
    const clientElements = await page.evaluate(() => {
      // Look for various client display patterns
      const patterns = [
        'table tbody tr',
        '.client-card',
        '.client-item',
        '.client-row',
        '[data-testid*="client"]',
        '.clients-grid > *',
        '.client-list > *'
      ];
      
      let maxCount = 0;
      let foundPattern = '';
      
      patterns.forEach(pattern => {
        const elements = document.querySelectorAll(pattern);
        if (elements.length > maxCount) {
          maxCount = elements.length;
          foundPattern = pattern;
        }
      });
      
      return { count: maxCount, pattern: foundPattern };
    });
    
    console.log(`Found ${clientElements.count} client elements using pattern: ${clientElements.pattern}`);
    
    if (clientElements.count === 0) {
      await addIssue('/clients', 'functionality', 'critical', 'No client data displaying despite database having 165 clients', 'persisting', 'CRITICAL #4: Clients List Page - Core Functionality Missing');
      cycle1CriticalIssues.find(issue => issue.page === '/clients')!.fixed = false;
    } else if (clientElements.count < 10) {
      await addIssue('/clients', 'functionality', 'high', `Only ${clientElements.count} clients displaying, expected ~165`, 'persisting', 'CRITICAL #4: Clients List Page');
    } else if (clientElements.count >= 10 && clientElements.count <= 200) {
      console.log(`✅ Client list displaying ${clientElements.count} clients (reasonable count)`);
      cycle1CriticalIssues.find(issue => issue.page === '/clients')!.fixed = true;
    }
    
    // Check for search functionality
    const searchElements = await page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').count();
    if (searchElements === 0) {
      await addIssue('/clients', 'functionality', 'high', 'No search functionality found', 'persisting', 'HIGH #1: Clients Page Search Missing');
    } else {
      console.log(`✅ Found ${searchElements} search elements`);
    }
  }
  
  if (pageName === '/clients/new') {
    // Check if form elements are accessible and functional
    const formElements = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return { hasForm: false };
      
      return {
        hasForm: true,
        inputCount: form.querySelectorAll('input, textarea, select').length,
        hasNameField: !!form.querySelector('input[name*="name"], input[id*="name"], input[placeholder*="name"]'),
        hasEmailField: !!form.querySelector('input[type="email"], input[name*="email"]'),
        hasSubmitButton: !!form.querySelector('button[type="submit"], input[type="submit"]')
      };
    });
    
    if (!formElements.hasForm) {
      await addIssue('/clients/new', 'functionality', 'critical', 'No form found on client creation page', 'persisting');
    } else if (!formElements.hasNameField || !formElements.hasEmailField || !formElements.hasSubmitButton) {
      await addIssue('/clients/new', 'functionality', 'high', 'Client form missing essential fields or submit button', 'persisting', 'HIGH #2: New Client Form Missing Fields');
    } else {
      console.log(`✅ Client form has all essential elements`);
    }
  }
  
  if (pageName === '/feedback') {
    // CRITICAL CYCLE 1 ISSUE: Check if feedback form exists
    const feedbackForm = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return { hasForm: false };
      
      return {
        hasForm: true,
        hasTextArea: !!form.querySelector('textarea'),
        hasMessageField: !!form.querySelector('input[type="text"], textarea'),
        hasSubmitButton: !!form.querySelector('button[type="submit"], input[type="submit"]')
      };
    });
    
    if (!feedbackForm.hasForm || !feedbackForm.hasMessageField || !feedbackForm.hasSubmitButton) {
      await addIssue('/feedback', 'functionality', 'high', 'Feedback form still missing or incomplete', 'persisting', 'HIGH #3: Feedback Form Missing');
      cycle1CriticalIssues.find(issue => issue.page === '/feedback')!.fixed = false;
    } else {
      console.log(`✅ Feedback form is complete and functional`);
      cycle1CriticalIssues.find(issue => issue.page === '/feedback')!.fixed = true;
    }
  }
  
  if (pageName === '/builder') {
    // Check if workout builder form is accessible
    const builderForm = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form, .builder-form, .workout-form'));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      const buttons = Array.from(document.querySelectorAll('button'));
      
      return {
        formCount: forms.length,
        inputCount: inputs.length,
        buttonCount: buttons.length,
        hasSelectOptions: inputs.some(input => input.tagName === 'SELECT' && input.querySelectorAll('option').length > 1),
        hasGenerateButton: buttons.some(btn => btn.textContent?.toLowerCase().includes('generate') || btn.textContent?.toLowerCase().includes('create'))
      };
    });
    
    if (builderForm.formCount === 0 || builderForm.inputCount === 0) {
      await addIssue('/builder', 'functionality', 'high', 'Workout builder form elements not found or not accessible', 'persisting', 'HIGH #4: Workout Builder Form Missing');
    } else {
      console.log(`✅ Workout builder has ${builderForm.formCount} forms and ${builderForm.inputCount} inputs`);
    }
  }
  
  if (pageName === '/login') {
    // Check login validation (cycle 1 critical issue)
    const loginForm = page.locator('form').first();
    if (await loginForm.count() > 0) {
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.count() > 0) {
        // Test empty form submission
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const validationMessages = await page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"], .text-red-500').count();
        if (validationMessages === 0) {
          await addIssue('/login', 'functionality', 'high', 'No validation messages for empty login form submission', 'persisting', 'CRITICAL #5: Login Page - Missing Form Validation');
          cycle1CriticalIssues.find(issue => issue.page === '/login')!.fixed = false;
        } else {
          console.log(`✅ Login validation working - found ${validationMessages} validation messages`);
          cycle1CriticalIssues.find(issue => issue.page === '/login')!.fixed = true;
        }
      }
    }
  }
};

// Enhanced responsive testing
const checkResponsiveVerification = async (pageName: string) => {
  console.log(`📱 Verifying responsive design on ${pageName}...`);
  
  const viewports = [
    { width: 320, height: 568, name: 'Mobile Portrait' },
    { width: 768, height: 1024, name: 'Tablet Portrait' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);

    // Check for horizontal scrolling on smaller screens
    if (viewport.width <= 768) {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        await addIssue(pageName, 'responsive', 'medium', `Horizontal scrolling on ${viewport.name}`, 'persisting');
      }
    }
    
    // Check if critical elements are still visible and accessible
    const criticalElements = await page.evaluate(() => {
      const nav = document.querySelector('nav, .navigation, .navbar');
      const forms = document.querySelectorAll('form');
      const buttons = document.querySelectorAll('button:not([disabled])');
      
      return {
        hasNav: !!nav,
        visibleForms: Array.from(forms).filter(form => {
          const rect = form.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
        visibleButtons: Array.from(buttons).filter(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length
      };
    });

    console.log(`${viewport.name}: Nav=${criticalElements.hasNav}, Forms=${criticalElements.visibleForms}, Buttons=${criticalElements.visibleButtons}`);
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
};

test.describe('Atlas AI Workouts - QA Testing Cycle 2 (Fix Verification)', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    // Generate comprehensive cycle 2 report
    console.log('\n' + '='.repeat(100));
    console.log('ATLAS AI WORKOUTS - QA CYCLE 2 REPORT - FIX VERIFICATION & NEW ISSUES');
    console.log('='.repeat(100));
    
    // Cycle 1 fix verification summary
    console.log('\n🔍 CYCLE 1 CRITICAL ISSUES - FIX VERIFICATION:');
    cycle1CriticalIssues.forEach(issue => {
      const status = issue.fixed ? '✅ FIXED' : '❌ NOT FIXED';
      console.log(`  ${status}: ${issue.page} - ${issue.issue}`);
    });
    
    const fixedCount = cycle1CriticalIssues.filter(issue => issue.fixed).length;
    const totalCritical = cycle1CriticalIssues.length;
    console.log(`\n📊 FIX SUCCESS RATE: ${fixedCount}/${totalCritical} (${Math.round(fixedCount/totalCritical*100)}%) critical issues resolved`);
    
    // Cycle 2 new issues summary
    console.log(`\n🆕 CYCLE 2 NEW ISSUES FOUND: ${cycle2Issues.length}`);
    
    const issuesByStatus = cycle2Issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const issuesBySeverity = cycle2Issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nISSUES BY STATUS:');
    Object.entries(issuesByStatus).forEach(([status, count]) => {
      const emoji = status === 'new' ? '🆕' : status === 'persisting' ? '🔄' : '⚠️';
      console.log(`  ${emoji} ${status}: ${count}`);
    });
    
    console.log('\nISSUES BY SEVERITY:');
    Object.entries(issuesBySeverity).forEach(([severity, count]) => {
      const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟡' : severity === 'medium' ? '🟠' : '🟢';
      console.log(`  ${emoji} ${severity}: ${count}`);
    });
    
    await context.close();
  });

  // Test all critical pages from cycle 1 with fix verification focus
  const pagesToTest = [
    { url: '/', name: 'Landing Page', cycle1Issues: [] },
    { url: '/dashboard', name: 'Dashboard', cycle1Issues: ['Body background'] },
    { url: '/login', name: 'Login Page', cycle1Issues: ['Missing Form Validation', 'Body background'] },
    { url: '/clients', name: 'Clients List', cycle1Issues: ['Core Functionality Missing', 'Body background'] },
    { url: '/clients/new', name: 'New Client Form', cycle1Issues: ['Complete Dark Mode Violation', 'Form fields', 'Body background'] },
    { url: '/builder', name: 'Workout Builder', cycle1Issues: ['Dark Mode Violation', 'Form missing', 'Body background'] },
    { url: '/builder/bulk', name: 'Bulk Workout Builder', cycle1Issues: ['Accessibility violations', 'Body background'] },
    { url: '/context', name: 'Context Management', cycle1Issues: ['Accessibility violations', 'Body background'] },
    { url: '/feedback', name: 'Feedback Page', cycle1Issues: ['Complete Dark Mode Violation', 'Form missing', 'Body background'] },
    { url: '/workouts', name: 'Workouts List', cycle1Issues: ['Empty/broken', 'Body background'] }
  ];

  for (const pageInfo of pagesToTest) {
    test(`CYCLE 2 VERIFICATION: ${pageInfo.name} (${pageInfo.url}) - Fix Verification & New Issues`, async () => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔍 CYCLE 2 TESTING: ${pageInfo.name} (${pageInfo.url})`);
      console.log(`📋 Cycle 1 Issues to Verify: ${pageInfo.cycle1Issues.join(', ') || 'None specific'}`);
      console.log(`${'='.repeat(80)}`);
      
      try {
        // Navigate to page
        await page.goto(`http://localhost:3002${pageInfo.url}`);
        await page.waitForLoadState('networkidle');
        
        // Take comprehensive screenshots
        await page.screenshot({ 
          path: `test-results/screenshots/cycle2-${pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-desktop.png`, 
          fullPage: true 
        });
        
        // Mobile screenshot  
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: `test-results/screenshots/cycle2-${pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-mobile.png`, 
          fullPage: true 
        });
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        // 1. DARK MODE VERIFICATION (Primary focus from cycle 1)
        await checkDarkModeVerification(pageInfo.url);
        
        // 2. FUNCTIONALITY VERIFICATION
        await checkFunctionalityVerification(pageInfo.url);
        
        // 3. ACCESSIBILITY VERIFICATION
        await checkAccessibilityVerification(pageInfo.url);
        
        // 4. RESPONSIVE VERIFICATION
        await checkResponsiveVerification(pageInfo.url);
        
        // 5. PERFORMANCE CHECK (New for cycle 2)
        const performanceMetrics = await page.evaluate(() => {
          const perfData = window.performance.getEntriesByType('navigation')[0] as any;
          return {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            responseTime: perfData.responseEnd - perfData.requestStart
          };
        });
        
        if (performanceMetrics.domContentLoaded > 3000) {
          await addIssue(pageInfo.url, 'performance', 'medium', `Slow DOM content loading: ${performanceMetrics.domContentLoaded}ms`, 'new');
        }
        
        // 6. NEW COMPREHENSIVE UI CHECKS
        const uiHealthCheck = await page.evaluate(() => {
          const body = document.body;
          const allElements = Array.from(document.querySelectorAll('*'));
          
          // Check for broken images
          const brokenImages = Array.from(document.images).filter(img => 
            !img.complete || img.naturalWidth === 0
          ).length;
          
          // Check for empty clickable elements
          const emptyButtons = Array.from(document.querySelectorAll('button, a')).filter(el => 
            el.textContent?.trim() === '' && !el.querySelector('img, svg, [aria-label]')
          ).length;
          
          // Check for invisible text (potential contrast issues)
          const invisibleText = allElements.filter(el => {
            const computed = window.getComputedStyle(el);
            const hasText = el.textContent && el.textContent.trim().length > 0;
            return hasText && (computed.opacity === '0' || computed.visibility === 'hidden');
          }).length;
          
          return {
            brokenImages,
            emptyButtons,
            invisibleText,
            totalElements: allElements.length
          };
        });
        
        if (uiHealthCheck.brokenImages > 0) {
          await addIssue(pageInfo.url, 'ui', 'medium', `${uiHealthCheck.brokenImages} broken images detected`, 'new');
        }
        
        if (uiHealthCheck.emptyButtons > 0) {
          await addIssue(pageInfo.url, 'ui', 'low', `${uiHealthCheck.emptyButtons} empty clickable elements`, 'new');
        }
        
        if (uiHealthCheck.invisibleText > 2) {
          await addIssue(pageInfo.url, 'ui', 'medium', `${uiHealthCheck.invisibleText} potentially invisible text elements`, 'new');
        }
        
        console.log(`✅ Cycle 2 verification completed for ${pageInfo.name}`);
        console.log(`   UI Health: ${uiHealthCheck.totalElements} elements, ${uiHealthCheck.brokenImages} broken images, ${uiHealthCheck.emptyButtons} empty buttons`);
        
      } catch (error) {
        await addIssue(pageInfo.url, 'functionality', 'critical', `Page failed to load or test: ${error}`, 'new');
        console.log(`❌ Failed to test ${pageInfo.name}: ${error}`);
      }
    });
  }

  test('CYCLE 2 API HEALTH VERIFICATION', async () => {
    console.log('\n🔌 CYCLE 2: API Endpoint Health Check...');
    
    const endpoints = [
      { url: '/api/test-db', method: 'GET', description: 'Database connection', critical: true },
      { url: '/api/clients/test', method: 'GET', description: 'Client API', critical: true },
      { url: '/api/clients/import', method: 'OPTIONS', description: 'Import API CORS', critical: false },
      { url: '/api/workouts', method: 'GET', description: 'Workouts API', critical: false }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.fetch(`http://localhost:3002${endpoint.url}`, {
          method: endpoint.method
        });
        
        const status = response.status();
        
        if (status >= 500) {
          const severity = endpoint.critical ? 'critical' : 'high';
          await addIssue('API', 'api', severity, `${endpoint.url} returns ${status} server error`, 'new');
        } else if (status >= 400 && endpoint.critical) {
          await addIssue('API', 'api', 'medium', `${endpoint.url} returns ${status} (auth may be required)`, 'new');
        } else {
          console.log(`✅ ${endpoint.url}: ${status} - ${endpoint.description}`);
        }
      } catch (error) {
        const severity = endpoint.critical ? 'high' : 'medium';
        await addIssue('API', 'api', severity, `${endpoint.url} failed: ${error}`, 'new');
      }
    }
  });
});