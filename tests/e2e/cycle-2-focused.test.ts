import { test, expect, Page } from '@playwright/test';

// FOCUSED CYCLE 2 TEST - Critical Pages Only
// Quick verification of the most important fixes from cycle 1

test.describe('Cycle 2 - Critical Pages Focus', () => {
  
  test('Critical Pages Dark Mode and Functionality Check', async ({ page }) => {
    console.log('🚀 CYCLE 2 FOCUSED TESTING - Critical Pages Only');
    
    const criticalPages = [
      { url: '/clients/new', name: 'New Client Form', cycle1Issue: 'Complete Dark Mode Violation' },
      { url: '/feedback', name: 'Feedback Page', cycle1Issue: 'Complete Dark Mode Violation' },
      { url: '/builder', name: 'Workout Builder', cycle1Issue: 'Dark Mode Violation' },
      { url: '/clients', name: 'Clients List', cycle1Issue: 'Core Functionality Missing' }
    ];
    
    const results = {
      fixedIssues: 0,
      persistingIssues: 0,
      newIssues: 0,
      details: [] as any[]
    };
    
    for (const pageInfo of criticalPages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Testing: ${pageInfo.name} (${pageInfo.url})`);
      console.log(`📋 Cycle 1 Issue: ${pageInfo.cycle1Issue}`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        await page.goto(`http://localhost:3002${pageInfo.url}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Screenshot for verification
        await page.screenshot({ 
          path: `test-results/screenshots/cycle2-focused-${pageInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`, 
          fullPage: true 
        });
        
        const pageResult = {
          page: pageInfo.name,
          url: pageInfo.url,
          cycle1Issue: pageInfo.cycle1Issue,
          darkModeFixed: false,
          functionalityWorking: false,
          newIssuesFound: [] as string[]
        };
        
        // 1. DARK MODE CHECK
        const darkModeStatus = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          const computed = window.getComputedStyle(body);
          
          // Check for light mode classes and styles
          const lightElements = Array.from(document.querySelectorAll('.bg-white, .bg-gray-50, .bg-gray-100')).length;
          const lightStyleElements = Array.from(document.querySelectorAll('[style*="background: white"], [style*="background-color: white"]')).length;
          
          return {
            hasDarkClass: html.classList.contains('dark'),
            bodyBackground: computed.backgroundColor,
            lightModeElements: lightElements + lightStyleElements,
            bodyColor: computed.color
          };
        });
        
        console.log(`   Dark Mode Status:`);
        console.log(`     HTML dark class: ${darkModeStatus.hasDarkClass}`);
        console.log(`     Body background: ${darkModeStatus.bodyBackground}`);
        console.log(`     Light mode elements: ${darkModeStatus.lightModeElements}`);
        
        // Determine if dark mode is fixed
        const isDarkModeFixed = darkModeStatus.hasDarkClass && 
                               darkModeStatus.bodyBackground !== 'rgb(255, 255, 255)' && 
                               darkModeStatus.lightModeElements === 0;
        
        pageResult.darkModeFixed = isDarkModeFixed;
        
        if (isDarkModeFixed) {
          console.log(`   ✅ DARK MODE: FIXED`);
          results.fixedIssues++;
        } else {
          console.log(`   ❌ DARK MODE: NOT FIXED`);
          results.persistingIssues++;
          if (darkModeStatus.lightModeElements > 0) {
            pageResult.newIssuesFound.push(`${darkModeStatus.lightModeElements} light mode elements still present`);
          }
        }
        
        // 2. FUNCTIONALITY CHECK
        if (pageInfo.url === '/clients') {
          // Check if clients are displaying
          await page.waitForTimeout(3000);
          const clientsDisplaying = await page.evaluate(() => {
            const patterns = ['table tbody tr', '.client-card', '.client-item', '.client-row'];
            let maxCount = 0;
            patterns.forEach(pattern => {
              const count = document.querySelectorAll(pattern).length;
              if (count > maxCount) maxCount = count;
            });
            return maxCount;
          });
          
          console.log(`   Client Display: ${clientsDisplaying} clients found`);
          pageResult.functionalityWorking = clientsDisplaying > 0;
          
          if (clientsDisplaying > 0) {
            console.log(`   ✅ FUNCTIONALITY: FIXED - Clients displaying`);
            results.fixedIssues++;
          } else {
            console.log(`   ❌ FUNCTIONALITY: NOT FIXED - No clients displaying`);
            results.persistingIssues++;
          }
        } else if (pageInfo.url === '/clients/new') {
          // Check form functionality
          const formStatus = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) return { hasForm: false };
            
            return {
              hasForm: true,
              hasNameField: !!form.querySelector('input[name*="name"], input[placeholder*="name"]'),
              hasEmailField: !!form.querySelector('input[type="email"]'),
              hasSubmitButton: !!form.querySelector('button[type="submit"]')
            };
          });
          
          pageResult.functionalityWorking = formStatus.hasForm && formStatus.hasNameField && formStatus.hasEmailField;
          console.log(`   Form Status: Form=${formStatus.hasForm}, Name=${formStatus.hasNameField}, Email=${formStatus.hasEmailField}`);
          
        } else if (pageInfo.url === '/feedback') {
          // Check feedback form
          const feedbackForm = await page.evaluate(() => {
            const form = document.querySelector('form');
            return {
              hasForm: !!form,
              hasTextArea: !!document.querySelector('textarea'),
              hasSubmit: !!document.querySelector('button[type="submit"]')
            };
          });
          
          pageResult.functionalityWorking = feedbackForm.hasForm && feedbackForm.hasTextArea;
          console.log(`   Feedback Form: Form=${feedbackForm.hasForm}, TextArea=${feedbackForm.hasTextArea}`);
          
        } else if (pageInfo.url === '/builder') {
          // Check builder functionality
          const builderStatus = await page.evaluate(() => {
            return {
              hasInputs: document.querySelectorAll('input, select, textarea').length,
              hasButtons: document.querySelectorAll('button').length,
              hasForm: !!document.querySelector('form')
            };
          });
          
          pageResult.functionalityWorking = builderStatus.hasInputs > 0 && builderStatus.hasButtons > 0;
          console.log(`   Builder Status: Inputs=${builderStatus.hasInputs}, Buttons=${builderStatus.hasButtons}`);
        }
        
        // 3. ACCESSIBILITY QUICK CHECK
        const accessibilityStatus = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea'));
          const unlabeledInputs = inputs.filter(input => {
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const hasLabel = id && document.querySelector(`label[for="${id}"]`);
            return !hasLabel && !ariaLabel;
          }).length;
          
          return { unlabeledInputs };
        });
        
        if (accessibilityStatus.unlabeledInputs > 0) {
          pageResult.newIssuesFound.push(`${accessibilityStatus.unlabeledInputs} inputs missing labels`);
        }
        
        results.details.push(pageResult);
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error}`);
        results.persistingIssues++;
        results.details.push({
          page: pageInfo.name,
          url: pageInfo.url,
          cycle1Issue: pageInfo.cycle1Issue,
          darkModeFixed: false,
          functionalityWorking: false,
          newIssuesFound: [`Page failed to load: ${error}`]
        });
      }
    }
    
    // SUMMARY REPORT
    console.log(`\n${'='.repeat(80)}`);
    console.log('CYCLE 2 FOCUSED TEST SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 RESULTS:`);
    console.log(`   ✅ Fixed Issues: ${results.fixedIssues}`);
    console.log(`   ❌ Persisting Issues: ${results.persistingIssues}`);
    console.log(`   🆕 New Issues: ${results.newIssues}`);
    console.log(`   📈 Fix Success Rate: ${Math.round(results.fixedIssues / (results.fixedIssues + results.persistingIssues) * 100)}%`);
    
    console.log(`\n📋 DETAILED RESULTS:`);
    results.details.forEach(result => {
      console.log(`\n   📄 ${result.page}:`);
      console.log(`     Cycle 1 Issue: ${result.cycle1Issue}`);
      console.log(`     Dark Mode Fixed: ${result.darkModeFixed ? '✅' : '❌'}`);
      console.log(`     Functionality Working: ${result.functionalityWorking ? '✅' : '❌'}`);
      if (result.newIssuesFound.length > 0) {
        console.log(`     New Issues: ${result.newIssuesFound.join(', ')}`);
      }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('CYCLE 2 FOCUSED TEST COMPLETE');
    console.log(`${'='.repeat(80)}`);
  });
});