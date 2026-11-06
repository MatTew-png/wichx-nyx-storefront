const { Client } = require('pg');
require('dotenv').config();

async function checkInventoryPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'inventory_keys'");
  console.log('inventory_keys policies:', res.rows.map(r => ({ name: r.policyname, cmd: r.cmd, qual: r.qual })));

  await client.end();
}
checkInventoryPolicies().catch(console.error);
