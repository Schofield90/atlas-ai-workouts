// Simple browser test to check clients page functionality
// Open http://localhost:3004/clients in browser and run this in console

console.log('🔍 Testing Clients Page - Cycle 3 Verification');

// Check if page is properly loaded
console.log('Page URL:', window.location.href);
console.log('Page title:', document.title);

// Check dark mode implementation
const html = document.documentElement;
const body = document.body;
console.log('HTML classes:', html.className);
console.log('Body classes:', body.className);
console.log('Body background:', window.getComputedStyle(body).backgroundColor);
console.log('Body color:', window.getComputedStyle(body).color);

// Check for light mode violations (white backgrounds)
const elements = document.querySelectorAll('*');
const lightModeViolations = [];

elements.forEach((el, index) => {
  if (index < 100) { // Check first 100 elements to avoid too much processing
    const styles = window.getComputedStyle(el);
    if (styles.backgroundColor === 'rgb(255, 255, 255)' || 
        styles.backgroundColor === 'white' ||
        (styles.color === 'rgb(0, 0, 0)' && el.tagName !== 'HTML' && el.tagName !== 'HEAD' && el.tagName !== 'META')) {
      lightModeViolations.push({
        tag: el.tagName,
        class: el.className,
        background: styles.backgroundColor,
        color: styles.color,
        text: el.textContent ? el.textContent.substring(0, 50) : ''
      });
    }
  }
});

console.log('Light mode violations found:', lightModeViolations.length);
if (lightModeViolations.length > 0) {
  console.log('First 5 violations:', lightModeViolations.slice(0, 5));
}

// Check for client list elements
const clientElements = document.querySelectorAll('[data-testid="client"], .client-item, .client-row');
console.log('Client elements found:', clientElements.length);

// Check for table/list structures
const tables = document.querySelectorAll('table, .table, .list, .grid');
console.log('Table/list structures found:', tables.length);

// Check for search functionality
const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
console.log('Search inputs found:', searchInputs.length);

// Check for buttons
const buttons = document.querySelectorAll('button');
console.log('Buttons found:', buttons.length);
buttons.forEach((btn, index) => {
  if (index < 10) { // Show first 10 buttons
    console.log(`Button ${index + 1}:`, btn.textContent?.trim() || 'No text');
  }
});

// Check for form inputs
const inputs = document.querySelectorAll('input');
console.log('Input elements found:', inputs.length);

// Check for any error messages or empty states
const errorMessages = document.querySelectorAll('.error, [class*="error"], .text-red');
const emptyStates = document.querySelectorAll('[class*="empty"], .no-clients, .text-center');
console.log('Error messages found:', errorMessages.length);
console.log('Empty state messages found:', emptyStates.length);

// Check console for any React/JS errors
console.log('Check browser console for any JavaScript errors...');

// Test API endpoints
async function testAPIs() {
  console.log('🧪 Testing API endpoints...');
  
  try {
    const dbResponse = await fetch('/api/test-db');
    const dbData = await dbResponse.json();
    console.log('Database API status:', dbResponse.status);
    console.log('Database clients count:', dbData.database?.currentClients || 'unknown');
  } catch (error) {
    console.error('Database API error:', error);
  }
  
  try {
    const clientsResponse = await fetch('/api/clients/test');
    const clientsData = await clientsResponse.json();
    console.log('Clients API status:', clientsResponse.status);
    console.log('Clients API data count:', clientsData.clients?.length || 'unknown');
  } catch (error) {
    console.error('Clients API error:', error);
  }
}

testAPIs();

console.log('🎯 Clients Page Test Complete - Check above results');