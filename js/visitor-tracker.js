/**
 * ==============================================================================
 * 🌐 PAGE VIEW METRICS & ROUTE TELEMETRY (NYX9 STUDIO)
 * ==============================================================================
 * Anonymous page telemetry and session visit counter via Supabase RPC.
 * Runs non-blocking and asynchronously for storefront reliability.
 * ==============================================================================
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__NYX9_TRACKER_INITIALIZED__) return;
  window.__NYX9_TRACKER_INITIALIZED__ = true;

  async function trackVisitor() {
    try {
      // 1. Session-based debounce to avoid spamming database on rapid reloads
      const currentPath = window.location.pathname || '/';
      const lastTrackKey = 'nyx9_last_track_' + currentPath;
      const lastTrackTime = sessionStorage.getItem(lastTrackKey);
      const now = Date.now();

      if (lastTrackTime && now - parseInt(lastTrackTime, 10) < 45000) {
        return; // Debounced for 45s per path
      }

      // 2. Resolve Supabase client
      let client = window.supabaseClient;
      if (!client && window.supabase && window.storeConfig?.supabase) {
        client = window.supabase.createClient(
          window.storeConfig.supabase.url,
          window.storeConfig.supabase.anonKey
        );
      }

      if (!client) {
        // Fallback default config if storeConfig not yet loaded
        const fallbackUrl = 'https://ymaulztlbctpzyhdhjvn.supabase.co';
        const fallbackKey = 'sb_publishable_liwa3Juk3Gy6LBSNnUIHRA_iqsD78_u';
        if (window.supabase) {
          client = window.supabase.createClient(fallbackUrl, fallbackKey);
        }
      }

      if (!client || typeof client.rpc !== 'function') {
        return;
      }

      sessionStorage.setItem(lastTrackKey, now.toString());

      const screenRes = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
      const referer = document.referrer || '';

      const { data, error } = await client.rpc('log_page_visit', {
        p_path: currentPath,
        p_referer: referer.substring(0, 250),
        p_screen: screenRes
      });

      if (error) {
        console.debug('[TRACKER] Log skipped:', error.message);
        return;
      }

      // 3. Blacklist enforcement
      if (data && data.is_blacklisted) {
        console.warn('[SECURITY] Visitor IP is blacklisted:', data.ip);
        enforceBlacklistModal(data.ip);
      }
    } catch (err) {
      // Silent error - do not disrupt storefront UX
      console.debug('[TRACKER] Silent failure:', err);
    }
  }

  function enforceBlacklistModal(ip) {
    // If the modal already exists, do not recreate
    if (document.getElementById('blacklist-lockdown-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'blacklist-lockdown-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(3, 7, 18, 0.96); backdrop-filter: blur(16px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; font-family: ui-sans-serif, system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="max-width: 440px; width: 100%; background: #0b0f19; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px; padding: 2rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
        <div style="width: 56px; height: 56px; margin: 0 auto 1.25rem; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; font-size: 24px;">
          🚫
        </div>
        <h3 style="color: #f87171; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">การเข้าถึงถูกระงับ (Access Denied)</h3>
        <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.25rem;">
          IP ของคุณ (<code style="color: #cbd5e1; background: #1e293b; padding: 2px 6px; border-radius: 6px;">${ip || 'Unknown'}</code>) อยู่ในบัญชีดำความปลอดภัยของระบบ กรุณาติดต่อแอดมินหากคุณคิดว่าเกิดข้อผิดพลาด
        </p>
        <div style="font-size: 0.75rem; color: #64748b;">NYX9 Studio Shield • Security Protocol Active</div>
      </div>
    `;

    document.body.appendChild(overlay);
    // Prevent interaction with page
    document.body.style.overflow = 'hidden';
  }

  // Execute tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisitor);
  } else {
    // Run with slight delay to prioritize critical rendering
    setTimeout(trackVisitor, 500);
  }
})();
