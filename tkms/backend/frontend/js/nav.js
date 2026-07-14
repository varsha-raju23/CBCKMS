// ============================================================
// TunnelKMS — Shared Navigation & Layout Builder
// ============================================================

const Nav = {
  build: async (activePage) => {
    if (!Auth.requireAuth()) return;
    if (!Auth.requireProfile()) return;

    const user = Auth.getUser();
    const isAdmin = user?.role === 'admin';

    // Fetch unread notification count
    let unreadCount = 0;
    try {
      const data = await API.get('/notifications');
      unreadCount = data.unreadCount || 0;
    } catch(e) {}

    const navHTML = `
    <nav class="topnav" id="topnav">
      <div class="topnav-brand">
        <a href="dashboard.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;">
          <span style="font-size:28px;"></span>
          <span class="topnav-title">TunnelKMS</span>
        </a>
      </div>

      <div class="topnav-links" id="navLinks">
        <a href="dashboard.html" class="${activePage==='dashboard'?'active':''}" >
           Dashboard
        </a>
        <a href="documents.html" class="${activePage==='documents'?'active':''}">
           Documents
        </a>
        <a href="ai-assistant.html" class="${activePage==='ai'?'active':''}">
           AI Assistant
        </a>
        <a href="help-center.html" class="${activePage==='help'?'active':''}">
           Help Center
        </a>
        ${isAdmin ? `<a href="admin.html" class="${activePage==='admin'?'active':''}" style="color:#ef4444;">
          ️ Admin
        </a>` : ''}
      </div>

      <div class="topnav-right">
        <!-- Theme Toggle -->
        <button onclick="Theme.toggle();updateThemeIcon()" id="themeToggleBtn" class="btn btn-ghost btn-sm" title="Toggle theme" style="padding:8px;">
          ${Theme.get()==='dark'?'️':''}
        </button>

        <!-- Notifications -->
        <div class="dropdown notif-btn" id="notifDropdown">
          <button class="btn btn-ghost btn-sm" onclick="Nav.toggleNotif()" style="padding:8px;position:relative;">
            
            <span class="notif-badge" id="notifBadge" style="${unreadCount===0?'display:none':''}">
              ${unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </button>
          <div class="notif-panel" id="notifPanel">
            <div class="notif-panel-header">
              <h3> Notifications</h3>
              <button onclick="Nav.markAllRead()" class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:11px;">Mark all read</button>
            </div>
            <div class="notif-list" id="notifList">
              <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">Loading...</div>
            </div>
          </div>
        </div>

        <!-- Mobile menu -->
        <button class="btn btn-ghost btn-sm" id="mobileMenuBtn" style="padding:8px;" onclick="Nav.toggleMobile()"></button>

        <!-- Profile Dropdown -->
        <div class="dropdown" id="profileDropdown">
          <div class="avatar-btn" onclick="Nav.toggleProfile()" title="${user?.profile?.fullName || user?.email}">
            ${user?.profile?.profilePhoto
              ? `<img src="http://localhost:5000${user.profile.profilePhoto}" alt="Profile" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
              : ''}
            <span>${(user?.profile?.fullName || user?.email || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <div class="dropdown-menu" id="profileMenu">
            <div style="padding:16px;border-bottom:1px solid var(--border);">
              <div style="font-weight:600;font-size:14px;">${user?.profile?.fullName || 'User'}</div>
              <div style="font-size:12px;color:var(--text-muted);">${user?.email}</div>
              <span class="badge" style="margin-top:6px;background:${Format.roleColor(user?.role)}22;color:${Format.roleColor(user?.role)};border:1px solid ${Format.roleColor(user?.role)}44;">
                ${user?.role?.toUpperCase()}
              </span>
            </div>
            <a href="profile.html" class="dropdown-item"> My Profile</a>
            <a href="documents.html" class="dropdown-item"> My Documents</a>
            ${isAdmin ? `<a href="admin.html" class="dropdown-item" style="color:var(--danger);">️ Admin Panel</a>` : ''}
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="Nav.logout()"> Logout</div>
          </div>
        </div>
      </div>
    </nav>`;

    // Insert nav at top of body
    const wrapper = document.createElement('div');
    wrapper.innerHTML = navHTML;
    document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!document.getElementById('profileDropdown')?.contains(e.target)) {
        document.getElementById('profileMenu')?.classList.remove('show');
      }
      if (!document.getElementById('notifDropdown')?.contains(e.target)) {
        document.getElementById('notifPanel')?.classList.remove('show');
      }
    });
  },

  toggleProfile: () => {
    document.getElementById('profileMenu').classList.toggle('show');
    document.getElementById('notifPanel').classList.remove('show');
  },

  toggleNotif: async () => {
    const panel = document.getElementById('notifPanel');
    const isOpen = panel.classList.contains('show');
    panel.classList.toggle('show');
    document.getElementById('profileMenu').classList.remove('show');
    if (!isOpen) await Nav.loadNotifications();
  },

  loadNotifications: async () => {
    try {
      const data = await API.get('/notifications');
      const list = document.getElementById('notifList');
      const badge = document.getElementById('notifBadge');
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
      if (!data.notifications?.length) {
        list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet</div>';
        return;
      }
      list.innerHTML = data.notifications.map(n => `
        <div class="notif-item ${n.isRead?'':'unread'}">
          <div class="notif-dot ${n.isRead?'read':''}"></div>
          <div>
            <p>${n.message}</p>
            <time>${Format.timeAgo(n.createdAt)}</time>
          </div>
        </div>
      `).join('');
    } catch(e) {}
  },

  markAllRead: async () => {
    try {
      await API.put('/notifications/read-all', {});
      document.getElementById('notifBadge').style.display = 'none';
      document.querySelectorAll('.notif-item').forEach(i => i.classList.remove('unread'));
      document.querySelectorAll('.notif-dot').forEach(d => d.classList.add('read'));
    } catch(e) {}
  },

  toggleMobile: () => {
    document.getElementById('navLinks').classList.toggle('mobile-show');
  },

  logout: () => {
    if (confirm('Are you sure you want to logout?')) {
      Auth.clearSession();
      window.location.href = 'login.html';
    }
  }
};

function updateThemeIcon() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = Theme.get() === 'dark' ? '️' : '';
}
