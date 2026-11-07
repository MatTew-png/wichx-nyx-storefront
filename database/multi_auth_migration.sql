-- ==============================================================================
-- 🌐 NYX9 STUDIO — MULTI-PROVIDER AUTHENTICATION TRIGGER MIGRATION
-- ==============================================================================
-- Supports: Discord, Google, GitHub, and Email/Password seamlessly
-- Automatically promotes Admin by Discord ID or Admin Email (sanaseeriri@gmail.com)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider TEXT;
  v_discord_id TEXT;
  v_username TEXT;
  v_avatar_url TEXT;
  v_role TEXT := 'customer';
BEGIN
  -- 1. Identify Authentication Provider (discord, google, github, email)
  v_provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_user_meta_data->>'provider',
    'email'
  );

  -- 2. Extract Discord ID strictly for Discord OAuth to prevent collision on UNIQUE constraint
  IF v_provider = 'discord' THEN
    v_discord_id := COALESCE(
      NEW.raw_user_meta_data->>'provider_id',
      NEW.raw_user_meta_data->>'sub'
    );
  ELSE
    v_discord_id := NULL;
  END IF;

  -- 3. Extract Best User Display Name across Discord, Google, GitHub, and Email
  v_username := COALESCE(
    (NEW.raw_user_meta_data->'custom_claims')->>'global_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    split_part(NEW.email, '@', 1),
    'Member'
  );

  -- 4. Extract Avatar URL across Google (picture), Discord (avatar_url), or DiceBear
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id
  );

  -- 5. Auto-Promote Admin via Discord Whitelist or Admin Gmail
  IF (v_discord_id IS NOT NULL AND v_discord_id IN ('483398326159671326', '422611554475835394'))
     OR (LOWER(COALESCE(NEW.email, '')) IN ('sanaseeriri@gmail.com')) THEN
    v_role := 'admin';
  END IF;

  -- 6. Upsert into public.profiles
  INSERT INTO public.profiles (id, discord_id, username, avatar_url, balance, role)
  VALUES (
    NEW.id,
    v_discord_id,
    v_username,
    v_avatar_url,
    0.00,
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    discord_id = COALESCE(EXCLUDED.discord_id, public.profiles.discord_id),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = CASE 
      WHEN (EXCLUDED.discord_id IN ('483398326159671326', '422611554475835394'))
        OR (LOWER(COALESCE(NEW.email, '')) IN ('sanaseeriri@gmail.com')) THEN 'admin'
      ELSE public.profiles.role
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure it listens to both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
