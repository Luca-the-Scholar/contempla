import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read from .env file
const envContent = fs.readFileSync('.env', 'utf-8');
const projectId = envContent.match(/VITE_SUPABASE_PROJECT_ID="?([^"\n]+)"?/)?.[1] || '';
const publishableKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/)?.[1] || '';

// Get service role key for admin operations
const serviceRoleKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/)?.[1] ||
                      envContent.match(/VITE_SUPABASE_SERVICE_ROLE="?([^"\n]+)"?/)?.[1] || '';

const supabaseUrl = `https://${projectId}.supabase.co`;

if (!projectId || (!publishableKey && !serviceRoleKey)) {
  throw new Error('Missing Supabase credentials in .env file');
}

// Use service role key if available, otherwise anon key
const supabaseKey = serviceRoleKey || publishableKey;
console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Using key type: ${serviceRoleKey ? 'Service Role (admin)' : 'Anon Key (limited)'}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log('🌱 Running Global Library Seed Script...\n');

  // Read the SQL file
  const sqlContent = fs.readFileSync('supabase/seed-global-library.sql', 'utf-8');

  try {
    // Execute the SQL via RPC or direct query
    // Note: Supabase client doesn't support executing raw SQL directly
    // We'll need to use the REST API

    console.log('📝 SQL script loaded, but direct execution not supported via JS client.');
    console.log('');
    console.log('⚠️  To run this seed script, use ONE of these methods:');
    console.log('');
    console.log('METHOD 1: Supabase Dashboard (RECOMMENDED)');
    console.log('1. Go to https://supabase.com/dashboard/project/' + projectId);
    console.log('2. Navigate to SQL Editor');
    console.log('3. Click "New Query"');
    console.log('4. Copy/paste the contents of: supabase/seed-global-library.sql');
    console.log('5. Click "Run"');
    console.log('');
    console.log('METHOD 2: Local PostgreSQL (if you have psql)');
    console.log('Get your connection string from Supabase dashboard, then:');
    console.log('psql "postgresql://..." -f supabase/seed-global-library.sql');
    console.log('');
    console.log('The seed script will:');
    console.log('✅ Create Contempla system account (@contempla)');
    console.log('✅ Insert 5 meditation techniques');
    console.log('✅ Set all as pending approval');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

runSeed().catch(console.error);
