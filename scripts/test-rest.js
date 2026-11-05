require('dotenv').config();

async function testRest() {
  const url = process.env.SUPABASE_URL + '/rest/v1/products?select=id,title,price,in_stock';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY
    }
  });

  console.log('REST Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Products from REST:', data);
}

testRest().catch(console.error);
