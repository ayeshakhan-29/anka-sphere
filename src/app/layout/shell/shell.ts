import { Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">

      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">

        <!-- Logo -->
        <div class="sidebar-logo">
          <div class="logo-mark">A</div>
          @if (!sidebarCollapsed()) {
            <span class="logo-text">Anka Sphere</span>
          }
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav" aria-label="Main navigation">
          @for (group of navGroups; track group.label) {
            <div class="nav-group">
              @if (!sidebarCollapsed()) {
                <span class="nav-group-label">{{ group.label }}</span>
              }
              @for (item of group.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: !!item.exact }"
                  class="nav-item"
                  [attr.aria-label]="sidebarCollapsed() ? item.label : null"
                  [title]="sidebarCollapsed() ? item.label : ''"
                >
                  <span class="nav-icon" [innerHTML]="item.icon" aria-hidden="true"></span>
                  @if (!sidebarCollapsed()) {
                    <span class="nav-label">{{ item.label }}</span>
                  }
                </a>
              }
            </div>
          }
        </nav>

        <!-- Collapse toggle -->
        <button
          class="collapse-btn"
          (click)="toggleSidebar()"
          [attr.aria-expanded]="!sidebarCollapsed()"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            @if (sidebarCollapsed()) {
              <path d="M9 18l6-6-6-6"/>
            } @else {
              <path d="M15 18l-6-6 6-6"/>
            }
          </svg>
        </button>

        <!-- User profile -->
        <div class="sidebar-user">
          <div class="user-avatar" aria-hidden="true">AK</div>
          @if (!sidebarCollapsed()) {
            <div class="user-info">
              <span class="user-name">Ayesha K.</span>
              <span class="user-role">Admin</span>
            </div>
          }
        </div>

      </aside>

      <!-- Main area -->
      <div class="main-area">

        <!-- Topbar -->
        <header class="topbar" role="banner">
          <div class="topbar-left">
            <h1 class="page-title">{{ pageTitle() }}</h1>
          </div>
          <div class="topbar-right">
            <button class="icon-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="page-content" id="main-content">
          <router-outlet />
        </main>

      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 260px;
      min-width: 260px;
      background: var(--color-sidebar);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, min-width 0.2s ease;
      overflow: hidden;
    }
    .sidebar.collapsed {
      width: 64px;
      min-width: 64px;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .logo-mark {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 8px;
      background: var(--color-accent);
      color: #fff;
      font-family: var(--font-display);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-text {
      font-family: var(--font-display);
      font-size: 17px;
      color: #F8FAFC;
      white-space: nowrap;
    }

    /* Nav */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 1px;
      margin-bottom: 8px;
    }
    .nav-group-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
      padding: 4px 10px 6px;
      white-space: nowrap;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.08);
      color: #F8FAFC;
    }
    .nav-item.active {
      background: rgba(22, 163, 74, 0.2);
      color: #4ADE80;
    }
    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
    }
    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Collapse button */
    .collapse-btn {
      margin: 8px;
      padding: 8px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .collapse-btn:hover {
      background: rgba(255,255,255,0.08);
      color: #F8FAFC;
    }

    /* User */
    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px;
      border-top: 1px solid rgba(255,255,255,0.07);
    }
    .user-avatar {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      color: #F8FAFC;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #F8FAFC;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
    }

    /* ── Main area ── */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--color-bg);
    }

    /* Topbar */
    .topbar {
      height: 60px;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    .page-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 400;
      color: var(--color-text);
      margin: 0;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .icon-btn:hover {
      background: var(--color-surface-raised);
      color: var(--color-text);
    }

    /* Page content */
    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 28px 28px;
    }
  `]
})
export class Shell {
  protected sidebarCollapsed = signal(false);

  protected pageTitle = computed(() => {
    const url = window.location.pathname;
    if (url.includes('projects')) return 'Projects';
    if (url.includes('profiling')) return 'Project Profiling';
    if (url.includes('written-content')) return 'Written Content';
    if (url.includes('design')) return 'Design';
    if (url.includes('development')) return 'Development';
    if (url.includes('analytics')) return 'Analytics Hub';
    if (url.includes('social')) return 'Social Media';
    if (url.includes('paid')) return 'Paid Marketing';
    if (url.includes('seo')) return 'SEO';
    if (url.includes('reporting')) return 'Reporting';
    return 'Dashboard';
  });

  protected navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        {
          label: 'Projects',
          route: '/app/projects',
          exact: true,
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
        },
      ]
    },
    {
      label: 'Product Modelling',
      items: [
        {
          label: 'Project Profiling',
          route: '/app/profiling',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
        },
        {
          label: 'Written Content',
          route: '/app/written-content',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
        },
        {
          label: 'Design',
          route: '/app/design',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>`
        },
      ]
    },
    {
      label: 'Product Development',
      items: [
        {
          label: 'Development',
          route: '/app/development',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
        },
      ]
    },
    {
      label: 'Product Growth',
      items: [
        {
          label: 'Analytics Hub',
          route: '/app/analytics',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
        },
        {
          label: 'Content Marketing',
          route: '/app/content-marketing',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
        },
        {
          label: 'Social Media',
          route: '/app/social',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`
        },
        {
          label: 'Paid Marketing',
          route: '/app/paid',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
        },
        {
          label: 'SEO',
          route: '/app/seo',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
        },
      ]
    },
    {
      label: 'Reports',
      items: [
        {
          label: 'Reporting',
          route: '/app/reporting',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`
        },
      ]
    }
  ];

  protected toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}
