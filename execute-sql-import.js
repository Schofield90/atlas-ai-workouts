const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Supabase credentials
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  console.log('Please run: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function executeSQLFile(filePath) {
  console.log(`\n📄 Executing SQL file: ${filePath}`)
  
  try {
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8')
    
    // Split by semicolons to handle multiple statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip if it's just comments
      if (statement.trim().startsWith('--')) continue
      
      try {
        // For INSERT statements with VALUES, we need to parse and use Supabase client
        if (statement.includes('INSERT INTO workout_clients')) {
          console.log(`\nExecuting bulk INSERT for workout_clients...`)
          
          // Extract the VALUES part
          const valuesMatch = statement.match(/VALUES\s*\(([\s\S]*)\)/i)
          if (valuesMatch) {
            // This is complex to parse, let's use a different approach
            // We'll execute the SQL directly using RPC
            console.log('Using direct SQL execution...')
            
            const { data, error } = await supabase.rpc('exec_sql', {
              sql: statement
            }).single()
            
            if (error) {
              // If RPC doesn't exist, try direct insert
              console.log('Direct SQL not available, parsing INSERT manually...')
              
              // Extract client names from the SQL
              const clientMatches = [...statement.matchAll(/gen_random_uuid\(\),\s*'([^']+)'/g)]
              const clients = clientMatches.map(match => ({
                full_name: match[1],
                organization_id: '00000000-0000-0000-0000-000000000000',
                user_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }))
              
              if (clients.length > 0) {
                console.log(`Inserting ${clients.length} clients...`)
                const { data, error } = await supabase
                  .from('workout_clients')
                  .insert(clients)
                  .select()
                
                if (error) {
                  console.error(`❌ Error inserting clients:`, error.message)
                  errorCount++
                } else {
                  console.log(`✅ Successfully inserted ${data?.length || clients.length} clients`)
                  successCount++
                }
              }
            } else {
              console.log(`✅ SQL executed successfully`)
              successCount++
            }
          }
        } else if (statement.includes('INSERT INTO workout_organizations')) {
          console.log(`\nCreating default organization...`)
          
          const { error } = await supabase
            .from('workout_organizations')
            .insert({
              id: '00000000-0000-0000-0000-000000000000',
              name: 'Default Organization',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
          
          if (error && !error.message.includes('duplicate')) {
            console.error(`❌ Error creating organization:`, error.message)
            errorCount++
          } else {
            console.log(`✅ Default organization ready`)
            successCount++
          }
        }
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message)
        errorCount++
      }
    }
    
    console.log(`\n📊 Summary for ${filePath}:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    
    return { successCount, errorCount }
    
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message)
    return { successCount: 0, errorCount: 1 }
  }
}

async function main() {
  console.log('🚀 Starting SQL import...')
  console.log('================================')
  
  const files = [
    '/Users/samschofield/Downloads/workout_clients_insert_min.sql',
    '/Users/samschofield/Downloads/workout_clients_insert_with_fields.sql'
  ]
  
  let totalSuccess = 0
  let totalErrors = 0
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      const result = await executeSQLFile(file)
      totalSuccess += result.successCount
      totalErrors += result.errorCount
    } else {
      console.log(`⚠️  File not found: ${file}`)
    }
  }
  
  console.log('\n================================')
  console.log('🏁 Import Complete!')
  console.log(`   Total Successful: ${totalSuccess}`)
  console.log(`   Total Errors: ${totalErrors}`)
  
  // Quick verification
  console.log('\n🔍 Verifying import...')
  const { count, error } = await supabase
    .from('workout_clients')
    .select('*', { count: 'exact', head: true })
  
  if (!error) {
    console.log(`   Total clients in database: ${count}`)
  }
}

main().catch(console.error)