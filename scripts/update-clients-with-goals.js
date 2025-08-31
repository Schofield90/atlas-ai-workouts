#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateClientsWithGoalsAndInjuries() {
  console.log('📊 Reading Excel file...');
  
  // Read the Excel file
  const workbook = XLSX.readFile('/Users/samschofield/Downloads/clients_name_membership_goals_injuries.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ Found ${excelData.length} clients in Excel file`);
  
  // Get all existing clients from database
  console.log('\n🔍 Fetching existing clients from database...');
  const { data: existingClients, error: fetchError } = await supabase
    .from('workout_clients')
    .select('id, full_name')
    .order('full_name');
  
  if (fetchError) {
    console.error('❌ Error fetching clients:', fetchError);
    return;
  }
  
  console.log(`✅ Found ${existingClients.length} clients in database`);
  
  // Create a map for easier matching
  const clientMap = new Map();
  existingClients.forEach(client => {
    // Normalize the name for matching (remove extra spaces, convert to lowercase)
    const normalizedName = client.full_name.toLowerCase().trim().replace(/\s+/g, ' ');
    clientMap.set(normalizedName, client);
  });
  
  // Update each client
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundNames = [];
  
  for (const excelClient of excelData) {
    const excelName = excelClient.Name || '';
    const normalizedExcelName = excelName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const dbClient = clientMap.get(normalizedExcelName);
    
    if (dbClient) {
      // Prepare update data
      const updateData = {
        goals: excelClient.Goals || null,
        injuries: excelClient.Injuries || null,
        // Store membership in notes or a custom field
        notes: excelClient.Membership ? `Membership: ${excelClient.Membership}` : null
      };
      
      // Update the client
      const { error: updateError } = await supabase
        .from('workout_clients')
        .update(updateData)
        .eq('id', dbClient.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${excelName}:`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ Updated ${excelName}`);
      }
    } else {
      notFoundCount++;
      notFoundNames.push(excelName);
    }
  }
  
  // Summary
  console.log('\n📊 Update Summary:');
  console.log(`✅ Successfully updated: ${updatedCount} clients`);
  console.log(`⚠️  Not found in database: ${notFoundCount} clients`);
  
  if (notFoundNames.length > 0) {
    console.log('\n❓ Clients not found in database:');
    notFoundNames.forEach(name => console.log(`   - ${name}`));
    
    // Check for close matches
    console.log('\n🔍 Checking for close matches...');
    for (const notFoundName of notFoundNames.slice(0, 5)) { // Check first 5
      const normalized = notFoundName.toLowerCase().trim();
      const closeMatches = existingClients.filter(client => {
        const dbNormalized = client.full_name.toLowerCase().trim();
        return dbNormalized.includes(normalized.split(' ')[0]) || 
               normalized.includes(dbNormalized.split(' ')[0]);
      });
      
      if (closeMatches.length > 0) {
        console.log(`\n   "${notFoundName}" might match:`);
        closeMatches.forEach(match => console.log(`      - ${match.full_name}`));
      }
    }
  }
}

// Run the update
updateClientsWithGoalsAndInjuries()
  .then(() => {
    console.log('\n✨ Update complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });