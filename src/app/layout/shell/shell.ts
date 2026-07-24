import { Component, computed, signal, inject, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Toast } from '../../ui';
import { ThemeService } from '../../services/theme.service';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  template: `
    <div class="shell">

      <!-- Sidebar backdrop on mobile -->
      @if (!sidebarCollapsed()) {
        <div class="mobile-sidebar-backdrop" (click)="sidebarCollapsed.set(true)"></div>
      }

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

        <!-- User profile + logout -->
        <div class="sidebar-user">
          <div class="user-avatar" aria-hidden="true">{{ userInitials() }}</div>
          @if (!sidebarCollapsed()) {
            <div class="user-info">
              <span class="user-name">{{ currentUser()?.name ?? 'User' }}</span>
              <span class="user-role">{{ currentUser()?.role ?? '' }}</span>
            </div>
            <button class="logout-btn" (click)="logout()" aria-label="Log out" title="Log out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          } @else {
            <button class="logout-btn" (click)="logout()" aria-label="Log out" title="Log out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          }
        </div>

      </aside>

      <!-- Main area -->
      <div class="main-area">

        <!-- Topbar -->
        <header class="topbar" role="banner">
          <div class="topbar-left" style="display: flex; align-items: center; gap: 12px;">
            <button
              class="mobile-menu-btn"
              (click)="toggleSidebar()"
              aria-label="Toggle menu"
              style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--color-text-secondary); display: none; align-items: center; justify-content: center;"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1 class="page-title">{{ pageTitle() }}</h1>
          </div>
          <div class="topbar-right">
            <!-- Notification bell -->
            <div class="notif-wrap" #notifWrap>
              <button
                class="icon-btn"
                [class.icon-btn--active]="panelOpen()"
                (click)="togglePanel()"
                aria-label="Notifications"
                [attr.aria-expanded]="panelOpen()"
                aria-haspopup="true"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                @if (notifService.unreadCount() > 0) {
                  <span class="notif-badge" aria-label="{{ notifService.unreadCount() }} unread notifications">
                    {{ notifService.unreadCount() > 9 ? '9+' : notifService.unreadCount() }}
                  </span>
                }
              </button>

              <!-- Notification panel -->
              @if (panelOpen()) {
                <div class="notif-backdrop" (click)="panelOpen.set(false)" aria-hidden="true"></div>
                <div class="notif-panel" role="dialog" aria-label="Notifications" aria-modal="false">
                  <div class="notif-panel-header">
                    <span class="notif-panel-title">Notifications</span>
                    @if (notifService.unreadCount() > 0) {
                      <button class="notif-mark-all" (click)="notifService.markAllRead()">Mark all read</button>
                    }
                  </div>

                  <div class="notif-list" role="list">
                    @for (n of notifService.notifications(); track n.id) {
                      <button
                        class="notif-item"
                        [class.notif-item--unread]="!n.read"
                        role="listitem"
                        (click)="openNotification(n)"
                        [attr.aria-label]="n.title + ': ' + n.body + (n.read ? '' : ' (unread)')"
                      >
                        <span class="notif-icon" [class]="'notif-icon--' + n.type" aria-hidden="true">
                          @if (n.type === 'gate_approved' || n.type === 'stage_unlocked') {
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          } @else if (n.type === 'gate_pending') {
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          } @else {
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          }
                        </span>
                        <span class="notif-body">
                          <span class="notif-title">{{ n.title }}</span>
                          <span class="notif-desc">{{ n.body }}</span>
                          <span class="notif-time">{{ relativeTime(n.createdAt) }}</span>
                        </span>
                        @if (!n.read) {
                          <span class="notif-unread-dot" aria-hidden="true"></span>
                        }
                      </button>
                    } @empty {
                      <div class="notif-empty" role="status">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <p>No notifications yet</p>
                      </div>
                    }
                  </div>

                  <div class="notif-panel-footer">
                    <span class="notif-count">{{ notifService.notifications().length }} total</span>
                  </div>
                </div>
              }
            </div>
            <button class="icon-btn" (click)="themeService.toggle()" aria-label="Toggle theme">{{ themeService.isDark() ? '🌙' : '☀️' }}</button>
          </div>
        </header>

        <!-- Page content -->
        <main class="page-content" id="main-content" #pageContent>
          <router-outlet />
        </main>

      </div>
    </div>

    <!-- Toast overlay -->
    <app-toast />
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
      background: #D9F2E7;
      color: #0B5A47;
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
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(217, 242, 231, 0.32);
      padding: 6px 10px 6px;
      white-space: nowrap;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      color: rgba(222, 240, 233, 0.62);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(217, 242, 231, 0.07);
      color: #ECFDF5;
    }
    .nav-item.active {
      background: rgba(60, 196, 158, 0.16);
      color: #8CE0C4;
      font-weight: 600;
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
      background: rgba(140, 224, 196, 0.16);
      color: #B5EBD6;
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
    .logout-btn {
      margin-left: auto;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .logout-btn:hover {
      background: rgba(239,68,68,0.15);
      color: #FCA5A5;
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
    .notif-wrap {
      position: relative;
    }
    .icon-btn {
      font-size: 1.2rem;
      position: relative;
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
    .icon-btn:hover, .icon-btn--active {
      background: var(--color-surface-raised);
      color: var(--color-text);
    }
    .notif-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 10px;
      background: #EF4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      border: 2px solid var(--color-surface);
    }

    /* Notification panel */
    .notif-backdrop {
      position: fixed;
      inset: 0;
      z-index: 199;
    }
    .notif-panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 360px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 32px rgba(0,0,0,0.16);
      z-index: 200;
      overflow: hidden;
      animation: panel-in 0.15s ease;
    }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .notif-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--color-border);
    }
    .notif-panel-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text);
    }
    .notif-mark-all {
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 500;
      color: var(--color-accent);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: opacity 0.15s;
    }
    .notif-mark-all:hover { opacity: 0.75; }

    .notif-list {
      max-height: 360px;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-bottom: 1px solid var(--color-border);
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-sans);
      transition: background 0.12s;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: var(--color-surface-raised); }
    .notif-item--unread { background: rgba(22,163,74,0.04); }
    .notif-item--unread:hover { background: rgba(22,163,74,0.08); }

    .notif-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .notif-icon--gate_approved, .notif-icon--stage_unlocked {
      background: rgba(22,163,74,0.12);
      color: #16A34A;
    }
    .notif-icon--gate_pending {
      background: rgba(245,158,11,0.12);
      color: #D97706;
    }
    .notif-icon--info {
      background: rgba(99,102,241,0.12);
      color: #6366F1;
    }

    .notif-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .notif-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-text);
    }
    .notif-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .notif-time {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }
    .notif-unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-accent);
      flex-shrink: 0;
      margin-top: 6px;
    }

    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      color: var(--color-text-muted);
      font-size: 13px;
    }
    .notif-empty p { margin: 0; }

    .notif-panel-footer {
      padding: 10px 16px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-raised);
    }
    .notif-count {
      font-size: 11.5px;
      color: var(--color-text-muted);
    }

    /* Page content */
    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 28px 28px;
    }

    .mobile-sidebar-backdrop {
      display: none;
    }

    @media (max-width: 768px) {
      .mobile-menu-btn {
        display: flex !important;
      }
      .sidebar {
        position: fixed;
        top: 0;
        left: -260px;
        height: 100vh;
        z-index: 1000;
        transition: left 0.3s ease, width 0.3s ease;
        box-shadow: 4px 0 12px rgba(0,0,0,0.15);
      }
      .sidebar:not(.collapsed) {
        left: 0;
        width: 260px;
        min-width: 260px;
      }
      .sidebar.collapsed {
        left: -260px;
        width: 260px;
        min-width: 260px;
      }
      .mobile-sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 999;
      }
      .main-area {
        width: 100%;
      }
      .topbar {
        padding: 0 16px;
      }
      .page-content {
        padding: 16px;
      }
      .notif-panel {
        width: calc(100vw - 32px);
        right: -16px;
      }
    }
  `]
})
export class Shell implements OnInit, OnDestroy {
  protected themeService = inject(ThemeService);
  @ViewChild('pageContent') private pageContent!: ElementRef<HTMLElement>;

