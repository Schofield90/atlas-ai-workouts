#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixClientData() {
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
    const normalizedName = client.full_name.toLowerCase().trim().replace(/\s+/g, ' ');
    clientMap.set(normalizedName, client);
  });
  
  // Fix and update each client
  let updatedCount = 0;
  let fixedCount = 0;
  
  for (const excelClient of excelData) {
    const excelName = excelClient.Name || '';
    const normalizedExcelName = excelName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const dbClient = clientMap.get(normalizedExcelName);
    
    if (dbClient) {
      // Check if data needs fixing
      const hasInvalidGoals = excelClient.Goals === 'Membership' || 
                              excelClient.Goals === 'Goals' || 
                              !excelClient.Goals || 
                              excelClient.Goals.trim() === '';
                              
      const hasInvalidInjuries = excelClient.Injuries === 'Date' || 
                                 excelClient.Injuries === 'Injuries' || 
                                 !excelClient.Injuries || 
                                 excelClient.Injuries.trim() === '';
      
      // Prepare update data
      let updateData = {};
      
      // Handle Goals field
      if (hasInvalidGoals) {
        // If goals are invalid, set to null or a default message
        updateData.goals = null;
        fixedCount++;
      } else {
        // Use the actual goals data
        updateData.goals = excelClient.Goals;
      }
      
      // Handle Injuries field
      if (hasInvalidInjuries) {
        // If injuries are invalid, set to "No injuries reported"
        updateData.injuries = "No injuries reported";
      } else {
        // Use the actual injuries data
        updateData.injuries = excelClient.Injuries;
      }
      
      // Handle Membership field - store in notes
      if (excelClient.Membership && excelClient.Membership.trim() !== '') {
        updateData.notes = `Membership: ${excelClient.Membership}`;
      }
      
      // Update the client
      const { error: updateError } = await supabase
        .from('workout_clients')
        .update(updateData)
        .eq('id', dbClient.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${excelName}:`, updateError);
      } else {
        updatedCount++;
        if (hasInvalidGoals || hasInvalidInjuries) {
          console.log(`🔧 Fixed ${excelName} - Removed invalid data`);
        } else {
          console.log(`✅ Updated ${excelName}`);
        }
      }
    }
  }
  
  // Summary
  console.log('\n📊 Update Summary:');
  console.log(`✅ Successfully updated: ${updatedCount} clients`);
  console.log(`🔧 Fixed invalid data for: ${fixedCount} clients`);
  
  // Show some examples of fixed data
  console.log('\n📋 Sample of updated clients:');
  const { data: samples } = await supabase
    .from('workout_clients')
    .select('full_name, goals, injuries, notes')
    .limit(10)
    .order('full_name');
  
  samples.forEach(client => {
    console.log(`\n${client.full_name}:`);
    console.log(`  Goals: ${client.goals || '(No goals specified)'}`);
    console.log(`  Injuries: ${client.injuries || 'No injuries reported'}`);
    if (client.notes) console.log(`  ${client.notes}`);
  });
}

// Run the fix
fixClientData()
  .then(() => {
    console.log('\n✨ Data fix complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });