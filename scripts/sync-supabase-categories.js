const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function syncCategories() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const updates = [
    { id: 'cat-discord-nitro', name: 'Discord Nitro & บูสต์', icon: 'zap' },
    { id: 'cat-discord-services', name: 'บริการดิสคอร์ด & ไอดี', icon: 'bot' },
    { id: 'cat-gaming-apps', name: 'FiveM, Steam & เกมมิ่ง', icon: 'gamepad-2' },
    { id: 'cat-uncategorized', name: 'ซอฟต์แวร์ & คีย์แท้', icon: 'sparkles' }
  ];

  for (const u of updates) {
    const { error } = await supabase
      .from('categories')
      .update({ name: u.name, icon: u.icon })
      .eq('id', u.id);

    if (error) {
      console.warn('Update failed for', u.id, error.message);
    } else {
      console.log('✅ Updated category in Supabase:', u.id, '->', u.name);
    }
  }
}

syncCategories().catch(console.error);
