import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProjectService } from '../../services/project.service';
import { IntegrationService, OAuthProviderSlug } from '../../services/integration.service';
import { UserRole, IntegrationInfo, IntegrationProvider } from '../../models/project.models';
import { environment } from '../../../environments/environment';

type TabId = 'profile' | 'team' | 'integrations' | 'notifications';

interface IntegrationCard {
  provider: IntegrationProvider;
  name: string;
  kind: 'oauth' | 'env';
  slug?: OAuthProviderSlug;   // for oauth cards
  envVar?: string;            // for env cards
  what: string;
  cost: string;
  steps: string[];
}

const INTEGRATION_CARDS: IntegrationCard[] = [
  {
    provider: 'GOOGLE_ANALYTICS', name: 'Google (GA4 + Search Console + Ads)', kind: 'oauth', slug: 'google',
    what: 'Live sessions, users, conversions, search queries and ad campaign data across the Analytics Hub, SEO and Paid departments.',
    cost: 'Free (Google APIs). ~15 min one-time setup.',
    steps: [
      'Go to console.cloud.google.com → create/select a project.',
      'Enable APIs: "Google Analytics Data API", "Search Console API", "Google Ads API".',
      'APIs & Services → OAuth consent screen → External → add your users as test users.',
      'Credentials → Create OAuth client ID → Web application → Under "Authorized redirect URIs", paste the exact Callback URL copied above.',
      'Copy Client ID/Secret into server .env (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) & set GOOGLE_OAUTH_REDIRECT_URI, restart, then hit Connect below.',
      'For Google Ads also request a developer token at ads.google.com → Tools → API Center and set GOOGLE_ADS_DEVELOPER_TOKEN.',
    ],
  },
  {
    provider: 'META', name: 'Meta (Facebook + Instagram)', kind: 'oauth', slug: 'meta',
    what: 'Publish posts to FB Pages / IG business accounts and pull ad campaign insights into the Paid department.',
    cost: 'Free (Graph API). ~20 min setup; app review needed for production publishing.',
    steps: [
      'Go to developers.facebook.com → Create App → Select "Business" app type.',
      'Add products: "Facebook Login for Business" and "Marketing API".',
      'Facebook Login → Settings → Under "Valid OAuth Redirect URIs", paste the exact Callback URL copied above.',
      'Settings → Basic: Copy App ID / App Secret into server .env (META_APP_ID / META_APP_SECRET).',
      'Link an Instagram business account to your Facebook Page for IG publishing.',
      'Restart the server and hit Connect below.',
    ],
  },
  {
    provider: 'TIKTOK', name: 'TikTok', kind: 'oauth', slug: 'tiktok',
    what: 'Publish videos via the Content Posting API from the Social department.',
    cost: 'Free. ~15 min setup; TikTok audits apps before production posting.',
    steps: [
      'Go to developers.tiktok.com → Manage apps → Create app.',
      'Add the "Content Posting API" product and request video.publish / video.upload scopes.',
      'Under "Redirect URI / Callback URL", paste the exact Callback URL copied above.',
      'Copy Client Key / Client Secret into server .env (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET).',
      'Restart the server and hit Connect below.',
    ],
  },
  {
    provider: 'OPENAI' as IntegrationProvider, name: 'OpenAI (gpt-image-1 + copy)', kind: 'env', envVar: 'OPENAI_API_KEY',
    what: 'AI images in the Design tab plus captions, ad copy, page drafts and report drafts.',
    cost: '~$0.04–0.17/image; fractions of a cent per text generation.',
    steps: [
      'Go to platform.openai.com → API keys → Create new secret key.',
      'Set OPENAI_API_KEY in the server .env and restart. Keys never touch the browser.',
    ],
  },
  {
    provider: 'STABILITY', name: 'Stability AI (Stable Image Core)', kind: 'env', envVar: 'STABILITY_API_KEY',
    what: 'Alternative, cheaper image provider in the Design tab picker.',
    cost: '~$0.03/image (3 credits).',
    steps: [
      'Go to platform.stability.ai → Account → API keys → Create.',
      'Set STABILITY_API_KEY in the server .env and restart. The Design tab picker shows Stability automatically.',
    ],
  },
  {
    provider: 'RUNWAY', name: 'Runway ML (gen4_turbo video)', kind: 'env', envVar: 'RUNWAY_API_KEY',
    what: 'AI video generation panel in the Design tab (text/image → 5–10 s video).',
    cost: '~$0.25–0.50 per 5–10 s video (credits).',
    steps: [
      'Go to dev.runwayml.com → create an API key (separate billing from the Runway web app).',
      'Set RUNWAY_API_KEY in the server .env and restart.',
    ],
  },
  {
    provider: 'AWS_S3' as IntegrationProvider, name: 'AWS S3 (Image Storage)', kind: 'env', envVar: 'AWS_S3_BUCKET_NAME',
    what: 'Moves AI-generated images and videos out of the database and stores them in an S3 bucket instead.',
    cost: 'Free tier / standard S3 pricing (~$0.023/GB).',
    steps: [
      'Go to console.aws.amazon.com → S3 → Create bucket.',
      'Go to IAM → Create user with Programmatic access (copy Access Key ID and Secret Access Key).',
      'Attach a policy granting S3 read/write access to your user (e.g. AmazonS3FullAccess or custom bucket policy).',
      'Set environment variables in server .env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME.',
      'Restart the server.',
    ],
  },
];

