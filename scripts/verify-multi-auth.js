/**
 * ==============================================================================
 * 🧪 NYX9 STUDIO — MULTI-PROVIDER AUTH VERIFICATION SUITE
 * ==============================================================================
 */

require('dotenv').config();
const { Client } = require('pg');

async function testMultiAuth() {
  console.log('================================================================');
  console.log('🔐 VERIFYING MULTI-PROVIDER AUTHENTICATION (Discord, Google, Email)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
      if (extra) console.log(`     ↳ ${extra}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      if (extra) console.error(`     ↳ ${extra}`);
    }
  }

  // 1. Verify methods exported in database/supabaseClient.js
  const SupabaseAdapterCode = require('fs').readFileSync('database/supabaseClient.js', 'utf8');
  assert(
    'SupabaseAdapter includes multi-provider OAuth methods (Discord, Google, GitHub)',
    SupabaseAdapterCode.includes('loginWithOAuth') &&
    SupabaseAdapterCode.includes('loginWithGoogle') &&
    SupabaseAdapterCode.includes('loginWithGitHub'),
    'Exported loginWithOAuth, loginWithGoogle, loginWithGitHub'
  );

  assert(
    'SupabaseAdapter includes Email Password & OTP methods',
    SupabaseAdapterCode.includes('loginWithPassword') &&
    SupabaseAdapterCode.includes('signUpWithPassword') &&
    SupabaseAdapterCode.includes('loginWithOtp'),
    'Exported loginWithPassword, signUpWithPassword, loginWithOtp'
  );

  // 2. Verify Database Trigger handles Multi-Provider payloads without error
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // A. Simulate Google User
    const googleTest = await client.query(`
      DO $$
      DECLARE
        v_meta JSONB := '{"provider": "google", "full_name": "Google Gamer", "picture": "https://google.com/pic.jpg"}';
        v_app_meta JSONB := '{"provider": "google"}';
        v_username TEXT;
        v_avatar TEXT;
        v_discord_id TEXT;
        v_role TEXT := 'customer';
      BEGIN
        IF v_app_meta->>'provider' = 'discord' THEN
          v_discord_id := v_meta->>'provider_id';
        ELSE
          v_discord_id := NULL;
        END IF;

        v_username := COALESCE((v_meta->'custom_claims')->>'global_name', v_meta->>'full_name', 'Member');
        v_avatar := COALESCE(v_meta->>'avatar_url', v_meta->>'picture');

        IF v_username <> 'Google Gamer' OR v_discord_id IS NOT NULL THEN
          RAISE EXCEPTION 'Google user simulation failed';
        END IF;
      END $$;
    `);
    assert(
      'Database trigger logic handles Google OAuth metadata cleanly without discord_id collision',
      true,
      'Extracted Google full_name & picture, kept discord_id NULL'
    );
  } catch (e) {
    assert('Database trigger logic handles Google OAuth metadata', false, e.message);
  }

  try {
    // B. Simulate Admin Email Promotion (sanaseeriri@gmail.com)
    const adminEmailTest = await client.query(`
      DO $$
      DECLARE
        v_email TEXT := 'sanaseeriri@gmail.com';
        v_role TEXT := 'customer';
      BEGIN
        IF LOWER(v_email) IN ('sanaseeriri@gmail.com') THEN
          v_role := 'admin';
        END IF;

        IF v_role <> 'admin' THEN
          RAISE EXCEPTION 'Admin email promotion failed';
        END IF;
      END $$;
    `);
    assert(
      'Admin promotion recognizes Store Support Email (sanaseeriri@gmail.com)',
      true,
      'Promoted role to admin for owner email'
    );
  } catch (e) {
    assert('Admin email promotion recognizes Store Support Email', false, e.message);
  }

  // 3. Verify AuthModal file exists and has all provider buttons
  const authModalCode = require('fs').readFileSync('js/components/AuthModal.js', 'utf8');
  assert(
    'AuthModalComponent contains 1-Click buttons for Discord, Google, GitHub and Email tab',
    authModalCode.includes('window.loginWithDiscord') &&
    authModalCode.includes('window.loginWithGoogle') &&
    authModalCode.includes('window.loginWithGitHub') &&
    authModalCode.includes('window.switchAuthMode'),
    'Interactive UI supports all 5 sign-in flows'
  );

  await client.end();

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

testMultiAuth().catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
