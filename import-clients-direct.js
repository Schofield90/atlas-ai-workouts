#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  console.log('\nPlease set your service role key:')
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
  console.log('\nYou can find it in Supabase Dashboard > Settings > API > service_role key')
  process.exit(1)
}

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function importFromSQL(filePath) {
  console.log(`\n📄 Processing: ${filePath}`)
  
  // Read SQL file
  const sql = fs.readFileSync(filePath, 'utf8')
  
  // Extract client names from INSERT statement
  // Pattern: gen_random_uuid(), 'Client Name',
  const clientPattern = /gen_random_uuid\(\),\s*'([^']+)',\s*'[0-9a-f-]+',\s*NULL/g
  const matches = [...sql.matchAll(clientPattern)]
  
  const clients = matches.map(match => ({
    full_name: match[1],
    organization_id: '00000000-0000-0000-0000-000000000000',
    user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
  
  console.log(`   Found ${clients.length} clients to import`)
  
  if (clients.length === 0) {
    console.log('   ⚠️  No clients found in SQL file')
    return 0
  }
  
  // Ensure default organization exists
  console.log('   Creating default organization...')
  const { error: orgError } = await supabase
    .from('workout_organizations')
    .upsert({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Organization',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
  
  if (orgError && !orgError.message.includes('duplicate')) {
    console.error('   ❌ Error creating organization:', orgError.message)
  } else {
    console.log('   ✅ Default organization ready')
  }
  
  // Insert clients in batches of 50
  const BATCH_SIZE = 50
  let totalInserted = 0
  let totalErrors = 0
  
  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(clients.length / BATCH_SIZE)
    
    console.log(`   Batch ${batchNum}/${totalBatches}: Inserting ${batch.length} clients...`)
    
    const { data, error } = await supabase
      .from('workout_clients')
      .insert(batch)
      .select()
    
    if (error) {
      console.error(`   ❌ Batch ${batchNum} error:`, error.message)
      
      // Try to insert individually to identify problematic records
      if (error.message.includes('duplicate')) {
        console.log(`   Trying individual inserts for batch ${batchNum}...`)
        
        for (const client of batch) {
          const { data: singleData, error: singleError } = await supabase
            .from('workout_clients')
            .insert([client])
            .select()
          
          if (singleError) {
            if (singleError.message.includes('duplicate')) {
              console.log(`      ⚠️  Skipping duplicate: ${client.full_name}`)
            } else {
              console.error(`      ❌ Failed: ${client.full_name} - ${singleError.message}`)
              totalErrors++
            }
          } else {
            totalInserted++
          }
        }
      } else {
        totalErrors += batch.length
      }
    } else {
      totalInserted += data.length
      console.log(`   ✅ Batch ${batchNum} complete: ${data.length} clients inserted`)
    }
  }
  
  return { inserted: totalInserted, errors: totalErrors, total: clients.length }
}

async function main() {
  console.log('🚀 Direct SQL Import Tool')
  console.log('=========================')
  
  const files = [
    '/Users/samschofield/Downloads/workout_clients_insert_min.sql',
    '/Users/samschofield/Downloads/workout_clients_insert_with_fields.sql'
  ]
  
  let grandTotal = { inserted: 0, errors: 0, total: 0 }
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      const result = await importFromSQL(file)
      grandTotal.inserted += result.inserted
      grandTotal.errors += result.errors
      grandTotal.total += result.total
    } else {
      console.log(`\n⚠️  File not found: ${file}`)
    }
  }
  
  console.log('\n=========================')
  console.log('📊 Final Results:')
  console.log(`   Total Clients Found: ${grandTotal.total}`)
  console.log(`   ✅ Successfully Imported: ${grandTotal.inserted}`)
  console.log(`   ❌ Errors: ${grandTotal.errors}`)
  
  // Verify total in database
  const { count } = await supabase
    .from('workout_clients')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📈 Total clients now in database: ${count}`)
  
  if (grandTotal.inserted === 169) {
    console.log('\n🎉 SUCCESS! All 169 clients imported!')
  } else if (grandTotal.inserted > 0) {
    console.log(`\n✅ Imported ${grandTotal.inserted} clients successfully`)
  }
}

// Run the import
main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})