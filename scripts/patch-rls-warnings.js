const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('1. Patching warranty_claims RLS policy...');
  await client.query(`
    DROP POLICY IF EXISTS "Allow insert warranty claims" ON public.warranty_claims;
    CREATE POLICY "Allow insert warranty claims" ON public.warranty_claims
      FOR INSERT WITH CHECK (
        order_id IS NOT NULL AND length(trim(order_id)) > 0 
        AND reason IS NOT NULL AND length(trim(reason)) > 0
        AND replacement_key IS NULL
      );
  `);
  console.log('✅ warranty_claims RLS policy updated.');

  const res = await client.query(`
    SELECT schemaname, tablename, policyname, cmd, with_check 
    FROM pg_policies 
    WHERE tablename = 'warranty_claims';
  `);
  console.table(res.rows);

  await client.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
