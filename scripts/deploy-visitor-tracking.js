const { Client } = require('pg');
require('dotenv').config();

async function deployVisitorTracking() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL...');

    const sql = `
      -- 1. Create table for visitor traffic logs
      CREATE TABLE IF NOT EXISTS public.visitor_traffic_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip_address TEXT NOT NULL,
          country TEXT DEFAULT 'XX',
          user_agent TEXT,
          path TEXT NOT NULL DEFAULT '/',
          referer TEXT,
          device_type TEXT DEFAULT 'desktop',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_traffic_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON public.visitor_traffic_logs (ip_address);
      CREATE INDEX IF NOT EXISTS idx_visitor_logs_country ON public.visitor_traffic_logs (country);

      ALTER TABLE public.visitor_traffic_logs ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Protect visitor traffic logs" ON public.visitor_traffic_logs;
      CREATE POLICY "Protect visitor traffic logs" ON public.visitor_traffic_logs FOR ALL TO service_role USING (true);

      -- 2. RPC to log a page visit anonymously
      CREATE OR REPLACE FUNCTION public.log_page_visit(
          p_path TEXT DEFAULT '/',
          p_referer TEXT DEFAULT '',
          p_screen TEXT DEFAULT ''
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
          v_headers JSONB;
          v_raw_ip TEXT;
          v_ip TEXT;
          v_country TEXT;
          v_ua TEXT;
          v_device TEXT := 'desktop';
          v_is_blacklisted BOOLEAN := false;
          v_recent_id UUID;
      BEGIN
          -- Extract headers injected by PostgREST
          BEGIN
              v_headers := COALESCE(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
          EXCEPTION WHEN OTHERS THEN
              v_headers := '{}'::jsonb;
          END;

          v_raw_ip := COALESCE(
              v_headers->>'cf-connecting-ip',
              v_headers->>'x-forwarded-for',
              v_headers->>'x-real-ip',
              '127.0.0.1'
          );
          
          -- Take first IP if comma-separated
          v_ip := TRIM(split_part(v_raw_ip, ',', 1));
          v_country := COALESCE(NULLIF(UPPER(v_headers->>'cf-ipcountry'), ''), 'XX');
          v_ua := COALESCE(v_headers->>'user-agent', 'Unknown');

          -- Classify device
          IF v_ua ~* 'mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile' THEN
              v_device := 'mobile';
          ELSIF v_ua ~* 'tablet' THEN
              v_device := 'tablet';
          ELSE
              v_device := 'desktop';
          END IF;

          -- Check if blacklisted
          SELECT EXISTS (
              SELECT 1 FROM public.blacklists
              WHERE target_type = 'ip' AND target_value = v_ip
          ) INTO v_is_blacklisted;

          -- Anti-spam debounce: If this IP visited the SAME path in the last 60 seconds, update timestamp instead of bloating rows
          SELECT id INTO v_recent_id
          FROM public.visitor_traffic_logs
          WHERE ip_address = v_ip 
            AND path = p_path
            AND created_at >= NOW() - INTERVAL '60 seconds'
          ORDER BY created_at DESC
          LIMIT 1;

          IF v_recent_id IS NOT NULL THEN
              UPDATE public.visitor_traffic_logs
              SET created_at = NOW(),
                  country = CASE WHEN country = 'XX' AND v_country <> 'XX' THEN v_country ELSE country END
              WHERE id = v_recent_id;
          ELSE
              INSERT INTO public.visitor_traffic_logs (
                  ip_address,
                  country,
                  user_agent,
                  path,
                  referer,
                  device_type,
                  created_at
              ) VALUES (
                  v_ip,
                  v_country,
                  LEFT(v_ua, 500),
                  LEFT(COALESCE(p_path, '/'), 255),
                  LEFT(COALESCE(p_referer, ''), 255),
                  v_device,
                  NOW()
              );
          END IF;

          RETURN jsonb_build_object(
              'success', true,
              'ip', v_ip,
              'country', v_country,
              'device', v_device,
              'is_blacklisted', v_is_blacklisted
          );
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.log_page_visit(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

      -- 3. Admin RPC to retrieve visitor logs and statistics
      CREATE OR REPLACE FUNCTION public.admin_get_visitor_logs(
          p_admin_secret TEXT,
          p_limit INT DEFAULT 100
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
          v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
          v_total_24h INT;
          v_unique_24h INT;
          v_top_countries JSONB;
          v_top_paths JSONB;
          v_logs JSONB;
      BEGIN
          IF p_admin_secret <> v_expected_secret THEN
              RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
          END IF;

          -- Total visits in 24h
          SELECT COUNT(*)::INT INTO v_total_24h
          FROM public.visitor_traffic_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours';

          -- Unique IPs in 24h
          SELECT COUNT(DISTINCT ip_address)::INT INTO v_unique_24h
          FROM public.visitor_traffic_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours';

          -- Top 5 countries
          SELECT jsonb_agg(c) INTO v_top_countries
          FROM (
              SELECT country, COUNT(*)::INT as count
              FROM public.visitor_traffic_logs
              WHERE created_at >= NOW() - INTERVAL '7 days'
              GROUP BY country
              ORDER BY count DESC
              LIMIT 5
          ) c;

          -- Top 5 paths
          SELECT jsonb_agg(p) INTO v_top_paths
          FROM (
              SELECT path, COUNT(*)::INT as count
              FROM public.visitor_traffic_logs
              WHERE created_at >= NOW() - INTERVAL '7 days'
              GROUP BY path
              ORDER BY count DESC
              LIMIT 5
          ) p;

          -- Recent logs with blacklist status
          SELECT jsonb_agg(l) INTO v_logs
          FROM (
              SELECT 
                  v.id,
                  v.ip_address,
                  v.country,
                  v.path,
                  v.device_type,
                  v.user_agent,
                  v.referer,
                  v.created_at,
                  EXISTS (
                      SELECT 1 FROM public.blacklists b 
                      WHERE b.target_type = 'ip' AND b.target_value = v.ip_address
                  ) as is_blacklisted
              FROM public.visitor_traffic_logs v
              ORDER BY v.created_at DESC
              LIMIT LEAST(p_limit, 500)
          ) l;

          RETURN jsonb_build_object(
              'success', true,
              'stats', jsonb_build_object(
                  'total_24h', COALESCE(v_total_24h, 0),
                  'unique_24h', COALESCE(v_unique_24h, 0),
                  'top_countries', COALESCE(v_top_countries, '[]'::jsonb),
                  'top_paths', COALESCE(v_top_paths, '[]'::jsonb)
              ),
              'logs', COALESCE(v_logs, '[]'::jsonb)
          );
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.admin_get_visitor_logs(TEXT, INT) TO anon, authenticated, service_role;

      -- 4. Admin RPC to quick blacklist an IP
      CREATE OR REPLACE FUNCTION public.admin_blacklist_ip(
          p_admin_secret TEXT,
          p_ip TEXT,
          p_reason TEXT DEFAULT 'Manually blocked from Visitor Logs'
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
          v_expected_secret TEXT := 'nyx9_secure_admin_passphrase';
      BEGIN
          IF p_admin_secret <> v_expected_secret THEN
              RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'รหัสผ่านแอดมินไม่ถูกต้อง');
          END IF;

          IF p_ip IS NULL OR TRIM(p_ip) = '' THEN
              RETURN jsonb_build_object('success', false, 'error', 'INVALID_IP', 'message', 'IP ไม่ถูกต้อง');
          END IF;

          INSERT INTO public.blacklists (target_type, target_value, reason, banned_by)
          VALUES ('ip', TRIM(p_ip), COALESCE(p_reason, 'Manually blocked from Visitor Logs'), 'ADMIN')
          ON CONFLICT (target_value) DO UPDATE
          SET reason = EXCLUDED.reason,
              created_at = NOW();

          -- Also insert into audit logs
          INSERT INTO public.system_audit_logs (event_type, severity, payload)
          VALUES ('ADMIN_IP_BLACKLISTED', 'CRITICAL', jsonb_build_object(
              'ip', TRIM(p_ip),
              'reason', p_reason,
              'timestamp', NOW()
          ));

          RETURN jsonb_build_object('success', true, 'message', 'แบน IP เรียบร้อยแล้ว', 'ip', TRIM(p_ip));
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.admin_blacklist_ip(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
    `;

    await client.query(sql);
    console.log('Successfully deployed visitor tracking schema and functions!');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

deployVisitorTracking();
