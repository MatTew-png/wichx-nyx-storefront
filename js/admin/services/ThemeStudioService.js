/**
 * ==============================================================================
 * 🎨 THEME STUDIO & LIVE CSS CONFIG SERVICE
 * ==============================================================================
 * Manages 6 Signature Color Presets, Hex Color Picker, and Custom CSS Injection
 * ==============================================================================
 */

class ThemeStudioService {
  constructor(store, apiClient) {
    this.store = store;
    this.apiClient = apiClient;
    this.currentThemeConfig = {
      preset: 'glacier_cyan',
      accent: '#00F0FF',
      accent_hover: '#00D2E0',
      accent_glow: 'rgba(0, 240, 255, 0.22)',
      custom_css: ''
    };
  }

  async initAdminThemeStudio() {
    try {
      const res = await fetch('/api/theme-settings');
      const data = await res.json();
      if (data.success && data.theme) {
        this.currentThemeConfig = Object.assign(this.currentThemeConfig, data.theme);
        this.store.set("currentThemeConfig", this.currentThemeConfig);
      }
    } catch (err) {
      console.warn('[ThemeStudioService] Failed to fetch theme settings, using defaults:', err);
    }

    const hexInput = document.getElementById('theme-hex-input');
    const colorPicker = document.getElementById('theme-color-picker');
    const hoverInput = document.getElementById('theme-hover-input');
    const cssTextarea = document.getElementById('theme-custom-css');

    if (hexInput) hexInput.value = this.currentThemeConfig.accent;
    if (colorPicker) colorPicker.value = this.currentThemeConfig.accent;
    if (hoverInput) hoverInput.value = this.currentThemeConfig.accent_hover;
    if (cssTextarea) cssTextarea.value = this.currentThemeConfig.custom_css || '';

    this.updatePresetActiveStyles(this.currentThemeConfig.preset);
    this.updateLiveThemePreview();
  }

  selectThemePreset(presetKey, accent, hover, glow) {
    this.currentThemeConfig.preset = presetKey;
    this.currentThemeConfig.accent = accent;
    this.currentThemeConfig.accent_hover = hover;
    this.currentThemeConfig.accent_glow = glow;
    this.store.set("currentThemeConfig", this.currentThemeConfig);

    const hexInput = document.getElementById('theme-hex-input');
    const colorPicker = document.getElementById('theme-color-picker');
    const hoverInput = document.getElementById('theme-hover-input');

    if (hexInput) hexInput.value = accent;
    if (colorPicker) colorPicker.value = accent;
    if (hoverInput) hoverInput.value = hover;

    this.updatePresetActiveStyles(presetKey);
    this.updateLiveThemePreview();
  }

  updatePresetActiveStyles(activeKey) {
    const keys = ['glacier_cyan', 'electric_indigo', 'cyber_pink', 'hacker_emerald', 'amber_gold', 'crimson_red'];
    keys.forEach(k => {
      const btn = document.getElementById(`btn-preset-${k}`);
      if (!btn) return;
      if (k === activeKey) {
        btn.classList.add('border-cyan-400', 'ring-2', 'ring-cyan-400/30');
        btn.classList.remove('border-slate-800');
      } else {
        btn.classList.remove('border-cyan-400', 'ring-2', 'ring-cyan-400/30');
        btn.classList.add('border-slate-800');
      }
    });
  }

  onCustomColorPick(val) {
    const hexInput = document.getElementById('theme-hex-input');
    if (hexInput) hexInput.value = val;
    this.currentThemeConfig.preset = 'custom';
    this.currentThemeConfig.accent = val;
    this.updatePresetActiveStyles(null);
    this.updateLiveThemePreview();
  }

  onCustomHexInput(val) {
    if (!val.startsWith('#') && val.length === 6) val = '#' + val;
    const colorPicker = document.getElementById('theme-color-picker');
    if (colorPicker && /^#[0-9A-Fa-f]{6}$/.test(val)) {
      colorPicker.value = val;
    }
    this.currentThemeConfig.preset = 'custom';
    this.currentThemeConfig.accent = val;
    this.updatePresetActiveStyles(null);
    this.updateLiveThemePreview();
  }

  updateLiveThemePreview() {
    const hex = document.getElementById('theme-hex-input')?.value || this.currentThemeConfig.accent || '#00F0FF';
    const hover = document.getElementById('theme-hover-input')?.value || this.currentThemeConfig.accent_hover || '#00D2E0';
    const customCss = document.getElementById('theme-custom-css')?.value || '';

    const badge = document.getElementById('preview-badge');
    if (badge) {
      badge.style.borderColor = hex;
      badge.style.color = hex;
      badge.style.backgroundColor = hex + '22';
    }

    const price = document.getElementById('preview-price');
    if (price) price.style.color = hex;

    const btn = document.getElementById('preview-btn');
    if (btn) {
      btn.style.background = `linear-gradient(135deg, ${hex}, ${hover})`;
    }

    const chip = document.getElementById('preview-chip');
    if (chip) {
      chip.style.borderColor = hex;
      chip.style.color = hex;
      chip.style.backgroundColor = hex + '15';
    }

    const wallet = document.getElementById('preview-wallet');
    if (wallet) {
      wallet.style.borderColor = hex;
      wallet.style.backgroundColor = hex + '15';
      const wIcon = wallet.querySelector('svg, i');
      if (wIcon) wIcon.style.color = hex;
      const wSpan = wallet.querySelector('span');
      if (wSpan) wSpan.style.color = hex;
    }

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--accent', hex);
      document.documentElement.style.setProperty('--accent-hover', hover);
      document.documentElement.style.setProperty('--accent-glow', `${hex}38`);

      let previewStyleTag = document.getElementById('admin-preview-custom-css');
      if (!previewStyleTag) {
        previewStyleTag = document.createElement('style');
        previewStyleTag.id = 'admin-preview-custom-css';
        document.head.appendChild(previewStyleTag);
      }
      previewStyleTag.textContent = customCss;
    }
  }

  async saveAdminThemeSettings() {
    const hex = document.getElementById('theme-hex-input')?.value?.trim() || '#00F0FF';
    const hover = document.getElementById('theme-hover-input')?.value?.trim() || '#00D2E0';
    const customCss = document.getElementById('theme-custom-css')?.value || '';

    const payload = {
      preset: this.currentThemeConfig.preset || 'custom',
      accent: hex,
      accent_hover: hover,
      accent_glow: `${hex}38`,
      custom_css: customCss
    };

    try {
      const res = await this.apiClient.fetchApi('/api/theme-settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        AdminUI.showToast('🎨 บันทึกการตั้งค่าธีมลงระบบเรียบร้อย!', 'success');
      } else {
        alert('ไม่สามารถบันทึกธีมได้: ' + (data.message || 'รหัสแอดมินไม่ถูกต้อง'));
      }
    } catch (err) {
      console.error('[ThemeStudioService] Error saving theme settings:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    }
  }
}

// Global Singleton Bridge
if (typeof window !== "undefined") {
  window.ThemeStudioService = ThemeStudioService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeStudioService;
}
