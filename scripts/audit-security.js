const { Client } = require('pg');
require('dotenv').config();

async function auditSecurity() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('🛡️ [SECURITY AUDIT] Inspecting PostgreSQL tables, RLS, and constraints...');

  // 1. Check RLS on all tables
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `);
  console.log('\n--- RLS STATUS PER TABLE ---');
  rlsRes.rows.forEach(r => {
    console.log(`${r.tablename}: RLS ${r.rowsecurity ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  });

  // 2. Check unique constraints on used slips and orders
  const constrRes = await client.query(`
    SELECT conname, relname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class r ON c.conrelid = r.oid
    JOIN pg_namespace n ON r.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.contype IN ('u', 'p')
  `);
  console.log('\n--- UNIQUE & PRIMARY KEY CONSTRAINTS ---');
  constrRes.rows.forEach(r => {
    console.log(`${r.relname}.${r.conname}: ${r.pg_get_constraintdef}`);
  });

  await client.end();
}
auditSecurity().catch(console.error);
