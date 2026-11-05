const { Client } = require('pg');
require('dotenv').config();

async function deployAuthTrigger() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL...');

    const sql = `
      -- 1. Create or replace the handle_new_user function
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_discord_id TEXT;
        v_username TEXT;
        v_avatar_url TEXT;
      BEGIN
        v_discord_id := COALESCE(
          NEW.raw_user_meta_data->>'provider_id',
          NEW.raw_user_meta_data->>'sub'
        );
        v_username := COALESCE(
          NEW.raw_user_meta_data->>'custom_claims'->>'global_name',
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'user_name',
          NEW.raw_user_meta_data->>'name',
          split_part(NEW.email, '@', 1),
          'Discord Member'
        );
        v_avatar_url := COALESCE(
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'picture'
        );

        INSERT INTO public.profiles (id, discord_id, username, avatar_url, balance, role)
        VALUES (
          NEW.id,
          v_discord_id,
          v_username,
          v_avatar_url,
          0.00,
          'customer'
        )
        ON CONFLICT (id) DO UPDATE
        SET
          discord_id = COALESCE(EXCLUDED.discord_id, public.profiles.discord_id),
          username = COALESCE(EXCLUDED.username, public.profiles.username),
          avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
          updated_at = NOW();

        RETURN NEW;
      END;
      $$;

      -- 2. Drop existing trigger if any and recreate
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

      -- 3. Ensure profiles RLS policies are clean
      DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;
      CREATE POLICY "Allow users read own profile" ON public.profiles 
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
      CREATE POLICY "Allow users update own profile" ON public.profiles 
        FOR UPDATE USING (auth.uid() IS NOT NULL AND id = auth.uid());
    `;

    await client.query(sql);
    console.log('✅ Trigger on_auth_user_created and handle_new_user deployed successfully!');

    // Verify trigger existence
    const res = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created';
    `);
    console.log('Verification:', res.rows);

  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deployAuthTrigger();
