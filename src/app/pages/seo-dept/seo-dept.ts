import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../ui';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.models';

type TabId = 'projects' | 'keywords' | 'onpage' | 'tasks';

interface SeoProject {
  id: string;
  name: string;
  client: string;
  clientInitials: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  seoTasksDone: number;
  seoTasksTotal: number;
  pagesWithMeta: number;
  pagesTotal: number;
  completedAt?: string;
  daysActive: number;
  searchConsoleUrl?: string;
}

const GSC_CREATE_URL = 'https://search.google.com/search-console/welcome';

interface KeywordRow {
  keyword: string;
  type: 'primary' | 'secondary';
  projectId: string;
  projectName: string;
  client: string;
}

interface OnPageRow {
  pageId: string;
  projectId: string;
  projectName: string;
  client: string;
  title: string;
  slug: string;
  wordCount: number;
  hasMeta: boolean;
  hasMetaDesc: boolean;
  status: string;
}

interface SeoTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  client: string;
  projectId: string;
}

function splitKw(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(/[,\n]+/).map(k => k.trim()).filter(Boolean);
}

@Component({
  selector: 'app-seo-dept',
  imports: [RouterLink, Badge],
  template: `
    <div class="seo-page">

      <!-- Header -->
      <div class="seo-header">
        <div class="seo-header-left">
          <div class="dept-badge" aria-hidden="true">SEO</div>
          <div>
            <h2 class="seo-title">SEO</h2>
            <p class="seo-sub">Product Growth · Organic Search · {{ projects().length }} projects</p>
          </div>
        </div>
        <div class="header-right">
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" type="search" placeholder="Search…" aria-label="Search"
              [value]="search()" (input)="search.set($any($event.target).value)" />
          </div>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip" role="list" aria-label="SEO summary">
        @for (k of kpis; track k.label) {
          <div class="kpi-card" role="listitem">
            <div class="kpi-icon" [style.background]="k.bg" [innerHTML]="k.icon" aria-hidden="true"></div>
            <div>
              <div class="kpi-val">{{ k.value() }}</div>
              <div class="kpi-lbl">{{ k.label }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Tab nav -->
      <div class="tab-nav" role="tablist" aria-label="SEO sections">
        @for (t of tabs; track t.id) {
          <button
            role="tab"
            class="tab-btn"
            [class.active]="activeTab() === t.id"
            [attr.aria-selected]="activeTab() === t.id"
            (click)="activeTab.set(t.id)"
          >
            {{ t.label }}
            @if (t.count() > 0) {
              <span class="tab-count">{{ t.count() }}</span>
            }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state" role="status">
          <div class="spinner" aria-hidden="true"></div>Loading projects…
        </div>
      } @else {

        <!-- ── Tab: Projects ── -->
        @if (activeTab() === 'projects') {
          <div class="list-header" aria-hidden="true">
            <span>Project / Client</span>
            <span>Primary Keywords</span>
            <span>SEO Tasks</span>
            <span>On-Page</span>
            <span>Days Active</span>
            <span>Status</span>
            <span>Search Console</span>
            <span></span>
          </div>
          <div class="proj-list" role="list" aria-label="SEO projects">
            @for (p of displayedProjects(); track p.id) {
              <article class="prow" role="listitem">
                <div class="prow-id">
                  <div class="avatar" aria-hidden="true">{{ p.clientInitials }}</div>
                  <div>
                    <span class="prow-name">{{ p.name }}</span>
                    <span class="prow-client">{{ p.client }}</span>
                  </div>
                </div>
                <div class="kw-cell">
                  @if (p.primaryKeywords.length === 0) {
                    <span class="kw-empty">No keywords</span>
                  } @else {
                    @for (kw of p.primaryKeywords.slice(0, 2); track kw) {
                      <span class="kw-tag">{{ kw }}</span>
                    }
                    @if (p.primaryKeywords.length > 2) {
                      <span class="kw-more">+{{ p.primaryKeywords.length - 2 }}</span>
                    }
                  }
                </div>
                <div class="progress-cell">
                  <span class="prog-label">{{ p.seoTasksDone }}/{{ p.seoTasksTotal }}</span>
                  @if (p.seoTasksTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="taskPct(p)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill" [style.width.%]="taskPct(p)"></div>
                    </div>
                  }
                </div>
                <div class="progress-cell">
                  <span class="prog-label">{{ p.pagesWithMeta }}/{{ p.pagesTotal }} meta</span>
                  @if (p.pagesTotal > 0) {
                    <div class="mini-bar" role="progressbar" [attr.aria-valuenow]="metaPct(p)" aria-valuemin="0" aria-valuemax="100">
                      <div class="mini-fill meta" [style.width.%]="metaPct(p)"></div>
                    </div>
                  }
                </div>
                <div class="days-cell">
                  <span class="days-num">{{ p.daysActive }}d</span>
                </div>
                <div>
                  @if (p.completedAt) {
                    <ui-badge variant="success">Complete</ui-badge>
                  } @else {
                    <ui-badge variant="success">Active</ui-badge>
                  }
                </div>
                <div class="gsc-cell">
                  @if (p.searchConsoleUrl) {
                    <a class="conn conn--on" [href]="gscLink(p.searchConsoleUrl)" target="_blank" rel="noopener" [title]="p.searchConsoleUrl">
                      <span class="conn-dot" aria-hidden="true"></span>Linked
                    </a>
                  } @else {
                    <a class="conn conn--off" [href]="GSC_CREATE_URL" target="_blank" rel="noopener">Set up →</a>
                  }
                </div>
                <a class="btn-open" [routerLink]="['/app/projects', p.id, 'analytics']" aria-label="Open {{ p.name }}">Open</a>
              </article>
            } @empty {
              <div class="empty-state">No projects in the SEO pipeline yet.</div>
            }
          </div>
        }

        <!-- ── Tab: Keyword Board ── -->
        @if (activeTab() === 'keywords') {
          <div class="kw-board">

            <!-- Filter row -->
            <div class="kw-filter-row">
              <div class="kw-filter-btns" role="group" aria-label="Keyword type filter">
                @for (f of kwFilters; track f.value) {
                  <button class="kw-fbtn" [class.active]="kwFilter() === f.value" (click)="kwFilter.set(f.value)">
                    {{ f.label }}
                    <span class="kw-fbtn-count">{{ f.count() }}</span>
                  </button>
                }
              </div>
            </div>

            @if (displayedKeywords().length === 0) {
              <div class="empty-state">No keywords found. Add primary/secondary keywords in Project Profiling.</div>
            } @else {
              <!-- Group by project -->
              @for (group of keywordGroups(); track group.projectId) {
                <div class="kw-project-group">
                  <div class="kw-group-header">
                    <div class="avatar sm" aria-hidden="true">{{ group.clientInitials }}</div>
                    <span class="kw-group-name">{{ group.projectName }}</span>
                    <span class="kw-group-client">{{ group.client }}</span>
                    <span class="kw-group-count">{{ group.keywords.length }} keywords</span>
                    <a class="btn-open sm" [routerLink]="['/app/projects', group.projectId, 'profiling']">Edit</a>
                  </div>
                  <div class="kw-chips">
                    @for (kw of group.keywords; track kw.keyword + kw.type) {
                      <span class="kw-chip" [class.kw-chip--primary]="kw.type === 'primary'" [class.kw-chip--secondary]="kw.type === 'secondary'">
                        <span class="kw-chip-dot" aria-hidden="true"></span>
                        {{ kw.keyword }}
                        <span class="kw-chip-type">{{ kw.type === 'primary' ? 'P' : 'S' }}</span>
                      </span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- ── Tab: On-Page SEO ── -->
        @if (activeTab() === 'onpage') {
          <div class="onpage-section">
            <div class="op-filter-row">
              @for (f of opFilters; track f.value) {
                <button class="kw-fbtn" [class.active]="opFilter() === f.value" (click)="opFilter.set(f.value)">
                  {{ f.label }}
                  <span class="kw-fbtn-count">{{ f.count() }}</span>
                </button>
              }
            </div>

            <div class="op-list-header" aria-hidden="true">
              <span>Page</span>
              <span>Project</span>
              <span>Words</span>
              <span>Meta Title</span>
              <span>Meta Desc</span>
              <span>Status</span>
            </div>
            <div class="op-list" role="list" aria-label="On-page SEO tracker">
              @for (row of displayedOnPage(); track row.pageId) {
                <div class="op-row" role="listitem">
                  <div class="op-page">
                    <span class="op-title">{{ row.title }}</span>
                    @if (row.slug) {
                      <span class="op-slug">/{{ row.slug }}</span>
                    }
                  </div>
                  <div class="op-proj">
                    <span class="op-proj-name">{{ row.projectName }}</span>
                    <span class="op-proj-client">{{ row.client }}</span>
                  </div>
                  <div class="op-words">{{ row.wordCount > 0 ? row.wordCount.toLocaleString() : '—' }}</div>
                  <div class="op-check-cell">
                    @if (row.hasMeta) {
                      <svg class="check-yes" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-label="Has meta title"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else {
                      <svg class="check-no" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Missing meta title"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                  </div>
                  <div class="op-check-cell">
                    @if (row.hasMetaDesc) {
                      <svg class="check-yes" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-label="Has meta description"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else {
                      <svg class="check-no" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Missing meta description"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                  </div>
                  <div>
                    @if (row.status === 'APPROVED') {
                      <ui-badge variant="success">Approved</ui-badge>
                    } @else if (row.status === 'IN_REVIEW') {
                      <ui-badge variant="info">In Review</ui-badge>
                    } @else {
                      <ui-badge variant="default">Draft</ui-badge>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-state">No content pages found. Pages appear once Written Content is underway.</div>
              }
            </div>

            <!-- Missing meta summary -->
            @if (missingMetaCount() > 0) {
              <div class="meta-alert" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <strong>{{ missingMetaCount() }}</strong> page(s) missing meta title or description — update them in the Written Content workspace.
              </div>
            }
          </div>
        }

        <!-- ── Tab: SEO Tasks ── -->
        @if (activeTab() === 'tasks') {
          <div class="tasks-section">
            <div class="tasks-filter-row">
              @for (f of taskFilters; track f.value) {
                <button class="kw-fbtn" [class.active]="taskFilter() === f.value" (click)="taskFilter.set(f.value)">
                  {{ f.label }}
                  <span class="kw-fbtn-count">{{ f.count() }}</span>
                </button>
              }
            </div>

            <div class="task-list-header" aria-hidden="true">
              <span>Task</span>
              <span>Project</span>
              <span>Priority</span>
              <span>Status</span>
            </div>
            <div class="task-list" role="list" aria-label="SEO task list">
              @for (t of displayedTasks(); track t.id) {
                <div class="task-row" role="listitem">
                  <span class="task-title">{{ t.title }}</span>
                  <div class="task-proj">
                    <span class="tp-name">{{ t.projectName }}</span>
                    <span class="tp-client">{{ t.client }}</span>
                  </div>
                  <span class="task-priority" [attr.data-p]="t.priority">{{ t.priority }}</span>
                  <span class="task-status" [attr.data-s]="t.status">{{ statusLabel(t.status) }}</span>
                </div>
              } @empty {
                <div class="empty-state">No SEO tasks yet. Add SEO-category tasks from the Marketing workspace.</div>
              }
            </div>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .seo-page { display: flex; flex-direction: column; gap: 16px; }

    /* Header */
    .seo-header { display: flex; align-items: center; justify-content: space-between; }
    .seo-header-left { display: flex; align-items: center; gap: 14px; }
    .dept-badge { width: 44px; height: 44px; border-radius: 10px; background: #10B981; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .seo-title { font-family: var(--font-display); font-size: 22px; font-weight: 400; color: var(--color-text); margin: 0 0 2px; }
    .seo-sub { font-size: 12.5px; color: var(--color-text-muted); margin: 0; }
    .header-right { display: flex; align-items: center; gap: 10px; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
    .search-input { height: 34px; padding: 0 10px 0 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 13px; color: var(--color-text); background: var(--color-surface); outline: none; width: 200px; }
    .search-input:focus { border-color: #10B981; }

    /* KPI strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); }
    .kpi-icon { width: 36px; height: 36px; min-width: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .kpi-val { font-size: 20px; font-weight: 700; color: var(--color-text); line-height: 1; }
    .kpi-lbl { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }

    /* Tabs */
    .tab-nav { display: flex; gap: 2px; border-bottom: 1px solid var(--color-border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: #10B981; border-bottom-color: #10B981; }
    .tab-count { background: #ECFDF5; color: #059669; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 10px; padding: 40px; justify-content: center; color: var(--color-text-muted); font-size: 13.5px; }
    .spinner { width: 18px; height: 18px; border: 2px solid var(--color-border); border-top-color: #10B981; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Projects tab */
    .list-header { display: grid; grid-template-columns: 1fr 180px 120px 110px 80px 90px 110px 70px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .proj-list { display: flex; flex-direction: column; gap: 6px; }
    .prow { display: grid; grid-template-columns: 1fr 180px 120px 110px 80px 90px 110px 70px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); transition: box-shadow 0.15s; }
    .prow:hover { box-shadow: var(--shadow-raised); }
    .prow-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .avatar { width: 32px; height: 32px; min-width: 32px; border-radius: 8px; background: var(--color-sidebar); color: #F8FAFC; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .avatar.sm { width: 26px; height: 26px; min-width: 26px; font-size: 10px; }
    .prow-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prow-client { display: block; font-size: 11.5px; color: var(--color-text-muted); }
    .kw-cell { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .kw-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-weight: 500; }
    .kw-empty { font-size: 12px; color: var(--color-text-muted); }
    .kw-more { font-size: 11px; color: var(--color-text-muted); }
    .progress-cell { display: flex; flex-direction: column; gap: 4px; }
    .prog-label { font-size: 12.5px; font-weight: 600; color: var(--color-text); }
    .mini-bar { height: 4px; background: var(--color-surface-raised); border-radius: 4px; overflow: hidden; }
    .mini-fill { height: 100%; background: #10B981; border-radius: 4px; transition: width 0.3s; }
    .mini-fill.meta { background: #6366F1; }
    .days-cell { }
    .days-num { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
    .gsc-cell { display: flex; }
    .conn { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; text-decoration: none; border: 1px solid transparent; white-space: nowrap; }
    .conn--on { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
    .conn--off { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); border-style: dashed; }
    .conn--off:hover { color: #10B981; border-color: #10B981; }
    .conn-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
    .btn-open { height: 28px; padding: 0 10px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: flex; align-items: center; transition: background 0.12s; }
    .btn-open:hover { background: var(--color-border); color: var(--color-text); }
    .btn-open.sm { height: 24px; font-size: 11px; padding: 0 8px; }
    .empty-state { text-align: center; padding: 40px 24px; color: var(--color-text-muted); font-size: 13.5px; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg); }

    /* Filter buttons (shared) */
    .kw-filter-row, .op-filter-row, .tasks-filter-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .kw-fbtn { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 15px; font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); background: var(--color-surface); cursor: pointer; transition: all 0.15s; }
    .kw-fbtn:hover { border-color: #10B981; color: #059669; }
    .kw-fbtn.active { background: #10B981; color: #fff; border-color: #10B981; }
    .kw-fbtn-count { font-size: 10.5px; font-weight: 700; }

    /* Keyword Board */
    .kw-board { display: flex; flex-direction: column; gap: 12px; }
    .kw-project-group { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .kw-group-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); }
    .kw-group-name { font-size: 13.5px; font-weight: 600; color: var(--color-text); }
    .kw-group-client { font-size: 12px; color: var(--color-text-muted); flex: 1; }
    .kw-group-count { font-size: 11px; font-weight: 600; background: #ECFDF5; color: #059669; padding: 2px 8px; border-radius: 10px; }
    .kw-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px; }
    .kw-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12.5px; font-weight: 500; border: 1px solid; }
    .kw-chip--primary { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
    .kw-chip--secondary { background: #F3F4F6; color: #4B5563; border-color: var(--color-border-strong); }
    .kw-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .kw-chip-type { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; background: rgba(0,0,0,0.08); padding: 1px 5px; border-radius: 6px; }

    /* On-Page tab */
    .onpage-section { display: flex; flex-direction: column; gap: 12px; }
    .op-list-header { display: grid; grid-template-columns: 1fr 180px 70px 90px 90px 90px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .op-list { display: flex; flex-direction: column; gap: 6px; }
    .op-row { display: grid; grid-template-columns: 1fr 180px 70px 90px 90px 90px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .op-page { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .op-title { font-size: 13px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .op-slug { font-size: 11.5px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
    .op-proj { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .op-proj-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .op-proj-client { font-size: 11px; color: var(--color-text-muted); }
    .op-words { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .op-check-cell { display: flex; align-items: center; padding-left: 24px; }
    .check-yes { color: #10B981; }
    .check-no { color: var(--color-destructive); opacity: 0.6; }
    .meta-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: var(--radius-md); font-size: 13px; color: #92400E; }

    /* Tasks tab */
    .tasks-section { display: flex; flex-direction: column; gap: 12px; }
    .task-list-header { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; padding: 0 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .task-list { display: flex; flex-direction: column; gap: 6px; }
    .task-row { display: grid; grid-template-columns: 1fr 200px 90px 100px; gap: 10px; align-items: center; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .task-title { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .task-proj { display: flex; flex-direction: column; gap: 2px; }
    .tp-name { font-size: 12.5px; font-weight: 500; color: var(--color-text-secondary); }
    .tp-client { font-size: 11px; color: var(--color-text-muted); }
    .task-priority { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-priority[data-p="HIGH"] { background: #FEE2E2; color: #DC2626; }
    .task-priority[data-p="MEDIUM"] { background: #FEF3C7; color: #D97706; }
    .task-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--color-surface-raised); color: var(--color-text-muted); }
    .task-status[data-s="DONE"] { background: #ECFDF5; color: #059669; }
    .task-status[data-s="IN_PROGRESS"] { background: #EFF6FF; color: #2563EB; }
    .task-status[data-s="IN_REVIEW"] { background: #FEF3C7; color: #D97706; }
  `]
})
export class SeoDept implements OnInit {
  private projectService = inject(ProjectService);

