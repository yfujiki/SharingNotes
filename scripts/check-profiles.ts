#!/usr/bin/env tsx
/**
 * Check if profiles have email populated
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  console.log('🔍 Checking profiles...\n');

  // Get profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, email');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles:\n`);

  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ID: ${profile.id.slice(0, 8)}...`);
    console.log(`   Display Name: ${profile.display_name || '(empty)'}`);
    console.log(`   Email: ${profile.email || '(empty)'}`);
    console.log('');
  });

  // Check auth.users
  const { data: authData } = await supabase.auth.admin.listUsers();

  console.log(`\n📧 Auth users for comparison:`);
  authData?.users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.id.slice(0, 8)}...`);
    console.log(`   Email: ${user.email}`);
    console.log('');
  });
}

checkProfiles();