interface TeamMember {
  name: string;
  initials: string;
  role: string;
  projectCount: number;
  projects: string[];
}

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  ADMIN:                        'Admin',
  MANAGER_PRODUCT_MODELLING:    'Manager — Product Modelling',
  MANAGER_PRODUCT_DEVELOPMENT:  'Manager — Product Development',
  MANAGER_PRODUCT_GROWTH:       'Manager — Product Growth',
  CONTENT_WRITER:               'Content Writer',
  DESIGNER:                     'Designer',
  DEVELOPER:                    'Developer',
  SOCIAL_MEDIA:                 'Social Media',
  PAID_ADS:                     'Paid Ads',
  SEO:                          'SEO',
};

const ROLE_DEPT: Partial<Record<UserRole, string>> = {
  ADMIN:                        'All Departments',
  MANAGER_PRODUCT_MODELLING:    'Product Modelling',
  MANAGER_PRODUCT_DEVELOPMENT:  'Product Development',
  MANAGER_PRODUCT_GROWTH:       'Product Growth',
  CONTENT_WRITER:               'Written Content',
  DESIGNER:                     'Design',
  DEVELOPER:                    'Development',
  SOCIAL_MEDIA:                 'Social Media',
  PAID_ADS:                     'Paid Marketing',
  SEO:                          'SEO',
};

const ROLE_COLOR: Partial<Record<UserRole, string>> = {
  ADMIN:                        '#6366F1',
  MANAGER_PRODUCT_MODELLING:    '#8B5CF6',
  MANAGER_PRODUCT_DEVELOPMENT:  '#F59E0B',
  MANAGER_PRODUCT_GROWTH:       '#10B981',
  CONTENT_WRITER:               '#3B82F6',
  DESIGNER:                     '#EC4899',
  DEVELOPER:                    '#F97316',
  SOCIAL_MEDIA:                 '#EC4899',
  PAID_ADS:                     '#EF4444',
  SEO:                          '#10B981',
};

@Component({
  selector: 'app-settings',
  imports: [CommonModule],
  template: `
    <div class="settings-page">

      <!-- Header -->
      <div class="settings-header">
        <div>
          <h2 class="settings-title">Settings</h2>
          <p class="settings-sub">Account, team, and preferences</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-nav" role="tablist" aria-label="Settings sections">
        @for (t of tabs; track t.id) {
          <button type="button" role="tab" class="tab-btn" [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id" (click)="activeTab.set(t.id)">
            <span class="tab-icon" aria-hidden="true">
              @if (t.id === 'profile') {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              } @else if (t.id === 'team') {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              } @else if (t.id === 'integrations') {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              } @else if (t.id === 'notifications') {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              }
            </span>
            {{ t.label }}
          </button>
        }
      </div>

      <!-- Profile tab -->
      @if (activeTab() === 'profile') {
        <div class="tab-panel">

          <div class="profile-hero">
            <div class="profile-avatar" [style.background]="roleColor()" aria-hidden="true">
              {{ initials() }}
            </div>
            <div class="profile-meta">
              <div class="profile-name">{{ user()?.name ?? '—' }}</div>
              <div class="profile-email">{{ user()?.email ?? '—' }}</div>
              <div class="profile-role-badge" [style.background]="roleColor() + '1A'" [style.color]="roleColor()">
                {{ roleLabel() }}
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-card-header">Account Details</div>
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-key">Full Name</span>
                  <span class="info-val">{{ user()?.name ?? '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">Email</span>
                  <span class="info-val">{{ user()?.email ?? '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">Role</span>
                  <span class="info-val">{{ roleLabel() }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">Department</span>
                  <span class="info-val">{{ roleDept() }}</span>
                </div>
                <div class="info-row">
                  <span class="info-key">Permissions</span>
                  <span class="info-val">{{ permissionSummary() }}</span>
                </div>
              </div>
            </div>

            <div class="info-card">
              <div class="info-card-header">Access Control</div>
              <div class="access-list" role="list">
                @for (p of permissions(); track p.label) {
                  <div class="access-row" role="listitem">
                    <span class="access-check" [class.access-yes]="p.allowed" [class.access-no]="!p.allowed" aria-hidden="true">
                      @if (p.allowed) {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      }
                    </span>
                    <span class="access-label">{{ p.label }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

        </div>
      }

      <!-- Team tab -->
      @if (activeTab() === 'team') {
        <div class="tab-panel">

          @if (teamLoading()) {
            <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading team…</div>
          } @else {
            <div class="team-summary">
              <span class="team-total">{{ team().length }} team members</span>
              <span class="team-note">across {{ projectCount() }} projects</span>
            </div>

            <div class="team-grid" role="list" aria-label="Team members">
              @for (member of team(); track member.name) {
                <article class="member-card" role="listitem">
                  <div class="member-top">
                    <div class="member-avatar" [style.background]="memberColor(member.role)" aria-hidden="true">
                      {{ member.initials }}
                    </div>
                    <div class="member-info">
                      <span class="member-name">{{ member.name }}</span>
                      <span class="member-role">{{ member.role }}</span>
                    </div>
                  </div>
                  <div class="member-dept">
                    {{ memberDept(member.role) }}
                  </div>
                  <div class="member-projects">
                    <span class="mp-count">{{ member.projectCount }} project{{ member.projectCount !== 1 ? 's' : '' }}</span>
                    <div class="mp-list">
                      @for (p of member.projects.slice(0, 3); track p) {
                        <span class="mp-chip">{{ p }}</span>
                      }
                      @if (member.projects.length > 3) {
                        <span class="mp-chip mp-chip--more">+{{ member.projects.length - 3 }}</span>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>

            @if (team().length === 0) {
              <div class="empty-state">No team members found. Members appear once assigned to a project.</div>
            }
          }
        </div>
      }

      <!-- Integrations tab -->
      @if (activeTab() === 'integrations') {
        <div class="tab-panel">
          @if (oauthResult()) {
            <div class="oauth-banner" [class.oauth-err]="oauthResultIsError()" role="status">{{ oauthResult() }}</div>
          }
          @if (intLoading()) {
            <div class="loading-state" role="status"><div class="spinner" aria-hidden="true"></div>Loading integrations…</div>
          } @else {
            <div class="int-list" role="list" aria-label="Integrations">
              @for (card of integrationCards; track card.provider) {
                <article class="int-card" role="listitem">
                  <div class="int-head">
                    <div class="int-title-wrap">
                      <span class="int-name">{{ card.name }}</span>
                      <span class="int-status" [attr.data-s]="statusFor(card.provider)">{{ statusLabelFor(card.provider) }}</span>
                    </div>
                    <div class="int-actions">
                      @if (card.kind === 'oauth') {
                        @if (statusFor(card.provider) === 'CONNECTED') {
                          <button class="btn-outline-sm" (click)="disconnect(card.slug!)" [disabled]="busySlug() === card.slug">
                            @if (busySlug() === card.slug) { … } @else { Disconnect }
                          </button>
                        } @else if (configuredFor(card.provider)) {
                          <button class="btn-connect" (click)="connect(card.slug!)" [disabled]="busySlug() === card.slug">
                            @if (busySlug() === card.slug) { Opening… } @else { Connect }
                          </button>
                        } @else {
                          <span class="int-env-note">Set server env keys first</span>
                        }
                      } @else {
                        <span class="int-env-note">
                          @if (statusFor(card.provider) === 'CONNECTED') { Configured via server env ({{ card.envVar }}) }
                          @else { Add {{ card.envVar }} to the server env }
                        </span>
                      }
                    </div>
                  </div>
                  @if (accountFor(card.provider); as acct) {
                    <div class="int-account">Connected as {{ acct }}</div>
                  }
                  @if (errorFor(card.provider); as err) {
                    <div class="int-error" role="alert">{{ err }}</div>
                  }
                  <p class="int-what">{{ card.what }}</p>
                  <p class="int-cost">💰 {{ card.cost }}</p>

                  @if (card.kind === 'oauth' && card.slug) {
                    <div class="callback-url-box">
                      <div class="cb-header">
                        <span class="cb-title">⚡ Authorized Redirect URI (Callback URL)</span>
                        <span class="cb-sub">Copy and paste this exact URL into your {{ card.name.split(' ')[0] }} Developer Console under <strong>Valid OAuth Redirect URIs</strong>:</span>
                      </div>
                      <div class="cb-row">
                        <code class="cb-code">{{ getCallbackUrl(card.slug) }}</code>
                        <button type="button" class="btn-copy-cb" (click)="copyCallbackUrl(card.slug)">
                          {{ copiedSlug() === card.slug ? 'Copied! ✓' : 'Copy Callback URL' }}
                        </button>
                      </div>
                    </div>
                  }

                  <details class="int-guide">
                    <summary>Click-by-click setup guide</summary>
                    <ol class="int-steps">
                      @for (step of card.steps; track $index) { <li>{{ step }}</li> }
                    </ol>
                  </details>
                </article>
              }
            </div>
          }
        </div>
      }

      <!-- Notifications tab -->
      @if (activeTab() === 'notifications') {
        <div class="tab-panel">

          <div class="notif-section">
            <div class="notif-section-title">Notification History</div>
            <div class="notif-summary">
              {{ notifService.unreadCount() }} unread · {{ notifService.notifications().length }} total
              @if (notifService.unreadCount() > 0) {
                <button class="mark-all-btn" (click)="notifService.markAllRead()">Mark all read</button>
              }
            </div>
          </div>

          <div class="notif-list" role="list" aria-label="Notifications">
            @for (n of notifService.notifications(); track n.id) {
              <div class="notif-row" [class.notif-unread]="!n.read" role="listitem"
                (click)="notifService.markRead(n.id)">
                <div class="notif-icon" [class]="'ni-' + n.type" aria-hidden="true">
                  @if (n.type === 'gate_approved') {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  } @else if (n.type === 'stage_unlocked') {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  } @else if (n.type === 'gate_pending') {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  } @else {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  }
                </div>
                <div class="notif-body">
                  <div class="notif-title">{{ n.title }}</div>
                  <div class="notif-text">{{ n.body }}</div>
                  <div class="notif-time">{{ relativeTime(n.createdAt) }}</div>
                </div>
                @if (!n.read) {
                  <div class="notif-dot" aria-label="Unread"></div>
                }
              </div>
            } @empty {
              <div class="empty-state">No notifications yet.</div>
            }
          </div>

          <div class="notif-section" style="margin-top: 8px;">
            <div class="notif-section-title">Preferences</div>
            <div class="pref-list" role="list">
              @for (p of notifPrefs; track p.key) {
                <label class="pref-row" role="listitem">
                  <div class="pref-info">
                    <span class="pref-label">{{ p.label }}</span>
                    <span class="pref-desc">{{ p.desc }}</span>
                  </div>
                  <div class="toggle" [class.on]="p.enabled()" (click)="p.toggle()"
                    role="switch" [attr.aria-checked]="p.enabled()" [attr.aria-label]="p.label" tabindex="0"
                    (keydown.enter)="p.toggle()" (keydown.space)="$event.preventDefault(); p.toggle()">
                    <div class="toggle-thumb"></div>
                  </div>
                </label>
              }
            </div>
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 20px; max-width: 860px; }
    .settings-header { }
    .settings-title { font-family: var(--font-display); font-size: 24px; font-weight: 400; color: var(--color-text); margin: 0 0 4px; }
    .settings-sub { font-size: 13px; color: var(--color-text-muted); margin: 0; }

    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
    .tab-icon { display: flex; align-items: center; }

    .tab-panel { display: flex; flex-direction: column; gap: 20px; }

    /* Profile */
    .profile-hero { display: flex; align-items: center; gap: 20px; padding: 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .profile-avatar { width: 64px; height: 64px; min-width: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: 700; }
    .profile-name { font-size: 20px; font-weight: 600; color: var(--color-text); margin-bottom: 2px; }
    .profile-email { font-size: 13.5px; color: var(--color-text-muted); margin-bottom: 8px; }
    .profile-role-badge { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 12px; font-size: 11.5px; font-weight: 600; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .info-card-header { padding: 12px 18px; background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); }
    .info-rows { display: flex; flex-direction: column; }
    .info-row { display: flex; gap: 12px; padding: 10px 18px; border-bottom: 1px solid var(--color-border); }
    .info-row:last-child { border-bottom: none; }
    .info-key { font-size: 12px; font-weight: 600; color: var(--color-text-muted); min-width: 100px; padding-top: 1px; }
    .info-val { font-size: 13px; color: var(--color-text-secondary); }

    .access-list { display: flex; flex-direction: column; }
    .access-row { display: flex; align-items: center; gap: 10px; padding: 9px 18px; border-bottom: 1px solid var(--color-border); }
    .access-row:last-child { border-bottom: none; }
    .access-check { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .access-yes { background: #ECFDF5; color: #16A34A; }
    .access-no  { background: var(--color-surface-raised); color: var(--color-text-muted); }
    .access-label { font-size: 12.5px; color: var(--color-text-secondary); }

    /* Team */
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .team-summary { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted); }
    .team-total { font-weight: 600; color: var(--color-text); }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .member-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow-card); }
    .member-top { display: flex; align-items: center; gap: 12px; }
    .member-avatar { width: 38px; height: 38px; min-width: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
    .member-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .member-name { font-size: 13.5px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-role { font-size: 11.5px; color: var(--color-text-muted); }
    .member-dept { font-size: 11.5px; font-weight: 600; color: var(--color-text-secondary); }
    .member-projects { display: flex; flex-direction: column; gap: 4px; }
    .mp-count { font-size: 11.5px; color: var(--color-text-muted); }
    .mp-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .mp-chip { font-size: 10.5px; padding: 2px 7px; border-radius: 8px; background: var(--color-surface-raised); color: var(--color-text-secondary); border: 1px solid var(--color-border); }
    .mp-chip--more { color: var(--color-text-muted); }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    /* Integrations */
    .oauth-banner { padding: 10px 14px; border-radius: var(--radius-md); background: #ECFDF5; color: #059669; font-size: 13px; font-weight: 500; border: 1px solid #A7F3D0; }
    .oauth-banner.oauth-err { background: #FEE2E2; color: #DC2626; border-color: #FECACA; }
    .int-list { display: flex; flex-direction: column; gap: 12px; }
    .int-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; box-shadow: var(--shadow-card); }
    .int-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .int-title-wrap { display: flex; align-items: center; gap: 10px; }
    .int-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
    .int-status { font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .int-status[data-s="CONNECTED"] { background: #ECFDF5; color: #059669; }
    .int-status[data-s="ERROR"] { background: #FEE2E2; color: #DC2626; }
    .int-status[data-s="PENDING"] { background: #FEF3C7; color: #D97706; }
    .int-actions { display: flex; align-items: center; gap: 8px; }
    .btn-connect { height: 30px; padding: 0 16px; background: var(--color-accent, #6366F1); color: #fff; border: none; border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .btn-connect:disabled { opacity: 0.6; }
    .btn-outline-sm { height: 30px; padding: 0 14px; background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; font-weight: 500; cursor: pointer; }
    .btn-outline-sm:hover { border-color: #DC2626; color: #DC2626; }
    .int-env-note { font-size: 12px; color: var(--color-text-muted); font-style: italic; }
    .int-account { font-size: 12px; color: #059669; font-weight: 500; }
    .int-error { font-size: 12px; color: #DC2626; }
    .int-what { font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.55; }
    .int-cost { font-size: 12px; color: var(--color-text-muted); margin: 0; }
    .int-guide summary { font-size: 12.5px; font-weight: 600; color: var(--color-accent, #6366F1); cursor: pointer; }
    .int-steps { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 5px; }
    .int-steps li { font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.5; }

    /* Callback URL Box */
    .callback-url-box {
      margin: 6px 0 2px;
      padding: 12px 14px;
      background: var(--color-surface-raised, #F8FAFC);
      border: 1px solid var(--color-border, #E2E8F0);
      border-left: 3.5px solid var(--color-accent, #6366F1);
      border-radius: var(--radius-md, 8px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cb-header { display: flex; flex-direction: column; gap: 2px; }
    .cb-title { font-size: 12px; font-weight: 700; color: var(--color-text); }
    .cb-sub { font-size: 11.5px; color: var(--color-text-muted); }
    .cb-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px; }
    .cb-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; padding: 6px 10px; background: rgba(0,0,0,0.06); border-radius: 6px; color: #0F172A; word-break: break-all; flex: 1; border: 1px solid rgba(0,0,0,0.08); }
    .btn-copy-cb { height: 30px; padding: 0 12px; font-size: 11.5px; font-weight: 600; background: var(--color-accent, #6366F1); color: #fff; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
    .btn-copy-cb:hover { opacity: 0.9; }

    /* Notifications */
    .notif-section { display: flex; flex-direction: column; gap: 8px; }
    .notif-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
    .notif-summary { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text-muted); }
    .mark-all-btn { height: 26px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); background: transparent; cursor: pointer; }
    .mark-all-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
    .notif-list { display: flex; flex-direction: column; gap: 4px; }
    .notif-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; transition: background 0.12s; }
    .notif-row:hover { background: var(--color-surface-raised); }
    .notif-unread { border-left: 3px solid var(--color-accent); }
    .notif-icon { width: 28px; height: 28px; min-width: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ni-gate_approved  { background: #ECFDF5; color: #16A34A; }
    .ni-stage_unlocked { background: #EFF6FF; color: #3B82F6; }
    .ni-gate_pending   { background: #FEF3C7; color: #D97706; }
    .ni-info           { background: var(--color-surface-raised); color: var(--color-text-muted); }
    .notif-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .notif-title { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .notif-text  { font-size: 12.5px; color: var(--color-text-secondary); }
    .notif-time  { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
    .notif-dot   { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); flex-shrink: 0; margin-top: 4px; }

    .pref-list { display: flex; flex-direction: column; gap: 0; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .pref-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid var(--color-border); cursor: pointer; }
    .pref-row:last-child { border-bottom: none; }
    .pref-info { display: flex; flex-direction: column; gap: 2px; }
    .pref-label { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .pref-desc  { font-size: 11.5px; color: var(--color-text-muted); }
    .toggle { width: 40px; height: 22px; border-radius: 11px; background: var(--color-border); position: relative; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
    .toggle.on { background: var(--color-accent); }
    .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle.on .toggle-thumb { transform: translateX(18px); }

    @media (max-width: 768px) {
      .info-grid { grid-template-columns: 1fr; }
      .profile-hero { flex-direction: column; text-align: center; }
    }
  `]
})
export class Settings implements OnInit {
  protected auth         = inject(AuthService);
  protected notifService = inject(NotificationService);
  private projectService = inject(ProjectService);
  private integrationService = inject(IntegrationService);
  private route          = inject(ActivatedRoute);

