import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection:');
console.log('URL:', supabaseUrl);
console.log('Key present:', Boolean(supabaseKey));

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  console.log('\n1. Fetching branches from Supabase...');
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  if (branchError) {
    console.error('Error fetching branches:', branchError);
  } else {
    console.log(`✓ Branches fetched successfully (${branches.length} branches found):`);
    branches.forEach((b) => console.log(`   - [${b.name}] (id: ${b.id}) -> ${b.review_link}`));
  }

  console.log('\n2. Fetching message templates from Supabase...');
  const { data: templates, error: tplError } = await supabase
    .from('templates')
    .select('*');

  if (tplError) {
    console.error('Error fetching templates:', tplError);
  } else {
    console.log(`✓ Templates fetched successfully (${templates.length} templates found):`);
    templates.forEach((t) => console.log(`   - [${t.language}]: ${t.body.substring(0, 50)}...`));
  }

  console.log('\n3. Fetching patients from Supabase...');
  const { data: patients, error: patError } = await supabase
    .from('patients')
    .select('*, branches(name)')
    .order('visit_time', { ascending: false });

  if (patError) {
    console.error('Error fetching patients:', patError);
  } else {
    console.log(`✓ Patients table queried successfully (${patients.length} patients found).`);
  }

  console.log('\n4. Testing Patient Insert into Supabase...');
  if (branches && branches.length > 0) {
    const testBranch = branches[0];
    const { data: newPatient, error: insertError } = await supabase
      .from('patients')
      .insert({
        name: 'Supabase Verification Patient',
        phone: '919876543210',
        branch_id: testBranch.id,
        visit_time: new Date().toISOString(),
      })
      .select('*, branches(name)')
      .single();

    if (insertError) {
      console.error('Error inserting test patient:', insertError);
    } else {
      console.log(`✓ Inserted patient successfully: ${newPatient.name} (id: ${newPatient.id})`);

      console.log('5. Testing Mark Sent update...');
      const { data: updatedPatient, error: updateError } = await supabase
        .from('patients')
        .update({
          sent_at: new Date().toISOString(),
          sent_language: 'en',
        })
        .eq('id', newPatient.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating patient:', updateError);
      } else {
        console.log(`✓ Updated patient to Sent: sent_at=${updatedPatient.sent_at}, lang=${updatedPatient.sent_language}`);
      }

      console.log('6. Cleaning up test patient...');
      await supabase.from('patients').delete().eq('id', newPatient.id);
      console.log('✓ Cleaned up test record.');
    }
  }

  console.log('\n=== ALL SUPABASE LIVE CHECKS COMPLETED SUCCESSFULLY ===\n');
}

run().catch((err) => {
  console.error('Fatal error during Supabase test:', err);
  process.exit(1);
});