  protected search      = signal('');
  protected activeTab   = signal<TabId>('projects');
  protected kwFilter    = signal<'all' | 'primary' | 'secondary'>('all');
  protected opFilter    = signal<'all' | 'missing-meta' | 'approved'>('all');
  protected taskFilter  = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('all');
  protected loading     = signal(true);
  protected projects    = signal<SeoProject[]>([]);
  protected allKeywords = signal<KeywordRow[]>([]);
  protected allPages    = signal<OnPageRow[]>([]);
  protected allTasks    = signal<SeoTask[]>([]);

  readonly tabs = [
    { id: 'projects'  as TabId, label: 'Projects',        count: computed(() => this.projects().length) },
    { id: 'keywords'  as TabId, label: 'Keyword Board',   count: computed(() => this.allKeywords().length) },
    { id: 'onpage'    as TabId, label: 'On-Page SEO',     count: computed(() => this.allPages().length) },
    { id: 'tasks'     as TabId, label: 'SEO Tasks',       count: computed(() => this.allTasks().length) },
  ];

  readonly kwFilters = [
    { label: 'All',       value: 'all'       as const, count: computed(() => this.allKeywords().length) },
    { label: 'Primary',   value: 'primary'   as const, count: computed(() => this.allKeywords().filter(k => k.type === 'primary').length) },
    { label: 'Secondary', value: 'secondary' as const, count: computed(() => this.allKeywords().filter(k => k.type === 'secondary').length) },
  ];