  protected activeTab   = signal<TabId>('profile');
  protected team        = signal<TeamMember[]>([]);
  protected projectCount = signal(0);
  protected teamLoading = signal(true);

  // Integrations
  readonly integrationCards = INTEGRATION_CARDS;
  protected integrations = signal<IntegrationInfo[]>([]);
  protected intLoading   = signal(true);
  protected busySlug     = signal<OAuthProviderSlug | ''>('');
  protected oauthResult  = signal('');
  protected oauthResultIsError = signal(false);

  protected notifGateEnabled  = signal(true);
  protected notifStageEnabled = signal(true);
  protected notifInfoEnabled  = signal(false);

  readonly tabs = [
    { id: 'profile'       as TabId, label: 'Profile' },
    { id: 'team'          as TabId, label: 'Team' },
    { id: 'integrations'  as TabId, label: 'Integrations' },
    { id: 'notifications' as TabId, label: 'Notifications' },
  ];

  readonly notifPrefs = [
    { key: 'gate',  label: 'Gate Approvals',     desc: 'When a pipeline gate is approved or rejected', enabled: this.notifGateEnabled,  toggle: () => this.notifGateEnabled.update(v => !v) },
    { key: 'stage', label: 'Stage Unlocks',       desc: 'When a new pipeline stage becomes active',     enabled: this.notifStageEnabled, toggle: () => this.notifStageEnabled.update(v => !v) },
    { key: 'info',  label: 'General Updates',     desc: 'Project info updates and team activity',        enabled: this.notifInfoEnabled,  toggle: () => this.notifInfoEnabled.update(v => !v) },
  ];

