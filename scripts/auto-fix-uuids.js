const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixUUIDs() {
  console.log('🔧 UUID Auto-Fix Script\n')
  console.log('========================\n')

  try {
    // Step 1: Get all clients
    console.log('📊 Fetching all clients...')
    const { data: clients, error: fetchError } = await supabase
      .from('workout_clients')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching clients:', fetchError)
      return
    }

    console.log(`Found ${clients?.length || 0} total clients`)

    // Step 2: Find invalid UUIDs
    const invalidClients = (clients || []).filter(c => c.id.length > 36)
    console.log(`Found ${invalidClients.length} clients with invalid UUIDs`)

    if (invalidClients.length === 0) {
      console.log('✅ All UUIDs are already valid!')
      return
    }

    // Step 3: Show invalid clients
    console.log('\n🔍 Invalid clients found:')
    invalidClients.forEach(c => {
      console.log(`  - ${c.full_name}: ${c.id} (${c.id.length} chars)`)
    })

    // Step 4: Fix each invalid client
    console.log('\n🔧 Fixing invalid UUIDs...')
    for (const client of invalidClients) {
      const cleanId = client.id.substring(0, 36)
      console.log(`  Fixing ${client.full_name}: ${client.id} → ${cleanId}`)
      
      // First update any references in workout_sessions
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .update({ client_id: cleanId })
        .eq('client_id', client.id)
      
      if (sessionError) {
        console.log(`    ⚠️  Could not update sessions: ${sessionError.message}`)
      }

      // Update any references in workout_feedback
      const { error: feedbackError } = await supabase
        .from('workout_feedback')
        .update({ client_id: cleanId })
        .eq('client_id', client.id)
      
      if (feedbackError) {
        console.log(`    ⚠️  Could not update feedback: ${feedbackError.message}`)
      }

      // Now update the client ID itself
      const { error: updateError } = await supabase
        .from('workout_clients')
        .update({ id: cleanId })
        .eq('id', client.id)
      
      if (updateError) {
        console.error(`    ❌ Failed to fix ${client.full_name}: ${updateError.message}`)
        
        // If update failed, try delete and re-insert
        console.log(`    🔄 Trying delete and re-insert...`)
        
        // Delete the old record
        const { error: deleteError } = await supabase
          .from('workout_clients')
          .delete()
          .eq('id', client.id)
        
        if (!deleteError) {
          // Re-insert with clean ID
          const newClient = { ...client, id: cleanId }
          const { error: insertError } = await supabase
            .from('workout_clients')
            .insert(newClient)
          
          if (insertError) {
            console.error(`    ❌ Failed to re-insert: ${insertError.message}`)
          } else {
            console.log(`    ✅ Fixed via re-insert`)
          }
        }
      } else {
        console.log(`    ✅ Fixed successfully`)
      }
    }

    // Step 5: Verify the fix
    console.log('\n✅ Verifying fixes...')
    const { data: verifyClients, error: verifyError } = await supabase
      .from('workout_clients')
      .select('id, full_name')
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
      return
    }

    const stillInvalid = (verifyClients || []).filter(c => c.id.length !== 36)
    
    if (stillInvalid.length === 0) {
      console.log('🎉 All UUIDs are now valid!')
      console.log(`Total clients: ${verifyClients?.length || 0}`)
    } else {
      console.log(`⚠️  ${stillInvalid.length} UUIDs still invalid:`)
      stillInvalid.forEach(c => {
        console.log(`  - ${c.full_name}: ${c.id} (${c.id.length} chars)`)
      })
    }

    console.log('\n📌 Next Steps:')
    console.log('1. Clear your browser cache')
    console.log('2. Visit https://atlas-ai-workouts.vercel.app/clients')
    console.log('3. Click on any client to test')
    console.log('4. Check /api/monitoring/uuid-health for status')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixUUIDs()