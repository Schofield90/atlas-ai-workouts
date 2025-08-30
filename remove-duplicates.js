#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function removeDuplicates() {
  console.log('🔍 Finding duplicate clients...')
  
  // Get all clients
  const { data: allClients, error: fetchError } = await supabase
    .from('workout_clients')
    .select('id, full_name, created_at')
    .order('created_at', { ascending: true })
  
  if (fetchError) {
    console.error('Error fetching clients:', fetchError)
    return
  }
  
  console.log(`Found ${allClients.length} total clients`)
  
  // Group by name to find duplicates
  const clientsByName = {}
  allClients.forEach(client => {
    if (!clientsByName[client.full_name]) {
      clientsByName[client.full_name] = []
    }
    clientsByName[client.full_name].push(client)
  })
  
  // Find duplicates (keep the first one, delete the rest)
  const toDelete = []
  let uniqueCount = 0
  
  Object.entries(clientsByName).forEach(([name, clients]) => {
    if (clients.length > 1) {
      console.log(`   Found ${clients.length} copies of "${name}"`)
      // Keep the first one (oldest), delete the rest
      const duplicates = clients.slice(1)
      toDelete.push(...duplicates.map(c => c.id))
    }
    uniqueCount++
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Unique clients: ${uniqueCount}`)
  console.log(`   Duplicates to remove: ${toDelete.length}`)
  
  if (toDelete.length > 0) {
    console.log('\n🗑️  Removing duplicates...')
    
    // Delete in batches
    const BATCH_SIZE = 50
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE)
      const { error: deleteError } = await supabase
        .from('workout_clients')
        .delete()
        .in('id', batch)
      
      if (deleteError) {
        console.error(`Error deleting batch:`, deleteError)
      } else {
        console.log(`   Deleted ${batch.length} duplicates`)
      }
    }
    
    console.log('\n✅ Duplicates removed!')
  } else {
    console.log('\n✅ No duplicates found')
  }
  
  // Final count
  const { count } = await supabase
    .from('workout_clients')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📈 Final client count: ${count}`)
}

removeDuplicates().catch(console.error)