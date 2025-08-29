const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'placeholder-service-role-key') {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('\nTo get your service role key:');
  console.log('1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/settings/api');
  console.log('2. Copy the service_role key (keep it secret!)');
  console.log('3. Update .env.local with the key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📦 Applying workout app migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_workout_app_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but be careful with functions
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE|COMMENT|BEGIN|COMMIT|ROLLBACK|SET|DECLARE|IF|CASE|END|create|alter|drop|insert|update|delete|grant|revoke|truncate|comment|begin|commit|rollback|set|declare|if|case|end))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      }).single();
      
      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('   Using alternative execution method...');
        // Note: This won't work with service key, we need to use Supabase CLI or dashboard
        throw new Error(`Statement ${i + 1} failed: ${error.message}`);
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Tables created:');
    console.log('   - workout_organizations');
    console.log('   - workout_users');
    console.log('   - workout_clients');
    console.log('   - workout_sessions');
    console.log('   - workout_feedback');
    console.log('   - workout_exercises');
    console.log('   - workout_client_messages');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nAlternative: You can apply the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    console.log('2. Copy the contents of supabase/migrations/002_workout_app_tables.sql');
    console.log('3. Paste and run in the SQL editor');
  }
}

runMigration();