  protected currentUrl = signal(typeof window !== 'undefined' ? window.location.pathname : '/app/projects');

  protected pageTitle = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/maintenance')) return 'Maintenance';
    if (url.includes('/settings')) return 'Settings';
    if (url.includes('/content-marketing')) return 'Content Marketing';
    if (url.includes('/written-content') || url.includes('/content')) return 'Written Content';
    if (url.includes('/profiling')) return 'Project Profiling';
    if (url.includes('/design')) return 'Design';
    if (url.includes('/development')) return 'Development';
    if (url.includes('/analytics')) return 'Analytics Hub';
    if (url.includes('/social')) return 'Social Media';
    if (url.includes('/paid')) return 'Paid Marketing';
    if (url.includes('/seo')) return 'SEO';
    if (url.includes('/reporting')) return 'Reporting';
    if (url.includes('/projects')) return 'Projects';
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
        {
          label: 'Maintenance',
          route: '/app/maintenance',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
        },
      ]
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Settings',
          route: '/app/settings',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        },
      ]
    }
  ];

  protected sidebarCollapsed = signal(false);
  private savedScroll = 0;
  private routerSub!: Subscription;
  private router = inject(Router);
  private auth = inject(AuthService);
  protected notifService = inject(NotificationService);
  protected panelOpen = signal(false);

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarCollapsed.set(true);
    }
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.savedScroll = this.pageContent?.nativeElement?.scrollTop ?? 0;
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          this.sidebarCollapsed.set(true);
        }
      }
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        // Restore on same-page tab switches; reset only on top-level page changes
        const el = this.pageContent?.nativeElement;
        if (!el) return;
        const isTopLevel = ['projects', 'profiling', 'written-content', 'design', 'development',
          'analytics', 'content-marketing', 'social', 'paid', 'seo', 'reporting', 'maintenance', 'settings']
          .some(p => event.urlAfterRedirects === `/app/${p}`);
        el.scrollTop = isTopLevel ? 0 : this.savedScroll;
      }
    });
  }


  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  protected currentUser = this.auth.user;
  protected userInitials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  });

  protected toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  protected togglePanel() {
    this.panelOpen.update(v => !v);
  }

  protected openNotification(n: { id: string; route: string; read: boolean }) {
    this.notifService.markRead(n.id);
    this.panelOpen.set(false);
    this.router.navigateByUrl(n.route);
  }

  protected relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  protected logout() {
    this.auth.logout();
  }
}