  protected user = computed(() => this.auth.user());

  protected initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  });

  protected roleLabel = computed(() => {
    const role = this.user()?.role as UserRole | undefined;
    return role ? (ROLE_LABELS[role] ?? role) : '—';
  });

  protected roleDept = computed(() => {
    const role = this.user()?.role as UserRole | undefined;
    return role ? (ROLE_DEPT[role] ?? '—') : '—';
  });

  protected roleColor = computed(() => {
    const role = this.user()?.role as UserRole | undefined;
    return role ? (ROLE_COLOR[role] ?? '#6366F1') : '#6366F1';
  });

  protected permissionSummary = computed(() => {
    const role = this.user()?.role;
    if (role === 'ADMIN') return 'Full access — all gates & departments';
    if (role === 'MANAGER_PRODUCT_MODELLING') return 'Can approve Profiling, Content & Design gates';
    if (role === 'MANAGER_PRODUCT_DEVELOPMENT') return 'Can approve Development gate';
    if (role === 'MANAGER_PRODUCT_GROWTH') return 'Can approve Marketing gate';
    return 'View access — cannot approve gates';
  });

  protected permissions = computed(() => {
    const role = this.user()?.role;
    const isAdmin = role === 'ADMIN';
    const isMPM = role === 'MANAGER_PRODUCT_MODELLING' || isAdmin;
    const isMPD = role === 'MANAGER_PRODUCT_DEVELOPMENT' || isAdmin;
    const isMPG = role === 'MANAGER_PRODUCT_GROWTH' || isAdmin;
    return [
      { label: 'View all projects',         allowed: true },
      { label: 'Create & edit projects',    allowed: isAdmin },
      { label: 'Approve Profiling gate',    allowed: isMPM },
      { label: 'Approve Design gate',       allowed: isMPM },
      { label: 'Approve Development gate',  allowed: isMPD },
      { label: 'Approve Marketing gate',    allowed: isMPG },
      { label: 'Manage team members',       allowed: isAdmin },
    ];
  });

  ngOnInit() {
    // OAuth callbacks land on /app/settings?integration=<slug>_<result>
    const result = this.route.snapshot.queryParamMap.get('integration');
    if (result) {
      this.activeTab.set('integrations');
      const [slug, outcome] = [result.replace(/_[^_]+$/, ''), result.replace(/^.*_/, '')];
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      if (outcome === 'connected') {
        this.oauthResult.set(`${name} connected successfully.`);
        this.oauthResultIsError.set(false);
      } else {
        this.oauthResult.set(outcome === 'denied' ? `${name} connection was cancelled.` : `${name} connection failed — check the server logs.`);
        this.oauthResultIsError.set(true);
      }
    }
    this.loadIntegrations();

    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectCount.set(projects.length);
        const memberMap = new Map<string, TeamMember>();
        for (const project of projects) {
          for (const m of project.members) {
            const key = m.user.name;
            if (!memberMap.has(key)) {
              memberMap.set(key, {
                name: m.user.name,
                initials: m.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                role: m.user.role ?? m.role,
                projectCount: 0,
                projects: [],
              });
            }
            const entry = memberMap.get(key)!;
            entry.projectCount++;
            entry.projects.push(project.name);
          }
        }
        this.team.set([...memberMap.values()].sort((a, b) => b.projectCount - a.projectCount));
        this.teamLoading.set(false);
      },
      error: () => this.teamLoading.set(false),
    });
  }

  protected memberColor(role: string): string {
    return ROLE_COLOR[role as UserRole] ?? '#6366F1';
  }

  // ── Integrations ──────────────────────────────────────────────────────────

  private loadIntegrations() {
    this.integrationService.getIntegrations().subscribe({
      next: (res) => { this.integrations.set(res.integrations); this.intLoading.set(false); },
      error: () => this.intLoading.set(false),
    });
  }

  private infoFor(provider: IntegrationProvider): IntegrationInfo | undefined {
    return this.integrations().find(i => i.provider === provider);
  }

  protected statusFor(provider: IntegrationProvider): string {
    return this.infoFor(provider)?.status ?? 'NOT_CONFIGURED';
  }

  protected statusLabelFor(provider: IntegrationProvider): string {
    const s = this.statusFor(provider);
    return s === 'CONNECTED' ? 'Connected' : s === 'ERROR' ? 'Error' : s === 'PENDING' ? 'Pending' : 'Not configured';
  }

  protected configuredFor(provider: IntegrationProvider): boolean {
    return this.infoFor(provider)?.configured ?? false;
  }

  protected accountFor(provider: IntegrationProvider): string | null {
    return this.infoFor(provider)?.accountName ?? null;
  }

  protected errorFor(provider: IntegrationProvider): string | null {
    return this.infoFor(provider)?.errorMessage ?? null;
  }

  protected connect(slug: OAuthProviderSlug) {
    this.busySlug.set(slug);
    this.integrationService.getAuthUrl(slug).subscribe({
      next: (res) => { window.location.href = res.url; },
      error: (err) => {
        this.oauthResult.set(err?.error?.error ?? 'Could not start the OAuth flow — check the server env keys.');
        this.oauthResultIsError.set(true);
        this.busySlug.set('');
      },
    });
  }

  protected disconnect(slug: OAuthProviderSlug) {
    this.busySlug.set(slug);
    this.integrationService.disconnect(slug).subscribe({
      next: () => { this.busySlug.set(''); this.loadIntegrations(); },
      error: () => this.busySlug.set(''),
    });
  }

  protected memberDept(role: string): string {
    return ROLE_DEPT[role as UserRole] ?? role;
  }

  protected relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  protected copiedSlug = signal<string | null>(null);

  protected getCallbackUrl(slug?: OAuthProviderSlug): string {
    if (!slug) return '';
    const base = environment.apiUrl
      ? environment.apiUrl
      : (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base.replace(/\/$/, '')}/integrations/${slug}/callback`;
  }

  protected copyCallbackUrl(slug?: OAuthProviderSlug) {
    if (!slug) return;
    const url = this.getCallbackUrl(slug);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copiedSlug.set(slug);
        setTimeout(() => this.copiedSlug.set(null), 2500);
      });
    }
  }
}
