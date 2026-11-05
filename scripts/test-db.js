const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const prod = await client.query('SELECT count(*) FROM public.products');
    console.log('Products count:', prod.rows[0].count);

    const keys = await client.query('SELECT count(*) FROM public.inventory_keys');
    console.log('Keys count:', keys.rows[0].count);

    const slips = await client.query('SELECT count(*) FROM public.used_payment_slips');
    console.log('Used slips count:', slips.rows[0].count);

    const topups = await client.query('SELECT count(*) FROM public.topup_transactions');
    console.log('Topups count:', topups.rows[0].count);

    await client.end();
  } catch (err) {
    console.error('DB Error:', err);
  }
}

main();
