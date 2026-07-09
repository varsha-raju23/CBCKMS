// ============================================================
// TunnelKMS - API Configuration & Shared Utilities
// ============================================================

const API_BASE = '/api';

// Auth Helpers
const Auth = {
  getToken: () => localStorage.getItem('tkms_token'),

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('tkms_user'));
    } catch {
      return null;
    }
  },

  setSession: (token, user) => {
    localStorage.setItem('tkms_token', token);
    localStorage.setItem('tkms_user', JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem('tkms_token');
    localStorage.removeItem('tkms_user');
  },

  isLoggedIn: () => !!localStorage.getItem('tkms_token'),

  requireAuth: () => {
    if (!localStorage.getItem('tkms_token')) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  },

  requireProfile: () => true
};

// API Request Helper
const API = {
  request: async (endpoint, options = {}) => {
    const token = Auth.getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      Auth.clearSession();
      window.location.href = '/pages/login.html';
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  get: (endpoint) => API.request(endpoint, { method: 'GET' }),

  post: (endpoint, body) => API.request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  }),

  put: (endpoint, body) => API.request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),

  patch: (endpoint, body) => API.request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),

  delete: (endpoint) => API.request(endpoint, { method: 'DELETE' }),

  upload: (endpoint, formData) => API.request(endpoint, {
    method: 'POST',
    body: formData
  })
};

// Toast Notifications
const Toast = {
  show: (message, type = 'info', duration = 4000) => {
    const container = document.getElementById('toast-container') || (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(c);
      return c;
    })();

    const icons = {
      success: 'OK',
      error: 'ERR',
      warning: '!',
      info: 'i'
    };

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      background:#1e293b;
      color:#f1f5f9;
      padding:14px 20px;
      border-radius:10px;
      border-left:4px solid ${colors[type]};
      min-width:280px;
      max-width:400px;
      box-shadow:0 10px 40px rgba(0,0,0,.4);
      display:flex;
      align-items:center;
      gap:10px;
      font-size:14px;
      animation:slideIn .3s ease;
      cursor:pointer;
    `;

    toast.innerHTML = `<span style="font-weight:700;">${icons[type]}</span><span style="flex:1">${message}</span><span style="opacity:.5;font-size:18px;">x</span>`;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error: (msg, dur) => Toast.show(msg, 'error', dur),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
  info: (msg, dur) => Toast.show(msg, 'info', dur)
};

// Loader
const Loader = {
  show: (text = 'Loading...') => {
    let el = document.getElementById('global-loader');

    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loader';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
      el.innerHTML = `<div class="spin" style="width:50px;height:50px;border:4px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:spin 1s linear infinite;"></div><p style="color:#f1f5f9;font-size:16px;" id="loader-text">${text}</p>`;
      document.body.appendChild(el);
    } else {
      document.getElementById('loader-text').textContent = text;
      el.style.display = 'flex';
    }
  },

  hide: () => {
    const el = document.getElementById('global-loader');
    if (el) el.style.display = 'none';
  }
};

// Format Helpers
const Format = {
  fileSize: (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  },

  date: (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  dateTime: (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  timeAgo: (d) => {
    const now = new Date();
    const then = new Date(d);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';

    return Format.date(d);
  },

  docTypeColor: (type) => {
    const map = {
      'Tunnel Design': '#8b5cf6',
      'Safety Reports': '#ef4444',
      'Daily Progress Reports': '#10b981',
      'Site Inspection': '#f59e0b',
      'Equipment Details': '#3b82f6',
      'Material Reports': '#ec4899',
      'Project Drawings': '#06b6d4',
      'Contracts': '#84cc16',
      'Specifications': '#f97316',
      'Survey Reports': '#a78bfa',
      'Environmental Reports': '#34d399',
      'Other': '#94a3b8'
    };

    return map[type] || '#94a3b8';
  },

  roleColor: (role) => {
    const map = {
      admin: '#ef4444',
      manager: '#f59e0b',
      engineer: '#3b82f6',
      viewer: '#94a3b8'
    };

    return map[role] || '#94a3b8';
  },

  fileIcon: (name) => {
    const ext = (name || '').split('.').pop().toLowerCase();

    const map = {
      pdf: 'PDF',
      doc: 'DOC',
      docx: 'DOC',
      xls: 'XLS',
      xlsx: 'XLS',
      ppt: 'PPT',
      pptx: 'PPT',
      txt: 'TXT',
      csv: 'CSV',
      jpg: 'IMG',
      jpeg: 'IMG',
      png: 'IMG',
      dwg: 'DWG',
      dxf: 'DXF'
    };

    return map[ext] || 'FILE';
  }
};

// Dark Mode
const Theme = {
  init: () => {
    const saved = localStorage.getItem('tkms_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },

  toggle: () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tkms_theme', next);
  },

  get: () => document.documentElement.getAttribute('data-theme') || 'dark'
};

// Global CSS animations injection
(() => {
  const style = document.createElement('style');

  style.textContent = `
    @keyframes slideIn {
      from { transform:translateX(110%); opacity:0; }
      to { transform:translateX(0); opacity:1; }
    }

    @keyframes slideOut {
      from { transform:translateX(0); opacity:1; }
      to { transform:translateX(110%); opacity:0; }
    }

    @keyframes spin {
      to { transform:rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity:0; transform:translateY(10px); }
      to { opacity:1; transform:translateY(0); }
    }

    @keyframes pulse {
      0%,100% { opacity:1; }
      50% { opacity:.5; }
    }

    .fade-in {
      animation: fadeIn .4s ease;
    }
  `;

  document.head.appendChild(style);
})();

Theme.init();

// ===== GLOBAL THEME + SELECT FIX =====
(function () {
  function applyTheme(theme) {
    const finalTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", finalTheme);
    localStorage.setItem("tkms_theme", finalTheme);
  }

  window.setTheme = applyTheme;

  window.toggleTheme = function () {
    const current = localStorage.getItem("tkms_theme") || document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  };

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(localStorage.getItem("tkms_theme") || "dark");

    document.addEventListener("click", function (e) {
      const btn = e.target.closest("button, .theme-toggle, [data-theme-toggle]");
      if (!btn) return;

      const text = (btn.textContent || "").toLowerCase();
      const id = (btn.id || "").toLowerCase();

      if (
        id.includes("theme") ||
        text.includes("light mode") ||
        text.includes("dark mode") ||
        text.includes("?") ||
        text.includes("??")
      ) {
        e.preventDefault();
        window.toggleTheme();
      }
    });

    document.querySelectorAll("select").forEach(function (select) {
      select.style.pointerEvents = "auto";
      select.style.userSelect = "auto";
      select.style.webkitAppearance = "menulist";
      select.style.appearance = "auto";
    });
  });
})();
// ===== END GLOBAL THEME + SELECT FIX =====

