import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProjectService } from '../../../services/project.service';
import { ProjectStateService } from '../../../services/project-state.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { IntegrationService } from '../../../services/integration.service';
import { MarketingTask, MarketingTaskCategory, DesignAsset, ContentPage } from '../../../models/project.models';

type AssetType = DesignAsset['type'];

type KanbanCol = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type CategoryFilter = 'ALL' | MarketingTaskCategory;

const COL_LABELS: Record<KanbanCol, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
};
const CAT_COLORS: Partial<Record<string, string>> = {
  CONTENT: '#F59E0B', SOCIAL: '#EC4899', PAID: '#EF4444',
  SEO: '#10B981', ANALYTICS: '#6366F1', OTHER: '#6B7280',
};

@Component({
  selector: 'app-marketing-tab',
  imports: [ReactiveFormsModule],
  template: `
    <div class="mk-wrap">

      <!-- Tab nav -->
      <div class="tab-nav" role="tablist">
        @for (t of tabs; track t.id) {
          <button
            role="tab"
            class="tab-btn"
            [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id"
            (click)="activeTab.set(t.id)"
          >{{ t.label }}</button>
        }
      </div>

      <!-- ── Tab: Google Integration & Live Metrics ── -->
      @if (activeTab() === 'analytics') {
        <section class="tab-panel" aria-label="Google Integration & Live Metrics">
          
          <!-- Integration Credentials Form -->
          <div class="creds-card">
            <div class="creds-header">
              <div>
                <h3 class="creds-title">Project Google Integration & Credentials</h3>
                <p class="creds-sub">Set project-specific Google Client ID, Secret, Ads Developer Token, and GA4 Property ID.</p>
              </div>
              @if (credsStatus() === 'CONNECTED') {
                <span class="conn-status-badge conn-status-badge--connected"><span class="status-dot status-dot--green"></span> Connected</span>
              } @else if (credsStatus() === 'ERROR') {
                <span class="conn-status-badge conn-status-badge--error"><span class="status-dot status-dot--red"></span> Error</span>
              } @else {
                <span class="conn-status-badge conn-status-badge--off"><span class="status-dot status-dot--gray"></span> Not Connected</span>
              }
            </div>

            <form [formGroup]="googleForm" (ngSubmit)="saveGoogleCredentials()" class="brief-form">
              <div class="form-grid">
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-client-id">Google Client ID</label>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="field-help-link">Create one →</a>
                  </div>
                  <input id="g-client-id" class="field-input" type="text" formControlName="clientId" placeholder="xxxx.apps.googleusercontent.com" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-client-secret">Google Client Secret</label>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="field-help-link">Find secret →</a>
                  </div>
                  <input id="g-client-secret" class="field-input" type="password" formControlName="clientSecret" placeholder="••••••••••••••••" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-dev-token">Google Ads Developer Token</label>
                    <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" rel="noopener" class="field-help-link">Create one →</a>
                  </div>
                  <input id="g-dev-token" class="field-input" type="password" formControlName="developerToken" placeholder="Developer Token" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-ads-id">Google Ads Customer Account ID</label>
                    <a href="https://ads.google.com/aw/overview" target="_blank" rel="noopener" class="field-help-link">Find Account ID →</a>
                  </div>
                  <input id="g-ads-id" class="field-input" type="text" formControlName="googleAdsAccountId" placeholder="e.g. 123-456-7890" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-ga4-id">GA4 Property ID</label>
                    <a href="https://analytics.google.com/analytics/web/#/provision" target="_blank" rel="noopener" class="field-help-link">Create Property →</a>
                  </div>
                  <input id="g-ga4-id" class="field-input" type="text" formControlName="analyticsPropertyId" placeholder="e.g. 123456789" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="g-gsc-url">Search Console Property URL</label>
                    <a href="https://search.google.com/search-console/welcome" target="_blank" rel="noopener" class="field-help-link">Create Site →</a>
                  </div>
                  <input id="g-gsc-url" class="field-input" type="text" formControlName="searchConsoleUrl" placeholder="https://clientdomain.com" />
                </div>
              </div>
              <div class="form-footer">
                @if (credsSuccess()) {
                  <span class="save-ok" role="status">Credentials Saved & Connected!</span>
                }
                @if (credsStatus() === 'CONNECTED') {
                  <button class="btn-sec-outline" type="button" (click)="resetGoogleCredentials()">
                    Reset / Clear Credentials
                  </button>
                }
                <button class="btn-primary" type="submit" [disabled]="savingCreds()">
                  {{ savingCreds() ? 'Saving…' : (credsStatus() === 'CONNECTED' ? 'Update Credentials' : 'Save & Connect Credentials') }}
                </button>
              </div>
            </form>
          </div>

          <!-- Live Dashboards -->
          <div class="live-section" style="margin-top: 20px;">

            <div class="live-header">
              <h3 class="live-title">Live Metrics & Performance</h3>
              <button class="ftab" (click)="loadLiveMetrics()" [disabled]="liveLoading()">↻ Refresh Metrics</button>
            </div>

            @if (liveLoading()) {
              <div class="loading-state"><div class="spinner"></div> Fetching live project data…</div>
            } @else {
              <!-- GA4 Card -->
              @if (ga4Metrics()) {
                <div class="live-card">
                  <h4 class="live-card-h">Google Analytics 4 — Last {{ ga4Metrics()!.rangeDays }} Days</h4>
                  <div class="kpi-grid">
                    <div class="kpi-box"><span class="kpi-num">{{ ga4Metrics()!.sessions }}</span><span class="kpi-lbl">Sessions</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ ga4Metrics()!.totalUsers }}</span><span class="kpi-lbl">Total Users</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ ga4Metrics()!.conversions }}</span><span class="kpi-lbl">Conversions</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ (ga4Metrics()!.engagementRate * 100).toFixed(1) }}%</span><span class="kpi-lbl">Engagement Rate</span></div>
                  </div>
                </div>
              } @else if (ga4Error()) {
                <div class="metric-warning-box">
                  <div class="mwb-header">
                    <span class="mwb-title">Google Analytics 4</span>
                    <span class="mwb-badge">Configuration Required</span>
                  </div>
                  <p class="mwb-msg">{{ ga4Error() }}</p>
                </div>
              }

              <!-- Search Console Card -->
              @if (gscMetrics()) {
                <div class="live-card">
                  <h4 class="live-card-h">Google Search Console — Last {{ gscMetrics()!.rangeDays }} Days</h4>
                  <div class="kpi-grid">
                    <div class="kpi-box"><span class="kpi-num">{{ gscMetrics()!.clicks }}</span><span class="kpi-lbl">Clicks</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ gscMetrics()!.impressions }}</span><span class="kpi-lbl">Impressions</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ (gscMetrics()!.ctr * 100).toFixed(1) }}%</span><span class="kpi-lbl">CTR</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ gscMetrics()!.avgPosition.toFixed(1) }}</span><span class="kpi-lbl">Avg Position</span></div>
                  </div>
                </div>
              } @else if (gscError()) {
                <div class="metric-warning-box">
                  <div class="mwb-header">
                    <span class="mwb-title">Google Search Console</span>
                    <span class="mwb-badge">Configuration Required</span>
                  </div>
                  <p class="mwb-msg">{{ gscError() }}</p>
                </div>
              }

              <!-- Google Ads Card -->
              @if (adsMetrics()) {
                <div class="live-card">
                  <h4 class="live-card-h">Google Ads Campaigns — Account: {{ adsMetrics()!.accountId }}</h4>
                  <div class="kpi-grid">
                    <div class="kpi-box"><span class="kpi-num">$ {{ adsMetrics()!.totals.spend }}</span><span class="kpi-lbl">Total Spend</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ adsMetrics()!.totals.impressions }}</span><span class="kpi-lbl">Impressions</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ adsMetrics()!.totals.clicks }}</span><span class="kpi-lbl">Clicks</span></div>
                    <div class="kpi-box"><span class="kpi-num">{{ adsMetrics()!.totals.conversions }}</span><span class="kpi-lbl">Conversions</span></div>
                  </div>
                  @if (adsMetrics()!.campaigns.length) {
                    <div class="campaign-table">
                      <div class="ct-head"><span>Campaign</span><span>Status</span><span>Spend</span><span>Clicks</span></div>
                      @for (c of adsMetrics()!.campaigns; track c.id) {
                        <div class="ct-row"><span>{{ c.name }}</span><span class="c-status">{{ c.status }}</span><span>$ {{ c.spend }}</span><span>{{ c.clicks }}</span></div>
                      }
                    </div>
                  }
                </div>
              } @else if (adsError()) {
                <div class="metric-warning-box">
                  <div class="mwb-header">
                    <span class="mwb-title">Google Ads Campaigns</span>
                    <span class="mwb-badge">Configuration Required</span>
                  </div>
                  <p class="mwb-msg">{{ adsError() }}</p>
                </div>
              }
            }
          </div>

        </section>
      }

      <!-- ── Tab: Social Credentials (Meta & TikTok) ── -->
      @if (activeTab() === 'social') {
        <section class="tab-panel" aria-label="Social Credentials & Account Integration">
          
          <!-- Social Credentials Form -->
          <div class="creds-card">
            <div class="creds-header">
              <div>
                <h3 class="creds-title">Project Social API Credentials (Meta & TikTok)</h3>
                <p class="creds-sub">Provide project-specific Meta App ID, Meta App Secret, TikTok Client Key, and TikTok Client Secret so each project uses its own developer credentials.</p>
              </div>
            </div>

            <form [formGroup]="socialForm" (ngSubmit)="saveSocialCredentials()" class="brief-form">
              <div class="form-grid">
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="meta-app-id">META_APP_ID</label>
                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" class="field-help-link">Meta Console →</a>
                  </div>
                  <input id="meta-app-id" class="field-input" type="text" formControlName="metaAppId" placeholder="e.g. 123456789012345" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="meta-app-secret">META_APP_SECRET</label>
                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" class="field-help-link">App Secret →</a>
                  </div>
                  <input id="meta-app-secret" class="field-input" type="password" formControlName="metaAppSecret" placeholder="••••••••••••••••" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="tiktok-client-key">TIKTOK_CLIENT_KEY</label>
                    <a href="https://developers.tiktok.com/" target="_blank" rel="noopener" class="field-help-link">TikTok Portal →</a>
                  </div>
                  <input id="tiktok-client-key" class="field-input" type="text" formControlName="tiktokClientKey" placeholder="e.g. awxxxxxxxxxxxxxx" />
                </div>
                <div class="field">
                  <div class="field-link-wrap">
                    <label class="field-label" for="tiktok-client-secret">TIKTOK_CLIENT_SECRET</label>
                    <a href="https://developers.tiktok.com/" target="_blank" rel="noopener" class="field-help-link">Client Secret →</a>
                  </div>
                  <input id="tiktok-client-secret" class="field-input" type="password" formControlName="tiktokClientSecret" placeholder="••••••••••••••••" />
                </div>
              </div>
              <div class="form-footer">
                @if (socialCredsSuccess()) {
                  <span class="save-ok" role="status">Social Credentials Saved!</span>
                }
                <button class="btn-primary" type="submit" [disabled]="savingSocialCreds()">
                  {{ savingSocialCreds() ? 'Saving…' : 'Save Social Credentials' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Social & Paid Integrations Card (Project Specific) -->
          <div class="creds-card" style="margin-top: 20px;">
            <div class="creds-header">
              <div>
                <h3 class="creds-title">Project Social & Paid Integrations (Meta & TikTok)</h3>
                <p class="creds-sub">Connect project-specific Meta and TikTok accounts to enable organic publishing and paid campaign tracking for this project.</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 14px 0 0;">
              <!-- Meta Card -->
              <div style="padding: 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13.5px; font-weight: 600; color: var(--color-text);">Meta (Facebook + Instagram)</span>
                  @if (isMetaConnected()) {
                    <span class="conn-status-badge conn-status-badge--connected" style="margin: 0;"><span class="status-dot status-dot--green"></span> Connected</span>
                  } @else {
                    <span class="conn-status-badge conn-status-badge--off" style="margin: 0;"><span class="status-dot status-dot--gray"></span> Disconnected</span>
                  }
                </div>
                <p style="font-size: 12px; color: var(--color-text-muted); margin: 0; line-height: 1.4;">
                  @if (isMetaConnected()) {
                    Connected as: <strong>{{ metaAccountName() || 'Meta Page' }}</strong>
                  } @else {
                    Authorize page-level publishing and ad campaign insights specifically for this project.
                  }
                </p>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                  @if (isMetaConnected()) {
                    <button class="btn-sec-outline" type="button" style="height: 32px; font-size: 12px;" (click)="disconnectProvider('meta')">Disconnect</button>
                  } @else {
                    <button class="btn-primary" type="button" style="height: 32px; font-size: 12px;" (click)="connectProvider('meta')">Connect Meta</button>
                  }
                </div>
              </div>

              <!-- TikTok Card -->
              <div style="padding: 14px; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13.5px; font-weight: 600; color: var(--color-text);">TikTok API</span>
                  @if (isTiktokConnected()) {
                    <span class="conn-status-badge conn-status-badge--connected" style="margin: 0;"><span class="status-dot status-dot--green"></span> Connected</span>
                  } @else {
                    <span class="conn-status-badge conn-status-badge--off" style="margin: 0;"><span class="status-dot status-dot--gray"></span> Disconnected</span>
                  }
                </div>
                <p style="font-size: 12px; color: var(--color-text-muted); margin: 0; line-height: 1.4;">
                  @if (isTiktokConnected()) {
                    Connected as: <strong>{{ tiktokAccountName() || 'TikTok Profile' }}</strong>
                  } @else {
                    Authorize video publishing and pixel conversion events specifically for this project.
                  }
                </p>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                  @if (isTiktokConnected()) {
                    <button class="btn-sec-outline" type="button" style="height: 32px; font-size: 12px;" (click)="disconnectProvider('tiktok')">Disconnect</button>
                  } @else {
                    <button class="btn-primary" type="button" style="height: 32px; font-size: 12px;" (click)="connectProvider('tiktok')">Connect TikTok</button>
                  }
                </div>
              </div>
            </div>
          </div>

        </section>
      }


      <!-- ── Tab: Strategy Brief ── -->
      @if (activeTab() === 'brief') {
        <section class="tab-panel" aria-label="Marketing Strategy Brief">
          <form [formGroup]="briefForm" (ngSubmit)="saveBrief()" class="brief-form">
            <div class="form-grid">
              <div class="field span-2">
                <label class="field-label" for="mk-strategy">Marketing Strategy</label>
                <textarea id="mk-strategy" class="field-textarea" rows="4" formControlName="strategy" placeholder="Outline the overall marketing approach…"></textarea>
              </div>
              <div class="field span-2">
                <label class="field-label" for="mk-audience">Target Audience</label>
                <textarea id="mk-audience" class="field-textarea" rows="3" formControlName="targetAudience" placeholder="Who are we marketing to?"></textarea>
              </div>
              <div class="field">
                <label class="field-label" for="mk-budget">Budget</label>
                <input id="mk-budget" class="field-input" type="text" formControlName="budget" placeholder="e.g. £2,000 / month" />
              </div>
              <div class="field">
                <label class="field-label" for="mk-channels">Channels</label>
                <input id="mk-channels" class="field-input" type="text" formControlName="channels" placeholder="e.g. Instagram, Google Ads, Email" />
              </div>
              <div class="field span-2">
                <label class="field-label" for="mk-notes">Notes</label>
                <textarea id="mk-notes" class="field-textarea" rows="3" formControlName="notes" placeholder="Any additional notes…"></textarea>
              </div>
            </div>
            <div class="form-footer">
              @if (saveSuccess()) {
                <span class="save-ok" role="status">Saved</span>
              }
              <button class="btn-primary" type="submit" [disabled]="briefForm.invalid || saving()">
                {{ saving() ? 'Saving…' : 'Save Brief' }}
              </button>
            </div>
          </form>
        </section>
      }

      <!-- ── Tab: Kanban ── -->
      @if (activeTab() === 'kanban') {
        <section class="tab-panel" aria-label="Marketing task board">

          <!-- Category filter -->
          <div class="cat-filter" role="group" aria-label="Filter by category">
            @for (cat of categoryFilters; track cat) {
              <button
                class="cat-btn"
                [class.active]="catFilter() === cat"
                [style.--cat-color]="catFilter() === cat ? (CAT_COLORS[cat] || '#6366F1') : 'transparent'"
                (click)="catFilter.set(cat)"
              >{{ cat === 'ALL' ? 'All' : cat }}</button>
            }
          </div>

          <div class="kanban-board">
            @for (col of kanbanCols; track col) {
              <div class="kanban-col">
                <div class="col-header">
                  <span class="col-title">{{ COL_LABELS[col] }}</span>
                  <span class="col-count">{{ filteredTasks(col).length }}</span>
                </div>
                <div class="col-cards" [attr.aria-label]="COL_LABELS[col] + ' tasks'">
                  @for (task of filteredTasks(col); track task.id) {
                    <div class="task-card" [attr.aria-label]="task.title">
                      <div class="task-header">
                        <span class="task-cat-dot" [style.background]="CAT_COLORS[task.category ?? 'OTHER']" [attr.aria-label]="task.category ?? 'OTHER'"></span>
                        <span class="task-title">{{ task.title }}</span>
                        <button class="task-del" type="button" (click)="deleteTask(task)" aria-label="Delete task">×</button>
                      </div>
                      @if (task.description) {
                        <p class="task-desc">{{ task.description }}</p>
                      }
                      <div class="task-footer">
                        <select
                          class="task-status-sel"
                          [value]="task.status"
                          (change)="moveTask(task, $any($event.target).value)"
                          [attr.aria-label]="'Status for ' + task.title"
                        >
                          @for (c of kanbanCols; track c) {
                            <option [value]="c">{{ COL_LABELS[c] }}</option>
                          }
                        </select>
                        <span class="task-priority" [attr.data-p]="task.priority">{{ task.priority }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="col-empty">No tasks</div>
                  }
                </div>
                <button class="add-task-btn" type="button" (click)="addTask(col)">+ Add task</button>
              </div>
            }
          </div>
        </section>
      }

      <!-- ── Tab: Design Assets ── -->
      @if (activeTab() === 'assets') {
        <section class="tab-panel" aria-label="Shared Design Assets">
          <div class="shared-header">
            <div>
              <h4 class="shared-title">Design Assets</h4>
              <p class="shared-sub">Approved assets from the Design stage — read-only</p>
            </div>
            <span class="shared-badge">{{ approvedAssets().length }} approved</span>
          </div>
          @if (approvedAssets().length === 0) {
            <div class="shared-empty" role="status">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p>No approved assets yet. Assets become available once the Design gate is approved.</p>
            </div>
          } @else {
            <div class="asset-grid" role="list">
              @for (asset of approvedAssets(); track asset.id) {
                <div class="asset-card" role="listitem">
                  <div class="asset-icon" [class]="'asset-icon--' + asset.type.toLowerCase()" [innerHTML]="assetIcon(asset.type)" aria-hidden="true"></div>
                  <div class="asset-info">
                    <span class="asset-name">{{ asset.name }}</span>
                    <div class="asset-meta">
                      <span class="asset-type-badge">{{ asset.type }}</span>
                      <span class="asset-version">v{{ asset.version }}</span>
                    </div>
                    @if (asset.notes) {
                      <span class="asset-notes">{{ asset.notes }}</span>
                    }
                    @if (asset.approvedAt) {
                      <span class="asset-approved">Approved {{ formatDate(asset.approvedAt) }}</span>
                    }
                  </div>
                  <a
                    [href]="asset.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="asset-link"
                    [attr.aria-label]="'Open ' + asset.name"
                    (click)="openAsset(asset, $event)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- ── Tab: Approved Content ── -->
      @if (activeTab() === 'content') {
        <section class="tab-panel" aria-label="Shared Content">
          <div class="shared-header">
            <div>
              <h4 class="shared-title">Approved Content</h4>
              <p class="shared-sub">Approved pages from the Written Content stage — read-only</p>
            </div>
            <span class="shared-badge">{{ approvedPages().length }} approved</span>
          </div>
          @if (approvedPages().length === 0) {
            <div class="shared-empty" role="status">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No approved pages yet. Pages appear here once the Written Content gate is approved.</p>
            </div>
          } @else {
            <div class="content-list" role="list">
              @for (page of approvedPages(); track page.id) {
                <div class="content-row" role="listitem">
                  <div class="content-row-left">
                    <span class="content-title">{{ page.title }}</span>
                    @if (page.slug) {
                      <span class="content-slug">/{{ page.slug }}</span>
                    }
                    @if (page.metaTitle) {
                      <span class="content-meta-title">Meta: {{ page.metaTitle }}</span>
                    }
                  </div>
                  <div class="content-row-right">
                    @if (page.wordCount) {
                      <span class="content-words">{{ page.wordCount.toLocaleString() }} words</span>
                    }
                    <span class="content-status-badge">Approved</span>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- ── Tab: Soft Gate ── -->
      @if (activeTab() === 'gate') {
        <section class="tab-panel gate-panel" aria-label="Marketing soft gate">
          <div class="gate-card">
            <div class="gate-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 class="gate-title">Soft Gate — Marketing Completion</h3>
            <p class="gate-desc">Marketing can be approved even with open tasks. Review the checklist below before proceeding.</p>

            <ul class="gate-checklist" aria-label="Gate checklist">
              <li class="check-item" [class.check-item--done]="briefForm.value.strategy || briefForm.value.channels">
                <span class="check-icon" aria-hidden="true">{{ (briefForm.value.strategy || briefForm.value.channels) ? '✓' : '○' }}</span>
                <span>Marketing strategy or channels defined</span>
              </li>
              <li class="check-item" [class.check-item--advisory]="openTaskCount() > 0">
                <span class="check-icon" aria-hidden="true">{{ openTaskCount() === 0 ? '✓' : '!' }}</span>
                <span>{{ openTaskCount() }} task(s) still open <em>(advisory — not blocking)</em></span>
              </li>
              <li class="check-item" [class.check-item--done]="briefForm.value.targetAudience">
                <span class="check-icon" aria-hidden="true">{{ briefForm.value.targetAudience ? '✓' : '○' }}</span>
                <span>Target audience defined</span>
              </li>
            </ul>

            @if (gateError()) {
              <div class="gate-error" role="alert">{{ gateError() }}</div>
            }
            @if (gateWarnings().length > 0) {
              <div class="gate-warnings" role="note">
                <strong>Advisory warnings:</strong>
                <ul>
                  @for (w of gateWarnings(); track w) { <li>{{ w }}</li> }
                </ul>
              </div>
            }

            @if (isCompleted()) {
              <div class="gate-approved" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Marketing stage approved. Project is complete.
              </div>
            } @else {
              <button
                class="btn-gate"
                type="button"
                [disabled]="gateLoading()"
                (click)="completeGate()"
              >
                {{ gateLoading() ? 'Approving…' : 'Approve & Complete Project' }}
              </button>
            }
          </div>
        </section>
      }

    </div>
  `,
  styles: [`
    .mk-wrap { display: flex; flex-direction: column; gap: 20px; }

    /* Tab nav */
    .tab-nav { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); padding-bottom: 0; }
    .tab-btn {
      padding: 8px 16px; border: none; background: none;
      font-family: var(--font-sans); font-size: 13.5px; font-weight: 500;
      color: var(--color-text-muted); cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #F97316; border-bottom-color: #F97316; }
    .tab-panel { padding-top: 4px; }

    /* Brief form */
    .brief-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .span-2 { grid-column: span 2; }
    .field-label { font-size: 12.5px; font-weight: 600; color: var(--color-text-secondary); }
    .field-input, .field-textarea {
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
      padding: 8px 10px; font-family: var(--font-sans); font-size: 13.5px;
      color: var(--color-text); background: var(--color-surface); outline: none; resize: vertical;
    }
    .field-input:focus, .field-textarea:focus { border-color: #F97316; }
    .form-footer { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
    .save-ok { font-size: 12.5px; color: var(--color-accent); font-weight: 500; }
    .btn-primary {
      height: 36px; padding: 0 18px; background: #F97316; color: #fff;
      border: none; border-radius: var(--radius-md); font-family: var(--font-sans);
      font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-primary:hover:not(:disabled) { background: #EA6C0A; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sec-outline {
      height: 36px; padding: 0 14px; background: transparent; color: var(--color-text-secondary);
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);
      font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .btn-sec-outline:hover { background: rgba(239, 68, 68, 0.08); color: #EF4444; border-color: #FCA5A5; }

    /* Category filter */
    .cat-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .cat-btn {
      height: 28px; padding: 0 12px; border: 1px solid var(--color-border);
      border-radius: 14px; font-family: var(--font-sans); font-size: 12px; font-weight: 500;
      color: var(--color-text-muted); background: var(--color-surface); cursor: pointer; transition: all 0.15s;
    }
    .cat-btn.active { background: var(--cat-color, #6366F1); color: #fff; border-color: transparent; }

    /* Kanban */
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: start; }
    .kanban-col { background: var(--color-surface-raised); border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .col-header { display: flex; align-items: center; justify-content: space-between; padding: 2px 0 6px; }
    .col-title { font-size: 12.5px; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .col-count { font-size: 11px; font-weight: 700; background: var(--color-border); color: var(--color-text-muted); padding: 1px 7px; border-radius: 10px; }
    .col-cards { display: flex; flex-direction: column; gap: 6px; min-height: 40px; }
    .task-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; display: flex; flex-direction: column; gap: 6px; }
    .task-header { display: flex; align-items: flex-start; gap: 7px; }
    .task-cat-dot { width: 8px; height: 8px; min-width: 8px; border-radius: 50%; margin-top: 4px; }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); flex: 1; }
    .task-del { background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0; margin-left: 4px; }
    .task-del:hover { color: var(--color-destructive); }
    .task-desc { font-size: 12px; color: var(--color-text-muted); margin: 0; }
    .task-footer { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .task-status-sel { font-family: var(--font-sans); font-size: 11.5px; border: 1px solid var(--color-border); border-radius: 6px; padding: 2px 6px; color: var(--color-text-secondary); background: var(--color-surface-raised); outline: none; cursor: pointer; }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEF3C7; color: #D97706; }
    .task-priority[data-p="URGENT"] { background: #FEE2E2; color: #DC2626; }
    .col-empty { font-size: 12px; color: var(--color-text-muted); text-align: center; padding: 12px 0; }
    .add-task-btn { background: none; border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); padding: 6px; font-family: var(--font-sans); font-size: 12px; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
    .add-task-btn:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }

    /* Gate */
    .gate-panel { display: flex; justify-content: center; padding-top: 24px; }
    .gate-card { max-width: 560px; width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 32px; display: flex; flex-direction: column; gap: 16px; }
    .gate-icon { width: 52px; height: 52px; border-radius: 14px; background: #FFF7ED; color: #F97316; display: flex; align-items: center; justify-content: center; }
    .gate-title { font-family: var(--font-display); font-size: 20px; font-weight: 400; color: var(--color-text); margin: 0; }
    .gate-desc { font-size: 13.5px; color: var(--color-text-muted); margin: 0; }
    .gate-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .check-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--color-text-muted); }
    .check-item--done { color: var(--color-text); }
    .check-item--advisory { color: #D97706; }
    .check-icon { font-size: 15px; width: 20px; text-align: center; color: var(--color-text-muted); }
    .check-item--done .check-icon { color: var(--color-accent); }
    .check-item--advisory .check-icon { color: #D97706; }
    .gate-error { padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); font-size: 13px; color: #DC2626; }
    .gate-warnings { padding: 10px 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); font-size: 13px; color: #92400E; }
    .gate-warnings ul { margin: 6px 0 0; padding-left: 16px; }
    .gate-approved { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); font-size: 13.5px; font-weight: 500; color: #15803D; }
    .btn-gate {
      height: 40px; padding: 0 20px; background: #F97316; color: #fff; border: none;
      border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 14px; font-weight: 600;
      cursor: pointer; align-self: flex-start; transition: background 0.15s;
    }
    .btn-gate:hover:not(:disabled) { background: #EA6C0A; }
    .btn-gate:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Shared tabs (Design Assets + Content) */
    .shared-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    .shared-title { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0 0 4px; }
    .shared-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .shared-badge { height: 22px; padding: 0 10px; background: #FFF7ED; color: #F97316; font-size: 11px; font-weight: 700; border-radius: 11px; display: flex; align-items: center; white-space: nowrap; }

    .shared-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--color-text-muted); text-align: center; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }
    .shared-empty p { font-size: 13.5px; max-width: 340px; margin: 0; line-height: 1.6; }

    .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .asset-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: border-color 0.15s; }
    .asset-card:hover { border-color: var(--color-border-strong); }
    .asset-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; background: var(--color-surface-raised); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); }
    .asset-icon--image { background: #EFF6FF; color: #3B82F6; }
    .asset-icon--video { background: #FEF3C7; color: #D97706; }
    .asset-icon--font  { background: #F3E8FF; color: #9333EA; }
    .asset-icon--document { background: #ECFDF5; color: #059669; }
    .asset-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .asset-name { font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-meta { display: flex; align-items: center; gap: 6px; }
    .asset-type-badge { font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .asset-version { font-size: 11px; color: var(--color-text-muted); }
    .asset-notes { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asset-approved { font-size: 11.5px; color: var(--color-accent); font-weight: 500; }
    .asset-link { width: 30px; height: 30px; min-width: 30px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--color-text-muted); text-decoration: none; transition: background 0.12s, color 0.12s; }
    .asset-link:hover { background: #FFF7ED; color: #F97316; }

    .content-list { display: flex; flex-direction: column; gap: 8px; }
    .content-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); transition: border-color 0.15s; }
    .content-row:hover { border-color: var(--color-border-strong); }
    .content-row-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .content-title { font-size: 13.5px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .content-slug { font-size: 11.5px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .content-meta-title { font-size: 11.5px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .content-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .content-words { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; }
    .content-status-badge { font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 10px; background: #ECFDF5; color: #059669; letter-spacing: 0.04em; text-transform: uppercase; }

    /* Integration Credentials & Live Section */
    .creds-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; box-shadow: var(--shadow-card); }
    .creds-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .creds-title { font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0 0 4px; }
    .creds-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .conn-status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 14px; border: 1px solid transparent; }
    .conn-status-badge--connected { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
    .conn-status-badge--off { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
    .conn-status-badge--error { background: #FEE2E2; color: #DC2626; border-color: #FECACA; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .status-dot--green { background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); }
    .status-dot--gray { background: #94A3B8; }
    .status-dot--red { background: #EF4444; }
    .field-link-wrap { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
    .field-help-link { font-size: 11.5px; font-weight: 600; color: #6366F1; text-decoration: none; transition: color 0.15s; }
    .field-help-link:hover { text-decoration: underline; color: #4F46E5; }
    .ftab { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; color: var(--color-text); background: var(--color-surface); cursor: pointer; }
    .ftab:hover { border-color: #6366F1; color: #6366F1; }
    .live-section { display: flex; flex-direction: column; gap: 16px; }
    .live-header { display: flex; align-items: center; justify-content: space-between; }
    .live-title { font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0; }
    .live-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .live-card-h { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin: 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .kpi-box { background: var(--color-surface-raised); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .kpi-num { font-size: 18px; font-weight: 700; color: var(--color-text); }
    .kpi-lbl { font-size: 11px; color: var(--color-text-muted); }
    .campaign-table { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; border-top: 1px solid var(--color-border); padding-top: 10px; }
    .ct-head, .ct-row { display: grid; grid-template-columns: 1fr 100px 100px 90px; gap: 10px; font-size: 12px; }
    .ct-head { font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; font-size: 10.5px; }
    .ct-row { color: var(--color-text); }
    .c-status { font-weight: 600; color: #10B981; }

    /* Metric Warning Box */
    .metric-warning-box { background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.35); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .mwb-header { display: flex; align-items: center; justify-content: space-between; }
    .mwb-title { font-size: 14px; font-weight: 700; color: var(--color-text); }
    .mwb-badge { font-size: 10.5px; font-weight: 700; color: #EF4444; background: #FEE2E2; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    .mwb-msg { font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5; }
  `]
})
export class MarketingTab implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private projectService = inject(ProjectService);
  private state          = inject(ProjectStateService);
  private fb             = inject(FormBuilder);
  private notifService   = inject(NotificationService);
  private integrationService = inject(IntegrationService);


  protected isMetaConnected = signal(false);
  protected isTiktokConnected = signal(false);
  protected metaAccountName = signal<string | null>(null);
  protected tiktokAccountName = signal<string | null>(null);

  private projectId = '';

  protected activeTab  = signal<'analytics' | 'social' | 'brief' | 'kanban' | 'assets' | 'content' | 'gate'>('analytics');
  protected saving     = signal(false);
  protected saveSuccess = signal(false);
  protected savingCreds = signal(false);
  protected credsSuccess = signal(false);
  protected gateLoading = signal(false);
  protected gateError   = signal('');
  protected gateWarnings = signal<string[]>([]);
  protected tasks        = signal<MarketingTask[]>([]);
  protected catFilter    = signal<CategoryFilter>('ALL');

  // Live metrics signals
  protected liveLoading  = signal(false);
  protected liveError    = signal('');
  protected ga4Metrics   = signal<any>(null);
  protected gscMetrics   = signal<any>(null);
  protected adsMetrics   = signal<any>(null);
  protected ga4Error     = signal<string>('');
  protected gscError     = signal<string>('');
  protected adsError     = signal<string>('');

  readonly COL_LABELS = COL_LABELS;
  readonly CAT_COLORS = CAT_COLORS;
  readonly kanbanCols: KanbanCol[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  readonly categoryFilters: CategoryFilter[] = ['ALL', 'CONTENT', 'SOCIAL', 'PAID', 'SEO', 'ANALYTICS', 'OTHER'];

  readonly tabs = [
    { id: 'analytics' as const, label: 'Google Analytics & Ads' },
    { id: 'social'    as const, label: 'Social Credentials (Meta & TikTok)' },
    { id: 'brief'     as const, label: 'Strategy Brief' },
    { id: 'kanban'    as const, label: 'Task Board' },
    { id: 'assets'    as const, label: 'Design Assets' },
    { id: 'content'   as const, label: 'Content' },
    { id: 'gate'      as const, label: 'Soft Gate' },
  ];

  protected briefForm = this.fb.group({
    strategy:       [''],
    targetAudience: [''],
    budget:         [''],
    channels:       [''],
    notes:          [''],
  });

  protected googleForm = this.fb.group({
    clientId:            [''],
    clientSecret:        [''],
    developerToken:      [''],
    analyticsPropertyId: [''],
    searchConsoleUrl:    [''],
    googleAdsAccountId:  [''],
  });

  protected socialForm = this.fb.group({
    metaAppId:          [''],
    metaAppSecret:      [''],
    tiktokClientKey:    [''],
    tiktokClientSecret: [''],
  });

  protected savingSocialCreds = signal<boolean>(false);
  protected socialCredsSuccess = signal<boolean>(false);
  protected hasMetaAppId = signal<boolean>(false);
  protected maskedMetaAppId = signal<string | null>(null);
  protected hasTiktokClientKey = signal<boolean>(false);
  protected maskedTiktokClientKey = signal<string | null>(null);


  protected isCompleted   = computed(() => !!this.state.project()?.marketing?.completedAt);
  protected openTaskCount = computed(() => this.tasks().filter(t => t.status !== 'DONE').length);

  protected approvedAssets = computed(() =>
    (this.state.project()?.design?.assets ?? []).filter((a): a is DesignAsset => !!a.approvedAt)
  );
  protected approvedPages = computed(() =>
    (this.state.project()?.content?.pages ?? []).filter((p): p is ContentPage => p.status === 'APPROVED')
  );

  protected filteredTasks(col: KanbanCol): MarketingTask[] {
    const cat = this.catFilter();
    return this.tasks().filter(t =>
      t.status === col && (cat === 'ALL' || t.category === cat)
    );
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.parent?.paramMap.get('id') ?? '';
    const mkt = this.state.project()?.marketing;
    if (mkt) {
      this.briefForm.patchValue({
        strategy:       mkt.strategy       ?? '',
        targetAudience: mkt.targetAudience  ?? '',
        budget:         mkt.budget          ?? '',
        channels:       mkt.channels        ?? '',
        notes:          mkt.notes           ?? '',
      });
      this.tasks.set(mkt.tasks ?? []);
    }
    this.loadProjectGoogleCredentials();
    this.loadProjectSocialCredentials();
    this.loadProjectIntegrations();
    this.loadLiveMetrics();


    this.route.queryParams.subscribe(params => {
      const integration = params['integration'];
      if (!integration) return;

      this.activeTab.set('social');
      this.loadProjectIntegrations();
      this.loadProjectSocialCredentials();

      if (integration === 'meta_connected') {
        this.notifService.toast('Meta connected successfully for this project!', 'success');
      } else if (integration === 'tiktok_connected') {
        this.notifService.toast('TikTok connected successfully for this project!', 'success');
      } else if (integration === 'meta_denied' || integration === 'meta_error') {
        this.notifService.toast('Failed to connect Meta account.', 'warning');
      } else if (integration === 'tiktok_denied' || integration === 'tiktok_error') {
        this.notifService.toast('Failed to connect TikTok account.', 'warning');
      }

      // Remove query param from browser URL so page reloads do not trigger the toast repeatedly
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { integration: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });


  }

  protected credsStatus = signal<string>('NOT_CONFIGURED');

  protected loadProjectGoogleCredentials() {
    if (!this.projectId) return;
    this.projectService.getProjectGoogleCredentials(this.projectId).subscribe({
      next: (res) => {
        this.credsStatus.set(res.status ?? (res.hasClientId ? 'CONNECTED' : 'NOT_CONFIGURED'));
        this.googleForm.patchValue({
          clientId: res.maskedClientId ?? '',
          analyticsPropertyId: res.analyticsPropertyId ?? '',
          searchConsoleUrl: res.searchConsoleUrl ?? '',
          googleAdsAccountId: res.googleAdsAccountId ?? '',
        });
      },
    });
  }

  protected saveGoogleCredentials() {
    if (this.savingCreds()) return;
    this.savingCreds.set(true);
    this.credsSuccess.set(false);
    this.projectService.saveProjectGoogleCredentials(this.projectId, this.googleForm.value as any).subscribe({
      next: () => {
        this.savingCreds.set(false);
        this.credsSuccess.set(true);
        this.credsStatus.set('CONNECTED');
        setTimeout(() => this.credsSuccess.set(false), 2500);
        this.loadLiveMetrics();
      },
      error: () => {
        this.savingCreds.set(false);
        this.credsStatus.set('ERROR');
      },
    });
  }

  protected resetGoogleCredentials() {
    if (!confirm('Are you sure you want to clear saved credentials for this project?')) return;
    this.googleForm.reset();
    this.savingCreds.set(true);
    this.projectService.saveProjectGoogleCredentials(this.projectId, {
      clientId: '',
      clientSecret: '',
      developerToken: '',
      analyticsPropertyId: '',
      searchConsoleUrl: '',
      googleAdsAccountId: '',
    }).subscribe({
      next: () => {
        this.savingCreds.set(false);
        this.credsStatus.set('NOT_CONFIGURED');
        this.loadLiveMetrics();
      },
      error: () => this.savingCreds.set(false),
    });
  }

  protected loadProjectSocialCredentials() {
    if (!this.projectId) return;
    this.projectService.getProjectSocialCredentials(this.projectId).subscribe({
      next: (res) => {
        this.hasMetaAppId.set(res.hasMetaAppId);
        this.maskedMetaAppId.set(res.maskedMetaAppId);
        this.hasTiktokClientKey.set(res.hasTiktokClientKey);
        this.maskedTiktokClientKey.set(res.maskedTiktokClientKey);
        this.socialForm.patchValue({
          metaAppId: res.maskedMetaAppId ?? '',
          tiktokClientKey: res.maskedTiktokClientKey ?? '',
        });
      },
    });
  }

  protected saveSocialCredentials() {
    if (this.savingSocialCreds()) return;
    this.savingSocialCreds.set(true);
    this.socialCredsSuccess.set(false);
    this.projectService.saveProjectSocialCredentials(this.projectId, this.socialForm.value as any).subscribe({
      next: () => {
        this.savingSocialCreds.set(false);
        this.socialCredsSuccess.set(true);
        this.notifService.toast('Social credentials saved successfully for this project!', 'success');
        setTimeout(() => this.socialCredsSuccess.set(false), 2500);
        this.loadProjectSocialCredentials();
      },
      error: (err) => {
        this.savingSocialCreds.set(false);
        this.notifService.toast(err.error?.error || 'Failed to save social credentials.', 'warning');
      },
    });
  }


  protected loadLiveMetrics() {
    if (!this.projectId) return;
    this.liveLoading.set(true);
    this.liveError.set('');
    this.ga4Error.set('');
    this.gscError.set('');
    this.adsError.set('');

    this.projectService.getGa4Metrics(this.projectId, 30, true).subscribe({
      next: (res) => {
        this.ga4Metrics.set(res.data);
        this.ga4Error.set('');
      },
      error: (err) => {
        this.ga4Metrics.set(null);
        this.ga4Error.set(err.error?.message || 'GA4 Property ID is not configured or failed to connect to Google Analytics.');
      },
    });

    this.projectService.getGscMetrics(this.projectId, 30, true).subscribe({
      next: (res) => {
        this.gscMetrics.set(res.data);
        this.gscError.set('');
      },
      error: (err) => {
        this.gscMetrics.set(null);
        this.gscError.set(err.error?.message || 'Search Console Property URL is not configured or failed to connect.');
      },
    });

    this.projectService.getGoogleAdsCampaigns(this.projectId, 30, true).subscribe({
      next: (res) => {
        this.adsMetrics.set(res.data);
        this.adsError.set('');
        this.liveLoading.set(false);
      },
      error: (err) => {
        this.adsMetrics.set(null);
        this.adsError.set(err.error?.message || 'Google Ads Customer Account ID or Developer Token is not configured.');
        this.liveLoading.set(false);
      },
    });
  }

  protected saveBrief() {
    if (this.briefForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.projectService.upsertMarketing(this.projectId, this.briefForm.value as any).subscribe({
      next: (mkt) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.tasks.set(mkt.tasks ?? []);
        setTimeout(() => this.saveSuccess.set(false), 2500);
      },
      error: () => this.saving.set(false),
    });
  }

  protected addTask(col: KanbanCol) {
    this.projectService.createMarketingTask(this.projectId, {
      title: 'New Task', status: col, priority: 'MEDIUM',
      category: this.catFilter() === 'ALL' ? 'OTHER' : this.catFilter() as MarketingTaskCategory,
      sortOrder: this.tasks().length,
    }).subscribe(t => this.tasks.update(list => [...list, t]));
  }

  protected moveTask(task: MarketingTask, status: KanbanCol) {
    this.projectService.updateMarketingTask(this.projectId, task.id, { status }).subscribe(updated =>
      this.tasks.update(list => list.map(t => t.id === updated.id ? updated : t))
    );
  }

  protected deleteTask(task: MarketingTask) {
    this.projectService.deleteMarketingTask(this.projectId, task.id).subscribe(() =>
      this.tasks.update(list => list.filter(t => t.id !== task.id))
    );
  }

  protected assetIcon(type: AssetType): string {
    const icons: Record<AssetType, string> = {
      IMAGE:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      VIDEO:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      FONT:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
      DOCUMENT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      OTHER:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    };
    return icons[type] ?? icons.OTHER;
  }

  protected openAsset(asset: { name: string; url: string }, event: MouseEvent) {
    if (asset.url.startsWith('data:')) {
      event.preventDefault();
      const newTab = window.open();
      if (newTab) {
        const safeName = asset.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${safeName}</title>
              <style>
                body { margin: 0; background: #0B0F19; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #fff; }
                img { max-width: 90%; max-height: 85vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border-radius: 12px; border: 1px solid #1E293B; }
                .container { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px; }
                .title { font-size: 14px; font-weight: 500; color: #94A3B8; letter-spacing: 0.02em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="title">${safeName}</div>
                <img src="${asset.url}" alt="${safeName}" />
              </div>
            </body>
          </html>
        `);
        newTab.document.close();
      }
    }
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected completeGate() {
    this.gateLoading.set(true);
    this.gateError.set('');
    this.gateWarnings.set([]);
    this.projectService.completeMarketing(this.projectId).subscribe({
      next: (res) => {
        this.gateLoading.set(false);
        this.gateWarnings.set(res.warnings ?? []);
        this.projectService.getProject(this.projectId).subscribe(p => this.state.setProject(p));
        const name = this.state.project()?.name ?? 'Project';
        this.notifService.add({
          type: 'gate_approved',
          title: 'Marketing gate approved',
          body: `${name} — All pipeline stages complete`,
          projectId: this.projectId,
          projectName: name,
          route: `/app/projects/${this.projectId}/reporting`,
        });
      },
      error: (err) => {
        this.gateLoading.set(false);
        this.gateError.set(err?.error?.error ?? 'Gate approval failed.');
      },
    });
  }

  protected loadProjectIntegrations() {
    if (!this.projectId) return;
    this.integrationService.getIntegrations(this.projectId).subscribe({
      next: (res) => {
        const meta = res.integrations.find(i => i.provider === 'META');
        const tiktok = res.integrations.find(i => i.provider === 'TIKTOK');
        this.isMetaConnected.set(meta?.status === 'CONNECTED');
        this.isTiktokConnected.set(tiktok?.status === 'CONNECTED');
        this.metaAccountName.set(meta?.accountName ?? null);
        this.tiktokAccountName.set(tiktok?.accountName ?? null);
      }
    });
  }

  protected connectProvider(provider: 'meta' | 'tiktok') {
    this.integrationService.getAuthUrl(provider, this.projectId).subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || `Please enter and save ${provider === 'meta' ? 'Meta App ID & App Secret' : 'TikTok Client Key & Client Secret'} in the form above first.`;
        this.notifService.toast(msg, 'warning');
      }
    });
  }


  protected disconnectProvider(provider: 'meta' | 'tiktok') {
    this.integrationService.disconnect(provider, this.projectId).subscribe({
      next: () => {
        this.loadProjectIntegrations();
        this.notifService.toast(`${provider === 'meta' ? 'Meta' : 'TikTok'} disconnected successfully.`, 'success');
      }
    });
  }
}