  readonly opFilters = [
    { label: 'All',          value: 'all'          as const, count: computed(() => this.allPages().length) },
    { label: 'Missing Meta', value: 'missing-meta' as const, count: computed(() => this.allPages().filter(p => !p.hasMeta || !p.hasMetaDesc).length) },
    { label: 'Approved',     value: 'approved'     as const, count: computed(() => this.allPages().filter(p => p.status === 'APPROVED').length) },
  ];

  readonly taskFilters = [
    { label: 'All',         value: 'all'         as const, count: computed(() => this.allTasks().length) },
    { label: 'To Do',       value: 'TODO'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'TODO').length) },
    { label: 'In Progress', value: 'IN_PROGRESS' as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_PROGRESS').length) },
    { label: 'In Review',   value: 'IN_REVIEW'   as const, count: computed(() => this.allTasks().filter(t => t.status === 'IN_REVIEW').length) },
    { label: 'Done',        value: 'DONE'        as const, count: computed(() => this.allTasks().filter(t => t.status === 'DONE').length) },
  ];

  protected kpis = [
    {
      label: 'Active Projects',
      value: computed(() => this.projects().filter(p => !p.completedAt).length),
      bg: '#10B981',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    },
    {
      label: 'Total Keywords',
      value: computed(() => this.allKeywords().length),
      bg: '#6366F1',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>`,
    },
    {
      label: 'Pages with Meta',
      value: computed(() => {
        const total = this.allPages().length;
        const withMeta = this.allPages().filter(p => p.hasMeta).length;
        return total === 0 ? '—' : `${withMeta}/${total}`;
      }),
      bg: '#F59E0B',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
    },
    {
      label: 'SEO Tasks Done',
      value: computed(() => {
        const done = this.allTasks().filter(t => t.status === 'DONE').length;
        return `${done}/${this.allTasks().length}`;
      }),
      bg: '#22C55E',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    },
  ];

  protected missingMetaCount = computed(() =>
    this.allPages().filter(p => !p.hasMeta || !p.hasMetaDesc).length
  );

  protected displayedProjects = computed(() => {
    const q = this.search().toLowerCase();
    return this.projects().filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)
    );
  });

  protected displayedKeywords = computed(() => {
    const type = this.kwFilter();
    const q = this.search().toLowerCase();
    return this.allKeywords().filter(k =>
      (type === 'all' || k.type === type) &&
      (!q || k.keyword.toLowerCase().includes(q) || k.projectName.toLowerCase().includes(q))
    );
  });

  protected keywordGroups = computed(() => {
    const kws = this.displayedKeywords();
    const map = new Map<string, { projectId: string; projectName: string; client: string; clientInitials: string; keywords: KeywordRow[] }>();
    for (const kw of kws) {
      if (!map.has(kw.projectId)) {
        const proj = this.projects().find(p => p.id === kw.projectId);
        map.set(kw.projectId, {
          projectId: kw.projectId,
          projectName: kw.projectName,
          client: kw.client,
          clientInitials: proj?.clientInitials ?? kw.client.slice(0, 2).toUpperCase(),
          keywords: [],
        });
      }
      map.get(kw.projectId)!.keywords.push(kw);
    }
    return Array.from(map.values());
  });

  protected displayedOnPage = computed(() => {
    const f = this.opFilter();
    const q = this.search().toLowerCase();
    return this.allPages().filter(p => {
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q);
      const matchFilter = f === 'all'
        || (f === 'missing-meta' && (!p.hasMeta || !p.hasMetaDesc))
        || (f === 'approved' && p.status === 'APPROVED');
      return matchSearch && matchFilter;
    });
  });

  protected displayedTasks = computed(() => {
    const f = this.taskFilter();
    const q = this.search().toLowerCase();
    return this.allTasks().filter(t => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q);
      const matchFilter = f === 'all' || t.status === f;
      return matchSearch && matchFilter;
    });
  });

  ngOnInit() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const seoProjects = projects.filter(p => p.currentStage === 'MARKETING' || !!p.marketing);
        this.projects.set(seoProjects.map(p => this.mapProject(p)));

        const keywords: KeywordRow[] = [];
        const pages: OnPageRow[] = [];
        const tasks: SeoTask[] = [];

        for (const p of seoProjects) {
          const name = p.name;
          const client = p.clientName;

          for (const kw of splitKw(p.profiling?.primaryKeywords)) {
            keywords.push({ keyword: kw, type: 'primary', projectId: p.id, projectName: name, client });
          }
          for (const kw of splitKw(p.profiling?.secondaryKeywords)) {
            keywords.push({ keyword: kw, type: 'secondary', projectId: p.id, projectName: name, client });
          }

          for (const page of p.content?.pages ?? []) {
            pages.push({
              pageId: page.id, projectId: p.id, projectName: name, client,
              title: page.title, slug: page.slug ?? '',
              wordCount: page.wordCount ?? 0,
              hasMeta: !!page.metaTitle,
              hasMetaDesc: !!page.metaDescription,
              status: page.status,
            });
          }

          for (const t of (p.marketing?.tasks ?? []).filter(t => t.category === 'SEO')) {
            tasks.push({
              id: t.id, title: t.title, status: t.status,
              priority: t.priority ?? 'MEDIUM',
              projectName: name, client, projectId: p.id,
            });
          }
        }

        this.allKeywords.set(keywords);
        this.allPages.set(pages);
        this.allTasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapProject(p: Project): SeoProject {
    const entry = p.pipeline.find(e => e.stage === 'MARKETING');
    const daysActive = entry?.startedAt
      ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 86400000)
      : 0;
    const seoTasks = (p.marketing?.tasks ?? []).filter(t => t.category === 'SEO');
    const pages = p.content?.pages ?? [];
    return {
      id: p.id, name: p.name, client: p.clientName,
      clientInitials: p.clientName.slice(0, 2).toUpperCase(),
      primaryKeywords: splitKw(p.profiling?.primaryKeywords),
      secondaryKeywords: splitKw(p.profiling?.secondaryKeywords),
      seoTasksDone:  seoTasks.filter(t => t.status === 'DONE').length,
      seoTasksTotal: seoTasks.length,
      pagesWithMeta: pages.filter(p => p.metaTitle).length,
      pagesTotal:    pages.length,
      completedAt:   p.marketing?.completedAt,
      daysActive,
      searchConsoleUrl: p.searchConsoleUrl,
    };
  }

  protected readonly GSC_CREATE_URL = GSC_CREATE_URL;

  /** Deep-link to the live Search Console property (falls back to setup when absent). */
  protected gscLink(url?: string): string {
    return url ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(url)}` : GSC_CREATE_URL;
  }

  protected taskPct(p: SeoProject): number {
    return p.seoTasksTotal === 0 ? 0 : Math.round((p.seoTasksDone / p.seoTasksTotal) * 100);
  }

  protected metaPct(p: SeoProject): number {
    return p.pagesTotal === 0 ? 0 : Math.round((p.pagesWithMeta / p.pagesTotal) * 100);
  }

  protected statusLabel(s: string): string {
    if (s === 'IN_PROGRESS') return 'In Progress';
    if (s === 'IN_REVIEW') return 'In Review';
    return s.charAt(0) + s.slice(1).toLowerCase();
  }
}
